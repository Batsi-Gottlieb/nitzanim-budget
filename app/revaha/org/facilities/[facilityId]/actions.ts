"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function num(formData: FormData, key: string): number | null {
  const raw = formData.get(key) as string;
  if (raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in (value as object)) return String((value as { text: unknown }).text);
  return String(value).trim();
}

function cellNumber(value: ExcelJS.CellValue): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function parseScheduleFromForm(formData: FormData, prefix = "") {
  const method = (formData.get(`${prefix}schedule_method`) as string) || "consolidated";
  if (method === "detailed") {
    const daily_shifts: Record<string, { start: string; end: string }> = {};
    for (let i = 0; i < 7; i++) {
      const start = formData.get(`${prefix}shift_${i}_start`) as string;
      const end = formData.get(`${prefix}shift_${i}_end`) as string;
      if (start && end) daily_shifts[String(i)] = { start, end };
    }
    return { schedule_method: "detailed" as const, weekday_hours: null, weekend_hours: null, daily_shifts };
  }
  return {
    schedule_method: "consolidated" as const,
    weekday_hours: num(formData, `${prefix}weekday_hours`),
    weekend_hours: num(formData, `${prefix}weekend_hours`),
    daily_shifts: null,
  };
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

export async function createStaffWithAssignments(facilityId: string, formData: FormData) {
  const supabase = await createClient();
  const payMode = formData.get("pay_mode") as string;
  const { data: staffRow, error } = await supabase
    .from("staff_revaha")
    .insert({
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
    })
    .select()
    .single();
  if (error) return { error: error.message };

  const roleKeys = ((formData.get("role_keys") as string) || "").split(",").filter(Boolean);
  const assignments = [];
  for (const key of roleKeys) {
    const prefix = `role_${key}_`;
    const roleId = formData.get(`${prefix}id`) as string;
    if (!roleId) continue;
    assignments.push({ staff_id: staffRow.id, role_id: roleId, ...parseScheduleFromForm(formData, prefix) });
  }

  if (assignments.length) {
    const { error: assignError } = await supabase.from("staff_role_assignments_revaha").insert(assignments);
    if (assignError) return { error: assignError.message };
  }

  revalidatePath(`/revaha/org/facilities/${facilityId}`);
  return { error: null };
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
    ...parseScheduleFromForm(formData),
  });
  if (error) return { error: error.message };
  revalidatePath(`/revaha/org/facilities/${facilityId}`);
  return { error: null };
}

export async function updateStaffRoleAssignment(id: string, facilityId: string, formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("staff_role_assignments_revaha")
    .update(parseScheduleFromForm(formData))
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

export async function importStaffFromExcel(facilityId: string, formData: FormData) {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "יש לבחור קובץ אקסל" };

  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as ExcelJS.Buffer);
  } catch {
    return { error: "לא ניתן לקרוא את קובץ האקסל. יש להשתמש בתבנית שסופקה." };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) return { error: "הקובץ ריק" };

  const rows: Record<string, unknown>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header row
    const fullName = cellText(row.getCell(1).value);
    if (!fullName) return;

    const payModeRaw = cellText(row.getCell(2).value);
    const payMode: "hourly" | "monthly" = payModeRaw.includes("חודשי") ? "monthly" : "hourly";
    const employmentTypeRaw = cellText(row.getCell(9).value);
    const trainingFundRaw = cellText(row.getCell(8).value);

    rows.push({
      facility_id: facilityId,
      full_name: fullName,
      pay_mode: payMode,
      hourly_rate: payMode === "hourly" ? cellNumber(row.getCell(3).value) : null,
      monthly_salary: payMode === "monthly" ? cellNumber(row.getCell(4).value) : null,
      monthly_hours: payMode === "monthly" ? cellNumber(row.getCell(5).value) : null,
      monthly_addition: cellNumber(row.getCell(6).value),
      monthly_travel: cellNumber(row.getCell(7).value),
      has_training_fund: trainingFundRaw.includes("כן"),
      employment_type: employmentTypeRaw.includes("עצמאי") ? "עצמאי" : "שכיר",
    });
  });

  if (rows.length === 0) return { error: "לא נמצאו שורות עובדים תקינות בקובץ" };

  const supabase = await createClient();
  const { error } = await supabase.from("staff_revaha").insert(rows);
  if (error) return { error: error.message };

  revalidatePath(`/revaha/org/facilities/${facilityId}`);
  return { error: null, count: rows.length };
}
