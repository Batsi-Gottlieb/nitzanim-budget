"use client";

import { useTransition } from "react";
import { deleteFacilityModelRole, upsertFacilityModelRole } from "../../actions";
import { roleTypeDotColor } from "@/lib/revaha/roleTypeColors";

type RoleType = { id: string; name: string };
type Role = { id: string; name: string; role_type_id: string };
type FacilityModelRole = {
  id: string;
  role_id: string;
  required_positions: number | null;
  monthly_hours_full_time: number | null;
  workdays_per_month: number | null;
  workdays_per_week: number | null;
  max_percent: number | null;
  affected_by_occupancy: boolean;
  notes: string | null;
};

function RoleRequirementRow({
  modelId,
  role,
  roleTypeName,
  dotColor,
  requirement,
}: {
  modelId: string;
  role: Role;
  roleTypeName: string;
  dotColor: string;
  requirement: FacilityModelRole;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSave(formData: FormData) {
    formData.set("role_id", role.id);
    startTransition(async () => {
      await upsertFacilityModelRole(modelId, formData);
    });
  }

  return (
    <form
      action={handleSave}
      className="grid grid-cols-2 items-end gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-8"
    >
      <div className="col-span-2 sm:col-span-1">
        <div className="text-sm font-bold text-slate-900">{role.name}</div>
        <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-slate-500">
          <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
          {roleTypeName}
        </span>
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-slate-500">תקנים נדרשים</label>
        <input
          name="required_positions"
          type="number"
          step="0.1"
          defaultValue={requirement.required_positions ?? ""}
          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-slate-500">שעות חודשי משרה מלאה</label>
        <input
          name="monthly_hours_full_time"
          type="number"
          defaultValue={requirement.monthly_hours_full_time ?? ""}
          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-slate-500">ימי עבודה בחודש</label>
        <input
          name="workdays_per_month"
          type="number"
          step="0.1"
          defaultValue={requirement.workdays_per_month ?? ""}
          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-slate-500">ימי עבודה בשבוע</label>
        <input
          name="workdays_per_week"
          type="number"
          step="0.1"
          defaultValue={requirement.workdays_per_week ?? ""}
          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-slate-500">אחוז מקסימלי</label>
        <input
          name="max_percent"
          type="number"
          step="0.1"
          defaultValue={requirement.max_percent ?? ""}
          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="checkbox"
          name="affected_by_occupancy"
          id={`occ-${requirement.id}`}
          defaultChecked={requirement.affected_by_occupancy}
          className="h-4 w-4"
        />
        <label htmlFor={`occ-${requirement.id}`} className="text-[11px] text-slate-500">
          מושפע ממושמים
        </label>
      </div>
      <div className="col-span-2 flex items-end gap-2 sm:col-span-8">
        <div className="flex-1">
          <label className="mb-1 block text-[11px] text-slate-500">הערות</label>
          <input
            name="notes"
            defaultValue={requirement.notes ?? ""}
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
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
          onClick={() => startTransition(() => deleteFacilityModelRole(modelId, requirement.id))}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-white disabled:opacity-60"
        >
          הסרה
        </button>
      </div>
    </form>
  );
}

function AddRoleRequirementForm({ modelId, availableRoles }: { modelId: string; availableRoles: Role[] }) {
  const [isPending, startTransition] = useTransition();

  function handleSave(formData: FormData) {
    startTransition(async () => {
      await upsertFacilityModelRole(modelId, formData);
    });
  }

  if (availableRoles.length === 0) return null;

  return (
    <form action={handleSave} className="flex flex-wrap items-end gap-2 border-t border-slate-200 pt-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">הוספת תפקיד לתקן</label>
        <select name="role_id" required className="w-56 rounded-lg border border-slate-200 px-2 py-1.5 text-sm">
          <option value="">בחירת תפקיד...</option>
          {availableRoles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <button
        disabled={isPending}
        className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 disabled:opacity-60"
      >
        {isPending ? "מוסיף..." : "הוספה"}
      </button>
    </form>
  );
}

export function ModelRolesTable({
  modelId,
  roles,
  roleTypes,
  requirements,
}: {
  modelId: string;
  roles: Role[];
  roleTypes: RoleType[];
  requirements: FacilityModelRole[];
}) {
  const configuredRoleIds = new Set(requirements.map((r) => r.role_id));
  const availableRoles = roles.filter((r) => !configuredRoleIds.has(r.id));
  const roleTypeIds = roleTypes.map((rt) => rt.id);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      <h2 className="mb-1 text-sm font-bold text-slate-900">תקן תפקידים למודל</h2>
      <p className="mb-3 text-xs text-slate-500">כמות תקנים נדרשת לכל תפקיד, ופרמטרי החישוב שלו.</p>
      <div className="space-y-2">
        {requirements.map((req) => {
          const role = roles.find((r) => r.id === req.role_id);
          if (!role) return null;
          const roleType = roleTypes.find((rt) => rt.id === role.role_type_id);
          return (
            <RoleRequirementRow
              key={req.id}
              modelId={modelId}
              role={role}
              roleTypeName={roleType?.name ?? ""}
              dotColor={roleTypeDotColor(role.role_type_id, roleTypeIds)}
              requirement={req}
            />
          );
        })}
        {requirements.length === 0 && <p className="text-sm text-slate-500">אין עדיין תפקידים בתקן המודל</p>}
      </div>
      <AddRoleRequirementForm modelId={modelId} availableRoles={availableRoles} />
    </section>
  );
}
