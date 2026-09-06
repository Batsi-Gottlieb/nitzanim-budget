"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRevahaProfile } from "@/lib/revaha/auth";

async function requireRevahaAdmin() {
  const session = await getCurrentRevahaProfile();
  if (session?.profile?.role !== "admin") {
    throw new Error("פעולה זו זמינה לסופר-אדמין בלבד");
  }
}

function num(formData: FormData, key: string): number | null {
  const raw = formData.get(key) as string;
  if (raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

export async function createPayment(formData: FormData) {
  await requireRevahaAdmin();
  const reseller_company_id = formData.get("reseller_company_id") as string;
  const amount = num(formData, "amount");
  const payment_date = formData.get("payment_date") as string;
  if (!reseller_company_id || !amount || !payment_date) {
    return { error: "יש לבחור חברה, סכום ותאריך" };
  }
  const card_last4 = ((formData.get("card_last4") as string) || "").replace(/\D/g, "").slice(-4) || null;

  const supabase = await createClient();
  const { error } = await supabase.from("payments_revaha").insert({
    reseller_company_id,
    amount,
    payment_date,
    method: (formData.get("method") as string) || null,
    card_last4,
    reference: (formData.get("reference") as string) || null,
    notes: (formData.get("notes") as string) || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/revaha/admin/payments");
  return { error: null };
}

export async function deletePayment(id: string) {
  await requireRevahaAdmin();
  const supabase = await createClient();
  await supabase.from("payments_revaha").delete().eq("id", id);
  revalidatePath("/revaha/admin/payments");
}
