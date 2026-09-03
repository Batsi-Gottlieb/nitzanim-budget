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
    <section className="rounded-2xl border border-[#E4E1FA] bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold text-[#2A2560]">פרטי הפנימייה</h2>
      <form action={handleSave} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">שם הפנימייה</label>
          <input
            name="name"
            defaultValue={facility.name}
            required
            className="w-full rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">מודל תקן</label>
          <select
            name="facility_model_id"
            defaultValue={facility.facility_model_id ?? ""}
            className="w-full rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm"
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
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">מושמים בפועל</label>
          <input
            name="occupancy_actual"
            type="number"
            defaultValue={facility.occupancy_actual ?? ""}
            className="w-full rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">מושמים מכרז</label>
          <input
            name="occupancy_tender"
            type="number"
            defaultValue={facility.occupancy_tender ?? ""}
            className="w-full rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm"
          />
        </div>
        <div className="sm:col-span-4 flex items-center gap-4">
          <button
            disabled={isPending}
            className="rounded-lg bg-[#5B4FE8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4A3FD4] disabled:opacity-60"
          >
            {isPending ? "שומר..." : "שמירת פרטים"}
          </button>
          {coefficient !== null && (
            <span className="text-xs text-[#7A76A8]">מקדם מושמים: {coefficient.toFixed(0)}%</span>
          )}
        </div>
      </form>
    </section>
  );
}
