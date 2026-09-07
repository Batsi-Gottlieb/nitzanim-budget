"use client";

import { Fragment, useMemo, useState, useTransition, type MouseEvent } from "react";
import { Pencil, Search, Trash2, UserCog, UserPlus, UserX, Users } from "lucide-react";
import { assignmentMonthlyWage, monthlyHoursForAssignment } from "@/lib/revaha/calc";
import { Facility, PayMode, ScheduleMethod, DailyShifts, SCHEDULE_METHOD_LABELS } from "@/lib/revaha/types";
import {
  createStaffRoleAssignment,
  deleteStaff,
  deleteStaffRoleAssignment,
  deleteStaffRoleAssignments,
  updateStaff,
  updateStaffRoleAssignment,
} from "./actions";
import { PayModeFields } from "./StaffSection";
import { RoleScheduleFields } from "./RoleScheduleFields";

type Staff = {
  id: string;
  full_name: string;
  phone: string | null;
  id_number: string | null;
  monthly_addition: number | null;
  monthly_travel: number | null;
  has_training_fund: boolean;
  employment_type: "שכיר" | "עצמאי";
};
type Role = { id: string; name: string; role_type_id: string };
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

function fmtMoney(n: number) {
  return n.toLocaleString("he-IL", { maximumFractionDigits: 0 });
}
function fmtHours(n: number) {
  return n.toLocaleString("he-IL", { maximumFractionDigits: 1 });
}

