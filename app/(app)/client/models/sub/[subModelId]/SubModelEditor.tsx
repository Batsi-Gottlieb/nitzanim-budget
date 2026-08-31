"use client";

import { useMemo, useState, useTransition } from "react";
import { BudgetLineItem, MONTHS, SubModel, SubModelMonth } from "@/lib/types";
import { computeSubModelBudget, summarizeForReport } from "@/lib/calc";
import {
  addLineItem,
  deleteLineItem,
  updateLineItem,
  updateSubModelMonths,
  updateSubModelSettings,
} from "./actions";

type YearGeneralRow = { calendar_month: number; month_order: number; activity_days: number; feeding_days: number };

const ITEM_TYPE_LABELS: Record<string, string> = {
  שכר: "שכר",
  חוג_העשרה: "חוגי העשרה",
  מתכלים: "ציוד מתכלה",
  הזנה: "הזנה",
  תקורה: "תקורה",
  הכנסה_משתתף: "הכנסה למשתתף",
  הכנסת_משרד: "הכנסת משרד החינוך",
  השתלמויות: "השתלמויות",
  רכזים_קבוע: "רכזים - סכום קבוע",
  בונוס: "בונוס",
  בונוס_קייטנה: "בונוס קייטנה",
  מענק: "מענק",
  ערכות: "ערכות",
  נקיון: "ניקיון",
  שיפוי_בעלויות: "שיפוי בעלויות",
  פעילות_אחר: "פעילות - אחר",
  העשרה_קייטנה: "העשרה קייטנה",
  הזנה_קייטנה: "הזנה קייטנה",
  כיבוד: "כיבוד",
  תקורה_רשות: "תקורה רשות",
  הכנסה_משתתף_תוספתי: "הכנסת משתתפים תוספתי",
  הכנסה_משתתף_קייטנה: "הכנסת משתתפים קייטנה",
  הכנסת_עירייה: "הכנסת עירייה השלמה",
};

const CATEGORY_GROUPS: { category: string; types: string[] }[] = [
  { category: "שכר", types: ["שכר", "השתלמויות", "רכזים_קבוע", "בונוס", "בונוס_קייטנה", "מענק"] },
  { category: "פעילות", types: ["חוג_העשרה", "מתכלים", "ערכות", "נקיון", "שיפוי_בעלויות", "פעילות_אחר", "העשרה_קייטנה"] },
  { category: "הזנה", types: ["הזנה", "הזנה_קייטנה", "כיבוד"] },
  { category: "תקורה", types: ["תקורה", "תקורה_רשות"] },
  {
    category: "הכנסות",
    types: ["הכנסה_משתתף", "הכנסה_משתתף_תוספתי", "הכנסה_משתתף_קייטנה", "הכנסת_משרד", "הכנסת_עירייה"],
  },
];

const ROLE_OPTIONS = ["מוביל", "סייעת", "סייעת_שניה", "סייעת_שילוב", "רכז", "אחר"];
const BUDGET_TIER_OPTIONS = ["בסיסי", "מורחב"];
const CAMP_UNIT_LABELS: Record<string, { unit: string; count: string }> = {
  העשרה_קייטנה: { unit: "עלות פעילות העשרה ליום קייטנה", count: "כמות פעילויות העשרה ליום קייטנה ממוצע" },
  הזנה_קייטנה: { unit: "עלות מנה ליום קייטנה", count: "כמות מנות ליום קייטנה ממוצע" },
};
const CAMP_UNIT_ITEM_TYPES = Object.keys(CAMP_UNIT_LABELS);
const FLAT_ANNUAL_ITEM_TYPES = [
  "מתכלים",
  "תקורה",
  "ערכות",
  "נקיון",
  "שיפוי_בעלויות",
  "פעילות_אחר",
  "כיבוד",
  "בונוס",
  "מענק",
  "תקורה_רשות",
];

function fmt(n: number) {
  return n.toLocaleString("he-IL", { maximumFractionDigits: 0 });
}

