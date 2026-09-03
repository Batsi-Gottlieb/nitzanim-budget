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
    <div className="rounded-2xl border border-[#E4E1FA] bg-white p-4">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">שם המודל</label>
          <input
            name="name"
            required
            placeholder="לדוגמה: עוגן 4"
            className="w-56 rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm"
          />
        </div>
        <button
          disabled={isPending}
          className="rounded-lg bg-[#5B4FE8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4A3FD4] disabled:opacity-60"
        >
          {isPending ? "יוצר..." : "יצירת מודל"}
        </button>
      </form>
      {state.error && <p className="mt-3 text-sm text-danger">{state.error}</p>}
    </div>
  );
}
