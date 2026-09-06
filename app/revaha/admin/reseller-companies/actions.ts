"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentRevahaProfile } from "@/lib/revaha/auth";
import { REVAHA_IMPERSONATOR_COOKIE, signAdminId } from "@/lib/revaha/impersonation";

function randomPassword() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase() + "!1";
}

function randomToken() {
  return randomBytes(9).toString("base64url");
}

async function requireRevahaAdmin() {
  const session = await getCurrentRevahaProfile();
  if (session?.profile?.role !== "admin") {
    throw new Error("פעולה זו זמינה לסופר-אדמין בלבד");
  }
  return session;
}

/** Confirms userId is a company_admin/company_staff row visible to the caller via RLS. */
async function assertCompanyUserInScope(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles_revaha").select("id, email").eq("id", userId).maybeSingle();
  if (!data?.email) throw new Error("משתמש זה אינו בטווח הניהול שלך");
  return data.email as string;
}

export async function createResellerCompanyWithAdmin(formData: FormData) {
  await requireRevahaAdmin();
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = (formData.get("phone") as string) || null;

  const supabase = await createClient();
  const password = randomPassword();

  const adminClient = createAdminClient();
  const { data: signUpData, error: signUpError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (signUpError || !signUpData.user) {
    return { error: signUpError?.message ?? "יצירת המשתמש נכשלה" };
  }

  const { data: company, error: companyError } = await supabase
    .from("reseller_companies_revaha")
    .insert({ name, contact_email: email, contact_phone: phone, url_token: randomToken() })
    .select()
    .single();
  if (companyError) return { error: companyError.message };

  await supabase.from("profiles_revaha").insert({
    id: signUpData.user.id,
    role: "company_admin",
    reseller_company_id: company.id,
    full_name: name,
    email,
  });

  revalidatePath("/revaha/admin/reseller-companies");
  return { error: null, email, password };
}

export async function updateResellerCompanyDetails(companyId: string, formData: FormData) {
  await requireRevahaAdmin();
  const supabase = await createClient();
  const name = formData.get("name") as string;
  const contact_email = (formData.get("contact_email") as string) || null;
  const contact_phone = (formData.get("contact_phone") as string) || null;
  const logo_url = (formData.get("logo_url") as string) || null;
  const billing_notes = (formData.get("billing_notes") as string) || null;
  const is_active = formData.get("is_active") === "on";
  await supabase
    .from("reseller_companies_revaha")
    .update({ name, contact_email, contact_phone, logo_url, billing_notes, is_active })
    .eq("id", companyId);
  revalidatePath(`/revaha/admin/reseller-companies/${companyId}`);
  revalidatePath("/revaha/admin/reseller-companies");
}

export async function regenerateCompanyUrlToken(companyId: string) {
  await requireRevahaAdmin();
  const supabase = await createClient();
  const token = randomToken();
  await supabase.from("reseller_companies_revaha").update({ url_token: token }).eq("id", companyId);
  revalidatePath(`/revaha/admin/reseller-companies/${companyId}`);
  return { token };
}

export async function addUserToResellerCompany(companyId: string, formData: FormData) {
  await requireRevahaAdmin();
  const email = formData.get("email") as string;
  const full_name = (formData.get("full_name") as string) || null;
  const role = formData.get("role") === "company_staff" ? "company_staff" : "company_admin";
  const password = randomPassword();

  const adminClient = createAdminClient();
  const { data: signUpData, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !signUpData.user) {
    return { error: error?.message ?? "יצירת המשתמש נכשלה" };
  }

  const supabase = await createClient();
  await supabase
    .from("profiles_revaha")
    .insert({ id: signUpData.user.id, role, reseller_company_id: companyId, full_name, email });

  revalidatePath(`/revaha/admin/reseller-companies/${companyId}`);
  return { error: null, email, password, id: signUpData.user.id };
}

export async function resetCompanyUserPassword(userId: string, companyId: string) {
  await requireRevahaAdmin();
  await assertCompanyUserInScope(userId);
  const password = randomPassword();
  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(userId, { password });
  if (error) return { error: error.message };
  revalidatePath(`/revaha/admin/reseller-companies/${companyId}`);
  return { error: null, password };
}

export async function impersonateCompanyAdmin(formData: FormData) {
  const session = await requireRevahaAdmin();
  const userId = formData.get("user_id") as string;
  const email = await assertCompanyUserInScope(userId);

  const supabase = await createClient();
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) {
    throw new Error(error?.message ?? "יצירת קישור הכניסה נכשלה");
  }

  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties.hashed_token,
  });
  if (verifyError) throw new Error(verifyError.message);

  const cookieStore = await cookies();
  cookieStore.set(REVAHA_IMPERSONATOR_COOKIE, signAdminId(session!.userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4,
  });

  revalidatePath("/", "layout");
  redirect("/revaha");
}
