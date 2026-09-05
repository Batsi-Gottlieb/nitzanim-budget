import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CreateModelForm } from "./CreateModelForm";

export default async function RevahaFacilityModelsPage() {
  const supabase = await createClient();
  const [{ data: models }, { data: requirements }] = await Promise.all([
    supabase.from("facility_models_revaha").select("*").order("name"),
    supabase.from("facility_model_roles_revaha").select("facility_model_id, required_positions, monthly_hours_full_time"),
  ]);

  const hoursByModel = new Map<string, number>();
  for (const r of requirements ?? []) {
    const roleHours = (r.required_positions ?? 0) * (r.monthly_hours_full_time ?? 0);
    hoursByModel.set(r.facility_model_id, (hoursByModel.get(r.facility_model_id) ?? 0) + roleHours);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-2xs">
        <Link href="/revaha/admin/base-data" className="text-xs text-slate-500 hover:text-indigo-600">
          ← בסיס מידע
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
          <LayoutGrid className="h-5 w-5 text-indigo-600" />
          מודלי פנימיות
        </h1>
        <p className="mt-1 text-sm text-slate-500">מודל תקן קובע תעריפי הכנסה ברירת מחדל ותקן תפקידים לפנימייה.</p>
      </div>

      <CreateModelForm />

      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        {(models ?? []).map((m) => {
          const totalHours = hoursByModel.get(m.id) ?? 0;
          return (
            <Link
              key={m.id}
              href={`/revaha/admin/base-data/models/${m.id}`}
              className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
            >
              <span>{m.name}</span>
              {totalHours > 0 && (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {Math.round(totalHours).toLocaleString("he-IL")} שעות חודשיות נדרשות
                </span>
              )}
            </Link>
          );
        })}
        {(models ?? []).length === 0 && <div className="px-4 py-3 text-sm text-slate-500">אין מודלים עדיין</div>}
      </div>
    </div>
  );
}
