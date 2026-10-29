import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { computeGrade3, computeSubModelBudget, summarizeForReport } from "@/lib/calc";
import { ITEM_TYPE_EXPLANATIONS, ITEM_TYPE_LABELS } from "@/lib/budgetItemExplanations";
import type { BudgetItemType, BudgetLineItem } from "@/lib/types";
import { LetterNotesForm } from "./LetterNotesForm";
import { PrintButton } from "./PrintButton";

/** סדר הצגת סוגי הסעיפים במכתב: שכר ← פעילות ← הזנה ← תקורה ← הכנסות. */
const ITEM_ORDER: BudgetItemType[] = [
  "שכר", "השתלמויות", "רכזים_קבוע", "בונוס", "בונוס_קייטנה", "מענק",
  "חוג_העשרה", "מתכלים", "ערכות", "נקיון", "שיפוי_בעלויות", "פעילות_אחר", "העשרה_קייטנה",
  "הזנה", "הזנה_קייטנה", "כיבוד",
  "תקורה", "תקורה_רשות",
  "הכנסה_משתתף", "הכנסה_משתתף_תוספתי", "הכנסה_משתתף_קייטנה", "הכנסת_משרד", "הכנסת_עירייה",
];

function fmt(n: number) {
  return n.toLocaleString("he-IL", { maximumFractionDigits: 0 });
}

const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0);

function lineDescription(item: BudgetLineItem) {
  const parts: string[] = [];
  if (item.role_label) parts.push(item.role_label.replace(/_/g, " "));
  if (item.camp_period) parts.push(`ימי קייטנה ${item.camp_period === "ארוך" ? "ארוכים" : "קצרים"}`);
  return parts.join(" · ");
}

