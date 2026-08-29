"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function randomPassword() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase() + "!1";
}

export async function createClientWithUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = (formData.get("phone") as string) || null;

  const supabase = await createClient();
  const password = randomPassword();

  // Admin-provisioned account: create it pre-confirmed via the service-role API,
  // so the office doesn't depend on the client clicking a confirmation email
  // (and doesn't hit the auth email rate limit).
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

  await supabase.from("profiles").insert({ id: signUpData.user.id, role: "client", client_id: client.id, full_name: name });

  revalidatePath("/admin/clients");
  return { error: null, email, password };
}

export async function assignModelToClient(clientId: string, yearId: string, modelId: string) {
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
  const supabase = await createClient();
  const lamas_level = Number(formData.get("lamas_level"));
  await supabase
    .from("client_years")
    .upsert({ client_id: clientId, year_id: yearId, lamas_level }, { onConflict: "client_id,year_id" });
  revalidatePath(`/admin/clients/${clientId}`);
}
