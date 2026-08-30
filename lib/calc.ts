import { BudgetLineItem, SubModel, SubModelMonth } from "./types";

export type ResolvedMonth = {
  month_order: number;
  calendar_month: number;
  activity_days: number;
  feeding_days: number;
};

const MONTH_COUNT = 10;

function zeros(): number[] {
  return new Array(MONTH_COUNT).fill(0);
}

export function resolveMonths(
  subModelMonths: SubModelMonth[],
  yearGeneral: { month_order: number; calendar_month: number; activity_days: number; feeding_days: number }[]
): ResolvedMonth[] {
  const byOrder = new Map(subModelMonths.map((m) => [m.month_order, m]));
  return yearGeneral
    .slice()
    .sort((a, b) => a.month_order - b.month_order)
    .map((g) => {
      const override = byOrder.get(g.month_order);
      return {
        month_order: g.month_order,
        calendar_month: g.calendar_month,
        activity_days: override?.activity_days ?? g.activity_days,
        feeding_days: override?.feeding_days ?? g.feeding_days,
      };
    });
}

function activeMonthIndexes(months: ResolvedMonth[]): number[] {
  return months
    .map((m, i) => ({ i, active: m.activity_days > 0 }))
    .filter((x) => x.active)
    .map((x) => x.i);
}

function spreadWage(
  item: BudgetLineItem,
  months: ResolvedMonth[],
  activeMonthsCount: number,
  avgWeeksPerMonth: number
): { annual: number; monthly: number[] } {
  const rate = item.hourly_rate ?? 0;
  const multiplier = item.employer_cost_multiplier ?? 1;
  const active = activeMonthIndexes(months);
  const totalDays = months.reduce((s, m) => s + m.activity_days, 0);
  const numActiveMonths = activeMonthsCount || active.length || 1;

  let annual: number;
  if (item.calc_method === "שבועות") {
    const weeklyHours = item.hours_per_week ?? (item.hours_per_day ?? 0) * 5;
    annual = rate * multiplier * weeklyHours * avgWeeksPerMonth * numActiveMonths;
  } else {
    const hoursPerDay = item.hours_per_day ?? 0;
    annual = rate * multiplier * hoursPerDay * totalDays;
  }

  const monthly = zeros();
  if (item.spread_method === "לפי_ימים" && totalDays > 0) {
    months.forEach((m, i) => {
      monthly[i] = annual * (m.activity_days / totalDays);
    });
  } else {
    const perMonth = numActiveMonths > 0 ? annual / numActiveMonths : 0;
    active.slice(0, numActiveMonths).forEach((i) => {
      monthly[i] = perMonth;
    });
  }
  return { annual, monthly };
}

export type LineItemResult = {
  item: BudgetLineItem;
  perGroupMonthly: number[];
  perGroupAnnual: number;
  totalMonthly: number[];
  totalAnnual: number;
};

export type SubModelBudgetResult = {
  items: LineItemResult[];
  overhead: LineItemResult;
  expensesMonthly: number[];
  expensesAnnual: number;
  incomeMonthly: number[];
  incomeAnnual: number;
  netMonthly: number[];
  netAnnual: number;
};

