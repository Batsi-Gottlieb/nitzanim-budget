import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ModelDetailForm } from "./ModelDetailForm";
import { ModelRolesTable } from "./ModelRolesTable";
import { ModelPillSelector } from "./ModelPillSelector";

export default async function RevahaFacilityModelDetailPage({ params }: { params: Promise<{ modelId: string }> }) {
  const { modelId } = await params;
  const supabase = await createClient();

  const [{ data: model }, { data: allModels }, { data: incomeRates }, { data: roleTypes }, { data: roles }, { data: requirements }, { data: allRequirements }] =
    await Promise.all([
      supabase.from("facility_models_revaha").select("*").eq("id", modelId).maybeSingle(),
      supabase.from("facility_models_revaha").select("id, name").order("name"),
      supabase.from("income_rate_categories_revaha").select("*").order("name"),
      supabase.from("role_types_revaha").select("*").order("name"),
      supabase.from("roles_revaha").select("*").order("name"),
      supabase.from("facility_model_roles_revaha").select("*").eq("facility_model_id", modelId),
      supabase.from("facility_model_roles_revaha").select("facility_model_id, required_positions, monthly_hours_full_time"),
    ]);

  if (!model) notFound();

  const participantRates = (incomeRates ?? []).filter((r) => r.rate_group === "participant");
  const rentReimbursementRates = (incomeRates ?? []).filter((r) => r.rate_group === "rent_reimbursement");

  const hoursByModel = new Map<string, number>();
  for (const r of allRequirements ?? []) {
    const roleHours = (r.required_positions ?? 0) * (r.monthly_hours_full_time ?? 0);
    hoursByModel.set(r.facility_model_id, (hoursByModel.get(r.facility_model_id) ?? 0) + roleHours);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/revaha/admin/base-data" className="text-xs text-slate-500 hover:text-indigo-600">
          ← בסיס מידע
        </Link>
        <h1 className="mt-1 text-xl font-black tracking-tight text-slate-900">מודלי פנימיות</h1>
      </div>

      <ModelPillSelector
        models={(allModels ?? []).map((m) => ({ ...m, totalHours: hoursByModel.get(m.id) ?? 0 }))}
        activeModelId={modelId}
      />

      <ModelDetailForm model={model} participantRates={participantRates} rentReimbursementRates={rentReimbursementRates} />
      <ModelRolesTable modelId={modelId} roles={roles ?? []} roleTypes={roleTypes ?? []} requirements={requirements ?? []} />
    </div>
  );
}
