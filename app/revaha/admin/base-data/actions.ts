"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRevahaProfile } from "@/lib/revaha/auth";

/** Super-admin, or a reseller company's own admin (not company_staff — this affects the shared, global catalog). */
async function requireRevahaAdmin() {
  const session = await getCurrentRevahaProfile();
  const role = session?.profile?.role;
  if (role !== "admin" && role !== "company_admin") {
    throw new Error("פעולה זו זמינה למנהלי מערכת בלבד");
  }
  return session!;
}

/**
 * New base-data rows created by super-admin go into the shared global catalog (reseller_company_id
 * null, visible to everyone). Rows created by a company_admin are scoped to their own company only —
 * they can freely add/edit their own additions without ever affecting the global baseline or any
 * other company's view.
 */
function resellerScopeForInsert(session: NonNullable<Awaited<ReturnType<typeof getCurrentRevahaProfile>>>) {
  return session.profile?.role === "company_admin" ? session.profile.reseller_company_id : null;
}

function num(formData: FormData, key: string): number | null {
  const raw = formData.get(key) as string;
  if (raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

export async function createRoleType(formData: FormData) {
  const session = await requireRevahaAdmin();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "יש להזין שם" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("role_types_revaha")
    .insert({ name, reseller_company_id: resellerScopeForInsert(session) });
  if (error) return { error: error.message };
  revalidatePath("/revaha/admin/base-data");
  return { error: null };
}

export async function createRole(formData: FormData) {
  const session = await requireRevahaAdmin();
  const name = (formData.get("name") as string)?.trim();
  const role_type_id = formData.get("role_type_id") as string;
  if (!name || !role_type_id) return { error: "יש להזין שם ולבחור סוג תפקיד" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("roles_revaha")
    .insert({ name, role_type_id, reseller_company_id: resellerScopeForInsert(session) });
  if (error) return { error: error.message };
  revalidatePath("/revaha/admin/base-data");
  return { error: null };
}

export async function createIncomeRateCategory(formData: FormData) {
  const session = await requireRevahaAdmin();
  const name = (formData.get("name") as string)?.trim();
  const rate_group = formData.get("rate_group") as string;
  const monthly_amount = num(formData, "monthly_amount") ?? 0;
  if (!name || (rate_group !== "participant" && rate_group !== "rent_reimbursement")) {
    return { error: "יש להזין שם ולבחור סוג תעריף" };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("income_rate_categories_revaha")
    .insert({ name, rate_group, monthly_amount, reseller_company_id: resellerScopeForInsert(session) });
  if (error) return { error: error.message };
  revalidatePath("/revaha/admin/base-data");
  return { error: null };
}

type CatalogTable = "role_types_revaha" | "roles_revaha" | "income_rate_categories_revaha";

/**
 * Super-admin may change any catalog row; a company_admin only the rows their own company added
 * (the global baseline is shared, so it stays read-only for them).
 */
async function assertCanModifyCatalogRow(table: CatalogTable, id: string): Promise<string | null> {
  const session = await requireRevahaAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from(table).select("id, reseller_company_id").eq("id", id).maybeSingle();
  if (!data) return "הפריט לא נמצא";
  if (session.profile?.role === "company_admin" && data.reseller_company_id !== session.profile.reseller_company_id) {
    return "ניתן לערוך או למחוק רק פריטים שנוספו על ידי החברה שלכם";
  }
  return null;
}

async function countRows(table: string, column: string, id: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from(table).select("id", { count: "exact", head: true }).eq(column, id);
  return count ?? 0;
}

export async function updateIncomeRateCategory(id: string, formData: FormData) {
  const denied = await assertCanModifyCatalogRow("income_rate_categories_revaha", id);
  if (denied) return { error: denied };
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "יש להזין שם" };
  const monthly_amount = num(formData, "monthly_amount") ?? 0;
  const supabase = await createClient();
  const { error } = await supabase.from("income_rate_categories_revaha").update({ name, monthly_amount }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/revaha/admin/base-data");
  return { error: null };
}

export async function deleteIncomeRateCategory(id: string) {
  const denied = await assertCanModifyCatalogRow("income_rate_categories_revaha", id);
  if (denied) return { error: denied };
  const supabase = await createClient();
  const [asParticipant, asRent] = await Promise.all([
    countRows("facility_models_revaha", "participant_rate_id", id),
    countRows("facility_models_revaha", "rent_reimbursement_rate_id", id),
  ]);
  if (asParticipant + asRent > 0) {
    return { error: `התעריף משמש ${asParticipant + asRent} מודלים — יש להחליף אותו במודלים לפני המחיקה` };
  }
  const { error } = await supabase.from("income_rate_categories_revaha").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/revaha/admin/base-data");
  return { error: null };
}

export async function updateRoleType(id: string, formData: FormData) {
  const denied = await assertCanModifyCatalogRow("role_types_revaha", id);
  if (denied) return { error: denied };
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "יש להזין שם" };
  const supabase = await createClient();
  const { error } = await supabase.from("role_types_revaha").update({ name }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/revaha/admin/base-data");
  return { error: null };
}

export async function deleteRoleType(id: string) {
  const denied = await assertCanModifyCatalogRow("role_types_revaha", id);
  if (denied) return { error: denied };
  const [roles, rates] = await Promise.all([
    countRows("roles_revaha", "role_type_id", id),
    countRows("staff_role_type_rates_revaha", "role_type_id", id),
  ]);
  if (roles > 0) return { error: `סוג התפקיד כולל ${roles} תפקידים — יש למחוק או להעביר אותם לפני המחיקה` };
  if (rates > 0) return { error: "סוג התפקיד בשימוש בתעריפי עובדים קיימים ולכן לא ניתן למחוק אותו" };
  const supabase = await createClient();
  const { error } = await supabase.from("role_types_revaha").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/revaha/admin/base-data");
  return { error: null };
}

export async function updateRole(id: string, formData: FormData) {
  const denied = await assertCanModifyCatalogRow("roles_revaha", id);
  if (denied) return { error: denied };
  const name = (formData.get("name") as string)?.trim();
  const role_type_id = formData.get("role_type_id") as string;
  if (!name || !role_type_id) return { error: "יש להזין שם ולבחור סוג תפקיד" };
  const supabase = await createClient();
  const { data: current } = await supabase.from("roles_revaha").select("role_type_id").eq("id", id).maybeSingle();
  if (current && current.role_type_id !== role_type_id) {
    const [assignments, modelRoles] = await Promise.all([
      countRows("staff_role_assignments_revaha", "role_id", id),
      countRows("facility_model_roles_revaha", "role_id", id),
    ]);
    if (assignments + modelRoles > 0) {
      return { error: "התפקיד בשימוש (בשיבוצים או במודלים) ולכן לא ניתן להחליף את סוג התפקיד שלו — ניתן לשנות רק את השם" };
    }
  }
  const { error } = await supabase.from("roles_revaha").update({ name, role_type_id }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/revaha/admin/base-data");
  return { error: null };
}

export async function deleteRole(id: string) {
  const denied = await assertCanModifyCatalogRow("roles_revaha", id);
  if (denied) return { error: denied };
  const [assignments, modelRoles] = await Promise.all([
    countRows("staff_role_assignments_revaha", "role_id", id),
    countRows("facility_model_roles_revaha", "role_id", id),
  ]);
  if (assignments > 0) return { error: `התפקיד משובץ ל-${assignments} שיבוצי עובדים — לא ניתן למחוק` };
  if (modelRoles > 0) return { error: `התפקיד נמצא בתקן של ${modelRoles} מודלים — יש להסיר אותו מהמודלים לפני המחיקה` };
  const supabase = await createClient();
  const { error } = await supabase.from("roles_revaha").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/revaha/admin/base-data");
  return { error: null };
}

export async function createFacilityModel(formData: FormData) {
  const session = await requireRevahaAdmin();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "יש להזין שם מודל" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("facility_models_revaha")
    .insert({ name, reseller_company_id: resellerScopeForInsert(session) })
    .select()
    .single();
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
  const { data, error } = await supabase.from("facility_models_revaha").update(payload).eq("id", modelId).select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "השמירה לא בוצעה — אין הרשאה לעדכן מודל זה" };
  revalidatePath(`/revaha/admin/base-data/models/${modelId}`);
  return { error: null };
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
