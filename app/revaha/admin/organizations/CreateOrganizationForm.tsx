"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { createOrganizationWithUser } from "./actions";

type State = { error: string | null; email?: string; password?: string };

export function CreateOrganizationForm() {
  const [state, formAction, isPending] = useActionState<State, FormData>(
    async (_prev, formData) => createOrganizationWithUser(formData),
    { error: null }
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">שם הארגון המפעיל</label>
          <input name="name" required className="w-56 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">אימייל</label>
          <input name="email" type="email" required className="w-56 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">טלפון</label>
          <input name="phone" className="w-40 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" />
        </div>
        <button
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 disabled:opacity-60"
        >
          <Plus className="h-3.5 w-3.5" />
          {isPending ? "יוצר..." : "פתיחת לקוח (ארגון) חדש"}
        </button>
      </form>
      {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      {state.password && (
        <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm">
          <p className="font-semibold text-slate-800">פרטי התחברות לארגון (מסרו באופן מאובטח, אינם יוצגו שוב):</p>
          <p className="mt-1 text-slate-700">
            אימייל: <span className="font-mono">{state.email}</span> · סיסמה זמנית:{" "}
            <span className="font-mono">{state.password}</span>
          </p>
        </div>
      )}
    </div>
  );
}
