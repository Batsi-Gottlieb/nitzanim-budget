"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveBudgetNotes(clientYearId: string, formData: FormData) {
  const supabase = await createClient();
  const intro = ((formData.get("intro") as string) ?? "").trim() || null;
  const points = ((formData.get("points") as string) ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n") || null;

  const { data, error } = await supabase
    .from("client_years")
    .update({ budget_notes_intro: intro, budget_notes_points: points })
    .eq("id", clientYearId)
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "השמירה לא בוצעה — אין הרשאה לעדכן את ההערות" };

  revalidatePath("/client/letter");
  return { error: null };
}
