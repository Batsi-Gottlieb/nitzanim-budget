"use client";

import { useTransition } from "react";
import { deleteFacilityModelRole, upsertFacilityModelRole } from "../../actions";

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
  requirement,
}: {
  modelId: string;
  role: Role;
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
      className="grid grid-cols-2 items-end gap-2 rounded-xl border border-[#E4E1FA] bg-[#F7F6FE]/40 p-3 sm:grid-cols-8"
    >
      <div className="col-span-2 text-sm font-medium text-[#2A2560] sm:col-span-1">{role.name}</div>
      <div>
        <label className="mb-1 block text-[11px] text-[#7A76A8]">תקנים נדרשים</label>
        <input
          name="required_positions"
          type="number"
          step="0.1"
          defaultValue={requirement.required_positions ?? ""}
          className="w-full rounded-md border border-[#E4E1FA] px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-[#7A76A8]">שעות חודשי משרה מלאה</label>
        <input
          name="monthly_hours_full_time"
          type="number"
          defaultValue={requirement.monthly_hours_full_time ?? ""}
          className="w-full rounded-md border border-[#E4E1FA] px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-[#7A76A8]">ימי עבודה בחודש</label>
        <input
          name="workdays_per_month"
          type="number"
          step="0.1"
          defaultValue={requirement.workdays_per_month ?? ""}
          className="w-full rounded-md border border-[#E4E1FA] px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-[#7A76A8]">ימי עבודה בשבוע</label>
        <input
          name="workdays_per_week"
          type="number"
          step="0.1"
          defaultValue={requirement.workdays_per_week ?? ""}
          className="w-full rounded-md border border-[#E4E1FA] px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-[#7A76A8]">אחוז מקסימלי</label>
        <input
          name="max_percent"
          type="number"
          step="0.1"
          defaultValue={requirement.max_percent ?? ""}
          className="w-full rounded-md border border-[#E4E1FA] px-2 py-1 text-sm"
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
        <label htmlFor={`occ-${requirement.id}`} className="text-[11px] text-[#7A76A8]">
          מושפע ממושמים
        </label>
      </div>
      <div className="col-span-2 flex items-end gap-2 sm:col-span-8">
        <div className="flex-1">
          <label className="mb-1 block text-[11px] text-[#7A76A8]">הערות</label>
          <input
            name="notes"
            defaultValue={requirement.notes ?? ""}
            className="w-full rounded-md border border-[#E4E1FA] px-2 py-1 text-sm"
          />
        </div>
        <button
          disabled={isPending}
          className="rounded-lg bg-[#5B4FE8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4A3FD4] disabled:opacity-60"
        >
          {isPending ? "שומר..." : "שמירה"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => deleteFacilityModelRole(modelId, requirement.id))}
          className="rounded-lg border border-[#E4E1FA] px-3 py-1.5 text-xs font-semibold text-danger hover:bg-white disabled:opacity-60"
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
    <form action={handleSave} className="flex flex-wrap items-end gap-2 border-t border-[#E4E1FA] pt-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-[#7A76A8]">הוספת תפקיד לתקן</label>
        <select name="role_id" required className="w-56 rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm">
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
        className="rounded-lg bg-[#5B4FE8] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#4A3FD4] disabled:opacity-60"
      >
        {isPending ? "מוסיף..." : "הוספה"}
      </button>
    </form>
  );
}

export function ModelRolesTable({
  modelId,
  roles,
  requirements,
}: {
  modelId: string;
  roles: Role[];
  requirements: FacilityModelRole[];
}) {
  const configuredRoleIds = new Set(requirements.map((r) => r.role_id));
  const availableRoles = roles.filter((r) => !configuredRoleIds.has(r.id));

  return (
    <section className="rounded-2xl border border-[#E4E1FA] bg-white p-5">
      <h2 className="mb-1 text-sm font-semibold text-[#2A2560]">תקן תפקידים למודל</h2>
      <p className="mb-3 text-xs text-[#7A76A8]">כמות תקנים נדרשת לכל תפקיד, ופרמטרי החישוב שלו.</p>
      <div className="space-y-2">
        {requirements.map((req) => {
          const role = roles.find((r) => r.id === req.role_id);
          if (!role) return null;
          return <RoleRequirementRow key={req.id} modelId={modelId} role={role} requirement={req} />;
        })}
        {requirements.length === 0 && <p className="text-sm text-[#7A76A8]">אין עדיין תפקידים בתקן המודל</p>}
      </div>
      <AddRoleRequirementForm modelId={modelId} availableRoles={availableRoles} />
    </section>
  );
}
