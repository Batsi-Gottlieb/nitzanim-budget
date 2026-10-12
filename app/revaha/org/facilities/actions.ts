"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRevahaProfile } from "@/lib/revaha/auth";

function num(formData: FormData, key: string): number | null {
  const raw = formData.get(key) as string;
  if (raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** The model's tariffs as plain amounts, to copy onto a facility as its initial (then freely editable) tariffs. */
async function modelTariffDefaults(supabase: SupabaseClient, modelId: string | null) {
  if (!modelId) return null;
  const { data: model } = await supabase.from("facility_models_revaha").select("*").eq("id", modelId).maybeSingle();
  if (!model) return null;
  const rateIds = [model.participant_rate_id, model.rent_reimbursement_rate_id].filter(Boolean) as string[];
  const { data: categories } = rateIds.length
    ? await supabase.from("income_rate_categories_revaha").select("id, monthly_amount").in("id", rateIds)
    : { data: [] };
  const amountById = new Map((categories ?? []).map((c) => [c.id as string, c.monthly_amount as number]));
  return {
    participant_rate: model.participant_rate_id ? amountById.get(model.participant_rate_id) ?? null : null,
    rent_reimbursement_rate: model.rent_reimbursement_rate_id ? amountById.get(model.rent_reimbursement_rate_id) ?? null : null,
    security_participation_monthly: model.security_participation_monthly as number | null,
    bat_sherut_rate: model.bat_sherut_full_rate as number | null,
    bat_ami_rate: model.bat_sherut_bat_ami_rate as number | null,
  };
}

export async function createFacility(formData: FormData) {
  const session = await getCurrentRevahaProfile();
  const organizationId = session?.profile?.organization_id;
  if (!organizationId) return { error: "חשבון זה אינו משויך לארגון" };

  const supabase = await createClient();
  const facilityModelId = (formData.get("facility_model_id") as string) || null;
  const tariffDefaults = await modelTariffDefaults(supabase, facilityModelId);
  const { data: facility, error } = await supabase
    .from("facilities_revaha")
    .insert({
      ...tariffDefaults,
      organization_id: organizationId,
      name: formData.get("name") as string,
      facility_model_id: facilityModelId,
      occupancy_actual: num(formData, "occupancy_actual"),
      occupancy_tender: num(formData, "occupancy_tender"),
      weekends_per_month: num(formData, "weekends_per_month"),
    })
    .select()
    .single();
  if (error || !facility) return { error: error?.message ?? "יצירת הפנימייה נכשלה" };

  revalidatePath("/revaha/org/facilities");
  return { error: null, id: facility.id as string };
}

export async function updateFacility(facilityId: string, formData: FormData) {
  const supabase = await createClient();
  const newModelId = (formData.get("facility_model_id") as string) || null;
  const { data: existing } = await supabase.from("facilities_revaha").select("facility_model_id").eq("id", facilityId).maybeSingle();
  // Changing the facility's model re-copies the new model's tariffs; picking no model leaves the tariffs untouched.
  const tariffDefaults = newModelId && existing?.facility_model_id !== newModelId ? await modelTariffDefaults(supabase, newModelId) : null;
  const { data, error } = await supabase
    .from("facilities_revaha")
    .update({
      ...tariffDefaults,
      name: formData.get("name") as string,
      facility_model_id: newModelId,
      occupancy_actual: num(formData, "occupancy_actual"),
      occupancy_tender: num(formData, "occupancy_tender"),
      weekends_per_month: num(formData, "weekends_per_month"),
    })
    .eq("id", facilityId)
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "השמירה לא בוצעה — אין הרשאה לעדכן פנימייה זו" };
  revalidatePath(`/revaha/org/facilities/${facilityId}`);
  revalidatePath("/revaha/org/facilities");
  return { error: null };
}
