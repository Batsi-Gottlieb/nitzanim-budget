"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRevahaProfile } from "@/lib/revaha/auth";

async function requireRevahaAdmin() {
  const session = await getCurrentRevahaProfile();
  if (session?.profile?.role !== "admin") {
    throw new Error("פעולה זו זמינה למנהל מערכת בלבד");
  }
}

function num(formData: FormData, key: string): number | null {
  const raw = formData.get(key) as string;
  if (raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

export async function createRoleType(formData: FormData) {
  await requireRevahaAdmin();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "יש להזין שם" };
  const supabase = await createClient();
  const { error } = await supabase.from("role_types_revaha").insert({ name });
  if (error) return { error: error.message };
  revalidatePath("/revaha/admin/base-data");
  return { error: null };
}

export async function createRole(formData: FormData) {
  await requireRevahaAdmin();
  const name = (formData.get("name") as string)?.trim();
  const role_type_id = formData.get("role_type_id") as string;
  if (!name || !role_type_id) return { error: "יש להזין שם ולבחור סוג תפקיד" };
  const supabase = await createClient();
  const { error } = await supabase.from("roles_revaha").insert({ name, role_type_id });
  if (error) return { error: error.message };
  revalidatePath("/revaha/admin/base-data");
  return { error: null };
}

export async function createIncomeRateCategory(formData: FormData) {
  await requireRevahaAdmin();
  const name = (formData.get("name") as string)?.trim();
  const rate_group = formData.get("rate_group") as string;
  const monthly_amount = num(formData, "monthly_amount") ?? 0;
  if (!name || (rate_group !== "participant" && rate_group !== "rent_reimbursement")) {
    return { error: "יש להזין שם ולבחור סוג תעריף" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("income_rate_categories_revaha").insert({ name, rate_group, monthly_amount });
  if (error) return { error: error.message };
  revalidatePath("/revaha/admin/base-data");
  return { error: null };
}

export async function updateIncomeRateCategoryAmount(id: string, formData: FormData) {
  await requireRevahaAdmin();
  const monthly_amount = num(formData, "monthly_amount") ?? 0;
  const supabase = await createClient();
  await supabase.from("income_rate_categories_revaha").update({ monthly_amount }).eq("id", id);
  revalidatePath("/revaha/admin/base-data");
}

export async function createFacilityModel(formData: FormData) {
  await requireRevahaAdmin();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "יש להזין שם מודל" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("facility_models_revaha").insert({ name }).select().single();
  if (error) return { error: error.message };
  revalidatePath("/revaha/admin/base-data/models");
  return { error: null, id: data.id as string };
}

export async function updateFacilityModel(modelId: string, formData: FormData) {
  await requireRevahaAdmin();
  const supabase = await createClient();
  const payload = {
    name: (formData.get("name") as string)?.trim(),
    participant_rate_id: (formData.get("participant_rate_id") as string) || null,
    rent_reimbursement_rate_id: (formData.get("rent_reimbursement_rate_id") as string) || null,
    security_participation_monthly: num(formData, "security_participation_monthly"),
    bat_sherut_full_rate: num(formData, "bat_sherut_full_rate"),
    bat_sherut_bat_ami_rate: num(formData, "bat_sherut_bat_ami_rate"),
  };
  await supabase.from("facility_models_revaha").update(payload).eq("id", modelId);
  revalidatePath(`/revaha/admin/base-data/models/${modelId}`);
}

export async function upsertFacilityModelRole(modelId: string, formData: FormData) {
  await requireRevahaAdmin();
  const role_id = formData.get("role_id") as string;
  if (!role_id) return { error: "יש לבחור תפקיד" };
  const supabase = await createClient();
  const payload = {
    facility_model_id: modelId,
    role_id,
    required_positions: num(formData, "required_positions"),
    monthly_hours_full_time: num(formData, "monthly_hours_full_time"),
    workdays_per_month: num(formData, "workdays_per_month"),
    workdays_per_week: num(formData, "workdays_per_week"),
    max_percent: num(formData, "max_percent"),
    affected_by_occupancy: formData.get("affected_by_occupancy") === "on",
    notes: (formData.get("notes") as string) || null,
  };
  const { error } = await supabase
    .from("facility_model_roles_revaha")
    .upsert(payload, { onConflict: "facility_model_id,role_id" });
  if (error) return { error: error.message };
  revalidatePath(`/revaha/admin/base-data/models/${modelId}`);
  return { error: null };
}

export async function deleteFacilityModelRole(modelId: string, facilityModelRoleId: string) {
  await requireRevahaAdmin();
  const supabase = await createClient();
  await supabase.from("facility_model_roles_revaha").delete().eq("id", facilityModelRoleId);
  revalidatePath(`/revaha/admin/base-data/models/${modelId}`);
}
