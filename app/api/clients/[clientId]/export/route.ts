import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeSubModelBudget, summarizeForReport } from "@/lib/calc";
import { buildClientAnnualReport, type SubModelReportEntry } from "@/lib/excelReport";

export async function GET(_request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase.from("clients").select("*").eq("id", clientId).maybeSingle();
  if (!client) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: activeYear } = await supabase.from("years").select("*").eq("is_active", true).maybeSingle();
  if (!activeYear) return NextResponse.json({ error: "no active year" }, { status: 400 });

  const { data: clientYear } = await supabase
    .from("client_years")
    .select("*")
    .eq("client_id", clientId)
    .eq("year_id", activeYear.id)
    .maybeSingle();
  if (!clientYear) return NextResponse.json({ error: "no data for this year" }, { status: 400 });

  const { data: yearGeneral } = await supabase
    .from("year_general_data")
    .select("*")
    .eq("year_id", activeYear.id)
    .order("month_order");

  const { data: clientModels } = await supabase
    .from("client_models")
    .select("*, models(*)")
    .eq("client_year_id", clientYear.id);

  const clientModelIds = (clientModels ?? []).map((cm) => cm.id);
  const { data: subModels } = clientModelIds.length
    ? await supabase.from("sub_models").select("*").in("client_model_id", clientModelIds)
    : { data: [] };
  const subModelIds = (subModels ?? []).map((sm) => sm.id);

  const [{ data: allMonths }, { data: allLineItems }, { data: lamasRows }] = await Promise.all([
    subModelIds.length
      ? supabase.from("sub_model_months").select("*").in("sub_model_id", subModelIds)
      : Promise.resolve({ data: [] }),
    subModelIds.length
      ? supabase.from("budget_line_items").select("*").in("sub_model_id", subModelIds)
      : Promise.resolve({ data: [] }),
    clientYear.lamas_level
      ? supabase.from("model_lamas_income").select("*").eq("year_id", activeYear.id).eq("lamas_level", clientYear.lamas_level)
      : Promise.resolve({ data: [] }),
  ]);

  const lamasByModel = new Map((lamasRows ?? []).map((r) => [r.model_id, r]));

  const entries: SubModelReportEntry[] = (subModels ?? []).map((sm) => {
    const clientModel = (clientModels ?? []).find((cm) => cm.id === sm.client_model_id)!;
    const model = clientModel.models as unknown as { id: string; name: string; category: "גנים" | "בתי_ספר" };
    const months = (allMonths ?? []).filter((m) => m.sub_model_id === sm.id);
    const items = (allLineItems ?? []).filter((li) => li.sub_model_id === sm.id);
    const lamas = lamasByModel.get(model.id);
    const defaultIncome = lamas
      ? { participant: lamas.participant_income_monthly, ministry: lamas.ministry_income_monthly }
      : null;
    const result = computeSubModelBudget(sm, months, yearGeneral ?? [], items, defaultIncome);
    return {
      name: sm.name,
      modelName: model.name,
      category: model.category,
      summary: summarizeForReport(result),
    };
  });

  const wb = buildClientAnnualReport(client.name, activeYear.hebrew_name, entries);
  const buffer = await wb.xlsx.writeBuffer();

  const filename = `${client.name}-דוח-תקציב-שנתי.xlsx`;
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