export function computeSubModelBudget(
  subModel: SubModel,
  subModelMonths: SubModelMonth[],
  yearGeneral: { month_order: number; calendar_month: number; activity_days: number; feeding_days: number }[],
  lineItems: BudgetLineItem[],
  defaultIncome: { participant: number; ministry: number } | null
): SubModelBudgetResult {
  const months = resolveMonths(subModelMonths, yearGeneral);
  const groups = subModel.groups_count || 1;

  const results: LineItemResult[] = [];
  const wageEnrichConsumMonthly = zeros();

  for (const item of lineItems) {
    let perGroupMonthly = zeros();
    let perGroupAnnual = 0;

    if (item.item_type === "שכר") {
      const { annual, monthly } = spreadWage(
        item,
        months,
        subModel.active_months_count,
        subModel.avg_weeks_per_month || 0
      );
      perGroupAnnual = annual;
      perGroupMonthly = monthly;
      monthly.forEach((v, i) => (wageEnrichConsumMonthly[i] += v));
    } else if (item.item_type === "חוג_העשרה") {
      const weeklyCost = (item.weekly_count ?? 0) * (item.session_cost ?? 0);
      const active = activeMonthIndexes(months);
      const numActive = subModel.active_months_count || active.length || 1;
      const monthlyAmount = weeklyCost * (subModel.avg_weeks_per_month || 0);
      active.slice(0, numActive).forEach((i) => (perGroupMonthly[i] = monthlyAmount));
      perGroupAnnual = monthlyAmount * numActive;
      perGroupMonthly.forEach((v, i) => (wageEnrichConsumMonthly[i] += v));
    } else if (item.item_type === "מתכלים" || item.item_type === "השתלמויות") {
      const active = activeMonthIndexes(months);
      const numActive = subModel.active_months_count || active.length || 1;
      const monthlyAmount = (item.annual_cost ?? 0) / numActive;
      active.slice(0, numActive).forEach((i) => (perGroupMonthly[i] = monthlyAmount));
      perGroupAnnual = item.annual_cost ?? 0;
      perGroupMonthly.forEach((v, i) => (wageEnrichConsumMonthly[i] += v));
    } else if (item.item_type === "רכזים_קבוע") {
      const active = activeMonthIndexes(months);
      const numActive = subModel.active_months_count || active.length || 1;
      const monthlyAmount = item.fixed_monthly_amount ?? 0;
      active.slice(0, numActive).forEach((i) => (perGroupMonthly[i] = monthlyAmount));
      perGroupAnnual = monthlyAmount * numActive;
      perGroupMonthly.forEach((v, i) => (wageEnrichConsumMonthly[i] += v));
    } else if (item.item_type === "הזנה") {
      months.forEach((m, i) => {
        perGroupMonthly[i] = (item.meal_cost ?? 0) * (subModel.participants_count || 0) * m.feeding_days;
      });
      perGroupAnnual = perGroupMonthly.reduce((s, v) => s + v, 0);
    } else if (item.item_type === "הכנסה_משתתף" || item.item_type === "הכנסת_משרד") {
      const fallback =
        item.item_type === "הכנסה_משתתף" ? defaultIncome?.participant ?? 0 : defaultIncome?.ministry ?? 0;
      const perMonthAmount = (item.income_monthly_override ?? fallback) * (subModel.participants_count || 0);
      const active = activeMonthIndexes(months);
      const numActive = subModel.active_months_count || active.length || 1;
      active.slice(0, numActive).forEach((i) => (perGroupMonthly[i] = perMonthAmount));
      perGroupAnnual = perMonthAmount * numActive;
    }
    // תקורה rows are computed once, in aggregate, after the loop — skipped here even if present in the array.
    if (item.item_type === "תקורה") continue;

    results.push({
      item,
      perGroupMonthly,
      perGroupAnnual,
      totalMonthly: perGroupMonthly.map((v) => v * groups),
      totalAnnual: perGroupAnnual * groups,
    });
  }

  const overheadPct = lineItems.find((i) => i.item_type === "תקורה")?.overhead_pct ?? 10;
  const overheadPerGroupMonthly = wageEnrichConsumMonthly.map((v) => (v * overheadPct) / 100);
  const overheadPerGroupAnnual = overheadPerGroupMonthly.reduce((s, v) => s + v, 0);
  const overheadItem: LineItemResult = {
    item:
      lineItems.find((i) => i.item_type === "תקורה") ??
      ({ item_type: "תקורה", overhead_pct: overheadPct } as BudgetLineItem),
    perGroupMonthly: overheadPerGroupMonthly,
    perGroupAnnual: overheadPerGroupAnnual,
    totalMonthly: overheadPerGroupMonthly.map((v) => v * groups),
    totalAnnual: overheadPerGroupAnnual * groups,
  };

  const expenseTypes = new Set(["שכר", "חוג_העשרה", "מתכלים", "הזנה", "השתלמויות", "רכזים_קבוע"]);
  const incomeTypes = new Set(["הכנסה_משתתף", "הכנסת_משרד"]);

  const expensesMonthly = zeros();
  const incomeMonthly = zeros();
  for (const r of results) {
    if (expenseTypes.has(r.item.item_type)) r.totalMonthly.forEach((v, i) => (expensesMonthly[i] += v));
    if (incomeTypes.has(r.item.item_type)) r.totalMonthly.forEach((v, i) => (incomeMonthly[i] += v));
  }
  overheadItem.totalMonthly.forEach((v, i) => (expensesMonthly[i] += v));

  const netMonthly = expensesMonthly.map((_, i) => incomeMonthly[i] - expensesMonthly[i]);

  return {
    items: results,
    overhead: overheadItem,
    expensesMonthly,
    expensesAnnual: expensesMonthly.reduce((s, v) => s + v, 0),
    incomeMonthly,
    incomeAnnual: incomeMonthly.reduce((s, v) => s + v, 0),
    netMonthly,
    netAnnual: netMonthly.reduce((s, v) => s + v, 0),
  };
}

/** Slice a 10-month breakdown to a "budget as of month N" cut (1..10, inclusive from the start of the year). */
export function cutToMonth(monthly: number[], uptoMonthOrder: number): number[] {
  return monthly.map((v, i) => (i + 1 <= uptoMonthOrder ? v : 0));
}

export type ReportRow = { label: string; perGroupMonthly: number[]; totalMonthly: number[] };

