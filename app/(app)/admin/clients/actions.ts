"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

function randomPassword() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase() + "!1";
}

export async function createClientWithUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = (formData.get("phone") as string) || null;

  const supabase = await createClient();
  const password = randomPassword();

  // Use an isolated (non-cookie-bound) client for signUp so we don't overwrite the admin's own session.
  const authClient = createSupabaseJsClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
  const { data: signUpData, error: signUpError } = await authClient.auth.signUp({ email, password });
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
