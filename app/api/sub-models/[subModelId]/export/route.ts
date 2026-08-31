import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeSubModelBudget } from "@/lib/calc";
import { MONTHS } from "@/lib/types";

const ITEM_TYPE_LABELS: Record<string, string> = {
  שכר: "שכר",
  חוג_העשרה: "חוגי העשרה",
  מתכלים: "מתכלים",
  הזנה: "הזנה",
  תקורה: "תקורה",
  הכנסה_משתתף: "הכנסה למשתתף",
  הכנסת_משרד: "הכנסת משרד החינוך",
  השתלמויות: "השתלמויות",
  רכזים_קבוע: "רכזים - סכום קבוע",
};

export async function GET(_request: Request, { params }: { params: Promise<{ subModelId: string }> }) {
  const { subModelId } = await params;
  const supabase = await createClient();

  const { data: subModel } = await supabase.from("sub_models").select("*").eq("id", subModelId).maybeSingle();
  if (!subModel) return NextResponse.json({ error: "not found" }, { status: 404 });

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
    supabase.from("sub_model_months").select("*").eq("sub_model_id", subModelId),
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

  const result = computeSubModelBudget(subModel, months ?? [], yearGeneral ?? [], lineItems ?? [], defaultIncome);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("תקציב", { views: [{ rightToLeft: true }] });

  const header = ["סעיף", ...MONTHS.map((m) => m.label), 'סה"כ'];
  sheet.addRow(header).font = { bold: true };

  const addRow = (label: string, monthly: number[]) => {
    const total = monthly.reduce((s, v) => s + v, 0);
    sheet.addRow([label, ...monthly.map((v) => Math.round(v)), Math.round(total)]);
  };

  for (const r of result.items) {
    const label =
      r.item.item_type === "שכר"
        ? (r.item.role_label ?? ITEM_TYPE_LABELS[r.item.item_type] ?? r.item.item_type) +
          (r.item.camp_period ? " (קייטנה)" : "")
        : ITEM_TYPE_LABELS[r.item.item_type] ?? r.item.item_type;
    addRow(label, r.totalMonthly);
  }
  const totalRow = sheet.addRow(['סה"כ הוצאות', ...result.expensesMonthly.map((v) => Math.round(v)), Math.round(result.expensesAnnual)]);
  totalRow.font = { bold: true };
  const incomeRow = sheet.addRow(['סה"כ הכנסות', ...result.incomeMonthly.map((v) => Math.round(v)), Math.round(result.incomeAnnual)]);
  incomeRow.font = { bold: true };
  const netRow = sheet.addRow(["מאזן נטו", ...result.netMonthly.map((v) => Math.round(v)), Math.round(result.netAnnual)]);
  netRow.font = { bold: true };

  sheet.columns.forEach((col) => (col.width = 14));
  sheet.getColumn(1).width = 28;

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(subModel.name)}-tazkiv.xlsx"`,
    },
  });
}
