"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SCHEDULE_METHOD_LABELS } from "@/lib/revaha/types";

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

/** Reads a time-of-day cell as "HH:MM", whatever shape Excel handed it back as (text, a Date the way exceljs decodes Excel's time serials, or a raw numeric day-fraction). */
function cellTimeString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined || value === "") return "";
  if (value instanceof Date) {
    const h = String(value.getUTCHours()).padStart(2, "0");
    const m = String(value.getUTCMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
  if (typeof value === "number") {
    const totalMinutes = Math.round(value * 24 * 60);
    const h = String(Math.floor(totalMinutes / 60) % 24).padStart(2, "0");
    const m = String(totalMinutes % 60).padStart(2, "0");
    return `${h}:${m}`;
  }
  const text = cellText(value);
  return /^\d{1,2}:\d{2}$/.test(text) ? text : "";
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

function parsePayFromForm(formData: FormData, prefix = "") {
  const pay_mode = (formData.get(`${prefix}pay_mode`) as string) === "monthly" ? "monthly" : "hourly";
  return {
    pay_mode,
    hourly_rate: pay_mode === "hourly" ? num(formData, `${prefix}hourly_rate`) : null,
    monthly_salary: pay_mode === "monthly" ? num(formData, `${prefix}monthly_salary`) : null,
    monthly_hours: pay_mode === "monthly" ? num(formData, `${prefix}monthly_hours`) : null,
  };
}

export async function updateStaff(staffId: string, facilityId: string, formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("staff_revaha")
    .update({
      full_name: formData.get("full_name") as string,
      phone: (formData.get("phone") as string) || null,
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
  const { data: staffRow, error } = await supabase
    .from("staff_revaha")
    .insert({
      facility_id: facilityId,
      full_name: formData.get("full_name") as string,
      phone: (formData.get("phone") as string) || null,
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
    assignments.push({
      staff_id: staffRow.id,
      role_id: roleId,
      ...parsePayFromForm(formData, prefix),
      ...parseScheduleFromForm(formData, prefix),
    });
  }

  if (assignments.length) {
    const { error: assignError } = await supabase.from("staff_role_assignments_revaha").insert(assignments);
    if (assignError) return { error: assignError.message };
  }

  revalidatePath(`/revaha/org/facilities/${facilityId}`);
  return { error: null };
}

export async function createStaffRoleAssignment(facilityId: string, formData: FormData) {
  const staff_id = formData.get("staff_id") as string;
  const role_id = formData.get("role_id") as string;
  if (!staff_id || !role_id) return { error: "יש לבחור עובד ותפקיד" };
  const supabase = await createClient();
  const { error } = await supabase.from("staff_role_assignments_revaha").insert({
    staff_id,
    role_id,
    ...parsePayFromForm(formData),
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
    .update({ ...parsePayFromForm(formData), ...parseScheduleFromForm(formData) })
    .eq("id", id);
  revalidatePath(`/revaha/org/facilities/${facilityId}`);
}

export async function deleteStaffRoleAssignment(id: string, facilityId: string) {
  const supabase = await createClient();
  await supabase.from("staff_role_assignments_revaha").delete().eq("id", id);
  revalidatePath(`/revaha/org/facilities/${facilityId}`);
}

/**
 * Bulk delete from the staff+role table: role assignments are removed outright, but a staff
 * identity is never cascade-deleted just because all its roles were selected — the employee's
 * contact info stays as a "no role" row until someone explicitly removes the person via `deleteStaff`.
 */
export async function deleteStaffRoleAssignments(
  assignmentIds: string[],
  staffIdsWithNoRole: string[],
  facilityId: string
) {
  const supabase = await createClient();
  if (assignmentIds.length) {
    await supabase.from("staff_role_assignments_revaha").delete().in("id", assignmentIds);
  }
  if (staffIdsWithNoRole.length) {
    await supabase.from("staff_revaha").delete().in("id", staffIdsWithNoRole);
  }
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

type ImportRow = {
  fullName: string;
  phone: string;
  roleName: string;
  pay_mode: "hourly" | "monthly";
  hourly_rate: number | null;
  monthly_salary: number | null;
  monthly_hours: number | null;
  scheduleMethodLabel: string;
  daily_shifts: Record<string, { start: string; end: string }>;
  weekday_hours: number | null;
  weekend_hours: number | null;
  monthly_addition: number | null;
  monthly_travel: number | null;
  has_training_fund: boolean;
  employment_type: "שכיר" | "עצמאי";
  weekends_per_month: number | null;
};

const DAY_GRID_START_COL = 9; // columns 9..22: 7 days * (start,end)

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

  const rows: ImportRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header row
    const fullName = cellText(row.getCell(1).value);
    if (!fullName) return;

    const payModeRaw = cellText(row.getCell(4).value);
    const pay_mode: "hourly" | "monthly" = payModeRaw.includes("חודשי") ? "monthly" : "hourly";
    const scheduleMethodLabel = cellText(row.getCell(8).value);
    const isDetailed = scheduleMethodLabel === SCHEDULE_METHOD_LABELS.detailed;

    const daily_shifts: Record<string, { start: string; end: string }> = {};
    if (isDetailed) {
      for (let i = 0; i < 7; i++) {
        const start = cellTimeString(row.getCell(DAY_GRID_START_COL + i * 2).value);
        const end = cellTimeString(row.getCell(DAY_GRID_START_COL + i * 2 + 1).value);
        if (start && end) daily_shifts[String(i)] = { start, end };
      }
    }

    const employmentTypeRaw = cellText(row.getCell(28).value);
    const trainingFundRaw = cellText(row.getCell(27).value);

    rows.push({
      fullName,
      phone: cellText(row.getCell(2).value),
      roleName: cellText(row.getCell(3).value),
      pay_mode,
      hourly_rate: pay_mode === "hourly" ? cellNumber(row.getCell(5).value) : null,
      monthly_salary: pay_mode === "monthly" ? cellNumber(row.getCell(6).value) : null,
      monthly_hours: pay_mode === "monthly" ? cellNumber(row.getCell(7).value) : null,
      scheduleMethodLabel,
      daily_shifts,
      weekday_hours: isDetailed ? null : cellNumber(row.getCell(23).value),
      weekend_hours: isDetailed ? null : cellNumber(row.getCell(24).value),
      monthly_addition: cellNumber(row.getCell(25).value),
      monthly_travel: cellNumber(row.getCell(26).value),
      has_training_fund: trainingFundRaw.includes("כן"),
      employment_type: employmentTypeRaw.includes("עצמאי") ? "עצמאי" : "שכיר",
      weekends_per_month: cellNumber(row.getCell(29).value),
    });
  });

  if (rows.length === 0) return { error: "לא נמצאו שורות עובדים תקינות בקובץ" };

  const supabase = await createClient();
  const warnings: string[] = [];

  const weekendsPerMonth = rows.find((r) => r.weekends_per_month !== null)?.weekends_per_month ?? null;
  if (weekendsPerMonth !== null) {
    await supabase
      .from("facilities_revaha")
      .update({ weekends_per_month: weekendsPerMonth })
      .eq("id", facilityId);
  }

  const { data: roles } = await supabase.from("roles_revaha").select("id, name");
  const roleIdByName = new Map((roles ?? []).map((r) => [r.name.trim(), r.id as string]));

  const groups = new Map<string, ImportRow[]>();
  for (const row of rows) {
    const key = row.fullName.trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const staffInserts = Array.from(groups.entries()).map(([fullName, groupRows]) => ({
    facility_id: facilityId,
    full_name: fullName,
    phone: groupRows.find((r) => r.phone)?.phone || null,
    monthly_addition: groupRows.find((r) => r.monthly_addition !== null)?.monthly_addition ?? null,
    monthly_travel: groupRows.find((r) => r.monthly_travel !== null)?.monthly_travel ?? null,
    has_training_fund: groupRows.some((r) => r.has_training_fund),
    employment_type: groupRows.find((r) => r.employment_type === "עצמאי")?.employment_type ?? "שכיר",
  }));

  const { data: insertedStaff, error: staffError } = await supabase
    .from("staff_revaha")
    .insert(staffInserts)
    .select("id, full_name");
  if (staffError) return { error: staffError.message };

  const staffIdByName = new Map((insertedStaff ?? []).map((s) => [s.full_name.trim(), s.id as string]));

  const assignmentInserts = [];
  for (const [fullName, groupRows] of groups) {
    const staffId = staffIdByName.get(fullName);
    if (!staffId) continue;
    for (const row of groupRows) {
      if (!row.roleName) continue;
      const roleId = roleIdByName.get(row.roleName.trim());
      if (!roleId) {
        warnings.push(`${fullName}: תפקיד "${row.roleName}" לא נמצא ברשימת התפקידים`);
        continue;
      }
      assignmentInserts.push({
        staff_id: staffId,
        role_id: roleId,
        pay_mode: row.pay_mode,
        hourly_rate: row.hourly_rate,
        monthly_salary: row.monthly_salary,
        monthly_hours: row.monthly_hours,
        schedule_method: row.scheduleMethodLabel === SCHEDULE_METHOD_LABELS.detailed ? "detailed" : "consolidated",
        weekday_hours: row.weekday_hours,
        weekend_hours: row.weekend_hours,
        daily_shifts: Object.keys(row.daily_shifts).length ? row.daily_shifts : null,
      });
    }
  }

  if (assignmentInserts.length) {
    const { error: assignError } = await supabase.from("staff_role_assignments_revaha").insert(assignmentInserts);
    if (assignError) return { error: assignError.message };
  }

  revalidatePath(`/revaha/org/facilities/${facilityId}`);
  return { error: null, count: staffInserts.length, warnings };
}
