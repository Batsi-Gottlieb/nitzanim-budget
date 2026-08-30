"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { signAdminId, verifySignedAdminId, IMPERSONATOR_COOKIE } from "@/lib/impersonation";

function randomPassword() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase() + "!1";
}

async function requireAdmin() {
  const session = await getCurrentProfile();
  if (session?.profile?.role !== "admin") {
    throw new Error("פעולה זו זמינה למנהל מערכת בלבד");
  }
  return session;
}

export async function createClientWithUser(formData: FormData) {
  await requireAdmin();
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

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({ name, contact_email: email, contact_phone: phone, auth_user_id: signUpData.user.id })
    .select()
    .single();
  if (clientError) return { error: clientError.message };

  await supabase
    .from("profiles")
    .insert({ id: signUpData.user.id, role: "client", client_id: client.id, full_name: name, email });

  revalidatePath("/admin/clients");
  return { error: null, email, password };
}

export async function assignModelToClient(clientId: string, yearId: string, modelId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: clientYear } = await supabase
    .from("client_years")
    .upsert({ client_id: clientId, year_id: yearId }, { onConflict: "client_id,year_id" })
    .select()
    .single();

  await supabase
    .from("client_models")
    .upsert({ client_year_id: clientYear!.id, client_id: clientId, model_id: modelId }, { onConflict: "client_year_id,model_id" });

  revalidatePath(`/admin/clients/${clientId}`);
}

export async function setClientLamasLevel(clientId: string, yearId: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const lamas_level = Number(formData.get("lamas_level"));
  await supabase
    .from("client_years")
    .upsert({ client_id: clientId, year_id: yearId, lamas_level }, { onConflict: "client_id,year_id" });
  revalidatePath(`/admin/clients/${clientId}`);
}

export async function updateClientDetails(clientId: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const name = formData.get("name") as string;
  const contact_email = (formData.get("contact_email") as string) || null;
  const contact_phone = (formData.get("contact_phone") as string) || null;
  await supabase.from("clients").update({ name, contact_email, contact_phone }).eq("id", clientId);
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/clients");
}

export async function addUserToClient(clientId: string, formData: FormData) {
  await requireAdmin();
  const email = formData.get("email") as string;
  const full_name = (formData.get("full_name") as string) || null;
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
    .from("profiles")
    .insert({ id: signUpData.user.id, role: "client", client_id: clientId, full_name, email });

  revalidatePath(`/admin/clients/${clientId}`);
  return { error: null, email, password, id: signUpData.user.id };
}

export async function updateUserName(userId: string, clientId: string, formData: FormData) {
  await requireAdmin();
  const full_name = formData.get("full_name") as string;
  const supabase = await createClient();
  await supabase.from("profiles").update({ full_name }).eq("id", userId);
  revalidatePath(`/admin/clients/${clientId}`);
}

export async function resetUserPassword(userId: string, clientId: string) {
  await requireAdmin();
  const password = randomPassword();
  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(userId, { password });
  if (error) return { error: error.message };
  revalidatePath(`/admin/clients/${clientId}`);
  return { error: null, password };
}

export async function impersonateUser(formData: FormData) {
  const session = await requireAdmin();
  const userId = formData.get("user_id") as string;

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("email").eq("id", userId).maybeSingle();
  if (!profile?.email) throw new Error("לא נמצא אימייל עבור משתמש זה");

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: profile.email,
  });
  if (error || !data.properties?.hashed_token) {
    throw new Error(error?.message ?? "יצירת קישור הכניסה נכשלה");
  }

  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties.hashed_token,
  });
  if (verifyError) throw new Error(verifyError.message);

  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATOR_COOKIE, signAdminId(session!.userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4,
  });

  revalidatePath("/", "layout");
  redirect("/");
}

export async function returnToAdmin() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const signed = cookieStore.get(IMPERSONATOR_COOKIE)?.value;
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

  cookieStore.delete(IMPERSONATOR_COOKIE);
  revalidatePath("/", "layout");
  redirect("/");
}
