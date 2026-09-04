"use client";

import { useTransition } from "react";
import {
  createStaffRoleAssignment,
  deleteStaffRoleAssignment,
  updateStaffRoleAssignment,
} from "./actions";

type Staff = { id: string; full_name: string };
type Role = { id: string; name: string };
type Assignment = { id: string; staff_id: string; role_id: string; weekly_hours: number | null };

function AssignmentRow({ assignment, staffName, roleName, facilityId }: { assignment: Assignment; staffName: string; roleName: string; facilityId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleSave(formData: FormData) {
    startTransition(() => updateStaffRoleAssignment(assignment.id, facilityId, formData));
  }

  return (
    <form action={handleSave} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <div className="min-w-0 flex-1 text-sm text-slate-900">
        <span className="font-medium">{staffName}</span> — {roleName}
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-slate-500">שעות שבועיות</label>
        <input
          name="weekly_hours"
          type="number"
          step="0.5"
          defaultValue={assignment.weekly_hours ?? ""}
          className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm"
        />
      </div>
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
  const [isPending, startTransition] = useTransition();

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      await createStaffRoleAssignment(facilityId, formData);
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      <h2 className="mb-1 text-sm font-bold text-slate-900">שיבוץ עובדים לתפקידים</h2>
      <p className="mb-3 text-xs text-slate-500">שיבוץ בסיסי: עובד, תפקיד ושעות שבועיות.</p>
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

      {staff.length > 0 && (
        <form action={handleAdd} className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-200 pt-4">
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
            <select name="role_id" required className="w-44 rounded-lg border border-slate-200 px-2 py-1.5 text-sm">
              <option value="">בחירת תפקיד...</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">שעות שבועיות</label>
            <input name="weekly_hours" type="number" step="0.5" className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
          </div>
          <button
            disabled={isPending}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 disabled:opacity-60"
          >
            {isPending ? "מוסיף..." : "הוספת שיבוץ"}
          </button>
        </form>
      )}
    </section>
  );
}