export default async function BudgetLetterPage() {
  const session = await getCurrentProfile();
  const clientId = session?.profile?.client_id;
  if (!clientId) return <p className="text-foreground-muted">חשבון זה אינו משויך ללקוח.</p>;

  const supabase = await createClient();
  const { data: activeYear } = await supabase.from("years").select("*").eq("is_active", true).maybeSingle();
  if (!activeYear) return <p className="text-foreground-muted">אין שנת פעילות פעילה.</p>;

  const [{ data: client }, { data: clientYear }] = await Promise.all([
    supabase.from("clients").select("id, name").eq("id", clientId).maybeSingle(),
    supabase.from("client_years").select("*").eq("client_id", clientId).eq("year_id", activeYear.id).maybeSingle(),
  ]);
  if (!clientYear) return <p className="text-foreground-muted">אין נתונים לשנה זו.</p>;

  const [{ data: yearGeneral }, { data: clientModels }] = await Promise.all([
    supabase.from("year_general_data").select("*").eq("year_id", activeYear.id).order("month_order"),
    supabase.from("client_models").select("*, models(*)").eq("client_year_id", clientYear.id),
  ]);

  const clientModelIds = (clientModels ?? []).map((cm) => cm.id);
  const { data: subModels } = clientModelIds.length
    ? await supabase.from("sub_models").select("*").in("client_model_id", clientModelIds).order("created_at")
    : { data: [] };
  const subModelIds = (subModels ?? []).map((sm) => sm.id);

  const [{ data: allMonths }, { data: allLineItems }, { data: lamasRows }] = await Promise.all([
    subModelIds.length
      ? supabase.from("sub_model_months").select("*").in("sub_model_id", subModelIds)
      : Promise.resolve({ data: [] }),
    subModelIds.length
      ? supabase.from("budget_line_items").select("*").in("sub_model_id", subModelIds).order("created_at")
      : Promise.resolve({ data: [] }),
    clientYear.lamas_level
      ? supabase.from("model_lamas_income").select("*").eq("year_id", activeYear.id).eq("lamas_level", clientYear.lamas_level)
      : Promise.resolve({ data: [] }),
  ]);
  const lamasByModel = new Map((lamasRows ?? []).map((r) => [r.model_id, r]));

  type Totals = { expenses: number; income: number; balance: number };
  const emptyTotals = (): Totals => ({ expenses: 0, income: 0, balance: 0 });
  const addTotals = (a: Totals, b: Totals): Totals => ({
    expenses: a.expenses + b.expenses,
    income: a.income + b.income,
    balance: a.balance + b.balance,
  });

  const modelBlocks = (clientModels ?? [])
    .map((cm) => {
      const model = cm.models as unknown as { id: string; name: string; category: string };
      const lamas = lamasByModel.get(model.id);
      const defaultIncome = lamas
        ? { participant: lamas.participant_income_monthly, ministry: lamas.ministry_income_monthly }
        : null;
      const subs = (subModels ?? [])
        .filter((sm) => sm.client_model_id === cm.id)
        .map((sm) => {
          const months = (allMonths ?? []).filter((m) => m.sub_model_id === sm.id);
          const items = (allLineItems ?? []).filter((li) => li.sub_model_id === sm.id) as BudgetLineItem[];
          const result = computeSubModelBudget(sm, months, yearGeneral ?? [], items, defaultIncome);
          const totalsFor = (tier: "בסיסי" | "all"): Totals => {
            const s = summarizeForReport(result, { tierFilter: tier });
            return {
              expenses: sum(s.totalCosts.totalMonthly),
              income: sum(s.totalIncome.totalMonthly),
              balance: sum(s.balance.totalMonthly),
            };
          };
          const byType = ITEM_ORDER.map((type) => ({ type, items: items.filter((i) => i.item_type === type) })).filter(
            (g) => g.items.length > 0
          );
          const grade3 = model.category === "בתי_ספר" ? computeGrade3(sm, months, yearGeneral ?? [], items) : null;
          return { sm, byType, basic: totalsFor("בסיסי"), extended: totalsFor("all"), grade3 };
        });
      return {
        model,
        subs,
        basic: subs.reduce((acc, s) => addTotals(acc, s.basic), emptyTotals()),
        extended: subs.reduce((acc, s) => addTotals(acc, s.extended), emptyTotals()),
      };
    })
    .filter((b) => b.subs.length > 0);

  const grade3Total = modelBlocks
    .flatMap((b) => b.subs)
    .reduce(
      (acc, s) =>
        s.grade3 && s.grade3.childrenCount > 0
          ? {
              children: acc.children + s.grade3.childrenCount,
              income: acc.income + s.grade3.income,
              feeding: acc.feeding + s.grade3.feedingExpense,
              surplus: acc.surplus + s.grade3.surplus,
            }
          : acc,
      { children: 0, income: 0, feeding: 0, surplus: 0 }
    );

  const grandBasic = modelBlocks.reduce((acc, b) => addTotals(acc, b.basic), emptyTotals());
  const grandExtended = modelBlocks.reduce((acc, b) => addTotals(acc, b.extended), emptyTotals());

  const intro: string = clientYear.budget_notes_intro ?? "";
  const pointsText: string = clientYear.budget_notes_points ?? "";
  const points = pointsText.split("\n").filter(Boolean);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="no-print space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">מכתב סיכום תקציב — {activeYear.hebrew_name}</h1>
            <p className="mt-1 text-sm text-foreground-muted">
              מכתב הסיכום נבנה אוטומטית מהמודלים והסעיפים שנבחרו. את ההערות הכלליות אפשר לערוך כאן.
            </p>
          </div>
          <PrintButton />
        </div>
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold">הערות כלליות לתקציב</h2>
          <LetterNotesForm clientYearId={clientYear.id} intro={intro} points={pointsText} />
        </section>
      </div>

      <article className="budget-letter rounded-2xl border border-border bg-white p-8 text-[15px] leading-relaxed print:rounded-none print:border-0 print:p-0">
        <h1 className="text-xl font-bold">
          סיכום תקציב מתוכנן לשנת הכספים {activeYear.hebrew_name} — {client?.name ?? ""}
        </h1>

        {(intro || points.length > 0) && (
          <section className="mt-5">
            {intro && <p>{intro}</p>}
            {points.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pr-6">
                {points.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="mt-6">
          <h2 className="mb-3 border-b border-border pb-1 text-base font-bold">סעיפי התקציב לפי מודל</h2>
          {modelBlocks.length === 0 && (
            <p className="text-sm text-foreground-muted">טרם נבנו מודלי משנה לשנה זו.</p>
          )}
          <div className="space-y-6">
            {modelBlocks.map(({ model, subs }) =>
              subs.map(({ sm, byType }) => (
                <div key={sm.id} className="letter-block">
                  <h3 className="font-semibold text-primary">
                    {model.name} — {sm.name}
                  </h3>
                  <p className="text-xs text-foreground-muted">
                    {fmt(sm.groups_count || 1)} קבוצות × {fmt(sm.participants_count)} משתתפים · {sm.active_months_count} חודשי
                    פעילות
                  </p>
                  {byType.length === 0 ? (
                    <p className="mt-2 text-sm text-foreground-muted">לא נבחרו סעיפי תקציב.</p>
                  ) : (
                    <dl className="mt-2 space-y-2.5">
                      {byType.map(({ type, items }) => (
                        <div key={type} className="letter-item">
                          <dt className="font-semibold">{ITEM_TYPE_LABELS[type]}</dt>
                          <dd className="text-sm text-foreground-muted">{ITEM_TYPE_EXPLANATIONS[type]}</dd>
                          {items.some((i) => lineDescription(i) || i.notes || i.budget_tier === "מורחב") && (
                            <dd>
                              <ul className="mt-1 list-disc space-y-0.5 pr-6 text-sm">
                                {items.map((i) => {
                                  const desc = lineDescription(i);
                                  const extended = i.budget_tier === "מורחב" && type !== "הכנסה_משתתף_תוספתי";
                                  if (!desc && !i.notes && !extended) return null;
                                  return (
                                    <li key={i.id}>
                                      {desc}
                                      {desc && i.notes ? " — " : ""}
                                      {i.notes ? <span>הערה: {i.notes}</span> : null}
                                      {extended ? (
                                        <span className="mr-1 rounded bg-surface-muted px-1.5 py-0.5 text-[11px] font-medium">
                                          הרחבה
                                        </span>
                                      ) : null}
                                    </li>
                                  );
                                })}
                              </ul>
                            </dd>
                          )}
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {modelBlocks.length > 0 && (
          <section className="letter-block mt-8">
            <h2 className="mb-3 border-b border-border pb-1 text-base font-bold">
              סיכום תקציב כולל מאוחד — תקציב בסיסי ותקציב מורחב (שנתי)
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-muted text-right">
                  <th className="px-2 py-1.5 font-semibold" rowSpan={2}>
                    מודל
                  </th>
                  <th className="border-r border-border px-2 py-1.5 text-center font-semibold" colSpan={3}>
                    תקציב בסיסי
                  </th>
                  <th className="border-r border-border px-2 py-1.5 text-center font-semibold" colSpan={3}>
                    תקציב מורחב (כולל הרחבות)
                  </th>
                </tr>
                <tr className="bg-surface-muted text-right text-xs">
                  {["הוצאות", "הכנסות", "יתרה", "הוצאות", "הכנסות", "יתרה"].map((h, i) => (
                    <th key={i} className={`px-2 py-1 font-medium ${i % 3 === 0 ? "border-r border-border" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modelBlocks.map(({ model, basic, extended }) => (
                  <tr key={model.id} className="border-b border-border">
                    <td className="px-2 py-1.5">{model.name}</td>
                    {[basic.expenses, basic.income, basic.balance, extended.expenses, extended.income, extended.balance].map(
                      (v, i) => (
                        <td key={i} className={`px-2 py-1.5 tabular-nums ${i % 3 === 0 ? "border-r border-border" : ""}`}>
                          {fmt(v)}
                        </td>
                      )
                    )}
                  </tr>
                ))}
                <tr className="bg-surface-muted font-bold">
                  <td className="px-2 py-1.5">סה&quot;כ מאוחד</td>
                  {[
                    grandBasic.expenses,
                    grandBasic.income,
                    grandBasic.balance,
                    grandExtended.expenses,
                    grandExtended.income,
                    grandExtended.balance,
                  ].map((v, i) => (
                    <td key={i} className={`px-2 py-1.5 tabular-nums ${i % 3 === 0 ? "border-r border-border" : ""}`}>
                      {fmt(v)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-xs text-foreground-muted">
              הסכומים בש&quot;ח לשנת הכספים כולה. התקציב הבסיסי כולל את הסעיפים שסומנו כבסיסיים בלבד; התקציב המורחב כולל גם את
              סעיפי ההרחבה.
            </p>
          </section>
        )}

        {grade3Total.children > 0 && (
          <section className="letter-block mt-6">
            <h2 className="mb-2 border-b border-border pb-1 text-base font-bold">
              ילדי כיתה ג&apos; — תרומה שנתית מחוץ לתקציב
            </h2>
            <p className="text-sm text-foreground-muted">
              ילדי כיתה ג&apos; הם משתתפים תוספתיים שאינם שייכים לפרויקט הרשמי, ולכן אינם נכללים בטבלה שלמעלה. הנתונים להלן
              הם חישוב פשטני לידיעה בלבד.
            </p>
            <table className="mt-2 w-full text-sm">
              <tbody>
                <tr className="border-b border-border">
                  <td className="px-2 py-1.5">כמות ילדי ג&apos;</td>
                  <td className="px-2 py-1.5 tabular-nums">{fmt(grade3Total.children)}</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-2 py-1.5">הכנסה לילדי כיתה ג&apos;</td>
                  <td className="px-2 py-1.5 tabular-nums">{fmt(grade3Total.income)}</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-2 py-1.5">הוצאות הזנה לילדי ג&apos;</td>
                  <td className="px-2 py-1.5 tabular-nums">{fmt(grade3Total.feeding)}</td>
                </tr>
                <tr className="bg-surface-muted font-bold">
                  <td className="px-2 py-1.5">עודף מילדי ג&apos;</td>
                  <td className="px-2 py-1.5 tabular-nums">{fmt(grade3Total.surplus)}</td>
                </tr>
              </tbody>
            </table>
          </section>
        )}
      </article>
    </div>
  );
}
