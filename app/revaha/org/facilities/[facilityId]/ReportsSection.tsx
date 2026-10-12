"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import {
  computeFacilityIncome,
  computeProfitLoss,
  employerCostRowsToRoleTypes,
  facilityEmployerCostByAssignment,
  facilityEmployerCostMonthly,
  roleStaffingSummary,
  roleTypeStaffingSummary,
  weeklyFullTimeHoursForRole,
  weeklyHoursForAssignment,
} from "@/lib/revaha/calc";
import { roleTypeDotColor } from "@/lib/revaha/roleTypeColors";
import { Facility, FacilityIncomeLineItem, FacilityModelRole, PayMode, ScheduleMethod, DailyShifts, WEEKDAY_LABELS } from "@/lib/revaha/types";
import { ProfitLossTable } from "@/components/revaha/ProfitLossTable";

type Role = { id: string; name: string; role_type_id: string };
type RoleType = { id: string; name: string };
type Staff = {
  id: string;
  full_name: string;
  monthly_addition: number | null;
  monthly_travel: number | null;
  has_training_fund: boolean;
  employment_type: "שכיר" | "עצמאי";
};
type Assignment = {
  id: string;
  staff_id: string;
  role_id: string;
  pay_mode: PayMode;
  hourly_rate: number | null;
  monthly_salary: number | null;
  monthly_hours: number | null;
  schedule_method: ScheduleMethod;
  weekday_hours: number | null;
  weekend_hours: number | null;
  weekend_occurrences_per_month: number | null;
  daily_shifts: DailyShifts | null;
};
type ExpenseLineItem = { id: string; category: string; monthly_amount: number | null };

function fmtNum(n: number) {
  return n.toLocaleString("he-IL", { maximumFractionDigits: 1 });
}

function DeltaBadge({ value, unit }: { value: number | null; unit: string }) {
  if (value === null) return <span className="text-slate-400">—</span>;
  const rounded = Math.round(value * 10) / 10;
  const isDeficit = rounded < -0.05;
  const isSurplus = rounded > 0.05;
  return (
    <span
      className={
        isDeficit
          ? "font-semibold text-red-600"
          : isSurplus
            ? "font-semibold text-emerald-600"
            : "text-slate-500"
      }
    >
      {rounded > 0 ? "+" : ""}
      {fmtNum(rounded)} {unit}
    </span>
  );
}

function RoleTypeCard({
  name,
  color,
  requiredPositions,
  assignedPositionsEquivalent,
  deltaPositions,
}: {
  name: string;
  color: string;
  requiredPositions: number | null;
  assignedPositionsEquivalent: number | null;
  deltaPositions: number | null;
}) {
  return (
    <div className="min-w-[9rem] flex-1 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700">
        <span className={`h-2 w-2 rounded-full ${color}`} />
        {name}
      </div>
      <div className="flex items-baseline gap-1 text-sm text-slate-900">
        <span className="font-bold">{assignedPositionsEquivalent !== null ? fmtNum(assignedPositionsEquivalent) : "0"}</span>
        <span className="text-slate-400">/</span>
        <span className="text-slate-500">{requiredPositions ?? "—"}</span>
        <span className="text-[11px] text-slate-400">תקנים</span>
      </div>
      <DeltaBadge value={deltaPositions} unit="תקנים" />
    </div>
  );
}

