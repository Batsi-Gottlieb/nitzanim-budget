import { ProfitLossSummary } from "@/lib/revaha/calc";

function fmtMoney(n: number) {
  return n.toLocaleString("he-IL", { maximumFractionDigits: 0 });
}

function Row({
  label,
  monthly,
  annual,
  bold,
  accent,
  sub,
}: {
  label: string;
  monthly: number;
  annual: number;
  bold?: boolean;
  accent?: "emerald" | "red" | "slate";
  sub?: boolean;
}) {
  const valueClass =
    accent === "emerald" ? "text-emerald-700" : accent === "red" ? "text-red-600" : "text-slate-900";
  return (
    <tr className={bold ? "bg-slate-50" : undefined}>
      <td className={`px-3 py-2 ${sub ? "pr-6 text-xs text-slate-400" : bold ? "font-bold text-slate-900" : "text-slate-600"}`}>
        {label}
      </td>
      <td className={`px-3 py-2 text-left ${sub ? "text-xs text-slate-400" : bold ? `font-bold ${valueClass}` : valueClass}`}>
        ₪{fmtMoney(monthly)}
      </td>
      <td className={`px-3 py-2 text-left ${sub ? "text-xs text-slate-400" : bold ? `font-bold ${valueClass}` : valueClass}`}>
        ₪{fmtMoney(annual)}
      </td>
    </tr>
  );
}

export function ProfitLossTable({ summary, title }: { summary: ProfitLossSummary; title?: string }) {
  const { income } = summary;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      {title && <h3 className="mb-3 text-sm font-bold text-slate-900">{title}</h3>}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-right text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-3 py-2">סעיף</th>
              <th className="px-3 py-2 text-left">חודשי</th>
              <th className="px-3 py-2 text-left">שנתי (צפי)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td colSpan={3} className="bg-emerald-50/50 px-3 py-1.5 text-xs font-bold text-emerald-800">
                הכנסות
              </td>
            </tr>
            <Row label="הכנסות משתתפים" monthly={income.participantIncomeMonthly} annual={income.participantIncomeMonthly * 12} />
            <Row label='שיפוי שכ"ד' monthly={income.rentReimbursementIncomeMonthly} annual={income.rentReimbursementIncomeMonthly * 12} />
            <Row label="השתתפות שמירה" monthly={income.securityIncomeMonthly} annual={income.securityIncomeMonthly * 12} />
            <Row label='סה"כ הכנסות' monthly={income.totalIncomeMonthly} annual={summary.totalIncomeAnnual} bold accent="emerald" />

            <tr>
              <td colSpan={3} className="bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                הוצאות
              </td>
            </tr>
            <Row label="עלות מעביד (שכר צוות)" monthly={summary.wageMonthly} annual={summary.wageMonthly * 12} bold />
            {summary.wageByRoleType
              .filter((rt) => Math.round(rt.employerCostMonthly) !== 0)
              .sort((a, b) => b.employerCostMonthly - a.employerCostMonthly)
              .map((rt) => (
                <Row
                  key={rt.roleTypeId || "none"}
                  label={rt.roleTypeName}
                  monthly={rt.employerCostMonthly}
                  annual={rt.employerCostMonthly * 12}
                  sub
                />
              ))}
            <Row label="הוצאות תפעול" monthly={summary.expensesMonthly} annual={summary.expensesMonthly * 12} />
            <Row label='סה"כ הוצאות' monthly={summary.totalCostsMonthly} annual={summary.totalCostsAnnual} bold />

            <Row
              label="עודף / גירעון"
              monthly={summary.netMonthly}
              annual={summary.netAnnual}
              bold
              accent={summary.netMonthly < 0 ? "red" : "emerald"}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}
