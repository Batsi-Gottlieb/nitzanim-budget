"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MONTHS = [
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

export async function createYear(formData: FormData) {
  const supabase = await createClient();
  const hebrew_name = formData.get("hebrew_name") as string;
  const start_date = formData.get("start_date") as string;
  const end_date = formData.get("end_date") as string;
  const cloneFromYearId = (formData.get("clone_from_year_id") as string) || null;

  const { data: year, error } = await supabase
    .from("years")
    .insert({ hebrew_name, start_date, end_date, is_active: false })
    .select()
    .single();
  if (error || !year) throw new Error(error?.message ?? "יצירת השנה נכשלה");

  await supabase
    .from("year_general_data")
    .insert(MONTHS.map((m) => ({ year_id: year.id, ...m, activity_days: 0, feeding_days: 0 })));

  if (cloneFromYearId) {
    const [{ data: prevGeneral }, { data: prevBaseData }, { data: prevLamas }] = await Promise.all([
      supabase.from("year_general_data").select("*").eq("year_id", cloneFromYearId),
      supabase.from("model_base_data").select("*").eq("year_id", cloneFromYearId),
      supabase.from("model_lamas_income").select("*").eq("year_id", cloneFromYearId),
    ]);

    for (const g of prevGeneral ?? []) {
      await supabase
        .from("year_general_data")
        .update({ activity_days: g.activity_days, feeding_days: g.feeding_days })
        .eq("year_id", year.id)
        .eq("calendar_month", g.calendar_month);
    }

    if (prevBaseData?.length) {
      await supabase.from("model_base_data").insert(
        prevBaseData.map(({ id, year_id, ...rest }) => ({ ...rest, year_id: year.id }))
      );
    }
    if (prevLamas?.length) {
      await supabase.from("model_lamas_income").insert(
        prevLamas.map(({ id, year_id, ...rest }) => ({ ...rest, year_id: year.id }))
      );
    }
  }

  revalidatePath("/admin/years");
}

export async function setActiveYear(yearId: string) {
  const supabase = await createClient();
  await supabase.from("years").update({ is_active: false }).neq("id", yearId);
  await supabase.from("years").update({ is_active: true }).eq("id", yearId);
  revalidatePath("/admin/years");
}