const REPORT_ROW_DEFS: { label: string; match: (r: LineItemResult) => boolean }[] = [
  { label: 'סה"כ עלויות מובילה', match: (r) => r.item.item_type === "שכר" && r.item.role_label === "מוביל" },
  { label: 'סה"כ עלויות סייעת', match: (r) => r.item.item_type === "שכר" && r.item.role_label === "סייעת" },
  { label: "השתלמויות", match: (r) => r.item.item_type === "השתלמויות" },
  { label: "רכזים לבעלויות", match: (r) => r.item.item_type === "שכר" && r.item.role_label === "רכז" },
  { label: 'סה"כ עלות רכזים לחודש', match: (r) => r.item.item_type === "רכזים_קבוע" },
  { label: "סייעות שילוב", match: (r) => r.item.item_type === "שכר" && r.item.role_label === "סייעת_שילוב" },
  {
    label: "שכר אחר",
    match: (r) =>
      r.item.item_type === "שכר" && !["מוביל", "סייעת", "רכז", "סייעת_שילוב"].includes(r.item.role_label ?? ""),
  },
  { label: "העשרה", match: (r) => r.item.item_type === "חוג_העשרה" },
  { label: "ציוד מתכלה", match: (r) => r.item.item_type === "מתכלים" },
];

/**
 * Categorizes a sub-model's computed line items into the office's fixed report
 * row structure (one row per role/category, matching the reference workbook),
 * summing multiple line items of the same category into a single row.
 */
export function summarizeForReport(result: SubModelBudgetResult): {
  costRows: ReportRow[];
  subtotalBeforeFeedingOverhead: ReportRow;
  feeding: ReportRow;
  overhead: ReportRow;
  totalCosts: ReportRow;
  participantIncome: ReportRow;
  ministryIncome: ReportRow;
  totalIncome: ReportRow;
  balance: ReportRow;
} {
  const zero = () => new Array(MONTH_COUNT).fill(0);
  const add = (a: number[], b: number[]) => a.map((v, i) => v + b[i]);

  const costRows: ReportRow[] = REPORT_ROW_DEFS.map((def) => {
    const matching = result.items.filter(def.match);
    return {
      label: def.label,
      perGroupMonthly: matching.reduce((acc, r) => add(acc, r.perGroupMonthly), zero()),
      totalMonthly: matching.reduce((acc, r) => add(acc, r.totalMonthly), zero()),
    };
  }).filter((row) => row.totalMonthly.some((v) => v !== 0));

  const subtotalBeforeFeedingOverhead: ReportRow = {
    label: 'סה"כ עלויות לפני הזנה ותקורה',
    perGroupMonthly: costRows.reduce((acc, r) => add(acc, r.perGroupMonthly), zero()),
    totalMonthly: costRows.reduce((acc, r) => add(acc, r.totalMonthly), zero()),
  };

  const feedingItems = result.items.filter((r) => r.item.item_type === "הזנה");
  const feeding: ReportRow = {
    label: "הזנה",
    perGroupMonthly: feedingItems.reduce((acc, r) => add(acc, r.perGroupMonthly), zero()),
    totalMonthly: feedingItems.reduce((acc, r) => add(acc, r.totalMonthly), zero()),
  };

  const overhead: ReportRow = {
    label: "תקורה",
    perGroupMonthly: result.overhead.perGroupMonthly,
    totalMonthly: result.overhead.totalMonthly,
  };

  const totalCosts: ReportRow = {
    label: 'סה"כ עלויות',
    perGroupMonthly: add(add(subtotalBeforeFeedingOverhead.perGroupMonthly, feeding.perGroupMonthly), overhead.perGroupMonthly),
    totalMonthly: add(add(subtotalBeforeFeedingOverhead.totalMonthly, feeding.totalMonthly), overhead.totalMonthly),
  };

  const participantItems = result.items.filter((r) => r.item.item_type === "הכנסה_משתתף");
  const ministryItems = result.items.filter((r) => r.item.item_type === "הכנסת_משרד");
  const participantIncome: ReportRow = {
    label: "הכנסות משתתפים",
    perGroupMonthly: participantItems.reduce((acc, r) => add(acc, r.perGroupMonthly), zero()),
    totalMonthly: participantItems.reduce((acc, r) => add(acc, r.totalMonthly), zero()),
  };
  const ministryIncome: ReportRow = {
    label: "הכנסות משרד החינוך",
    perGroupMonthly: ministryItems.reduce((acc, r) => add(acc, r.perGroupMonthly), zero()),
    totalMonthly: ministryItems.reduce((acc, r) => add(acc, r.totalMonthly), zero()),
  };
  const totalIncome: ReportRow = {
    label: 'סה"כ הכנסות',
    perGroupMonthly: add(participantIncome.perGroupMonthly, ministryIncome.perGroupMonthly),
    totalMonthly: add(participantIncome.totalMonthly, ministryIncome.totalMonthly),
  };

  const balance: ReportRow = {
    label: "יתרה",
    perGroupMonthly: totalIncome.perGroupMonthly.map((v, i) => v - totalCosts.perGroupMonthly[i]),
    totalMonthly: totalIncome.totalMonthly.map((v, i) => v - totalCosts.totalMonthly[i]),
  };

  return {
    costRows,
    subtotalBeforeFeedingOverhead,
    feeding,
    overhead,
    totalCosts,
    participantIncome,
    ministryIncome,
    totalIncome,
    balance,
  };
}
