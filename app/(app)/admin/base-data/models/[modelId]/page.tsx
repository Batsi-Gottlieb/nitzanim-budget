import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ModelBaseDataForm } from "./ModelBaseDataForm";
import { LamasTable } from "./LamasTable";

export default async function ModelDetailPage({ params }: { params: Promise<{ modelId: string }> }) {
  const { modelId } = await params;
  const supabase = await createClient();

  const { data: model } = await supabase.from("models").select("*").eq("id", modelId).maybeSingle();
  if (!model) notFound();

  const { data: activeYear } = await supabase.from("years").select("*").eq("is_active", true).maybeSingle();
  if (!activeYear) {
    return <p className="text-foreground-muted">יש להגדיר שנת פעילות פעילה לפני עריכת נתוני בסיס.</p>;
  }

  const [{ data: baseData }, { data: lamas }] = await Promise.all([
    supabase
      .from("model_base_data")
      .select("*")
      .eq("year_id", activeYear.id)
      .eq("model_id", modelId)
      .maybeSingle(),
    supabase.from("model_lamas_income").select("*").eq("year_id", activeYear.id).eq("model_id", modelId),
  ]);

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          {model.name} <span className="text-base font-normal text-foreground-muted">({model.code})</span>
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          נתוני בסיס לשנת {activeYear.hebrew_name} — {model.category === "גנים" ? "צהרוני גנים" : "צהרוני בתי ספר"}
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">נתוני בסיס</h2>
        <ModelBaseDataForm yearId={activeYear.id} modelId={modelId} initial={baseData ?? {}} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">הכנסות לפי דרג למ&quot;ס</h2>
        <LamasTable yearId={activeYear.id} modelId={modelId} initial={lamas ?? []} />
      </section>
    </div>
  );
}
