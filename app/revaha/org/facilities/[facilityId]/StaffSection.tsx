"use client";

import { useState, useTransition } from "react";
import {
  createStaff,
  deleteStaff,
  deleteStaffRoleTypeRate,
  updateStaff,
  upsertStaffRoleTypeRate,
} from "./actions";

type RoleType = { id: string; name: string };
type StaffRoleTypeRate = { id: string; staff_id: string; role_type_id: string; hourly_rate: number | null };
type Staff = {
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

function PayModeFields({ payMode, staff }: { payMode: string; staff?: Staff }) {
  if (payMode === "hourly") {
    return (
      <div>
        <label className="mb-1 block text-[11px] text-[#7A76A8]">תעריף לשעה</label>
        <input
          name="hourly_rate"
          type="number"
          defaultValue={staff?.hourly_rate ?? ""}
          className="w-full rounded-md border border-[#E4E1FA] px-2 py-1 text-sm"
        />
      </div>
    );
  }
  return (
    <>
      <div>
        <label className="mb-1 block text-[11px] text-[#7A76A8]">שכר חודשי</label>
        <input
          name="monthly_salary"
          type="number"
          defaultValue={staff?.monthly_salary ?? ""}
          className="w-full rounded-md border border-[#E4E1FA] px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-[#7A76A8]">שעות חודשיות</label>
        <input
          name="monthly_hours"
          type="number"
          defaultValue={staff?.monthly_hours ?? ""}
          className="w-full rounded-md border border-[#E4E1FA] px-2 py-1 text-sm"
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
    <div className="mt-2 border-t border-[#E4E1FA] pt-2">
      <div className="mb-1 text-[11px] font-bold text-[#7A76A8]">תעריף שעתי ייחודי לסוג תפקיד</div>
      <div className="flex flex-wrap gap-2">
        {rates.map((r) => {
          const rt = roleTypes.find((x) => x.id === r.role_type_id);
          return (
            <span
              key={r.id}
              className="flex items-center gap-1 rounded-full bg-[#F7F6FE] px-2.5 py-1 text-xs text-[#2A2560]"
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
          <select name="role_type_id" required className="rounded-md border border-[#E4E1FA] px-1.5 py-1 text-xs">
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
            className="w-20 rounded-md border border-[#E4E1FA] px-1.5 py-1 text-xs"
          />
          <button disabled={isPending} className="rounded-md border border-[#E4E1FA] px-2 py-1 text-xs font-semibold text-[#5B4FE8]">
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
    <div className="rounded-xl border border-[#E4E1FA] bg-[#F7F6FE]/40 p-3">
      <form action={handleSave} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-7">
        <div className="col-span-2">
          <label className="mb-1 block text-[11px] text-[#7A76A8]">שם</label>
          <input
            name="full_name"
            defaultValue={staff.full_name}
            required
            className="w-full rounded-md border border-[#E4E1FA] px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-[#7A76A8]">אופן תשלום</label>
          <select
            name="pay_mode"
            value={payMode}
            onChange={(e) => setPayMode(e.target.value as "hourly" | "monthly")}
            className="w-full rounded-md border border-[#E4E1FA] px-2 py-1 text-sm"
          >
            <option value="hourly">שעתי</option>
            <option value="monthly">חודשי</option>
          </select>
        </div>
        <PayModeFields payMode={payMode} staff={staff} />
        <div>
          <label className="mb-1 block text-[11px] text-[#7A76A8]">תוספת חודשית</label>
          <input
            name="monthly_addition"
            type="number"
            defaultValue={staff.monthly_addition ?? ""}
            className="w-full rounded-md border border-[#E4E1FA] px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-[#7A76A8]">נסיעות חודשי</label>
          <input
            name="monthly_travel"
            type="number"
            defaultValue={staff.monthly_travel ?? ""}
            className="w-full rounded-md border border-[#E4E1FA] px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-[#7A76A8]">סוג העסקה</label>
          <select
            name="employment_type"
            defaultValue={staff.employment_type}
            className="w-full rounded-md border border-[#E4E1FA] px-2 py-1 text-sm"
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
          <label htmlFor={`kh-${staff.id}`} className="text-[11px] text-[#7A76A8]">
            קרן השתלמות
          </label>
        </div>
        <div className="col-span-2 flex gap-2 sm:col-span-7">
          <button
            disabled={isPending}
            className="rounded-lg bg-[#5B4FE8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4A3FD4] disabled:opacity-60"
          >
            {isPending ? "שומר..." : "שמירה"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => deleteStaff(staff.id, facilityId))}
            className="rounded-lg border border-[#E4E1FA] px-3 py-1.5 text-xs font-semibold text-danger hover:bg-white disabled:opacity-60"
          >
            הסרה
          </button>
        </div>
      </form>
      <RoleTypeRates staffId={staff.id} facilityId={facilityId} roleTypes={roleTypes} rates={rates} />
    </div>
  );
}

export function StaffSection({
  facilityId,
  staff,
  roleTypes,
  roleTypeRates,
}: {
  facilityId: string;
  staff: Staff[];
  roleTypes: RoleType[];
  roleTypeRates: StaffRoleTypeRate[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      await createStaff(facilityId, formData);
    });
  }

  return (
    <section className="rounded-2xl border border-[#E4E1FA] bg-white p-5">
      <h2 className="mb-1 text-sm font-semibold text-[#2A2560]">צוות</h2>
      <p className="mb-3 text-xs text-[#7A76A8]">עובדי הפנימייה, תעריפים ותוספות חודשיות קבועות.</p>
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
        {staff.length === 0 && <p className="text-sm text-[#7A76A8]">אין עדיין עובדים בפנימייה זו</p>}
      </div>

      <form action={handleAdd} className="mt-4 flex flex-wrap items-end gap-2 border-t border-[#E4E1FA] pt-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">שם עובד חדש</label>
          <input name="full_name" required className="w-44 rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">אופן תשלום</label>
          <select name="pay_mode" defaultValue="hourly" className="w-32 rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm">
            <option value="hourly">שעתי</option>
            <option value="monthly">חודשי</option>
          </select>
        </div>
        <button
          disabled={isPending}
          className="rounded-lg bg-[#5B4FE8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4A3FD4] disabled:opacity-60"
        >
          {isPending ? "מוסיף..." : "הוספת עובד"}
        </button>
      </form>
    </section>
  );
}