export function SubModelEditor({
  subModelId,
  clientId,
  subModel: initialSubModel,
  months: initialMonths,
  yearGeneral,
  lineItems: initialLineItems,
  defaultIncome,
}: {
  subModelId: string;
  clientId: string;
  subModel: SubModel;
  months: SubModelMonth[];
  yearGeneral: YearGeneralRow[];
  lineItems: BudgetLineItem[];
  defaultIncome: { participant: number; ministry: number } | null;
}) {
  const [subModel, setSubModel] = useState(initialSubModel);
  const [months, setMonths] = useState(initialMonths);
  const [lineItems, setLineItems] = useState(initialLineItems);
  const [isPending, startTransition] = useTransition();
  const [cutoffMonth, setCutoffMonth] = useState(10);
  const [tierFilter, setTierFilter] = useState<"בסיסי" | "all">("all");

  const result = useMemo(
    () => computeSubModelBudget(subModel, months, yearGeneral, lineItems, defaultIncome),
    [subModel, months, yearGeneral, lineItems, defaultIncome]
  );

  function saveSettings() {
    const fd = new FormData();
    fd.set("avg_weeks_per_month", String(subModel.avg_weeks_per_month));
    fd.set("active_months_count", String(subModel.active_months_count));
    fd.set("participants_count", String(subModel.participants_count));
    fd.set("groups_count", String(subModel.groups_count));
    startTransition(() => updateSubModelSettings(subModelId, fd));
  }

  function saveMonths() {
    const fd = new FormData();
    fd.set(
      "rows_json",
      JSON.stringify(
        months.map((m) => ({
          calendar_month: m.calendar_month,
          activity_days: m.activity_days,
          feeding_days: m.feeding_days,
          short_camp_days: m.short_camp_days,
          long_camp_days: m.long_camp_days,
          participants_count: m.participants_count,
          groups_count: m.groups_count,
          actual_performance_pct: m.actual_performance_pct,
        }))
      )
    );
    startTransition(() => updateSubModelMonths(subModelId, fd));
  }

  function saveLineItem(item: BudgetLineItem) {
    const fd = new FormData();
    const set = (k: string, v: unknown) => fd.set(k, v === null || v === undefined ? "" : String(v));
    set("role_label", item.role_label);
    set("hourly_rate", item.hourly_rate);
    set("employer_cost_multiplier", item.employer_cost_multiplier);
    set("hours_per_day", item.hours_per_day);
    set("hours_per_week", item.hours_per_week);
    set("calc_method", item.calc_method);
    set("spread_method", item.spread_method);
    set("weekly_count", item.weekly_count);
    set("session_cost", item.session_cost);
    set("annual_cost", item.annual_cost);
    set("meal_cost", item.meal_cost);
    set("income_monthly_override", item.income_monthly_override);
    set("fixed_monthly_amount", item.fixed_monthly_amount);
    set("hours_count", item.hours_count);
    set("budget_tier", item.budget_tier);
    set("camp_period", item.camp_period);
    set("notes", item.notes);
    startTransition(() => updateLineItem(item.id, subModelId, fd));
  }

  function updateItemLocal(id: string, patch: Partial<BudgetLineItem>) {
    setLineItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function handleAddItem(itemType: string) {
    startTransition(async () => {
      const result = await addLineItem(subModelId, clientId, itemType);
      if (result.item) {
        setLineItems((prev) => [...prev, result.item as BudgetLineItem]);
      }
    });
  }

  function handleDeleteItem(itemId: string) {
    setLineItems((prev) => prev.filter((i) => i.id !== itemId));
    startTransition(() => deleteLineItem(itemId, subModelId));
  }

  const categoryGroups = CATEGORY_GROUPS.map((cat) => ({
    category: cat.category,
    groups: cat.types.map((t) => ({
      type: t,
      items: lineItems.filter((i) => i.item_type === t),
    })),
  }));

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">הגדרות מודל משנה</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="כמות משתתפים ממוצעת לקבוצה">
            <input
              type="number"
              value={subModel.participants_count}
              onChange={(e) => setSubModel({ ...subModel, participants_count: Number(e.target.value) })}
              className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
            />
          </Field>
          <Field label="כמות קבוצות">
            <input
              type="number"
              value={subModel.groups_count}
              onChange={(e) => setSubModel({ ...subModel, groups_count: Number(e.target.value) })}
              className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
            />
          </Field>
          <Field label="סך כמות משתתפים">
            <div className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm tabular-nums">
              {fmt(subModel.participants_count * subModel.groups_count)}
            </div>
          </Field>
          <Field label="ממוצע שבועות לחודש">
            <input
              type="number"
              step="0.01"
              value={subModel.avg_weeks_per_month}
              onChange={(e) => setSubModel({ ...subModel, avg_weeks_per_month: Number(e.target.value) })}
              className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
            />
          </Field>
          <Field label="כמות חודשי פעילות">
            <input
              type="number"
              value={subModel.active_months_count}
              onChange={(e) => setSubModel({ ...subModel, active_months_count: Number(e.target.value) })}
              className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
            />
          </Field>
        </div>
        <button
          onClick={saveSettings}
          disabled={isPending}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        >
          שמירת הגדרות
        </button>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <div className="p-4">
          <h2 className="text-sm font-semibold">ימי פעילות / הזנה / קייטנות לפי חודש</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-border bg-surface-muted text-right">
              <th className="px-3 py-2 font-semibold">חודש</th>
              <th className="px-3 py-2 font-semibold">ימי פעילות</th>
              <th className="px-3 py-2 font-semibold">אחוז ביצוע בפועל</th>
              <th className="px-3 py-2 font-semibold">כמות משתתפים</th>
              <th className="px-3 py-2 font-semibold">כמות קבוצות</th>
              <th className="px-3 py-2 font-semibold">ימי הזנה</th>
              <th className="px-3 py-2 font-semibold">קייטנה קצרה</th>
              <th className="px-3 py-2 font-semibold">קייטנה ארוכה</th>
            </tr>
          </thead>
          <tbody>
            {MONTHS.map((m) => {
              const row = months.find((r) => r.calendar_month === m.calendar_month)!;
              const yg = yearGeneral.find((g) => g.calendar_month === m.calendar_month);
              return (
                <tr key={m.calendar_month} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-medium">{m.label}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      placeholder={String(yg?.activity_days ?? 0)}
                      value={row.activity_days ?? ""}
                      onChange={(e) =>
                        setMonths((prev) =>
                          prev.map((r) =>
                            r.calendar_month === m.calendar_month
                              ? { ...r, activity_days: e.target.value === "" ? null : Number(e.target.value) }
                              : r
                          )
                        )
                      }
                      className="w-20 rounded-md border border-border px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      placeholder="100"
                      value={row.actual_performance_pct ?? ""}
                      onChange={(e) =>
                        setMonths((prev) =>
                          prev.map((r) =>
                            r.calendar_month === m.calendar_month
                              ? { ...r, actual_performance_pct: e.target.value === "" ? null : Number(e.target.value) }
                              : r
                          )
                        )
                      }
                      className="w-20 rounded-md border border-border px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      placeholder={String(subModel.participants_count)}
                      value={row.participants_count ?? ""}
                      onChange={(e) =>
                        setMonths((prev) =>
                          prev.map((r) =>
                            r.calendar_month === m.calendar_month
                              ? { ...r, participants_count: e.target.value === "" ? null : Number(e.target.value) }
                              : r
                          )
                        )
                      }
                      className="w-20 rounded-md border border-border px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      placeholder={String(subModel.groups_count)}
                      value={row.groups_count ?? ""}
                      onChange={(e) =>
                        setMonths((prev) =>
                          prev.map((r) =>
                            r.calendar_month === m.calendar_month
                              ? { ...r, groups_count: e.target.value === "" ? null : Number(e.target.value) }
                              : r
                          )
                        )
                      }
                      className="w-20 rounded-md border border-border px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      placeholder={String(yg?.feeding_days ?? 0)}
                      value={row.feeding_days ?? ""}
                      onChange={(e) =>
                        setMonths((prev) =>
                          prev.map((r) =>
                            r.calendar_month === m.calendar_month
                              ? { ...r, feeding_days: e.target.value === "" ? null : Number(e.target.value) }
                              : r
                          )
                        )
                      }
                      className="w-20 rounded-md border border-border px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={row.short_camp_days ?? 0}
                      onChange={(e) =>
                        setMonths((prev) =>
                          prev.map((r) =>
                            r.calendar_month === m.calendar_month
                              ? { ...r, short_camp_days: Number(e.target.value) }
                              : r
                          )
                        )
                      }
                      className="w-20 rounded-md border border-border px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={row.long_camp_days ?? 0}
                      onChange={(e) =>
                        setMonths((prev) =>
                          prev.map((r) =>
                            r.calendar_month === m.calendar_month
                              ? { ...r, long_camp_days: Number(e.target.value) }
                              : r
                          )
                        )
                      }
                      className="w-20 rounded-md border border-border px-2 py-1"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-surface-muted font-semibold">
              <td className="px-3 py-2">סה&quot;כ</td>
              <td className="px-3 py-2 tabular-nums">
                {MONTHS.reduce((s, m) => {
                  const row = months.find((r) => r.calendar_month === m.calendar_month)!;
                  const yg = yearGeneral.find((g) => g.calendar_month === m.calendar_month);
                  return s + (row.activity_days ?? yg?.activity_days ?? 0);
                }, 0)}
              </td>
              <td />
              <td />
              <td />
              <td className="px-3 py-2 tabular-nums">
                {MONTHS.reduce((s, m) => {
                  const row = months.find((r) => r.calendar_month === m.calendar_month)!;
                  const yg = yearGeneral.find((g) => g.calendar_month === m.calendar_month);
                  return s + (row.feeding_days ?? yg?.feeding_days ?? 0);
                }, 0)}
              </td>
              <td className="px-3 py-2 tabular-nums">
                {months.reduce((s, r) => s + (r.short_camp_days ?? 0), 0)}
              </td>
              <td className="px-3 py-2 tabular-nums">
                {months.reduce((s, r) => s + (r.long_camp_days ?? 0), 0)}
              </td>
            </tr>
          </tfoot>
        </table>
        <div className="border-t border-border p-4">
          <button
            onClick={saveMonths}
            disabled={isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            שמירת חודשים
          </button>
        </div>
      </section>

      <section className="space-y-8">
        <h2 className="text-lg font-semibold">סעיפי תקציב</h2>
        {categoryGroups.map((cat) => (
          <div key={cat.category} className="space-y-4">
            <h3 className="text-base font-bold text-primary">{cat.category}</h3>
            {cat.groups.map((g) => (
              <div key={g.type} className="rounded-2xl border border-border bg-surface p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-bold">{ITEM_TYPE_LABELS[g.type]}</h4>
                  <button
                    onClick={() => handleAddItem(g.type)}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    + הוספת שורה
                  </button>
                </div>
                <div className="space-y-3">
                  {g.items.map((item) => (
                    <LineItemRow
                      key={item.id}
                      item={item}
                      onChange={(patch) => updateItemLocal(item.id, patch)}
                      onSave={() => saveLineItem(lineItems.find((i) => i.id === item.id)!)}
                      onDelete={() => handleDeleteItem(item.id)}
                    />
                  ))}
                  {g.items.length === 0 && <p className="text-xs text-foreground-muted">אין שורות מסוג זה</p>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">תקציב מחושב — ברמת קבוצה בודדת × {subModel.groups_count || 1} קבוצות</h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <label className="text-foreground-muted">הצגה:</label>
              <div className="flex overflow-hidden rounded-md border border-border">
                <button
                  onClick={() => setTierFilter("בסיסי")}
                  className={`px-3 py-1 text-xs font-semibold ${
                    tierFilter === "בסיסי" ? "bg-primary text-primary-foreground" : "hover:bg-surface-muted"
                  }`}
                >
                  בסיס בלבד
                </button>
                <button
                  onClick={() => setTierFilter("all")}
                  className={`px-3 py-1 text-xs font-semibold ${
                    tierFilter === "all" ? "bg-primary text-primary-foreground" : "hover:bg-surface-muted"
                  }`}
                >
                  כולל מורחב
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-foreground-muted">חתך עד חודש:</label>
              <select
                value={cutoffMonth}
                onChange={(e) => setCutoffMonth(Number(e.target.value))}
                className="rounded-md border border-border px-2 py-1"
              >
                {MONTHS.map((m) => (
                  <option key={m.month_order} value={m.month_order}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <ReportTable result={result} cutoffMonth={cutoffMonth} tierFilter={tierFilter} />
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-foreground-muted">{label}</label>
      {children}
    </div>
  );
}

function LineItemRow({
  item,
  onChange,
  onSave,
  onDelete,
}: {
  item: BudgetLineItem;
  onChange: (patch: Partial<BudgetLineItem>) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const input = (key: keyof BudgetLineItem, label: string, type: "number" | "text" = "number", step = "0.01") => (
    <Field label={label}>
      <input
        type={type}
        step={type === "number" ? step : undefined}
        value={(item[key] as string | number) ?? ""}
        onChange={(e) => onChange({ [key]: type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value } as Partial<BudgetLineItem>)}
        className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
      />
    </Field>
  );

  return (
    <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {item.item_type === "שכר" && (
          <>
            <Field label="תפקיד">
              <select
                value={item.role_label ?? ""}
                onChange={(e) => onChange({ role_label: e.target.value })}
                className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="סוג יום (קייטנה)">
              <select
                value={item.camp_period ?? ""}
                onChange={(e) => onChange({ camp_period: (e.target.value || null) as BudgetLineItem["camp_period"] })}
                className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
              >
                <option value="">לא קייטנה</option>
                <option value="ארוך">ימים ארוכים</option>
                <option value="קצר">ימים קצרים</option>
              </select>
            </Field>
            {input("hourly_rate", "תעריף לשעה")}
            {input("employer_cost_multiplier", "מכפיל עלות מעביד", "number", "0.001")}
            {input("hours_per_day", "שעות ליום")}
            {!item.camp_period && (
              <Field label="פריסה חודשית">
                <select
                  value={item.spread_method ?? "לפי_ימים"}
                  onChange={(e) => onChange({ spread_method: e.target.value as BudgetLineItem["spread_method"] })}
                  className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
                >
                  <option value="לפי_ימים">לפי ימים</option>
                  <option value="לפי_חודשי_פעילות">לפי חודשי פעילות</option>
                </select>
              </Field>
            )}
          </>
        )}
        {item.item_type === "חוג_העשרה" && (
          <>
            {input("weekly_count", "כמות לשבוע")}
            {input("session_cost", "עלות חוג בודד")}
          </>
        )}
        {FLAT_ANNUAL_ITEM_TYPES.includes(item.item_type) &&
          item.item_type !== "תקורה" &&
          input("annual_cost", "עלות שנתית")}
        {CAMP_UNIT_ITEM_TYPES.includes(item.item_type) && (
          <>
            {input("session_cost", CAMP_UNIT_LABELS[item.item_type].unit)}
            {input("weekly_count", CAMP_UNIT_LABELS[item.item_type].count)}
            <Field label="סיכום — ערך יום קייטנה ממוצע">
              <div className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm tabular-nums">
                {fmt((item.session_cost ?? 0) * (item.weekly_count ?? 0))}
              </div>
            </Field>
          </>
        )}
        {item.item_type === "בונוס_קייטנה" && input("session_cost", "בונוס ליום קייטנה")}
        {item.item_type === "השתלמויות" && (
          <>
            <Field label="תפקיד">
              <select
                value={item.role_label ?? ""}
                onChange={(e) => onChange({ role_label: e.target.value })}
                className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            {input("hours_count", "כמות שעות הכשרה")}
            {input("hourly_rate", "תעריף לשעה")}
            {input("employer_cost_multiplier", "מכפיל עלות מעביד", "number", "0.001")}
          </>
        )}
        {item.item_type === "רכזים_קבוע" && input("fixed_monthly_amount", "סכום קבוע לחודש")}
        {item.item_type === "הזנה" && input("meal_cost", "עלות מנה")}
        {item.item_type === "תקורה" && input("annual_cost", "עלות תקורה שנתית")}
        {(
          [
            "הכנסה_משתתף",
            "הכנסה_משתתף_תוספתי",
            "הכנסה_משתתף_קייטנה",
            "הכנסת_משרד",
            "הכנסת_עירייה",
          ] as string[]
        ).includes(item.item_type) &&
          input("income_monthly_override", "סכום לחודש למשתתף (ברירת מחדל מבסיס הנתונים אם ריק)")}
        <Field label="תקציב בסיסי / מורחב">
          <select
            value={item.budget_tier}
            disabled={item.item_type === "הכנסה_משתתף_תוספתי"}
            onChange={(e) => onChange({ budget_tier: e.target.value as BudgetLineItem["budget_tier"] })}
            className="w-full rounded-md border border-border px-2 py-1.5 text-sm disabled:opacity-60"
          >
            {BUDGET_TIER_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="mt-2">
        <Field label="הערה">
          <input
            type="text"
            value={item.notes ?? ""}
            onChange={(e) => onChange({ notes: e.target.value || null })}
            className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
          />
        </Field>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <button onClick={onSave} className="text-xs font-semibold text-primary hover:underline">
          שמירה
        </button>
        <button onClick={onDelete} className="text-xs font-semibold text-danger hover:underline">
          מחיקה
        </button>
        {item.source === "base_default" && (
          <span className="text-[11px] text-foreground-muted">ברירת מחדל מבסיס הנתונים</span>
        )}
      </div>
    </div>
  );
}

function ReportTable({
  result,
  cutoffMonth,
  tierFilter,
}: {
  result: ReturnType<typeof computeSubModelBudget>;
  cutoffMonth: number;
  tierFilter: "בסיסי" | "all";
}) {
  const visibleMonths = MONTHS.filter((m) => m.month_order <= cutoffMonth);
  const sum = (arr: number[]) => arr.slice(0, cutoffMonth).reduce((s, v) => s + v, 0);

  const summary = summarizeForReport(result, { tierFilter });
  const costRows = [...summary.costRows, summary.feeding, summary.overhead].filter((r) =>
    r.totalMonthly.some((v) => v !== 0)
  );
  const incomeRows = [summary.participantIncome, summary.ministryIncome, ...summary.incomeRows].filter((r) =>
    r.totalMonthly.some((v) => v !== 0)
  );
  const rows = costRows.map((r) => ({ label: r.label, monthly: r.totalMonthly }));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted text-right">
            <th className="px-3 py-2 font-semibold">סעיף</th>
            {visibleMonths.map((m) => (
              <th key={m.month_order} className="px-3 py-2 font-semibold">
                {m.label}
              </th>
            ))}
            <th className="px-3 py-2 font-semibold">סה&quot;כ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-border">
              <td className="px-3 py-2">{r.label}</td>
              {visibleMonths.map((m) => (
                <td key={m.month_order} className="px-3 py-2 tabular-nums">
                  {fmt(r.monthly[m.month_order - 1])}
                </td>
              ))}
              <td className="px-3 py-2 font-semibold tabular-nums">{fmt(sum(r.monthly))}</td>
            </tr>
          ))}
          <tr className="border-b border-border bg-surface-muted font-semibold">
            <td className="px-3 py-2">סה&quot;כ הוצאות</td>
            {visibleMonths.map((m) => (
              <td key={m.month_order} className="px-3 py-2 tabular-nums">
                {fmt(summary.totalCosts.totalMonthly[m.month_order - 1])}
              </td>
            ))}
            <td className="px-3 py-2 tabular-nums">{fmt(sum(summary.totalCosts.totalMonthly))}</td>
          </tr>
          {incomeRows.map((r) => (
            <tr key={r.label} className="border-b border-border">
              <td className="px-3 py-2">{r.label}</td>
              {visibleMonths.map((m) => (
                <td key={m.month_order} className="px-3 py-2 tabular-nums">
                  {fmt(r.totalMonthly[m.month_order - 1])}
                </td>
              ))}
              <td className="px-3 py-2 font-semibold tabular-nums">{fmt(sum(r.totalMonthly))}</td>
            </tr>
          ))}
          <tr className="border-b border-border font-semibold text-success">
            <td className="px-3 py-2">סה&quot;כ הכנסות</td>
            {visibleMonths.map((m) => (
              <td key={m.month_order} className="px-3 py-2 tabular-nums">
                {fmt(summary.totalIncome.totalMonthly[m.month_order - 1])}
              </td>
            ))}
            <td className="px-3 py-2 tabular-nums">{fmt(sum(summary.totalIncome.totalMonthly))}</td>
          </tr>
          <tr className="font-bold">
            <td className="px-3 py-2">מאזן נטו</td>
            {visibleMonths.map((m) => (
              <td key={m.month_order} className="px-3 py-2 tabular-nums">
                {fmt(summary.balance.totalMonthly[m.month_order - 1])}
              </td>
            ))}
            <td className="px-3 py-2 tabular-nums">{fmt(sum(summary.balance.totalMonthly))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
