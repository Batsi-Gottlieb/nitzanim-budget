"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";
import { createStaffWithAssignments } from "./actions";
import { PayModeFields } from "./StaffSection";
import { RoleScheduleFields } from "./RoleScheduleFields";

type Role = { id: string; name: string };

function StaffRoleBlock({ roleKey, roles, onRemove }: { roleKey: number; roles: Role[]; onRemove: () => void }) {
  const [roleId, setRoleId] = useState("");
  const roleName = roles.find((r) => r.id === roleId)?.name ?? "";
  const prefix = `role_${roleKey}_`;

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex items-center gap-2">
        <select
          name={`${prefix}id`}
          required
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          className="w-52 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">בחירת תפקיד...</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onRemove}
          aria-label="הסרת תפקיד"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {roleId && <RoleScheduleFields roleName={roleName} namePrefix={prefix} />}
    </div>
  );
}

export function AddStaffModal({ facilityId, roles, onClose }: { facilityId: string; roles: Role[]; onClose: () => void }) {
  const [payMode, setPayMode] = useState<"hourly" | "monthly">("hourly");
  const [roleKeys, setRoleKeys] = useState<number[]>([0]);
  const [nextKey, setNextKey] = useState(1);

  const [state, formAction, isPending] = useActionState<{ error: string | null }, FormData>(
    async (_prev, formData) => {
      formData.set("role_keys", roleKeys.join(","));
      const result = await createStaffWithAssignments(facilityId, formData);
      if (!result.error) onClose();
      return result;
    },
    { error: null }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">קליטת עובד חדש</h2>
          <button type="button" onClick={onClose} aria-label="סגירה" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">שם העובד</label>
              <input name="full_name" required className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">אופן תשלום</label>
              <select
                name="pay_mode"
                value={payMode}
                onChange={(e) => setPayMode(e.target.value as "hourly" | "monthly")}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
              >
                <option value="hourly">שעתי</option>
                <option value="monthly">חודשי</option>
              </select>
            </div>
            <PayModeFields payMode={payMode} />
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">תוספת חודשית</label>
              <input name="monthly_addition" type="number" className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">נסיעות חודשי</label>
              <input name="monthly_travel" type="number" className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">סוג העסקה</label>
              <select name="employment_type" defaultValue="שכיר" className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm">
                <option value="שכיר">שכיר</option>
                <option value="עצמאי">עצמאי</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5 pt-5">
              <input type="checkbox" id="add-staff-training-fund" name="has_training_fund" className="h-4 w-4" />
              <label htmlFor="add-staff-training-fund" className="text-xs text-slate-500">
                קרן השתלמות
              </label>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900">תפקידים ושיבוץ</h3>
              <button
                type="button"
                onClick={() => {
                  setRoleKeys((keys) => [...keys, nextKey]);
                  setNextKey((k) => k + 1);
                }}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" />
                הוספת תפקיד
              </button>
            </div>
            <div className="space-y-3">
              {roleKeys.map((key) => (
                <StaffRoleBlock
                  key={key}
                  roleKey={key}
                  roles={roles}
                  onRemove={() => setRoleKeys((keys) => keys.filter((k) => k !== key))}
                />
              ))}
              {roleKeys.length === 0 && <p className="text-xs text-slate-500">ניתן להוסיף תפקיד גם מאוחר יותר.</p>}
            </div>
          </div>

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}

          <button
            disabled={isPending}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 disabled:opacity-60"
          >
            {isPending ? "קולט עובד..." : "קליטת עובד"}
          </button>
        </form>
      </div>
    </div>
  );
}
