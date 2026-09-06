"use client";

import { useActionState, useState, useTransition } from "react";
import { LogIn } from "lucide-react";
import { addUserToResellerCompany, impersonateCompanyAdmin, resetCompanyUserPassword } from "./actions";

type UserRow = { id: string; email: string | null; full_name: string | null; role: string };

export function CompanyUsersSection({ companyId, initialUsers }: { companyId: string; initialUsers: UserRow[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function handleResetPassword(userId: string) {
    startTransition(async () => {
      const result = await resetCompanyUserPassword(userId, companyId);
      if (result?.password) setRevealed((prev) => ({ ...prev, [userId]: result.password! }));
    });
  }

  const addAction = async (_prev: { error: string | null }, formData: FormData) => {
    const fullNameInput = formData.get("full_name") as string;
    const roleInput = formData.get("role") as string;
    const result = await addUserToResellerCompany(companyId, formData);
    if (result?.password && result.email && result.id) {
      setUsers((prev) => [...prev, { id: result.id!, email: result.email!, full_name: fullNameInput || null, role: roleInput }]);
      setRevealed((prev) => ({ ...prev, [result.id!]: result.password! }));
    }
    return { error: result?.error ?? null };
  };
  const [addState, addFormAction, addPending] = useActionState(addAction, { error: null });

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-bold text-slate-900">משתמשים מקושרים לחברה זו</h2>
      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">שם</label>
                <div className="px-2 py-1.5 text-sm text-slate-900">{u.full_name}</div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">אימייל</label>
                <div className="px-2 py-1.5 text-sm text-slate-500">{u.email}</div>
              </div>
              <span className="rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700">
                {u.role === "company_admin" ? "מנהל חברה" : "עובד"}
              </span>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleResetPassword(u.id)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white disabled:opacity-60"
              >
                סיסמה אקראית חדשה
              </button>
              <form action={impersonateCompanyAdmin}>
                <input type="hidden" name="user_id" value={u.id} />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  כניסה כמשתמש זה
                </button>
              </form>
            </div>
            {revealed[u.id] && (
              <p className="mt-2 rounded-lg bg-indigo-50 p-2 text-xs text-slate-700">
                סיסמה חדשה (הציגו פעם אחת): <span className="font-mono font-semibold">{revealed[u.id]}</span>
              </p>
            )}
          </div>
        ))}
        {users.length === 0 && <p className="text-sm text-slate-500">אין עדיין משתמשים לחברה זו</p>}
      </div>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <h3 className="mb-2 text-xs font-bold text-slate-400">הוספת משתמש</h3>
        <form action={addFormAction} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">שם</label>
            <input name="full_name" className="w-40 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">אימייל</label>
            <input name="email" type="email" required className="w-56 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">דרגה</label>
            <select name="role" defaultValue="company_staff" className="w-36 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm">
              <option value="company_admin">מנהל חברה</option>
              <option value="company_staff">עובד</option>
            </select>
          </div>
          <button
            disabled={addPending}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 disabled:opacity-60"
          >
            {addPending ? "מוסיף..." : "הוספת משתמש"}
          </button>
        </form>
        {addState.error && <p className="mt-2 text-sm text-red-600">{addState.error}</p>}
      </div>
    </section>
  );
}
