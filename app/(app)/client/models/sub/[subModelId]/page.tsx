import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubModelEditor } from "./SubModelEditor";

export default async function SubModelPage({ params }: { params: Promise<{ subModelId: string }> }) {
  const { subModelId } = await params;
  const supabase = await createClient();

  const { data: subModel } = await supabase.from("sub_models").select("*").eq("id", subModelId).maybeSingle();
  if (!subModel) notFound();

  const { data: clientModel } = await supabase
    .from("client_models")
    .select("*, models(*), client_years(year_id, lamas_level)")
    .eq("id", subModel.client_model_id)
    .single();
  const model = clientModel.models as unknown as { id: string; name: string };
  const { year_id: yearId, lamas_level: lamasLevel } = clientModel.client_years as unknown as {
    year_id: string;
    lamas_level: number | null;
  };

  const [{ data: months }, { data: yearGeneral }, { data: lineItems }, { data: lamasIncome }] = await Promise.all([
    supabase.from("sub_model_months").select("*").eq("sub_model_id", subModelId).order("month_order"),
    supabase.from("year_general_data").select("*").eq("year_id", yearId).order("month_order"),
    supabase.from("budget_line_items").select("*").eq("sub_model_id", subModelId),
    lamasLevel
      ? supabase
          .from("model_lamas_income")
          .select("*")
          .eq("year_id", yearId)
          .eq("model_id", model.id)
          .eq("lamas_level", lamasLevel)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const defaultIncome = lamasIncome
    ? { participant: lamasIncome.participant_income_monthly, ministry: lamasIncome.ministry_income_monthly }
    : null;

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{subModel.name}</h1>
        <p className="mt-1 text-sm text-foreground-muted">מודל: {model.name}</p>
      </div>
      <SubModelEditor
        subModelId={subModelId}
        clientId={subModel.client_id}
        subModel={subModel}
        months={months ?? []}
        yearGeneral={yearGeneral ?? []}
        lineItems={lineItems ?? []}
        defaultIncome={defaultIncome}
      />
    </div>
  );
}
