import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleTypeDotColor } from "@/lib/revaha/roleTypeColors";

function fmt(n: number | null, digits = 1) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("he-IL", { maximumFractionDigits: digits });
}

export default async function RevahaFacilityModelReadOnlyPage({ params }: { params: Promise<{ modelId: string }> }) {
  const { modelId } = await params;
  const supabase = await createClient();

  const [{ data: model }, { data: incomeRates }, { data: roleTypes }, { data: roles }, { data: requirements }] = await Promise.all([
    supabase.from("facility_models_revaha").select("*").eq("id", modelId).maybeSingle(),
    supabase.from("income_rate_categories_revaha").select("*"),
    supabase.from("role_types_revaha").select("*").order("name"),
    supabase.from("roles_revaha").select("*").order("name"),
    supabase.from("facility_model_roles_revaha").select("*").eq("facility_model_id", modelId),
  ]);

  if (!model) notFound();

  const rateById = new Map((incomeRates ?? []).map((r) => [r.id, r]));
  const participantRate = model.participant_rate_id ? rateById.get(model.participant_rate_id) : undefined;
  const rentReimbursementRate = model.rent_reimbursement_rate_id ? rateById.get(model.rent_reimbursement_rate_id) : undefined;
  const roleTypeIds = (roleTypes ?? []).map((rt) => rt.id);
  const roleTypeNameById = new Map((roleTypes ?? []).map((rt) => [rt.id, rt.name]));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/revaha/org/facility-models" className="text-xs text-slate-500 hover:text-indigo-600">
          ← מודלי פנימיות
        </Link>
        <h1 className="mt-1 text-xl font-black tracking-tight text-slate-900">{model.name}</h1>
        <p className="mt-1 text-xs text-slate-400">תצוגה בלבד — עריכת המודל מתבצעת על ידי מנהל המערכת.</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <h2 className="mb-3 text-sm font-bold text-slate-900">תעריפי הכנסה</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <div className="text-xs text-slate-500">תעריף משתתף</div>
            <div className="mt-1 text-sm font-bold text-slate-900">{participantRate?.name ?? "ללא"}</div>
            {participantRate && <div className="text-xs text-emerald-700">₪{fmt(participantRate.monthly_amount, 0)} לחודש</div>}
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <div className="text-xs text-slate-500">תעריף שיפוי שכ&quot;ד</div>
            <div className="mt-1 text-sm font-bold text-slate-900">{rentReimbursementRate?.name ?? "ללא"}</div>
            {rentReimbursementRate && <div className="text-xs text-emerald-700">₪{fmt(rentReimbursementRate.monthly_amount, 0)} לחודש</div>}
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <div className="text-xs text-slate-500">השתתפות שמירה חודשית</div>
            <div className="mt-1 text-sm font-bold text-emerald-700">₪{fmt(model.security_participation_monthly, 0)}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <div className="text-xs text-slate-500">תעריף בת שירות (מלא)</div>
            <div className="mt-1 text-sm font-bold text-slate-900">₪{fmt(model.bat_sherut_full_rate, 0)}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <div className="text-xs text-slate-500">תעריף בת עמי</div>
            <div className="mt-1 text-sm font-bold text-slate-900">₪{fmt(model.bat_sherut_bat_ami_rate, 0)}</div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <h2 className="mb-1 text-sm font-bold text-slate-900">תקן תפקידים</h2>
        <p className="mb-3 text-xs text-slate-500">כמות תקנים נדרשת לכל תפקיד, ופרמטרי החישוב שלו.</p>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-right text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">תפקיד</th>
                <th className="px-3 py-2">תקנים נדרשים</th>
                <th className="px-3 py-2">שעות חודשי משרה מלאה</th>
                <th className="px-3 py-2">ימי עבודה בחודש</th>
                <th className="px-3 py-2">ימי עבודה בשבוע</th>
                <th className="px-3 py-2">אחוז מקסימלי</th>
                <th className="px-3 py-2">מושפע ממושמים</th>
                <th className="px-3 py-2">הערות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(requirements ?? []).map((req) => {
                const role = (roles ?? []).find((r) => r.id === req.role_id);
                if (!role) return null;
                return (
                  <tr key={req.id}>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1.5 font-medium text-slate-900">
                        <span className={`h-2 w-2 rounded-full ${roleTypeDotColor(role.role_type_id, roleTypeIds)}`} />
                        {role.name}
                        <span className="text-[10px] font-normal text-slate-400">
                          ({roleTypeNameById.get(role.role_type_id) ?? ""})
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{fmt(req.required_positions, 2)}</td>
                    <td className="px-3 py-2 text-slate-600">{fmt(req.monthly_hours_full_time, 1)}</td>
                    <td className="px-3 py-2 text-slate-600">{fmt(req.workdays_per_month, 1)}</td>
                    <td className="px-3 py-2 text-slate-600">{fmt(req.workdays_per_week, 1)}</td>
                    <td className="px-3 py-2 text-slate-600">{req.max_percent !== null ? `${fmt(req.max_percent, 1)}%` : "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{req.affected_by_occupancy ? "כן" : "לא"}</td>
                    <td className="px-3 py-2 text-slate-500">{req.notes ?? "—"}</td>
                  </tr>
                );
              })}
              {(requirements ?? []).length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-sm text-slate-500">
                    אין עדיין תפקידים בתקן המודל
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
