"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentRevahaProfile } from "@/lib/revaha/auth";
import { REVAHA_IMPERSONATOR_COOKIE, signAdminId, verifySignedAdminId } from "@/lib/revaha/impersonation";

function randomPassword() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase() + "!1";
}

/** Super-admin, or a reseller company's own admin/staff managing their own clients. */
async function requireRevahaManager() {
  const session = await getCurrentRevahaProfile();
  const role = session?.profile?.role;
  if (role !== "admin" && role !== "company_admin" && role !== "company_staff") {
    throw new Error("פעולה זו זמינה למנהלי מערכת בלבד");
  }
  return session!;
}

/**
 * Confirms `userId` is a profiles_revaha row visible to the CURRENT caller (via the
 * RLS-bound client, not the service-role admin client), before any Admin API call
 * touches that user. Without this, a company_admin/staff could pass an arbitrary
 * user_id to a password-reset action and affect a user outside their own company.
 */
async function assertUserInScope(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles_revaha").select("id, email").eq("id", userId).maybeSingle();
  if (!data?.email) throw new Error("משתמש זה אינו בטווח הניהול שלך");
  return data.email as string;
}

export async function createOrganizationWithUser(formData: FormData) {
  const session = await requireRevahaManager();
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = (formData.get("phone") as string) || null;
  const isSuperAdmin = session.profile!.role === "admin";
  const reseller_company_id = isSuperAdmin
    ? (formData.get("reseller_company_id") as string) || null
    : session.profile!.reseller_company_id;

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

  const { data: organization, error: orgError } = await supabase
    .from("organizations_revaha")
    .insert({ name, contact_email: email, contact_phone: phone, reseller_company_id })
    .select()
    .single();
  if (orgError) return { error: orgError.message };

  await supabase
    .from("profiles_revaha")
    .insert({ id: signUpData.user.id, role: "org_user", organization_id: organization.id, full_name: name, email });

  revalidatePath("/revaha/admin/organizations");
  return { error: null, email, password };
}

export async function updateOrganizationDetails(organizationId: string, formData: FormData) {
  await requireRevahaManager();
  const supabase = await createClient();
  const name = formData.get("name") as string;
  const contact_email = (formData.get("contact_email") as string) || null;
  const contact_phone = (formData.get("contact_phone") as string) || null;
  await supabase.from("organizations_revaha").update({ name, contact_email, contact_phone }).eq("id", organizationId);
  revalidatePath(`/revaha/admin/organizations/${organizationId}`);
  revalidatePath("/revaha/admin/organizations");
}

/** Confirms `userId` is an org_user of `organizationId` that the caller may manage (RLS-bound read). */
async function assertOrgUser(userId: string, organizationId: string) {
  await assertUserInScope(userId);
  const supabase = await createClient();
  const { data } = await supabase.from("profiles_revaha").select("id, role, organization_id, email").eq("id", userId).maybeSingle();
  if (!data || data.role !== "org_user" || data.organization_id !== organizationId) {
    throw new Error("משתמש זה אינו משתמש של ארגון זה");
  }
  return data as { id: string; email: string | null };
}

export async function addUserToOrganization(organizationId: string, formData: FormData) {
  await requireRevahaManager();
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const full_name = ((formData.get("full_name") as string) || "").trim() || null;
  const password = ((formData.get("password") as string) || "").trim();
  if (!email) return { error: "יש להזין כתובת אימייל" };
  if (password.length < 6) return { error: "הסיסמה חייבת להכיל לפחות 6 תווים" };

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
  const { error: insertError } = await supabase
    .from("profiles_revaha")
    .insert({ id: signUpData.user.id, role: "org_user", organization_id: organizationId, full_name, email });
  if (insertError) {
    await adminClient.auth.admin.deleteUser(signUpData.user.id);
    return { error: insertError.message };
  }

  revalidatePath(`/revaha/admin/organizations/${organizationId}`);
  revalidatePath("/revaha/admin/organizations");
  return { error: null, email, full_name, id: signUpData.user.id };
}

/** Edits an organization user's name / login email, and optionally sets a new password they chose. */
export async function updateOrgUser(userId: string, organizationId: string, formData: FormData) {
  await requireRevahaManager();
  const current = await assertOrgUser(userId, organizationId);
  const full_name = ((formData.get("full_name") as string) || "").trim() || null;
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const password = ((formData.get("password") as string) || "").trim();
  if (!email) return { error: "יש להזין כתובת אימייל" };
  if (password && password.length < 6) return { error: "הסיסמה חייבת להכיל לפחות 6 תווים" };

  const authUpdate: { email?: string; email_confirm?: boolean; password?: string } = {};
  if (email !== (current.email ?? "").toLowerCase()) {
    authUpdate.email = email;
    authUpdate.email_confirm = true;
  }
  if (password) authUpdate.password = password;
  if (Object.keys(authUpdate).length) {
    const { error } = await createAdminClient().auth.admin.updateUserById(userId, authUpdate);
    if (error) return { error: error.message };
  }

  const supabase = await createClient();
  const { error: profileError } = await supabase.from("profiles_revaha").update({ full_name, email }).eq("id", userId);
  if (profileError) return { error: profileError.message };

  revalidatePath(`/revaha/admin/organizations/${organizationId}`);
  revalidatePath("/revaha/admin/organizations");
  return { error: null, full_name, email, passwordChanged: !!password };
}

/** Permanently deletes an organization user (profile + login). The organization itself and its facilities are untouched. */
export async function deleteOrgUser(userId: string, organizationId: string) {
  const session = await requireRevahaManager();
  if (session.userId === userId) return { error: "לא ניתן למחוק את המשתמש שאתם מחוברים אליו" };
  await assertOrgUser(userId, organizationId);

  const supabase = await createClient();
  const { error: profileError } = await supabase.from("profiles_revaha").delete().eq("id", userId);
  if (profileError) return { error: profileError.message };
  const { error } = await createAdminClient().auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  revalidatePath(`/revaha/admin/organizations/${organizationId}`);
  revalidatePath("/revaha/admin/organizations");
  return { error: null };
}

export async function impersonateOrgUser(formData: FormData) {
  const session = await requireRevahaManager();
  const userId = formData.get("user_id") as string;
  const email = await assertUserInScope(userId);

  const supabase = await createClient();
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error || !data.properties?.hashed_token) {
    throw new Error(error?.message ?? "יצירת קישור הכניסה נכשלה");
  }

  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties.hashed_token,
  });
  if (verifyError) throw new Error(verifyError.message);

  const cookieStore = await cookies();
  cookieStore.set(REVAHA_IMPERSONATOR_COOKIE, signAdminId(session.userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4,
  });

  revalidatePath("/", "layout");
  redirect("/revaha");
}

export async function returnToRevahaAdmin() {
  const cookieStore = await cookies();
  const signed = cookieStore.get(REVAHA_IMPERSONATOR_COOKIE)?.value;
  const adminUserId = verifySignedAdminId(signed);
  if (!adminUserId) throw new Error("לא נמצאה הפעלת התחזות פעילה");

  const adminClient = createAdminClient();
  const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(adminUserId);
  if (userError || !userData.user?.email) throw new Error("לא ניתן היה לשחזר את משתמש המנהל");

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: userData.user.email,
  });
  if (error || !data.properties?.hashed_token) {
    throw new Error(error?.message ?? "יצירת קישור החזרה נכשלה");
  }

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties.hashed_token,
  });
  if (verifyError) throw new Error(verifyError.message);

  cookieStore.delete(REVAHA_IMPERSONATOR_COOKIE);
  revalidatePath("/", "layout");
  redirect("/revaha");
}
