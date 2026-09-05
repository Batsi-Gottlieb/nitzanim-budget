"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { FileSpreadsheet, UserPlus, Upload } from "lucide-react";
import {
  deleteStaff,
  deleteStaffRoleTypeRate,
  importStaffFromExcel,
  updateStaff,
  upsertStaffRoleTypeRate,
} from "./actions";
import { AddStaffModal } from "./AddStaffModal";

type RoleType = { id: string; name: string };
type StaffRoleTypeRate = { id: string; staff_id: string; role_type_id: string; hourly_rate: number | null };
export type Staff = {
  id: string;
  full_name: string;
  pay_mode: "hourly" | "monthly";
  hourly_rate: number | null;
  monthly_salary: number | null;
  monthly_hours: number | null;
  monthly_addition: number | null;
  monthly_travel: number | null;
  has_training_fund: boolean;
  employment_type: "שכיר" | "עצמאי";
};

export function PayModeFields({ payMode, staff }: { payMode: string; staff?: Staff }) {
  if (payMode === "hourly") {
    return (
      <div>
        <label className="mb-1 block text-[11px] text-slate-500">תעריף לשעה</label>
        <input
          name="hourly_rate"
          type="number"
          defaultValue={staff?.hourly_rate ?? ""}
          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
        />
      </div>
    );
  }
  return (
    <>
      <div>
        <label className="mb-1 block text-[11px] text-slate-500">שכר חודשי</label>
        <input
          name="monthly_salary"
          type="number"
          defaultValue={staff?.monthly_salary ?? ""}
          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-slate-500">שעות חודשיות</label>
        <input
          name="monthly_hours"
          type="number"
          defaultValue={staff?.monthly_hours ?? ""}
          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
        />
      </div>
    </>
  );
}

function RoleTypeRates({
  staffId,
  facilityId,
  roleTypes,
  rates,
}: {
  staffId: string;
  facilityId: string;
  roleTypes: RoleType[];
  rates: StaffRoleTypeRate[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      await upsertStaffRoleTypeRate(staffId, facilityId, formData);
    });
  }

  const configured = new Set(rates.map((r) => r.role_type_id));
  const available = roleTypes.filter((rt) => !configured.has(rt.id));

  return (
    <div className="mt-2 border-t border-slate-200 pt-2">
      <div className="mb-1 text-[11px] font-bold text-slate-500">תעריף שעתי ייחודי לסוג תפקיד</div>
      <div className="flex flex-wrap gap-2">
        {rates.map((r) => {
          const rt = roleTypes.find((x) => x.id === r.role_type_id);
          return (
            <span
              key={r.id}
              className="flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-xs text-slate-900"
            >
              {rt?.name}: ₪{r.hourly_rate}
              <button
                type="button"
                disabled={isPending}
                onClick={() => startTransition(() => deleteStaffRoleTypeRate(r.id, facilityId))}
                className="text-danger"
                aria-label="הסרה"
              >
                ✕
              </button>
            </span>
          );
        })}
      </div>
      {available.length > 0 && (
        <form action={handleAdd} className="mt-1.5 flex items-end gap-1.5">
          <select name="role_type_id" required className="rounded-lg border border-slate-200 px-1.5 py-1 text-xs">
            <option value="">סוג תפקיד...</option>
            {available.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </select>
          <input
            name="hourly_rate"
            type="number"
            placeholder="תעריף"
            required
            className="w-20 rounded-lg border border-slate-200 px-1.5 py-1 text-xs"
          />
          <button disabled={isPending} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-indigo-600">
            הוספה
          </button>
        </form>
      )}
    </div>
  );
}

