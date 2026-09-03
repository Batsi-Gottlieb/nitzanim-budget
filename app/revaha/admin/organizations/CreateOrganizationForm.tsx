"use client";

import { useActionState } from "react";
import { createOrganizationWithUser } from "./actions";

type State = { error: string | null; email?: string; password?: string };

export function CreateOrganizationForm() {
  const [state, formAction, isPending] = useActionState<State, FormData>(
    async (_prev, formData) => createOrganizationWithUser(formData),
    { error: null }
  );

  return (
    <div className="rounded-2xl border border-[#E4E1FA] bg-white p-4">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">שם הארגון המפעיל</label>
          <input name="name" required className="w-56 rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">אימייל</label>
          <input name="email" type="email" required className="w-56 rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">טלפון</label>
          <input name="phone" className="w-40 rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm" />
        </div>
        <button
          disabled={isPending}
          className="rounded-lg bg-[#5B4FE8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4A3FD4] disabled:opacity-60"
        >
          {isPending ? "יוצר..." : "יצירת ארגון + משתמש"}
        </button>
      </form>
      {state.error && <p className="mt-3 text-sm text-danger">{state.error}</p>}
      {state.password && (
        <div className="mt-3 rounded-lg bg-[#F7F6FE] p-3 text-sm">
          <p className="font-semibold text-[#2A2560]">פרטי התחברות לארגון (מסרו באופן מאובטח, אינם יוצגו שוב):</p>
          <p className="mt-1 text-[#2A2560]">
            אימייל: <span className="font-mono">{state.email}</span> · סיסמה זמנית:{" "}
            <span className="font-mono">{state.password}</span>
          </p>
        </div>
      )}
    </div>
  );
}
