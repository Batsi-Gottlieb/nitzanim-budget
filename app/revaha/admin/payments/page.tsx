import { Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PaymentsSection } from "./PaymentsSection";

export default async function RevahaPaymentsPage() {
  const supabase = await createClient();
  const [{ data: companies }, { data: payments }] = await Promise.all([
    supabase.from("reseller_companies_revaha").select("id, name").order("name"),
    supabase.from("payments_revaha").select("*").order("payment_date", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-2xs">
        <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
          <Wallet className="h-5 w-5 text-indigo-600" />
          תשלומים
        </h1>
        <p className="mt-1 text-sm text-slate-500">מעקב פנימי אחר תשלומים שהתקבלו מחברות המערכת.</p>
      </div>

      <PaymentsSection companies={companies ?? []} payments={payments ?? []} />
    </div>
  );
}