function AssignmentEditForm({
  assignment,
  facilityId,
  roleName,
  onDone,
}: {
  assignment: Assignment;
  facilityId: string;
  roleName: string;
  onDone: () => void;
}) {
  const [payMode, setPayMode] = useState<PayMode>(assignment.pay_mode);
  const [isPending, startTransition] = useTransition();

  function handleSave(formData: FormData) {
    startTransition(async () => {
      await updateStaffRoleAssignment(assignment.id, facilityId, formData);
      onDone();
    });
  }

  return (
    <form action={handleSave} className="mt-2 space-y-2 rounded-xl border-2 border-indigo-200 bg-white p-3 shadow-sm">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-[11px] text-slate-500">אופן תשלום</label>
          <select
            name="pay_mode"
            value={payMode}
            onChange={(e) => setPayMode(e.target.value as PayMode)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
          >
            <option value="hourly">שעתי</option>
            <option value="monthly">חודשי</option>
          </select>
        </div>
        <PayModeFields
          payMode={payMode}
          defaults={{
            hourly_rate: assignment.hourly_rate,
            monthly_salary: assignment.monthly_salary,
            monthly_hours: assignment.monthly_hours,
          }}
        />
      </div>
      <RoleScheduleFields
        roleName={roleName}
        defaultMethod={assignment.schedule_method}
        defaultWeekdayHours={assignment.weekday_hours}
        defaultWeekendHours={assignment.weekend_hours}
        defaultDailyShifts={assignment.daily_shifts}
        defaultWeekendOccurrencesPerMonth={assignment.weekend_occurrences_per_month}
      />
      <div className="flex gap-2">
        <button
          disabled={isPending}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:opacity-60"
        >
          {isPending ? "שומר..." : "שמירה"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}

function AddRoleForm({
  staffId,
  availableRoles,
  facilityId,
  onDone,
}: {
  staffId: string;
  availableRoles: Role[];
  facilityId: string;
  onDone: () => void;
}) {
  const [roleId, setRoleId] = useState("");
  const [payMode, setPayMode] = useState<PayMode>("hourly");
  const [isPending, startTransition] = useTransition();
  const roleName = availableRoles.find((r) => r.id === roleId)?.name ?? "";

  function handleSave(formData: FormData) {
    startTransition(async () => {
      const result = await createStaffRoleAssignment(facilityId, formData);
      if (!result.error) onDone();
    });
  }

  return (
    <form action={handleSave} className="mt-2 space-y-2 rounded-xl border-2 border-indigo-200 bg-white p-3 shadow-sm">
      <input type="hidden" name="staff_id" value={staffId} />
      <div>
        <label className="mb-1 block text-[11px] text-slate-500">תפקיד</label>
        <select
          name="role_id"
          required
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          className="w-52 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">בחירת תפקיד...</option>
          {availableRoles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      {roleId && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-[11px] text-slate-500">אופן תשלום</label>
              <select
                name="pay_mode"
                value={payMode}
                onChange={(e) => setPayMode(e.target.value as PayMode)}
                className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
              >
                <option value="hourly">שעתי</option>
                <option value="monthly">חודשי</option>
              </select>
            </div>
            <PayModeFields payMode={payMode} />
          </div>
          <RoleScheduleFields roleName={roleName} />
        </>
      )}
      <div className="flex gap-2">
        <button
          disabled={isPending || !roleId}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:opacity-60"
        >
          {isPending ? "מוסיף..." : "הוספת תפקיד"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}

function StaffIdentityEditForm({
  staff,
  facilityId,
  onDone,
}: {
  staff: Staff;
  facilityId: string;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSave(formData: FormData) {
    startTransition(async () => {
      await updateStaff(staff.id, facilityId, formData);
      onDone();
    });
  }

  return (
    <form action={handleSave} className="mt-2 grid grid-cols-2 items-end gap-2 rounded-xl border-2 border-indigo-200 bg-white p-3 shadow-sm sm:grid-cols-6">
      <div>
        <label className="mb-1 block text-[11px] text-slate-500">שם</label>
        <input name="full_name" defaultValue={staff.full_name} required className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-slate-500">טלפון</label>
        <input name="phone" defaultValue={staff.phone ?? ""} className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-slate-500">ת.ז</label>
        <input name="id_number" defaultValue={staff.id_number ?? ""} className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-slate-500">תוספת חודשית</label>
        <input name="monthly_addition" type="number" defaultValue={staff.monthly_addition ?? ""} className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-slate-500">נסיעות חודשי</label>
        <input name="monthly_travel" type="number" defaultValue={staff.monthly_travel ?? ""} className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-slate-500">סוג העסקה</label>
        <select name="employment_type" defaultValue={staff.employment_type} className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm">
          <option value="שכיר">שכיר</option>
          <option value="עצמאי">עצמאי</option>
        </select>
      </div>
      <div className="flex items-center gap-1.5">
        <input type="checkbox" id={`kh-${staff.id}`} name="has_training_fund" defaultChecked={staff.has_training_fund} className="h-4 w-4" />
        <label htmlFor={`kh-${staff.id}`} className="text-[11px] text-slate-500">קרן השתלמות</label>
      </div>
      <div className="col-span-2 flex gap-2 sm:col-span-6">
        <button disabled={isPending} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:opacity-60">
          {isPending ? "שומר..." : "שמירה"}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50">
          ביטול
        </button>
      </div>
    </form>
  );
}

type Row =
  | { kind: "assignment"; staff: Staff; assignment: Assignment; role: Role | undefined }
  | { kind: "no-role"; staff: Staff };

function rowKey(row: Row): string {
  return row.kind === "assignment" ? `a:${row.assignment.id}` : `n:${row.staff.id}`;
}

export function StaffRoleTable({
  facilityId,
  facility,
  staff,
  assignments,
  roles,
}: {
  facilityId: string;
  facility: Facility;
  staff: Staff[];
  assignments: Assignment[];
  roles: Role[];
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [identityEditId, setIdentityEditId] = useState<string | null>(null);
  const [addRoleForStaffId, setAddRoleForStaffId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const rows: Row[] = useMemo(() => {
    const result: Row[] = [];
    for (const s of staff) {
      const staffAssignments = assignments.filter((a) => a.staff_id === s.id);
      if (staffAssignments.length === 0) {
        result.push({ kind: "no-role", staff: s });
      } else {
        for (const a of staffAssignments) {
          result.push({ kind: "assignment", staff: s, assignment: a, role: roles.find((r) => r.id === a.role_id) });
        }
      }
    }
    return result;
  }, [staff, assignments, roles]);

  const filteredRows = useMemo(() => {
    const term = search.trim();
    return rows.filter((row) => {
      if (roleFilter && (row.kind !== "assignment" || row.assignment.role_id !== roleFilter)) return false;
      if (!term) return true;
      const haystack = `${row.staff.full_name} ${row.staff.phone ?? ""} ${row.kind === "assignment" ? row.role?.name ?? "" : ""}`;
      return haystack.includes(term);
    });
  }, [rows, search, roleFilter]);

  const lastRowIndexByStaffId = useMemo(() => {
    const map = new Map<string, number>();
    filteredRows.forEach((r, i) => map.set(r.staff.id, i));
    return map;
  }, [filteredRows]);

  const selectableKeys = filteredRows.map(rowKey);
  const allSelected = selectableKeys.length > 0 && selectableKeys.every((k) => selected.has(k));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectableKeys));
  }
  function toggleOne(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleBulkDelete() {
    const assignmentIds = filteredRows
      .filter((r) => r.kind === "assignment" && selected.has(rowKey(r)))
      .map((r) => (r as Extract<Row, { kind: "assignment" }>).assignment.id);
    const staffIdsWithNoRole = filteredRows
      .filter((r) => r.kind === "no-role" && selected.has(rowKey(r)))
      .map((r) => r.staff.id);
    if (!assignmentIds.length && !staffIdsWithNoRole.length) return;
    startTransition(async () => {
      await deleteStaffRoleAssignments(assignmentIds, staffIdsWithNoRole, facilityId);
      setSelected(new Set());
    });
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם או טלפון..."
            aria-label="חיפוש לפי שם או טלפון"
            className="w-52 rounded-lg border-2 border-slate-300 py-1.5 pl-2.5 pr-8 text-xs outline-none transition-colors focus:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="סינון לפי תפקיד"
          className="rounded-lg border-2 border-slate-300 px-2.5 py-1.5 text-xs outline-none transition-colors focus:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
        >
          <option value="">כל התפקידים</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        {selected.size > 0 && (
          <button
            type="button"
            disabled={isPending}
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:opacity-90 focus-visible:ring-2 focus-visible:ring-red-500/50 disabled:opacity-60"
          >
            <Trash2 className="h-3.5 w-3.5" />
            מחיקת {selected.size} נבחרים
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border-2 border-slate-300 shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-100 text-right text-xs font-semibold text-slate-600">
            <tr className="border-b-2 border-slate-300">
              <th scope="col" className="w-8 border-l border-slate-200 px-2 py-2.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="בחירת כל השורות"
                  className="h-4 w-4 cursor-pointer accent-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500/50"
                />
              </th>
              <th scope="col" className="border-l border-slate-200 px-2 py-2.5">שם</th>
              <th scope="col" className="border-l border-slate-200 px-2 py-2.5">טלפון</th>
              <th scope="col" className="border-l border-slate-200 px-2 py-2.5">תפקיד</th>
              <th scope="col" className="border-l border-slate-200 px-2 py-2.5">שיטת שיבוץ</th>
              <th scope="col" className="border-l border-slate-200 px-2 py-2.5">שעות חודשיות</th>
              <th scope="col" className="border-l border-slate-200 px-2 py-2.5">שכר חודשי</th>
              <th scope="col" className="px-2 py-2.5">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredRows.map((row, index) => {
              const key = rowKey(row);
              const isEditing = editingKey === key;
              const isLastRowForStaff = lastRowIndexByStaffId.get(row.staff.id) === index;
              const isIdentityEditing = isLastRowForStaff && identityEditId === row.staff.id;
              const isAddingRole = isLastRowForStaff && addRoleForStaffId === row.staff.id;
              const assignedRoleIds = new Set(
                assignments.filter((a) => a.staff_id === row.staff.id).map((a) => a.role_id)
              );
              const availableRoles = roles.filter((r) => !assignedRoleIds.has(r.id));

              function handleRowClick(e: MouseEvent<HTMLTableRowElement>) {
                if ((e.target as HTMLElement).closest("button, input, a, select")) return;
                if (row.kind === "assignment") setEditingKey(isEditing ? null : key);
                else setAddRoleForStaffId(isAddingRole ? null : row.staff.id);
              }

              return (
                <Fragment key={key}>
                  <tr
                    className="cursor-pointer text-slate-900 even:bg-slate-50/60 hover:bg-indigo-50/50"
                    onClick={handleRowClick}
                  >
                    <td className="border-l border-slate-200 px-2 py-2 align-top">
                      <input
                        type="checkbox"
                        checked={selected.has(key)}
                        onChange={() => toggleOne(key)}
                        aria-label={`בחירת ${row.staff.full_name}${row.kind === "assignment" ? ` — ${row.role?.name ?? ""}` : ""}`}
                        className="h-4 w-4 cursor-pointer accent-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500/50"
                      />
                    </td>
                    <td className="border-l border-slate-200 px-2 py-2 align-top font-medium">{row.staff.full_name}</td>
                    <td className="border-l border-slate-200 px-2 py-2 align-top text-slate-500">{row.staff.phone ?? "—"}</td>
                    <td className="border-l border-slate-200 px-2 py-2 align-top">
                      {row.kind === "assignment" ? row.role?.name ?? "?" : <span className="text-slate-400">— ללא תפקיד —</span>}
                    </td>
                    <td className="border-l border-slate-200 px-2 py-2 align-top text-slate-500">
                      {row.kind === "assignment" ? SCHEDULE_METHOD_LABELS[row.assignment.schedule_method] : "—"}
                    </td>
                    <td className="border-l border-slate-200 px-2 py-2 align-top font-semibold text-slate-700">
                      {row.kind === "assignment" ? fmtHours(monthlyHoursForAssignment(row.assignment, facility)) : "—"}
                    </td>
                    <td className="border-l border-slate-200 px-2 py-2 align-top font-semibold text-emerald-700">
                      {row.kind === "assignment" ? `₪${fmtMoney(assignmentMonthlyWage(row.assignment, facility))}` : "—"}
                    </td>
                    <td className="px-2 py-2 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIdentityEditId(isIdentityEditing ? null : row.staff.id)}
                          className="flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
                        >
                          <UserCog className="h-3 w-3" />
                          פרטי עובד
                        </button>
                        {row.kind === "assignment" && (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditingKey(isEditing ? null : key)}
                              className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/60 px-2 py-1 text-[11px] font-semibold text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
                            >
                              <Pencil className="h-3 w-3" />
                              עריכה
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => startTransition(() => deleteStaffRoleAssignment(row.assignment.id, facilityId))}
                              className="flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-[11px] font-semibold text-danger transition-colors hover:border-red-300 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:opacity-60"
                            >
                              <UserX className="h-3 w-3" />
                              הסרת תפקיד
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setAddRoleForStaffId(isAddingRole ? null : row.staff.id)}
                          className="flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-semibold text-indigo-600 transition-colors hover:border-indigo-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
                        >
                          <UserPlus className="h-3 w-3" />
                          הוספת תפקיד
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => startTransition(() => deleteStaff(row.staff.id, facilityId))}
                          className="flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-[11px] font-semibold text-danger transition-colors hover:border-red-300 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:opacity-60"
                        >
                          <Trash2 className="h-3 w-3" />
                          מחיקת עובד
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isIdentityEditing && (
                    <tr key={`${key}-identity`} className="bg-slate-50">
                      <td colSpan={8} className="px-2 pb-3 pt-1">
                        <StaffIdentityEditForm staff={row.staff} facilityId={facilityId} onDone={() => setIdentityEditId(null)} />
                      </td>
                    </tr>
                  )}
                  {isEditing && row.kind === "assignment" && (
                    <tr key={`${key}-edit`} className="bg-slate-50">
                      <td colSpan={8} className="px-2 pb-3 pt-1">
                        <AssignmentEditForm
                          assignment={row.assignment}
                          facilityId={facilityId}
                          roleName={row.role?.name ?? ""}
                          onDone={() => setEditingKey(null)}
                        />
                      </td>
                    </tr>
                  )}
                  {isAddingRole && (
                    <tr key={`${key}-add-role`} className="bg-slate-50">
                      <td colSpan={8} className="px-2 pb-3 pt-1">
                        <AddRoleForm
                          staffId={row.staff.id}
                          availableRoles={availableRoles}
                          facilityId={facilityId}
                          onDone={() => setAddRoleForStaffId(null)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-2 py-8 text-center text-sm text-slate-500">
                  <div className="flex flex-col items-center gap-1.5">
                    <Users className="h-6 w-6 text-slate-300" />
                    לא נמצאו עובדים תואמים
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
