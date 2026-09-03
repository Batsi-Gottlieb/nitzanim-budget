"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function num(formData: FormData, key: string): number | null {
  const raw = formData.get(key) as string;
  if (raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

export async function createStaff(facilityId: string, formData: FormData) {
  const supabase = await createClient();
  const payMode = formData.get("pay_mode") as string;
  const { error } = await supabase.from("staff_revaha").insert({
    facility_id: facilityId,
    full_name: formData.get("full_name") as string,
    pay_mode: payMode,
    hourly_rate: payMode === "hourly" ? num(formData, "hourly_rate") : null,
    monthly_salary: payMode === "monthly" ? num(formData, "monthly_salary") : null,
    monthly_hours: payMode === "monthly" ? num(formData, "monthly_hours") : null,
    monthly_addition: num(formData, "monthly_addition"),
    monthly_travel: num(formData, "monthly_travel"),
    has_training_fund: formData.get("has_training_fund") === "on",
    employment_type: (formData.get("employment_type") as string) || "שכיר",
  });
  if (error) return { error: error.message };
  revalidatePath(`/revaha/org/facilities/${facilityId}`);
  return { error: null };
}

export async function updateStaff(staffId: string, facilityId: string, formData: FormData) {
  const supabase = await createClient();
  const payMode = formData.get("pay_mode") as string;
  await supabase
    .from("staff_revaha")
    .update({
      full_name: formData.get("full_name") as string,
      pay_mode: payMode,
      hourly_rate: payMode === "hourly" ? num(formData, "hourly_rate") : null,
      monthly_salary: payMode === "monthly" ? num(formData, "monthly_salary") : null,
      monthly_hours: payMode === "monthly" ? num(formData, "monthly_hours") : null,
      monthly_addition: num(formData, "monthly_addition"),
      monthly_travel: num(formData, "monthly_travel"),
      has_training_fund: formData.get("has_training_fund") === "on",
      employment_type: (formData.get("employment_type") as string) || "שכיר",
    })
    .eq("id", staffId);
  revalidatePath(`/revaha/org/facilities/${facilityId}`);
}

export async function deleteStaff(staffId: string, facilityId: string) {
  const supabase = await createClient();
  await supabase.from("staff_revaha").delete().eq("id", staffId);
  revalidatePath(`/revaha/org/facilities/${facilityId}`);
}

export async function upsertStaffRoleTypeRate(staffId: string, facilityId: string, formData: FormData) {
  const role_type_id = formData.get("role_type_id") as string;
  const hourly_rate = num(formData, "hourly_rate");
  if (!role_type_id) return { error: "יש לבחור סוג תפקיד" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("staff_role_type_rates_revaha")
    .upsert({ staff_id: staffId, role_type_id, hourly_rate }, { onConflict: "staff_id,role_type_id" });
  if (error) return { error: error.message };
  revalidatePath(`/revaha/org/facilities/${facilityId}`);
  return { error: null };
}

export async function deleteStaffRoleTypeRate(id: string, facilityId: string) {
  const supabase = await createClient();
  await supabase.from("staff_role_type_rates_revaha").delete().eq("id", id);
  revalidatePath(`/revaha/org/facilities/${facilityId}`);
}

export async function createStaffRoleAssignment(facilityId: string, formData: FormData) {
  const staff_id = formData.get("staff_id") as string;
  const role_id = formData.get("role_id") as string;
  if (!staff_id || !role_id) return { error: "יש לבחור עובד ותפקיד" };
  const supabase = await createClient();
  const { error } = await supabase.from("staff_role_assignments_revaha").insert({
    staff_id,
    role_id,
    weekly_hours: num(formData, "weekly_hours"),
  });
  if (error) return { error: error.message };
  revalidatePath(`/revaha/org/facilities/${facilityId}`);
  return { error: null };
}

export async function updateStaffRoleAssignment(id: string, facilityId: string, formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("staff_role_assignments_revaha")
    .update({ weekly_hours: num(formData, "weekly_hours") })
    .eq("id", id);
  revalidatePath(`/revaha/org/facilities/${facilityId}`);
}

export async function deleteStaffRoleAssignment(id: string, facilityId: string) {
  const supabase = await createClient();
  await supabase.from("staff_role_assignments_revaha").delete().eq("id", id);
  revalidatePath(`/revaha/org/facilities/${facilityId}`);
}

export async function createExpenseLineItem(facilityId: string, formData: FormData) {
  const category = (formData.get("category") as string)?.trim();
  if (!category) return { error: "יש להזין קטגוריה" };
  const supabase = await createClient();
  const { error } = await supabase.from("facility_expense_line_items_revaha").insert({
    facility_id: facilityId,
    category,
    monthly_amount: num(formData, "monthly_amount"),
    notes: (formData.get("notes") as string) || null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/revaha/org/facilities/${facilityId}`);
  return { error: null };
}

export async function updateExpenseLineItem(id: string, facilityId: string, formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("facility_expense_line_items_revaha")
    .update({
      category: formData.get("category") as string,
      monthly_amount: num(formData, "monthly_amount"),
      notes: (formData.get("notes") as string) || null,
    })
    .eq("id", id);
  revalidatePath(`/revaha/org/facilities/${facilityId}`);
}

export async function deleteExpenseLineItem(id: string, facilityId: string) {
  const supabase = await createClient();
  await supabase.from("facility_expense_line_items_revaha").delete().eq("id", id);
  revalidatePath(`/revaha/org/facilities/${facilityId}`);
}
