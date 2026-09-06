import Link from "next/link";
import { ChevronLeft, Library } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function RevahaFacilityModelsListPage() {
  const supabase = await createClient();

  const [{ data: models }, { data: requirements }] = await Promise.all([
    supabase.from("facility_models_revaha").select("id, name").order("name"),
    supabase.from("facility_model_roles_revaha").select("facility_model_id, required_positions, monthly_hours_full_time"),
  ]);

  const hoursByModel = new Map<string, number>();
  const positionsByModel = new Map<string, number>();
  for (const r of requirements ?? []) {
    const roleHours = (r.required_positions ?? 0) * (r.monthly_hours_full_time ?? 0);
    hoursByModel.set(r.facility_model_id, (hoursByModel.get(r.facility_model_id) ?? 0) + roleHours);
    positionsByModel.set(r.facility_model_id, (positionsByModel.get(r.facility_model_id) ?? 0) + (r.required_positions ?? 0));
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-2xs">
        <h1 className="text-xl font-black tracking-tight text-slate-900">מודלי פנימיות</h1>
        <p className="mt-1 text-sm text-slate-500">
          כלל מודלי התקן המוגדרים במערכת — תעריפי הכנסה, תקני תפקידים ושעות עבודה, כפי שהוגדרו על ידי מנהל המערכת.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="divide-y divide-slate-100">
          {(models ?? []).map((m) => (
            <Link
              key={m.id}
              href={`/revaha/org/facility-models/${m.id}`}
              className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-slate-50/70"
            >
              <div className="flex items-center gap-2.5">
                <Library className="h-4 w-4 text-indigo-600" />
                <span className="font-semibold text-slate-900">{m.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{positionsByModel.get(m.id)?.toFixed(2) ?? 0} תקנים</span>
                <span>{(hoursByModel.get(m.id) ?? 0).toLocaleString("he-IL", { maximumFractionDigits: 0 })} שעות חודשי</span>
                <ChevronLeft className="h-4 w-4 text-slate-300" />
              </div>
            </Link>
          ))}
          {(models ?? []).length === 0 && <div className="px-4 py-3 text-sm text-slate-500">אין עדיין מודלים מוגדרים</div>}
        </div>
      </div>
    </div>
  );
}
