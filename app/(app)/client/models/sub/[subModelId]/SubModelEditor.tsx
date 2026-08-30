"use client";

import { useMemo, useState, useTransition } from "react";
import { BudgetLineItem, MONTHS, SubModel, SubModelMonth } from "@/lib/types";
import { computeSubModelBudget } from "@/lib/calc";
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
  מתכלים: "מתכלים",
  הזנה: "הזנה",
  תקורה: "תקורה",
  הכנסה_משתתף: "הכנסה למשתתף",
  הכנסת_משרד: "הכנסת משרד החינוך",
  השתלמויות: "השתלמויות",
  רכזים_קבוע: "רכזים - סכום קבוע",
};

const ROLE_OPTIONS = ["מוביל", "סייעת", "סייעת_שילוב", "רכז", "אחר"];

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
    set("overhead_pct", item.overhead_pct);
    set("income_monthly_override", item.income_monthly_override);
    set("fixed_monthly_amount", item.fixed_monthly_amount);
    set("notes", item.notes);
    startTransition(() => updateLineItem(item.id, subModelId, fd));
  }

  function updateItemLocal(id: string, patch: Partial<BudgetLineItem>) {
    setLineItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function handleAddItem(itemType: string) {
    startTransition(() => addLineItem(subModelId, clientId, itemType));
  }

  function handleDeleteItem(itemId: string) {
    setLineItems((prev) => prev.filter((i) => i.id !== itemId));
    startTransition(() => deleteLineItem(itemId, subModelId));
  }

  const grouped = [
    "שכר",
    "חוג_העשרה",
    "מתכלים",
    "השתלמויות",
    "רכזים_קבוע",
    "הזנה",
    "תקורה",
    "הכנסה_משתתף",
    "הכנסת_משרד",
  ].map((t) => ({
    type: t,
    items: lineItems.filter((i) => i.item_type === t),
  }));

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">הגדרות מודל משנה</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="כמות משתתפים">
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

      <section className="space-y-6">
        <h2 className="text-lg font-semibold">סעיפי תקציב</h2>
        {grouped.map((g) => (
          <div key={g.type} className="rounded-2xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold">{ITEM_TYPE_LABELS[g.type]}</h3>
              {(g.type === "שכר" || g.type === "חוג_העשרה" || g.type === "השתלמויות" || g.type === "רכזים_קבוע") && (
                <button
                  onClick={() => handleAddItem(g.type)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  + הוספת שורה
                </button>
              )}
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
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">תקציב מחושב — ברמת קבוצה בודדת × {subModel.groups_count || 1} קבוצות</h2>
          <div className="flex items-center gap-2 text-sm">
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
        <ReportTable result={result} cutoffMonth={cutoffMonth} />
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
            {input("hourly_rate", "תעריף לשעה")}
            {input("employer_cost_multiplier", "מכפיל עלות מעביד", "number", "0.001")}
            {input("hours_per_day", "שעות ליום")}
            {input("hours_per_week", "שעות בשבוע (לשיטת שבועות)")}
            <Field label="שיטת חישוב">
              <select
                value={item.calc_method ?? "ימים"}
                onChange={(e) => onChange({ calc_method: e.target.value as BudgetLineItem["calc_method"] })}
                className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
              >
                <option value="ימים">לפי סך ימים</option>
                <option value="שבועות">לפי שבועות</option>
              </select>
            </Field>
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
          </>
        )}
        {item.item_type === "חוג_העשרה" && (
          <>
            {input("weekly_count", "כמות לשבוע")}
            {input("session_cost", "עלות חוג בודד")}
          </>
        )}
        {(item.item_type === "מתכלים" || item.item_type === "השתלמויות") && input("annual_cost", "עלות שנתית")}
        {item.item_type === "רכזים_קבוע" && input("fixed_monthly_amount", "סכום קבוע לחודש")}
        {item.item_type === "הזנה" && input("meal_cost", "עלות מנה")}
        {item.item_type === "תקורה" && input("overhead_pct", "אחוז תקורה", "number", "0.1")}
        {(item.item_type === "הכנסה_משתתף" || item.item_type === "הכנסת_משרד") &&
          input("income_monthly_override", "סכום לחודש למשתתף (ברירת מחדל מבסיס הנתונים אם ריק)")}
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
}: {
  result: ReturnType<typeof computeSubModelBudget>;
  cutoffMonth: number;
}) {
  const visibleMonths = MONTHS.filter((m) => m.month_order <= cutoffMonth);
  const sum = (arr: number[]) => arr.slice(0, cutoffMonth).reduce((s, v) => s + v, 0);

  const rows = [
    ...result.items.map((r) => ({ label: r.item.role_label ?? ITEM_TYPE_LABELS[r.item.item_type], monthly: r.totalMonthly, type: r.item.item_type })),
    { label: "תקורה", monthly: result.overhead.totalMonthly, type: "תקורה" },
  ];

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
            <tr key={r.label + r.type} className="border-b border-border">
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
                {fmt(result.expensesMonthly[m.month_order - 1])}
              </td>
            ))}
            <td className="px-3 py-2 tabular-nums">{fmt(sum(result.expensesMonthly))}</td>
          </tr>
          <tr className="border-b border-border font-semibold text-success">
            <td className="px-3 py-2">סה&quot;כ הכנסות</td>
            {visibleMonths.map((m) => (
              <td key={m.month_order} className="px-3 py-2 tabular-nums">
                {fmt(result.incomeMonthly[m.month_order - 1])}
              </td>
            ))}
            <td className="px-3 py-2 tabular-nums">{fmt(sum(result.incomeMonthly))}</td>
          </tr>
          <tr className="font-bold">
            <td className="px-3 py-2">מאזן נטו</td>
            {visibleMonths.map((m) => (
              <td key={m.month_order} className="px-3 py-2 tabular-nums">
                {fmt(result.netMonthly[m.month_order - 1])}
              </td>
            ))}
            <td className="px-3 py-2 tabular-nums">{fmt(sum(result.netMonthly))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
