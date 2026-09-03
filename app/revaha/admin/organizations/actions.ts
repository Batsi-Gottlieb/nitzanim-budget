"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentRevahaProfile } from "@/lib/revaha/auth";

function randomPassword() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase() + "!1";
}

async function requireRevahaAdmin() {
  const session = await getCurrentRevahaProfile();
  if (session?.profile?.role !== "admin") {
    throw new Error("פעולה זו זמינה למנהל מערכת בלבד");
  }
  return session;
}

export async function createOrganizationWithUser(formData: FormData) {
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

  const { data: organization, error: orgError } = await supabase
    .from("organizations_revaha")
    .insert({ name, contact_email: email, contact_phone: phone })
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
  await requireRevahaAdmin();
  const supabase = await createClient();
  const name = formData.get("name") as string;
  const contact_email = (formData.get("contact_email") as string) || null;
  const contact_phone = (formData.get("contact_phone") as string) || null;
  await supabase.from("organizations_revaha").update({ name, contact_email, contact_phone }).eq("id", organizationId);
  revalidatePath(`/revaha/admin/organizations/${organizationId}`);
  revalidatePath("/revaha/admin/organizations");
}

export async function addUserToOrganization(organizationId: string, formData: FormData) {
  await requireRevahaAdmin();
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
    .from("profiles_revaha")
    .insert({ id: signUpData.user.id, role: "org_user", organization_id: organizationId, full_name, email });

  revalidatePath(`/revaha/admin/organizations/${organizationId}`);
  return { error: null, email, password, id: signUpData.user.id };
}

export async function resetOrgUserPassword(userId: string, organizationId: string) {
  await requireRevahaAdmin();
  const password = randomPassword();
  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(userId, { password });
  if (error) return { error: error.message };
  revalidatePath(`/revaha/admin/organizations/${organizationId}`);
  return { error: null, password };
}