function StaffRow({
  staff,
  facilityId,
  roleTypes,
  rates,
}: {
  staff: Staff;
  facilityId: string;
  roleTypes: RoleType[];
  rates: StaffRoleTypeRate[];
}) {
  const [payMode, setPayMode] = useState(staff.pay_mode);
  const [isPending, startTransition] = useTransition();

  function handleSave(formData: FormData) {
    startTransition(() => updateStaff(staff.id, facilityId, formData));
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <form action={handleSave} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-7">
        <div className="col-span-2">
          <label className="mb-1 block text-[11px] text-slate-500">שם</label>
          <input
            name="full_name"
            defaultValue={staff.full_name}
            required
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-slate-500">אופן תשלום</label>
          <select
            name="pay_mode"
            value={payMode}
            onChange={(e) => setPayMode(e.target.value as "hourly" | "monthly")}
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
          >
            <option value="hourly">שעתי</option>
            <option value="monthly">חודשי</option>
          </select>
        </div>
        <PayModeFields payMode={payMode} staff={staff} />
        <div>
          <label className="mb-1 block text-[11px] text-slate-500">תוספת חודשית</label>
          <input
            name="monthly_addition"
            type="number"
            defaultValue={staff.monthly_addition ?? ""}
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-slate-500">נסיעות חודשי</label>
          <input
            name="monthly_travel"
            type="number"
            defaultValue={staff.monthly_travel ?? ""}
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-slate-500">סוג העסקה</label>
          <select
            name="employment_type"
            defaultValue={staff.employment_type}
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
          >
            <option value="שכיר">שכיר</option>
            <option value="עצמאי">עצמאי</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="checkbox"
            id={`kh-${staff.id}`}
            name="has_training_fund"
            defaultChecked={staff.has_training_fund}
            className="h-4 w-4"
          />
          <label htmlFor={`kh-${staff.id}`} className="text-[11px] text-slate-500">
            קרן השתלמות
          </label>
        </div>
        <div className="col-span-2 flex gap-2 sm:col-span-7">
          <button
            disabled={isPending}
            className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 disabled:opacity-60"
          >
            {isPending ? "שומר..." : "שמירה"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => deleteStaff(staff.id, facilityId))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-white disabled:opacity-60"
          >
            הסרה
          </button>
        </div>
      </form>
      <RoleTypeRates staffId={staff.id} facilityId={facilityId} roleTypes={roleTypes} rates={rates} />
    </div>
  );
}

function ImportStaffForm({ facilityId }: { facilityId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, isPending] = useActionState<{ error: string | null; count?: number }, FormData>(
    async (_prev, formData) => {
      const result = await importStaffFromExcel(facilityId, formData);
      if (!result.error && fileInputRef.current) fileInputRef.current.value = "";
      return result;
    },
    { error: null }
  );

  return (
    <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-500">
        <FileSpreadsheet className="h-3.5 w-3.5" />
        קליטה מרוכזת — ייבוא עובדים מאקסל
      </div>
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          name="file"
          type="file"
          accept=".xlsx"
          required
          className="w-56 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
        />
        <button
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 disabled:opacity-60"
        >
          <Upload className="h-3.5 w-3.5" />
          {isPending ? "מייבא..." : "ייבוא"}
        </button>
        <a
          href="/api/revaha/staff-template"
          className="text-xs font-semibold text-indigo-600 hover:underline"
        >
          הורדת תבנית לדוגמה
        </a>
      </form>
      {state.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
      {state.count !== undefined && !state.error && (
        <p className="mt-2 text-xs text-emerald-600">יובאו {state.count} עובדים בהצלחה</p>
      )}
    </div>
  );
}

export function StaffSection({
  facilityId,
  staff,
  roleTypes,
  roleTypeRates,
  roles,
}: {
  facilityId: string;
  staff: Staff[];
  roleTypes: RoleType[];
  roleTypeRates: StaffRoleTypeRate[];
  roles: { id: string; name: string }[];
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">צוות</h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700"
        >
          <UserPlus className="h-3.5 w-3.5" />
          קליטה בודדת
        </button>
      </div>
      <p className="mb-3 text-xs text-slate-500">עובדי הפנימייה, תעריפים ותוספות חודשיות קבועות.</p>
      <div className="space-y-2">
        {staff.map((s) => (
          <StaffRow
            key={s.id}
            staff={s}
            facilityId={facilityId}
            roleTypes={roleTypes}
            rates={roleTypeRates.filter((r) => r.staff_id === s.id)}
          />
        ))}
        {staff.length === 0 && <p className="text-sm text-slate-500">אין עדיין עובדים בפנימייה זו</p>}
      </div>

      <ImportStaffForm facilityId={facilityId} />

      {modalOpen && <AddStaffModal facilityId={facilityId} roles={roles} onClose={() => setModalOpen(false)} />}
    </section>
  );
}
