"use client";

import { useActionState } from "react";
import { createClientWithUser } from "./actions";

type State = { error: string | null; email?: string; password?: string };

export function CreateClientForm() {
  const [state, formAction, isPending] = useActionState<State, FormData>(
    async (_prev, formData) => createClientWithUser(formData),
    { error: null }
  );

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground-muted">שם הלקוח</label>
          <input name="name" required className="w-56 rounded-md border border-border px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground-muted">אימייל</label>
          <input name="email" type="email" required className="w-56 rounded-md border border-border px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground-muted">טלפון</label>
          <input name="phone" className="w-40 rounded-md border border-border px-2 py-1.5 text-sm" />
        </div>
        <button
          disabled={isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        >
          {isPending ? "יוצר..." : "יצירת לקוח + משתמש"}
        </button>
      </form>
      {state.error && <p className="mt-3 text-sm text-danger">{state.error}</p>}
      {state.password && (
        <div className="mt-3 rounded-lg bg-accent/15 p-3 text-sm">
          <p className="font-semibold">פרטי התחברות ללקוח (מסרו באופן מאובטח, אינם יוצגו שוב):</p>
          <p className="mt-1">
            אימייל: <span className="font-mono">{state.email}</span> · סיסמה זמנית:{" "}
            <span className="font-mono">{state.password}</span>
          </p>
        </div>
      )}
    </div>
  );
}
