"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createSubModel(formData: FormData) {
  const supabase = await createClient();
  const name = formData.get("name") as string;
  const clientModelId = formData.get("client_model_id") as string;
  const clientId = formData.get("client_id") as string;

  const { data: clientModel } = await supabase
    .from("client_models")
    .select("*, client_years(year_id, lamas_level)")
    .eq("id", clientModelId)
    .single();
  const modelId = clientModel.model_id;
  const yearId = (clientModel.client_years as unknown as { year_id: string }).year_id;
  const lamasLevel = (clientModel.client_years as unknown as { lamas_level: number | null }).lamas_level;

  const { data: subModel, error } = await supabase
    .from("sub_models")
    .insert({ client_model_id: clientModelId, client_id: clientId, name })
    .select()
    .single();
  if (error || !subModel) throw new Error(error?.message ?? "יצירת מודל המשנה נכשלה");

  const months = [
    { calendar_month: 9, month_order: 1 },
    { calendar_month: 10, month_order: 2 },
    { calendar_month: 11, month_order: 3 },
    { calendar_month: 12, month_order: 4 },
    { calendar_month: 1, month_order: 5 },
    { calendar_month: 2, month_order: 6 },
    { calendar_month: 3, month_order: 7 },
    { calendar_month: 4, month_order: 8 },
    { calendar_month: 5, month_order: 9 },
    { calendar_month: 6, month_order: 10 },
  ];
  await supabase
    .from("sub_model_months")
    .insert(months.map((m) => ({ sub_model_id: subModel.id, client_id: clientId, ...m })));

  const { data: baseData } = await supabase
    .from("model_base_data")
    .select("*")
    .eq("year_id", yearId)
    .eq("model_id", modelId)
    .maybeSingle();

  const { data: lamasIncome } = lamasLevel
    ? await supabase
        .from("model_lamas_income")
        .select("*")
        .eq("year_id", yearId)
        .eq("model_id", modelId)
        .eq("lamas_level", lamasLevel)
        .maybeSingle()
    : { data: null };

  const wageRows: Record<string, unknown>[] = [];
  if (baseData) {
    const roles = [
      { label: "מוביל", hours: baseData.lead_daily_hours, rate: baseData.lead_hourly_rate },
      { label: "סייעת", hours: baseData.assistant_daily_hours, rate: baseData.assistant_hourly_rate },
      {
        label: "סייעת_שילוב",
        hours: baseData.inclusion_assistant_daily_hours,
        rate: baseData.inclusion_assistant_hourly_rate,
      },
      { label: "רכז", hours: baseData.coordinator_daily_hours, rate: baseData.coordinator_hourly_rate },
    ];
    for (const r of roles) {
      if (!r.hours && !r.rate) continue;
      wageRows.push({
        sub_model_id: subModel.id,
        client_id: clientId,
        item_type: "שכר",
        role_label: r.label,
        hourly_rate: r.rate,
        employer_cost_multiplier: 1.3,
        hours_per_day: r.hours,
        calc_method: "ימים",
        spread_method: "לפי_ימים",
        source: "base_default",
      });
    }
  }

  const otherRows: Record<string, unknown>[] = [
    {
      sub_model_id: subModel.id,
      client_id: clientId,
      item_type: "תקורה",
      annual_cost: (baseData?.overhead_monthly_amount ?? 0) * 10,
      source: "base_default",
    },
    {
      sub_model_id: subModel.id,
      client_id: clientId,
      item_type: "השתלמויות",
      role_label: "מוביל",
      hours_count: baseData?.training_hours ?? 0,
      hourly_rate: baseData?.lead_hourly_rate ?? null,
      employer_cost_multiplier: 1.3,
      source: "base_default",
    },
    {
      sub_model_id: subModel.id,
      client_id: clientId,
      item_type: "הכנסה_משתתף",
      income_monthly_override: lamasIncome?.participant_income_monthly ?? null,
      source: "base_default",
    },
    {
      sub_model_id: subModel.id,
      client_id: clientId,
      item_type: "הכנסת_משרד",
      income_monthly_override: lamasIncome?.ministry_income_monthly ?? null,
      source: "base_default",
    },
  ];

  await supabase.from("budget_line_items").insert([...wageRows, ...otherRows]);

  revalidatePath("/client/models");
  redirect(`/client/models/sub/${subModel.id}`);
}
