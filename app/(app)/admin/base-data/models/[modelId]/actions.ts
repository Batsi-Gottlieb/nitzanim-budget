"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveModelBaseData(yearId: string, modelId: string, formData: FormData) {
  const supabase = await createClient();
  const num = (key: string) => Number(formData.get(key) ?? 0);

  await supabase.from("model_base_data").upsert(
    {
      year_id: yearId,
      model_id: modelId,
      lead_daily_hours: num("lead_daily_hours"),
      lead_hourly_rate: num("lead_hourly_rate"),
      assistant_daily_hours: num("assistant_daily_hours"),
      assistant_hourly_rate: num("assistant_hourly_rate"),
      inclusion_assistant_daily_hours: num("inclusion_assistant_daily_hours"),
      inclusion_assistant_hourly_rate: num("inclusion_assistant_hourly_rate"),
      coordinator_daily_hours: num("coordinator_daily_hours"),
      coordinator_hourly_rate: num("coordinator_hourly_rate"),
      avg_participants: num("avg_participants"),
      min_clubs: num("min_clubs"),
      max_clubs: num("max_clubs"),
    },
    { onConflict: "year_id,model_id" }
  );
  revalidatePath(`/admin/base-data/models/${modelId}`);
}

export async function saveLamasIncome(yearId: string, modelId: string, formData: FormData) {
  const supabase = await createClient();
  const rows = JSON.parse(formData.get("rows_json") as string) as {
    lamas_level: number;
    participant_income_monthly: number;
    ministry_income_monthly: number;
  }[];

  for (const r of rows) {
    await supabase.from("model_lamas_income").upsert(
      {
        year_id: yearId,
        model_id: modelId,
        lamas_level: r.lamas_level,
        participant_income_monthly: r.participant_income_monthly,
        ministry_income_monthly: r.ministry_income_monthly,
      },
      { onConflict: "year_id,model_id,lamas_level" }
    );
  }
  revalidatePath(`/admin/base-data/models/${modelId}`);
}
