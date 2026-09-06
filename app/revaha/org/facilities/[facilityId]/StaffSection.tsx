"use client";

import { useActionState, useRef, useState } from "react";
import { FileSpreadsheet, UserPlus, Upload } from "lucide-react";
import { Facility, PayMode, ScheduleMethod, DailyShifts } from "@/lib/revaha/types";
import { importStaffFromExcel } from "./actions";
import { AddStaffModal } from "./AddStaffModal";
import { StaffRoleTable } from "./StaffRoleTable";

export type Staff = {
  id: string;
  full_name: string;
  phone: string | null;
  id_number: string | null;
  monthly_addition: number | null;
  monthly_travel: number | null;
  has_training_fund: boolean;
  employment_type: "שכיר" | "עצמאי";
};

export function PayModeFields({
  payMode,
  defaults,
  namePrefix = "",
}: {
  payMode: string;
  defaults?: { hourly_rate?: number | null; monthly_salary?: number | null; monthly_hours?: number | null };
  namePrefix?: string;
}) {
  const field = (name: string) => `${namePrefix}${name}`;
  if (payMode === "hourly") {
    return (
      <div>
        <label className="mb-1 block text-[11px] text-slate-500">תעריף לשעה</label>
        <input
          name={field("hourly_rate")}
          type="number"
          defaultValue={defaults?.hourly_rate ?? ""}
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
          name={field("monthly_salary")}
          type="number"
          defaultValue={defaults?.monthly_salary ?? ""}
          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-slate-500">שעות חודשיות</label>
        <input
          name={field("monthly_hours")}
          type="number"
          defaultValue={defaults?.monthly_hours ?? ""}
          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
        />
      </div>
    </>
  );
}

function ImportStaffForm({ facilityId }: { facilityId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, isPending] = useActionState<
    { error: string | null; count?: number; warnings?: string[] },
    FormData
  >(
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
      <p className="mt-2 text-[11px] text-slate-400">
        עובד עם כמה תפקידים — שורה נפרדת לכל תפקיד באותו שם. קיבוץ עובדים בייבוא נעשה לפי שם מלא זהה.
      </p>
      {state.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
      {state.count !== undefined && !state.error && (
        <p className="mt-2 text-xs text-emerald-600">יובאו {state.count} עובדים בהצלחה</p>
      )}
      {state.warnings && state.warnings.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-amber-600">
          {state.warnings.map((w, i) => (
            <li key={i}>⚠ {w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

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
  daily_shifts: DailyShifts | null;
};

export function StaffSection({
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

      <StaffRoleTable facilityId={facilityId} facility={facility} staff={staff} assignments={assignments} roles={roles} />

      <ImportStaffForm facilityId={facilityId} />

      {modalOpen && <AddStaffModal facilityId={facilityId} roles={roles} onClose={() => setModalOpen(false)} />}
    </section>
  );
}
