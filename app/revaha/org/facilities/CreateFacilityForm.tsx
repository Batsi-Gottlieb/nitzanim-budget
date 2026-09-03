"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createFacility } from "./actions";

type FacilityModel = { id: string; name: string };
type State = { error: string | null; id?: string };

export function CreateFacilityForm({ models }: { models: FacilityModel[] }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<State, FormData>(
    async (_prev, formData) => createFacility(formData),
    { error: null }
  );

  useEffect(() => {
    if (state.id) router.push(`/revaha/org/facilities/${state.id}`);
  }, [state.id, router]);

  return (
    <div className="rounded-2xl border border-[#E4E1FA] bg-white p-4">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">שם הפנימייה</label>
          <input name="name" required className="w-56 rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">מודל תקן</label>
          <select name="facility_model_id" className="w-56 rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm">
            <option value="">בחירת מודל...</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">מושמים בפועל</label>
          <input name="occupancy_actual" type="number" className="w-32 rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">מושמים מכרז</label>
          <input name="occupancy_tender" type="number" className="w-32 rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm" />
        </div>
        <button
          disabled={isPending}
          className="rounded-lg bg-[#5B4FE8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4A3FD4] disabled:opacity-60"
        >
          {isPending ? "יוצר..." : "יצירת פנימייה"}
        </button>
      </form>
      {state.error && <p className="mt-3 text-sm text-danger">{state.error}</p>}
    </div>
  );
}
