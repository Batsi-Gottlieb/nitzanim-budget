"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateSubModelSettings(subModelId: string, formData: FormData) {
  const supabase = await createClient();
  const num = (key: string) => Number(formData.get(key) ?? 0);
  await supabase
    .from("sub_models")
    .update({
      avg_weeks_per_month: num("avg_weeks_per_month"),
      active_months_count: num("active_months_count"),
      participants_count: num("participants_count"),
      groups_count: num("groups_count"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", subModelId);
  revalidatePath(`/client/models/sub/${subModelId}`);
}

export async function updateSubModelMonths(subModelId: string, formData: FormData) {
  const supabase = await createClient();
  const rows = JSON.parse(formData.get("rows_json") as string) as {
    calendar_month: number;
    activity_days: number | null;
    feeding_days: number | null;
    short_camp_days: number;
    long_camp_days: number;
    participants_count: number | null;
    groups_count: number | null;
    actual_performance_pct: number | null;
  }[];
  for (const r of rows) {
    await supabase
      .from("sub_model_months")
      .update({
        activity_days: r.activity_days,
        feeding_days: r.feeding_days,
        short_camp_days: r.short_camp_days,
        long_camp_days: r.long_camp_days,
        participants_count: r.participants_count,
        groups_count: r.groups_count,
        actual_performance_pct: r.actual_performance_pct,
      })
      .eq("sub_model_id", subModelId)
      .eq("calendar_month", r.calendar_month);
  }
  revalidatePath(`/client/models/sub/${subModelId}`);
}

export async function addLineItem(subModelId: string, clientId: string, itemType: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("budget_line_items")
    .insert({
      sub_model_id: subModelId,
      client_id: clientId,
      item_type: itemType,
      source: "manual",
      budget_tier: itemType === "הכנסה_משתתף_תוספתי" ? "מורחב" : "בסיסי",
      ...(itemType === "שכר" ? { calc_method: "ימים", spread_method: "לפי_ימים", employer_cost_multiplier: 1.3 } : {}),
    })
    .select()
    .single();
  revalidatePath(`/client/models/sub/${subModelId}`);
  if (error) return { error: error.message, item: null };
  return { error: null, item: data };
}

export async function updateLineItem(itemId: string, subModelId: string, formData: FormData) {
  const supabase = await createClient();
  const num = (key: string) => {
    const v = formData.get(key);
    return v === null || v === "" ? null : Number(v);
  };
  const str = (key: string) => {
    const v = formData.get(key);
    return v === null || v === "" ? null : (v as string);
  };

  const { data: existing } = await supabase
    .from("budget_line_items")
    .select("item_type")
    .eq("id", itemId)
    .maybeSingle();
  const budgetTier = existing?.item_type === "הכנסה_משתתף_תוספתי" ? "מורחב" : str("budget_tier") ?? "בסיסי";

  await supabase
    .from("budget_line_items")
    .update({
      role_label: str("role_label"),
      hourly_rate: num("hourly_rate"),
      employer_cost_multiplier: num("employer_cost_multiplier"),
      hours_per_day: num("hours_per_day"),
      hours_per_week: num("hours_per_week"),
      calc_method: str("calc_method"),
      spread_method: str("spread_method"),
      weekly_count: num("weekly_count"),
      session_cost: num("session_cost"),
      annual_cost: num("annual_cost"),
      meal_cost: num("meal_cost"),
      income_monthly_override: num("income_monthly_override"),
      fixed_monthly_amount: num("fixed_monthly_amount"),
      hours_count: num("hours_count"),
      budget_tier: budgetTier,
      camp_period: str("camp_period"),
      notes: str("notes"),
      source: "manual",
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId);
  revalidatePath(`/client/models/sub/${subModelId}`);
}

export async function deleteLineItem(itemId: string, subModelId: string) {
  const supabase = await createClient();
  await supabase.from("budget_line_items").delete().eq("id", itemId);
  revalidatePath(`/client/models/sub/${subModelId}`);
}
