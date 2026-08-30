import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { computeSubModelBudget } from "@/lib/calc";
import { ReportsTree, type TreeNode } from "./ReportsTree";

export default async function ClientReportsPage() {
  const session = await getCurrentProfile();
  const clientId = session?.profile?.client_id;
  if (!clientId) return <p className="text-foreground-muted">חשבון זה אינו משויך ללקוח.</p>;

  const supabase = await createClient();
  const { data: activeYear } = await supabase.from("years").select("*").eq("is_active", true).maybeSingle();
  if (!activeYear) return <p className="text-foreground-muted">אין שנת פעילות פעילה.</p>;

  const { data: clientYear } = await supabase
    .from("client_years")
    .select("*")
    .eq("client_id", clientId)
    .eq("year_id", activeYear.id)
    .maybeSingle();
  if (!clientYear) return <p className="text-foreground-muted">אין נתונים לשנה זו.</p>;

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

  const zeros10 = () => new Array(10).fill(0);
  const addArr = (a: number[], b: number[]) => a.map((v, i) => v + b[i]);

  const subModelNodes: TreeNode[] = (subModels ?? []).map((sm) => {
    const months = (allMonths ?? []).filter((m) => m.sub_model_id === sm.id);
    const items = (allLineItems ?? []).filter((li) => li.sub_model_id === sm.id);
    const clientModel = (clientModels ?? []).find((cm) => cm.id === sm.client_model_id)!;
    const modelId = (clientModel.models as unknown as { id: string }).id;
    const lamas = lamasByModel.get(modelId);
    const defaultIncome = lamas
      ? { participant: lamas.participant_income_monthly, ministry: lamas.ministry_income_monthly }
      : null;
    const result = computeSubModelBudget(sm, months, yearGeneral ?? [], items, defaultIncome);
    return {
      id: sm.id,
      label: sm.name,
      href: `/client/models/sub/${sm.id}`,
      expensesMonthly: result.expensesMonthly,
      incomeMonthly: result.incomeMonthly,
      children: [],
    };
  });

  const modelNodes: TreeNode[] = (clientModels ?? []).map((cm) => {
    const model = cm.models as unknown as { id: string; name: string; category: string };
    const children = subModelNodes.filter((n) => (subModels ?? []).find((sm) => sm.id === n.id)?.client_model_id === cm.id);
    return {
      id: cm.id,
      label: model.name,
      expensesMonthly: children.reduce((acc, c) => addArr(acc, c.expensesMonthly), zeros10()),
      incomeMonthly: children.reduce((acc, c) => addArr(acc, c.incomeMonthly), zeros10()),
      children,
      category: model.category,
    };
  });

  const categories: { key: "גנים" | "בתי_ספר"; label: string }[] = [
    { key: "גנים", label: "צהרוני גנים" },
    { key: "בתי_ספר", label: "צהרוני בתי ספר" },
  ];

  const categoryNodes: TreeNode[] = categories
    .map((c): TreeNode | null => {
      const children = modelNodes.filter((n) => n.category === c.key);
      if (children.length === 0) return null;
      return {
        id: c.key,
        label: c.label,
        expensesMonthly: children.reduce((acc, ch) => addArr(acc, ch.expensesMonthly), zeros10()),
        incomeMonthly: children.reduce((acc, ch) => addArr(acc, ch.incomeMonthly), zeros10()),
        children,
      };
    })
    .filter((n): n is TreeNode => n !== null);

  const consolidated: TreeNode = {
    id: "consolidated",
    label: "מאוחד — כלל המודלים",
    expensesMonthly: categoryNodes.reduce((acc, c) => addArr(acc, c.expensesMonthly), zeros10()),
    incomeMonthly: categoryNodes.reduce((acc, c) => addArr(acc, c.incomeMonthly), zeros10()),
    children: categoryNodes,
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">דוחות — {activeYear.hebrew_name}</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            תצוגת תקציב לפי חודשים ברמות מודל-משנה ← מודל ← גנים/בתי&quot;ס ← מאוחד, עם אפשרות חתך עד חודש נבחר.
          </p>
        </div>
        <a
          href={`/api/clients/${clientId}/export`}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold hover:bg-surface-muted"
        >
          ייצוא דוח שנתי מלא
        </a>
      </div>
      <ReportsTree root={consolidated} />
    </div>
  );
}
