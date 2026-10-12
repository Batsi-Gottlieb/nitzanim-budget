"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronLeft, FileDown } from "lucide-react";
import { ProfitLossSummary } from "@/lib/revaha/calc";

function fmtMoney(n: number) {
  return n.toLocaleString("he-IL", { maximumFractionDigits: 0 });
}
function fmtHours(n: number) {
  return n.toLocaleString("he-IL", { maximumFractionDigits: 1 });
}

function Row({
  label,
  monthly,
  annual,
  bold,
  accent,
  sub,
  toggle,
}: {
  label: string;
  monthly: number;
  annual: number;
  bold?: boolean;
  accent?: "emerald" | "red" | "slate";
  sub?: boolean;
  toggle?: { open: boolean; onToggle: () => void };
}) {
  const valueClass =
    accent === "emerald" ? "text-emerald-700" : accent === "red" ? "text-red-600" : "text-slate-900";
  const cellClass = sub ? "text-xs text-slate-500" : bold ? `font-bold ${valueClass}` : valueClass;
  return (
    <tr className={bold ? "bg-slate-50" : undefined}>
      <td className={`px-3 py-2 ${sub ? "pr-6 text-xs text-slate-500" : bold ? "font-bold text-slate-900" : "text-slate-600"}`}>
        {toggle ? (
          <button
            type="button"
            onClick={toggle.onToggle}
            aria-expanded={toggle.open}
            className="flex items-center gap-1 text-right hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
          >
            {toggle.open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            {label}
          </button>
        ) : (
          label
        )}
      </td>
      <td className={`px-3 py-2 text-left ${cellClass}`}>₪{fmtMoney(monthly)}</td>
      <td className={`px-3 py-2 text-left ${cellClass}`}>₪{fmtMoney(annual)}</td>
    </tr>
  );
}

export function ProfitLossTable({
  summary,
  title,
  exportHref,
}: {
  summary: ProfitLossSummary;
  title?: string;
  exportHref?: string;
}) {
  const { income } = summary;
  const [openRoleTypes, setOpenRoleTypes] = useState<Set<string>>(new Set());
  const [expensesOpen, setExpensesOpen] = useState(false);

  function toggleRoleType(id: string) {
    setOpenRoleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const roleTypeRows = summary.wageByRoleType
    .filter((rt) => Math.round(rt.employerCostMonthly) !== 0)
    .slice()
    .sort((a, b) => b.employerCostMonthly - a.employerCostMonthly);

  const expenseRows = summary.expenseDetail.slice().sort((a, b) => b.monthly - a.monthly);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      <div className="mb-3 flex items-center justify-between gap-2">
        {title && <h3 className="text-sm font-bold text-slate-900">{title}</h3>}
        {exportHref && (
          <a
            href={exportHref}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <FileDown className="h-3.5 w-3.5" />
            ייצוא עלות שכר לפי תפקיד
          </a>
        )}
      </div>
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
            <Row label="השתתפות אבטחה" monthly={income.securityIncomeMonthly} annual={income.securityIncomeMonthly * 12} />
            {Math.round(income.batSherutIncomeMonthly) !== 0 && (
              <Row label="הכנסות בנות שירות" monthly={income.batSherutIncomeMonthly} annual={income.batSherutIncomeMonthly * 12} />
            )}
            {Math.round(income.batAmiIncomeMonthly) !== 0 && (
              <Row label="הכנסות בנות עמי" monthly={income.batAmiIncomeMonthly} annual={income.batAmiIncomeMonthly * 12} />
            )}
            {income.extraIncomeRows.map((r, i) => (
              <Row
                key={`${r.label}:${r.facilityName ?? ""}:${i}`}
                label={r.facilityName ? `${r.label} — ${r.facilityName}` : r.label}
                monthly={r.monthly}
                annual={r.monthly * 12}
              />
            ))}
            <Row label='סה"כ הכנסות' monthly={income.totalIncomeMonthly} annual={summary.totalIncomeAnnual} bold accent="emerald" />

            <tr>
              <td colSpan={3} className="bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                הוצאות
              </td>
            </tr>
            <Row label="עלות מעביד (שכר צוות)" monthly={summary.wageMonthly} annual={summary.wageMonthly * 12} bold />
            {roleTypeRows.map((rt) => {
              const key = rt.roleTypeId || "none";
              const detail = summary.wageDetail
                .filter((d) => d.roleTypeId === rt.roleTypeId && Math.round(d.employerCostMonthly) !== 0)
                .sort((a, b) => b.employerCostMonthly - a.employerCostMonthly);
              const open = openRoleTypes.has(key);
              return (
                <Fragment key={key}>
                  <Row
                    label={rt.roleTypeName}
                    monthly={rt.employerCostMonthly}
                    annual={rt.employerCostMonthly * 12}
                    sub
                    toggle={detail.length ? { open, onToggle: () => toggleRoleType(key) } : undefined}
                  />
                  {open &&
                    detail.map((d, i) => (
                      <tr key={`${d.staffId}:${d.roleId}:${i}`} className="bg-slate-50/50">
                        <td className="px-3 py-1.5 pr-12 text-[11px] text-slate-500">
                          {d.staffName} — {d.roleName}
                          {d.facilityName ? ` (${d.facilityName})` : ""}
                          <span className="mr-2 text-slate-400">{fmtHours(d.monthlyHours)} שעות לחודש</span>
                        </td>
                        <td className="px-3 py-1.5 text-left text-[11px] text-slate-500">₪{fmtMoney(d.employerCostMonthly)}</td>
                        <td className="px-3 py-1.5 text-left text-[11px] text-slate-500">₪{fmtMoney(d.employerCostMonthly * 12)}</td>
                      </tr>
                    ))}
                </Fragment>
              );
            })}
            <Row
              label="הוצאות תפעול"
              monthly={summary.expensesMonthly}
              annual={summary.expensesMonthly * 12}
              toggle={expenseRows.length ? { open: expensesOpen, onToggle: () => setExpensesOpen((o) => !o) } : undefined}
            />
            {expensesOpen &&
              expenseRows.map((e, i) => (
                <tr key={`${e.label}:${e.facilityName ?? ""}:${i}`} className="bg-slate-50/50">
                  <td className="px-3 py-1.5 pr-12 text-[11px] text-slate-500">
                    {e.label}
                    {e.facilityName ? ` (${e.facilityName})` : ""}
                  </td>
                  <td className="px-3 py-1.5 text-left text-[11px] text-slate-500">₪{fmtMoney(e.monthly)}</td>
                  <td className="px-3 py-1.5 text-left text-[11px] text-slate-500">₪{fmtMoney(e.monthly * 12)}</td>
                </tr>
              ))}
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
