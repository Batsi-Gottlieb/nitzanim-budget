"use client";

import { useActionState } from "react";
import { createRole } from "./actions";
import { roleTypeDotColor } from "@/lib/revaha/roleTypeColors";

type RoleType = { id: string; name: string };
type Role = { id: string; name: string; role_type_id: string };

export function RolesSection({ roleTypes, roles }: { roleTypes: RoleType[]; roles: Role[] }) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error: string | null }, formData: FormData) => createRole(formData),
    { error: null }
  );
  const roleTypeIds = roleTypes.map((rt) => rt.id);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      <h2 className="mb-1 text-sm font-bold text-slate-900">תפקידים</h2>
      <p className="mb-3 text-xs text-slate-500">התפקידים הספציפיים בפנימייה, כל אחד משויך לסוג תפקיד.</p>
      <div className="space-y-3">
        {roleTypes.map((rt) => {
          const rtRoles = roles.filter((r) => r.role_type_id === rt.id);
          if (rtRoles.length === 0) return null;
          const dotColor = roleTypeDotColor(rt.id, roleTypeIds);
          return (
            <div key={rt.id}>
              <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                {rt.name}
              </div>
              <div className="flex flex-wrap gap-2">
                {rtRoles.map((r) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1.5 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                  >
                    {r.name}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        {roles.length === 0 && <p className="text-sm text-slate-500">אין תפקידים עדיין</p>}
      </div>
      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">תפקיד חדש</label>
          <input name="name" required className="w-48 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">סוג תפקיד</label>
          <select name="role_type_id" required className="w-48 rounded-lg border border-slate-200 px-2 py-1.5 text-sm">
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
          className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 disabled:opacity-60"
        >
          {isPending ? "מוסיף..." : "הוספה"}
        </button>
      </form>
      {state.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
    </section>
  );
}
