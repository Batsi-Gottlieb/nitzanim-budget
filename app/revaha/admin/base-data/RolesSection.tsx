"use client";

import { useActionState } from "react";
import { createRole } from "./actions";

type RoleType = { id: string; name: string };
type Role = { id: string; name: string; role_type_id: string };

export function RolesSection({ roleTypes, roles }: { roleTypes: RoleType[]; roles: Role[] }) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error: string | null }, formData: FormData) => createRole(formData),
    { error: null }
  );

  return (
    <section className="rounded-2xl border border-[#E4E1FA] bg-white p-5">
      <h2 className="mb-1 text-sm font-semibold text-[#2A2560]">תפקידים</h2>
      <p className="mb-3 text-xs text-[#7A76A8]">התפקידים הספציפיים בפנימייה, כל אחד משויך לסוג תפקיד.</p>
      <div className="space-y-3">
        {roleTypes.map((rt) => {
          const rtRoles = roles.filter((r) => r.role_type_id === rt.id);
          if (rtRoles.length === 0) return null;
          return (
            <div key={rt.id}>
              <div className="mb-1 text-xs font-bold text-[#7A76A8]">{rt.name}</div>
              <div className="flex flex-wrap gap-2">
                {rtRoles.map((r) => (
                  <span key={r.id} className="rounded-full bg-[#F7F6FE] px-3 py-1 text-xs font-medium text-[#2A2560]">
                    {r.name}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        {roles.length === 0 && <p className="text-sm text-[#7A76A8]">אין תפקידים עדיין</p>}
      </div>
      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">תפקיד חדש</label>
          <input name="name" required className="w-48 rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">סוג תפקיד</label>
          <select name="role_type_id" required className="w-48 rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm">
            <option value="">בחירה...</option>
            {roleTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </select>
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
