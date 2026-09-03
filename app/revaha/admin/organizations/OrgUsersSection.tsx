"use client";

import { useActionState, useState, useTransition } from "react";
import { addUserToOrganization, resetOrgUserPassword } from "./actions";

type UserRow = { id: string; email: string | null; full_name: string | null };

export function OrgUsersSection({ organizationId, initialUsers }: { organizationId: string; initialUsers: UserRow[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function handleResetPassword(userId: string) {
    startTransition(async () => {
      const result = await resetOrgUserPassword(userId, organizationId);
      if (result?.password) {
        setRevealed((prev) => ({ ...prev, [userId]: result.password! }));
      }
    });
  }

  const addAction = async (_prev: { error: string | null }, formData: FormData) => {
    const fullNameInput = formData.get("full_name") as string;
    const result = await addUserToOrganization(organizationId, formData);
    if (result?.password && result.email && result.id) {
      setUsers((prev) => [...prev, { id: result.id!, email: result.email!, full_name: fullNameInput || null }]);
      setRevealed((prev) => ({ ...prev, [result.id!]: result.password! }));
    }
    return { error: result?.error ?? null };
  };
  const [addState, addFormAction, addPending] = useActionState(addAction, { error: null });

  return (
    <section className="rounded-2xl border border-[#E4E1FA] bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold text-[#2A2560]">משתמשים מקושרים לארגון זה</h2>
      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.id} className="rounded-xl border border-[#E4E1FA] bg-[#F7F6FE]/40 p-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#7A76A8]">שם</label>
                <div className="px-2 py-1.5 text-sm text-[#2A2560]">{u.full_name}</div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#7A76A8]">אימייל</label>
                <div className="px-2 py-1.5 text-sm text-[#7A76A8]">{u.email}</div>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleResetPassword(u.id)}
                className="rounded-lg border border-[#E4E1FA] px-3 py-1.5 text-xs font-semibold text-[#2A2560] hover:bg-[#F7F6FE] disabled:opacity-60"
              >
                איפוס סיסמה
              </button>
            </div>
            {revealed[u.id] && (
              <p className="mt-2 rounded-lg bg-[#F7F6FE] p-2 text-xs text-[#2A2560]">
                סיסמה חדשה (הציגו פעם אחת): <span className="font-mono font-semibold">{revealed[u.id]}</span>
              </p>
            )}
          </div>
        ))}
        {users.length === 0 && <p className="text-sm text-[#7A76A8]">אין עדיין משתמשים לארגון זה</p>}
      </div>

      <div className="mt-5 border-t border-[#E4E1FA] pt-4">
        <h3 className="mb-2 text-xs font-bold text-[#7A76A8]">הוספת משתמש</h3>
        <form action={addFormAction} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#7A76A8]">שם</label>
            <input name="full_name" className="w-40 rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#7A76A8]">אימייל</label>
            <input name="email" type="email" required className="w-56 rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm" />
          </div>
          <button
            disabled={addPending}
            className="rounded-lg bg-[#5B4FE8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4A3FD4] disabled:opacity-60"
          >
            {addPending ? "מוסיף..." : "הוספת משתמש"}
          </button>
        </form>
        {addState.error && <p className="mt-2 text-sm text-danger">{addState.error}</p>}
      </div>
    </section>
  );
}
