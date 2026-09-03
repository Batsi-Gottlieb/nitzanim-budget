"use client";

import { useActionState } from "react";
import { createRoleType } from "./actions";

type RoleType = { id: string; name: string };

export function RoleTypesSection({ roleTypes }: { roleTypes: RoleType[] }) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error: string | null }, formData: FormData) => createRoleType(formData),
    { error: null }
  );

  return (
    <section className="rounded-2xl border border-[#E4E1FA] bg-white p-5">
      <h2 className="mb-1 text-sm font-semibold text-[#2A2560]">סוגי תפקיד</h2>
      <p className="mb-3 text-xs text-[#7A76A8]">קטגוריה רחבה (לדוגמה: הדרכה, רפואי) — עובד שעובר בין תפקידים מאותו סוג תפקיד שומר על אותו תעריף.</p>
      <div className="flex flex-wrap gap-2">
        {roleTypes.map((rt) => (
          <span key={rt.id} className="rounded-full bg-[#F7F6FE] px-3 py-1 text-xs font-medium text-[#2A2560]">
            {rt.name}
          </span>
        ))}
        {roleTypes.length === 0 && <p className="text-sm text-[#7A76A8]">אין סוגי תפקיד עדיין</p>}
      </div>
      <form action={formAction} className="mt-4 flex items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">סוג תפקיד חדש</label>
          <input name="name" required className="w-56 rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm" />
        </div>
        <button
          disabled={isPending}
          className="rounded-lg bg-[#5B4FE8] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#4A3FD4] disabled:opacity-60"
        >
          {isPending ? "מוסיף..." : "הוספה"}
        </button>
      </form>
      {state.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
    </section>
  );
}
