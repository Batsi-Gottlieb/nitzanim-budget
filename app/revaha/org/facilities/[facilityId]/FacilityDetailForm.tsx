"use client";

import { useTransition } from "react";
import { updateFacility } from "../actions";

type FacilityModel = { id: string; name: string };
type Facility = {
  id: string;
  name: string;
  facility_model_id: string | null;
  occupancy_actual: number | null;
  occupancy_tender: number | null;
};

export function FacilityDetailForm({ facility, models }: { facility: Facility; models: FacilityModel[] }) {
  const [isPending, startTransition] = useTransition();

  function handleSave(formData: FormData) {
    startTransition(() => updateFacility(facility.id, formData));
  }

  const coefficient =
    facility.occupancy_tender && facility.occupancy_tender > 0
      ? ((facility.occupancy_actual ?? 0) / facility.occupancy_tender) * 100
      : null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      <h2 className="mb-3 text-sm font-bold text-slate-900">פרטי הפנימייה</h2>
      <form action={handleSave} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">שם הפנימייה</label>
          <input
            name="name"
            defaultValue={facility.name}
            required
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">מודל תקן</label>
          <select
            name="facility_model_id"
            defaultValue={facility.facility_model_id ?? ""}
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          >
            <option value="">ללא</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">מושמים בפועל</label>
          <input
            name="occupancy_actual"
            type="number"
            defaultValue={facility.occupancy_actual ?? ""}
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">מושמים מכרז</label>
          <input
            name="occupancy_tender"
            type="number"
            defaultValue={facility.occupancy_tender ?? ""}
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="sm:col-span-4 flex items-center gap-4">
          <button
            disabled={isPending}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 disabled:opacity-60"
          >
            {isPending ? "שומר..." : "שמירת פרטים"}
          </button>
          {coefficient !== null && (
            <span className="rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700">
              מקדם מושמים: {coefficient.toFixed(0)}%
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
