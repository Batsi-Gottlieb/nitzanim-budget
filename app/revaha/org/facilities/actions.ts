"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRevahaProfile } from "@/lib/revaha/auth";

function num(formData: FormData, key: string): number | null {
  const raw = formData.get(key) as string;
  if (raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

export async function createFacility(formData: FormData) {
  const session = await getCurrentRevahaProfile();
  const organizationId = session?.profile?.organization_id;
  if (!organizationId) return { error: "חשבון זה אינו משויך לארגון" };

  const supabase = await createClient();
  const { data: facility, error } = await supabase
    .from("facilities_revaha")
    .insert({
      organization_id: organizationId,
      name: formData.get("name") as string,
      facility_model_id: (formData.get("facility_model_id") as string) || null,
      occupancy_actual: num(formData, "occupancy_actual"),
      occupancy_tender: num(formData, "occupancy_tender"),
    })
    .select()
    .single();
  if (error || !facility) return { error: error?.message ?? "יצירת הפנימייה נכשלה" };

  revalidatePath("/revaha/org/facilities");
  return { error: null, id: facility.id as string };
}

export async function updateFacility(facilityId: string, formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("facilities_revaha")
    .update({
      name: formData.get("name") as string,
      facility_model_id: (formData.get("facility_model_id") as string) || null,
      occupancy_actual: num(formData, "occupancy_actual"),
      occupancy_tender: num(formData, "occupancy_tender"),
    })
    .eq("id", facilityId);
  revalidatePath(`/revaha/org/facilities/${facilityId}`);
  revalidatePath("/revaha/org/facilities");
}
