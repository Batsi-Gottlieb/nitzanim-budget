"use client";

import { useActionState } from "react";
import { createRoleType } from "./actions";
import { roleTypeDotColor } from "@/lib/revaha/roleTypeColors";

type RoleType = { id: string; name: string };

export function RoleTypesSection({ roleTypes }: { roleTypes: RoleType[] }) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error: string | null }, formData: FormData) => createRoleType(formData),
    { error: null }
  );
  const roleTypeIds = roleTypes.map((rt) => rt.id);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      <h2 className="mb-1 text-sm font-bold text-slate-900">סוגי תפקיד</h2>
      <p className="mb-3 text-xs text-slate-500">קטגוריה רחבה (לדוגמה: הדרכה, רפואי) — עובד שעובר בין תפקידים מאותו סוג תפקיד שומר על אותו תעריף.</p>
      <div className="flex flex-wrap gap-2">
        {roleTypes.map((rt) => (
          <span
            key={rt.id}
            className="inline-flex items-center gap-1.5 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
          >
            <span className={`h-2 w-2 rounded-full ${roleTypeDotColor(rt.id, roleTypeIds)}`} />
            {rt.name}
          </span>
        ))}
        {roleTypes.length === 0 && <p className="text-sm text-slate-500">אין סוגי תפקיד עדיין</p>}
      </div>
      <form action={formAction} className="mt-4 flex items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">סוג תפקיד חדש</label>
          <input name="name" required className="w-56 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
        </div>
        <button
          disabled={isPending}
          className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 disabled:opacity-60"
        >
          {isPending ? "מוסיף..." : "הוספה"}
        </button>
      </form>
      {state.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
    </section>
  );
}
