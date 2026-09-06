"use client";

import { FileDown } from "lucide-react";
import { roleStaffingSummary } from "@/lib/revaha/calc";
import { roleTypeDotColor } from "@/lib/revaha/roleTypeColors";
import { Facility, FacilityModelRole, PayMode, ScheduleMethod, DailyShifts } from "@/lib/revaha/types";

type Role = { id: string; name: string; role_type_id: string };
type RoleType = { id: string; name: string };
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
  daily_shifts: DailyShifts | null;
};

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

export function ReportsSection({
  facility,
  facilityModelRoles,
  roles,
  roleTypes,
  assignments,
}: {
  facility: Facility;
  facilityModelRoles: FacilityModelRole[];
  roles: Role[];
  roleTypes: RoleType[];
  assignments: Assignment[];
}) {
  const summary = roleStaffingSummary(facility, facilityModelRoles, roles, assignments);
  const allRoleTypeIds = roleTypes.map((rt) => rt.id);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
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

      {summary.length === 0 ? (
        <p className="text-sm text-slate-500">לא הוגדר מודל תקן לפנימייה זו, או שאין תפקידים במודל.</p>
      ) : (
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
      )}
    </section>
  );
}
