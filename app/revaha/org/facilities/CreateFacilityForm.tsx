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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">שם הפנימייה</label>
          <input name="name" required className="w-56 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">מודל תקן</label>
          <select name="facility_model_id" className="w-56 rounded-lg border border-slate-200 px-2 py-1.5 text-sm">
            <option value="">בחירת מודל...</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">מושמים בפועל</label>
          <input name="occupancy_actual" type="number" className="w-32 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">מושמים מכרז</label>
          <input name="occupancy_tender" type="number" className="w-32 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
        </div>
        <button
          disabled={isPending}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 disabled:opacity-60"
        >
          {isPending ? "יוצר..." : "יצירת פנימייה"}
        </button>
      </form>
      {state.error && <p className="mt-3 text-sm text-danger">{state.error}</p>}
    </div>
  );
}
