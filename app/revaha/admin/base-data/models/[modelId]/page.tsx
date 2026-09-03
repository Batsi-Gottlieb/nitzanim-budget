import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ModelDetailForm } from "./ModelDetailForm";
import { ModelRolesTable } from "./ModelRolesTable";

export default async function RevahaFacilityModelDetailPage({ params }: { params: Promise<{ modelId: string }> }) {
  const { modelId } = await params;
  const supabase = await createClient();

  const [{ data: model }, { data: incomeRates }, { data: roles }, { data: requirements }] = await Promise.all([
    supabase.from("facility_models_revaha").select("*").eq("id", modelId).maybeSingle(),
    supabase.from("income_rate_categories_revaha").select("*").order("name"),
    supabase.from("roles_revaha").select("*").order("name"),
    supabase.from("facility_model_roles_revaha").select("*").eq("facility_model_id", modelId),
  ]);

  if (!model) notFound();

  const participantRates = (incomeRates ?? []).filter((r) => r.rate_group === "participant");
  const rentReimbursementRates = (incomeRates ?? []).filter((r) => r.rate_group === "rent_reimbursement");

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/revaha/admin/base-data/models" className="text-xs text-[#7A76A8] hover:text-[#5B4FE8]">
          ← מודלי פנימיות
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-[#2A2560]">{model.name}</h1>
      </div>

      <ModelDetailForm model={model} participantRates={participantRates} rentReimbursementRates={rentReimbursementRates} />
      <ModelRolesTable modelId={modelId} roles={roles ?? []} requirements={requirements ?? []} />
    </div>
  );
}