export function ReportsSection({
  facility,
  facilityModelRoles,
  incomeItems,
  expenses,
  roles,
  roleTypes,
  assignments,
  staff,
}: {
  facility: Facility;
  facilityModelRoles: FacilityModelRole[];
  incomeItems: FacilityIncomeLineItem[];
  expenses: ExpenseLineItem[];
  roles: Role[];
  roleTypes: RoleType[];
  assignments: Assignment[];
  staff: Staff[];
}) {
  const summary = roleStaffingSummary(facility, facilityModelRoles, roles, assignments);
  const typeSummary = roleTypeStaffingSummary(summary, roleTypes);
  const allRoleTypeIds = roleTypes.map((rt) => rt.id);
  const staffById = new Map(staff.map((s) => [s.id, s.full_name]));

  const [roleFilter, setRoleFilter] = useState("");

  const income = computeFacilityIncome(facility, incomeItems);
  const wageMonthly = facilityEmployerCostMonthly(staff, assignments, facility);
  const wageDetail = facilityEmployerCostByAssignment(staff, assignments, facility, roles, roleTypes);
  const wageByRoleType = employerCostRowsToRoleTypes(wageDetail);
  const expensesMonthly = expenses.reduce((sum, e) => sum + (e.monthly_amount ?? 0), 0);
  const expenseDetail = expenses
    .filter((e) => (e.monthly_amount ?? 0) !== 0)
    .map((e) => ({ label: e.category, monthly: e.monthly_amount ?? 0 }));
  const profitLoss = computeProfitLoss(income, wageMonthly, expensesMonthly, wageByRoleType, { wageDetail, expenseDetail });

  return (
    <section className="space-y-4">
      <ProfitLossTable
        summary={profitLoss}
        title="דוח רווח והפסד"
        exportHref={`/api/revaha/facilities/${facility.id}/payroll-report`}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">דוחות</h2>
          <a
            href={`/api/revaha/facilities/${facility.id}/staffing-report`}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700"
          >
            <FileDown className="h-3.5 w-3.5" />
            ייצוא לאקסל
          </a>
        </div>
        <p className="mb-3 text-xs text-slate-500">ריכוז שעות ותקנים לפי תפקיד, מול התקן הנדרש במודל הפנימייה.</p>

        {typeSummary.length === 0 ? (
          <p className="text-sm text-slate-500">לא הוגדר מודל תקן לפנימייה זו, או שאין תפקידים במודל.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {typeSummary.map((rt) => (
              <RoleTypeCard
                key={rt.roleTypeId}
                name={rt.roleTypeName}
                color={roleTypeDotColor(rt.roleTypeId, allRoleTypeIds)}
                requiredPositions={rt.requiredPositions}
                assignedPositionsEquivalent={rt.assignedPositionsEquivalent}
                deltaPositions={rt.deltaPositions}
              />
            ))}
          </div>
        )}
      </div>

      {assignments.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <h3 className="mb-1 text-sm font-bold text-slate-900">שיבוץ עובדים — לפי ימים</h3>
          <p className="mb-3 text-xs text-slate-500">כניסה–יציאה לכל יום (שיבוץ מפורט) או סה&quot;כ שעות שבועי (שיבוץ מרוכז).</p>
          <div className="mb-3 flex items-center gap-2">
            <label htmlFor="assignment-role-filter" className="text-xs font-medium text-slate-500">
              סינון לפי תפקיד:
            </label>
            <select
              id="assignment-role-filter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border-2 border-slate-300 px-2.5 py-1.5 text-xs outline-none focus:border-indigo-400"
            >
              <option value="">כל התפקידים</option>
              {roles
                .filter((r) => assignments.some((a) => a.role_id === r.id))
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-right text-xs text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-2 py-2">שם עובד</th>
                  <th className="whitespace-nowrap px-2 py-2">תפקיד</th>
                  <th className="whitespace-nowrap px-2 py-2">אחוז משרה</th>
                  {WEEKDAY_LABELS.map((label) => (
                    <th key={label} className="whitespace-nowrap px-2 py-2">
                      {label}
                    </th>
                  ))}
                  <th className="whitespace-nowrap px-2 py-2">סה&quot;כ שעות שבועי</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.filter((a) => !roleFilter || a.role_id === roleFilter).map((a) => {
                  const role = roles.find((r) => r.id === a.role_id);
                  const weeklyTotal = weeklyHoursForAssignment(a);
                  const fullTimeWeekly = weeklyFullTimeHoursForRole(a.role_id, facilityModelRoles);
                  const occupancyPercent = fullTimeWeekly ? (weeklyTotal / fullTimeWeekly) * 100 : null;
                  return (
                    <tr key={a.id}>
                      <td className="whitespace-nowrap px-2 py-2 font-medium text-slate-900">{staffById.get(a.staff_id) ?? "?"}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${roleTypeDotColor(role?.role_type_id ?? "", allRoleTypeIds)}`} />
                          {role?.name ?? "?"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-slate-500">
                        {occupancyPercent !== null ? `${Math.round(occupancyPercent)}%` : "—"}
                      </td>
                      {WEEKDAY_LABELS.map((_, dayIndex) => {
                        const shift = a.schedule_method === "detailed" ? a.daily_shifts?.[String(dayIndex) as "0"] : undefined;
                        return (
                          <td key={dayIndex} className="whitespace-nowrap px-2 py-2 text-center text-xs text-slate-500">
                            {shift?.start && shift?.end ? `${shift.start}–${shift.end}` : "—"}
                          </td>
                        );
                      })}
                      <td className="whitespace-nowrap px-2 py-2 font-semibold text-slate-900">{fmtNum(weeklyTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {summary.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <h3 className="mb-3 text-sm font-bold text-slate-900">פירוט לפי תפקיד ספציפי</h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-right text-xs text-slate-500">
                <tr>
                  <th className="px-2 py-2">תפקיד</th>
                  <th className="px-2 py-2">תקנים נדרשים</th>
                  <th className="px-2 py-2">שעות נדרשות (חודשי)</th>
                  <th className="px-2 py-2">תקנים משובצים</th>
                  <th className="px-2 py-2">שעות משובצות (חודשי)</th>
                  <th className="px-2 py-2">פער תקנים</th>
                  <th className="px-2 py-2">פער שעות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.map((row) => (
                  <tr key={row.roleId}>
                    <td className="px-2 py-2">
                      <span className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${roleTypeDotColor(row.roleTypeId, allRoleTypeIds)}`} />
                        {row.roleName}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-slate-600">{row.requiredPositions ?? "—"}</td>
                    <td className="px-2 py-2 text-slate-600">
                      {row.requiredMonthlyHours !== null ? fmtNum(row.requiredMonthlyHours) : "—"}
                    </td>
                    <td className="px-2 py-2 text-slate-600">
                      {row.assignedPositionsEquivalent !== null ? fmtNum(row.assignedPositionsEquivalent) : "—"}
                    </td>
                    <td className="px-2 py-2 text-slate-600">{fmtNum(row.assignedMonthlyHours)}</td>
                    <td className="px-2 py-2">
                      <DeltaBadge value={row.deltaPositions} unit="תקנים" />
                    </td>
                    <td className="px-2 py-2">
                      <DeltaBadge value={row.deltaMonthlyHours} unit="שעות" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
