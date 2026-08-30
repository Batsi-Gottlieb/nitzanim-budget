"use client";

import { useActionState, useState, useTransition } from "react";
import { addUserToClient, impersonateUser, resetUserPassword, updateUserName } from "../actions";

type UserRow = { id: string; email: string | null; full_name: string | null };

export function UsersSection({ clientId, initialUsers }: { clientId: string; initialUsers: UserRow[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function handleResetPassword(userId: string) {
    startTransition(async () => {
      const result = await resetUserPassword(userId, clientId);
      if (result?.password) {
        setRevealed((prev) => ({ ...prev, [userId]: result.password! }));
      }
    });
  }

  function handleNameChange(userId: string, full_name: string) {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, full_name } : u)));
  }

  function handleSaveName(userId: string) {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const fd = new FormData();
    fd.set("full_name", user.full_name ?? "");
    startTransition(() => updateUserName(userId, clientId, fd));
  }

  const addAction = async (_prev: { error: string | null }, formData: FormData) => {
    const fullNameInput = formData.get("full_name") as string;
    const result = await addUserToClient(clientId, formData);
    if (result?.password && result.email && result.id) {
      setUsers((prev) => [...prev, { id: result.id!, email: result.email!, full_name: fullNameInput || null }]);
      setRevealed((prev) => ({ ...prev, [result.id!]: result.password! }));
    }
    return { error: result?.error ?? null };
  };
  const [addState, addFormAction, addPending] = useActionState(addAction, { error: null });

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-3 text-sm font-semibold">משתמשים מקושרים ללקוח זה</h2>
      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.id} className="rounded-xl border border-border bg-surface-muted/40 p-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground-muted">שם</label>
                <input
                  value={u.full_name ?? ""}
                  onChange={(e) => handleNameChange(u.id, e.target.value)}
                  onBlur={() => handleSaveName(u.id)}
                  className="w-40 rounded-md border border-border px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground-muted">אימייל</label>
                <div className="px-2 py-1.5 text-sm text-foreground-muted">{u.email}</div>
              </div>
              <form action={impersonateUser}>
                <input type="hidden" name="user_id" value={u.id} />
                <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-primary hover:bg-surface-muted">
                  כניסה כמשתמש זה
                </button>
              </form>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleResetPassword(u.id)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-muted disabled:opacity-60"
              >
                איפוס סיסמה
              </button>
            </div>
            {revealed[u.id] && (
              <p className="mt-2 rounded-lg bg-accent/15 p-2 text-xs">
                סיסמה חדשה (הציגו פעם אחת): <span className="font-mono font-semibold">{revealed[u.id]}</span>
              </p>
            )}
          </div>
        ))}
        {users.length === 0 && <p className="text-sm text-foreground-muted">אין עדיין משתמשים ללקוח זה</p>}
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <h3 className="mb-2 text-xs font-bold text-foreground-muted">הוספת משתמש</h3>
        <form action={addFormAction} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-muted">שם</label>
            <input name="full_name" className="w-40 rounded-md border border-border px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-muted">אימייל</label>
            <input name="email" type="email" required className="w-56 rounded-md border border-border px-2 py-1.5 text-sm" />
          </div>
          <button
            disabled={addPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            {addPending ? "מוסיף..." : "הוספת משתמש"}
          </button>
        </form>
        {addState.error && <p className="mt-2 text-sm text-danger">{addState.error}</p>}
      </div>
    </section>
  );
}
