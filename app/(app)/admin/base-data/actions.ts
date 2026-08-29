"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveGeneralData(yearId: string, formData: FormData) {
  const supabase = await createClient();
  const months = JSON.parse(formData.get("months_json") as string) as {
    calendar_month: number;
    activity_days: number;
    feeding_days: number;
  }[];

  for (const m of months) {
    await supabase
      .from("year_general_data")
      .update({ activity_days: m.activity_days, feeding_days: m.feeding_days })
      .eq("year_id", yearId)
      .eq("calendar_month", m.calendar_month);
  }
  revalidatePath("/admin/base-data");
}

export async function createModel(formData: FormData) {
  const supabase = await createClient();
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  await supabase.from("models").insert({ code, name, category });
  revalidatePath("/admin/base-data");
}
