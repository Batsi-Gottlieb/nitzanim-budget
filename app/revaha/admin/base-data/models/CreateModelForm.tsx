"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createFacilityModel } from "../actions";

type State = { error: string | null; id?: string };

export function CreateModelForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<State, FormData>(
    async (_prev, formData) => createFacilityModel(formData),
    { error: null }
  );

  useEffect(() => {
    if (state.id) router.push(`/revaha/admin/base-data/models/${state.id}`);
  }, [state.id, router]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">שם המודל</label>
          <input
            name="name"
            required
            placeholder="לדוגמה: עוגן 4"
            className="w-56 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
        </div>
        <button
          disabled={isPending}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 disabled:opacity-60"
        >
          {isPending ? "יוצר..." : "יצירת מודל"}
        </button>
      </form>
      {state.error && <p className="mt-3 text-sm text-danger">{state.error}</p>}
    </div>
  );
}
