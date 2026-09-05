"use client";

import { useState, useTransition } from "react";
import { weeklyHoursForAssignment } from "@/lib/revaha/calc";
import { DailyShifts, ScheduleMethod } from "@/lib/revaha/types";
import {
  createStaffRoleAssignment,
  deleteStaffRoleAssignment,
  updateStaffRoleAssignment,
} from "./actions";
import { RoleScheduleFields } from "./RoleScheduleFields";

type Staff = { id: string; full_name: string };
type Role = { id: string; name: string };
type Assignment = {
  id: string;
  staff_id: string;
  role_id: string;
  schedule_method: ScheduleMethod;
  weekday_hours: number | null;
  weekend_hours: number | null;
  daily_shifts: DailyShifts | null;
};

function fmtHours(n: number) {
  return n.toLocaleString("he-IL", { maximumFractionDigits: 1 });
}

function AssignmentRow({
  assignment,
  staffName,
  roleName,
  facilityId,
}: {
  assignment: Assignment;
  staffName: string;
  roleName: string;
  facilityId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSave(formData: FormData) {
    startTransition(() => updateStaffRoleAssignment(assignment.id, facilityId, formData));
  }

  return (
    <form action={handleSave} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-slate-900">
          <span className="font-medium">{staffName}</span> — {roleName}
          <span className="mr-2 text-xs text-slate-500">({fmtHours(weeklyHoursForAssignment(assignment))} שעות שבועיות)</span>
        </div>
        <div className="flex gap-2">
          <button
            disabled={isPending}
            className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 disabled:opacity-60"
          >
            {isPending ? "שומר..." : "שמירה"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => deleteStaffRoleAssignment(assignment.id, facilityId))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-white disabled:opacity-60"
          >
            הסרה
          </button>
        </div>
      </div>
      <RoleScheduleFields
        roleName={roleName}
        defaultMethod={assignment.schedule_method}
        defaultWeekdayHours={assignment.weekday_hours}
        defaultWeekendHours={assignment.weekend_hours}
        defaultDailyShifts={assignment.daily_shifts}
      />
    </form>
  );
}

function AddAssignmentForm({
  facilityId,
  staff,
  roles,
}: {
  facilityId: string;
  staff: Staff[];
  roles: Role[];
}) {
  const [isPending, startTransition] = useTransition();
  const [roleId, setRoleId] = useState("");
  const roleName = roles.find((r) => r.id === roleId)?.name ?? "";

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      await createStaffRoleAssignment(facilityId, formData);
    });
  }

  return (
    <form action={handleAdd} className="mt-4 space-y-2 border-t border-slate-200 pt-4">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">עובד</label>
          <select name="staff_id" required className="w-44 rounded-lg border border-slate-200 px-2 py-1.5 text-sm">
            <option value="">בחירת עובד...</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">תפקיד</label>
          <select
            name="role_id"
            required
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="w-44 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          >
            <option value="">בחירת תפקיד...</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <button
          disabled={isPending}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 disabled:opacity-60"
        >
          {isPending ? "מוסיף..." : "הוספת שיבוץ"}
        </button>
      </div>
      {roleId && <RoleScheduleFields roleName={roleName} />}
    </form>
  );
}

export function RoleAssignmentsSection({
  facilityId,
  staff,
  roles,
  assignments,
}: {
  facilityId: string;
  staff: Staff[];
  roles: Role[];
  assignments: Assignment[];
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      <h2 className="mb-1 text-sm font-bold text-slate-900">שיבוץ עובדים לתפקידים</h2>
      <p className="mb-3 text-xs text-slate-500">
        למדריכים ואם בית ניתן לבחור בין שיבוץ מפורט (לפי שעות יומיות) לשיבוץ מרוכז. לשאר התפקידים — שיבוץ מרוכז בלבד.
      </p>
      <div className="space-y-2">
        {assignments.map((a) => (
          <AssignmentRow
            key={a.id}
            assignment={a}
            staffName={staff.find((s) => s.id === a.staff_id)?.full_name ?? "?"}
            roleName={roles.find((r) => r.id === a.role_id)?.name ?? "?"}
            facilityId={facilityId}
          />
        ))}
        {assignments.length === 0 && <p className="text-sm text-slate-500">אין עדיין שיבוצים</p>}
      </div>

      {staff.length > 0 && <AddAssignmentForm facilityId={facilityId} staff={staff} roles={roles} />}
    </section>
  );
}
