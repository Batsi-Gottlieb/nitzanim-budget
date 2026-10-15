"use client";

import { useActionState, useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { PasswordInput } from "@/components/revaha/PasswordInput";
import { addRevahaAdmin, resetRevahaAdminPassword, updateRevahaAdmin } from "./actions";

type AdminRow = { id: string; email: string | null; full_name: string | null };

const INPUT = "w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm";

function AdminEditForm({
  admin,
  onSaved,
  onCancel,
}: {
  admin: AdminRow;
  onSaved: (updated: AdminRow, passwordChanged: boolean) => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateRevahaAdmin(admin.id, formData);
      if (result?.error) setError(result.error);
      else onSaved({ id: admin.id, email: result.email!, full_name: result.full_name ?? null }, !!result.passwordChanged);
    });
  }

  return (
    <form action={handleSave} className="mt-3 grid grid-cols-1 gap-3 rounded-xl border-2 border-indigo-200 bg-white p-3 sm:grid-cols-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">שם</label>
        <input name="full_name" defaultValue={admin.full_name ?? ""} className={INPUT} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">אימייל (שם משתמש)</label>
        <input name="email" type="email" required defaultValue={admin.email ?? ""} className={INPUT} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">סיסמה חדשה</label>
        <PasswordInput name="password" minLength={6} placeholder="ריק = ללא שינוי" />
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
        <button
          disabled={isPending}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-60"
        >
          {isPending ? "שומר..." : "שמירה"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          ביטול
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </form>
  );
}

export function AdminsSection({ initialAdmins, currentUserId }: { initialAdmins: AdminRow[]; currentUserId: string }) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Controlled so a failed add (e.g. a too-short password) doesn't wipe what was typed.
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  function handleReset(userId: string) {
    startTransition(async () => {
      const result = await resetRevahaAdminPassword(userId);
      if (result?.password) setRevealed((prev) => ({ ...prev, [userId]: result.password! }));
    });
  }

  const addAction = async (_prev: { error: string | null }, formData: FormData) => {
    setNotice(null);
    const result = await addRevahaAdmin(formData);
    if (result?.error) return { error: result.error };
    setNewName("");
    setNewEmail("");
    setNewPassword("");
    setAdmins((prev) => [...prev, { id: result.id!, email: result.email!, full_name: result.full_name ?? null }]);
    if (result.password) setRevealed((prev) => ({ ...prev, [result.id!]: result.password! }));
    else if (result.chosenPassword) setNotice(`${result.email} נוסף כאדמין עם הסיסמה שבחרתם.`);
    else if (result.existingLogin) setNotice(`${result.email} נוסף כאדמין. למשתמש כבר הייתה כניסה, והוא ימשיך להתחבר עם הסיסמה הקיימת שלו.`);
    return { error: null };
  };
  const [addState, addFormAction, addPending] = useActionState(addAction, { error: null });

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      <h2 className="mb-3 text-sm font-bold text-slate-900">אדמינים קיימים</h2>
      <div className="space-y-3">
        {admins.map((a) => (
          <div key={a.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900">
                  {a.full_name ?? "ללא שם"}
                  {a.id === currentUserId && (
                    <span className="mr-2 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">אתם</span>
                  )}
                </div>
                <div className="text-xs text-slate-500">{a.email}</div>
              </div>
              <button
                type="button"
                onClick={() => setEditingId(editingId === a.id ? null : a.id)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white"
              >
                <Pencil className="h-3 w-3" />
                עריכה / קביעת סיסמה
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleReset(a.id)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white disabled:opacity-60"
              >
                סיסמה אקראית
              </button>
            </div>
            {editingId === a.id && (
              <AdminEditForm
                key={a.id + (a.email ?? "") + (a.full_name ?? "")}
                admin={a}
                onCancel={() => setEditingId(null)}
                onSaved={(updated, passwordChanged) => {
                  setAdmins((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                  setEditingId(null);
                  setNotice(passwordChanged ? `הפרטים והסיסמה של ${updated.email} עודכנו.` : `הפרטים של ${updated.email} עודכנו.`);
                }}
              />
            )}
            {revealed[a.id] && (
              <p className="mt-2 rounded-lg bg-indigo-50 p-2 text-xs text-slate-700">
                סיסמה (מוצגת פעם אחת): <span className="font-mono font-semibold">{revealed[a.id]}</span>
              </p>
            )}
          </div>
        ))}
        {admins.length === 0 && <p className="text-sm text-slate-500">אין אדמינים</p>}
      </div>
      {notice && <p className="mt-3 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">{notice}</p>}

      <div className="mt-5 border-t border-slate-200 pt-4">
        <h3 className="mb-2 text-xs font-bold text-slate-400">הוספת אדמין</h3>
        <form action={addFormAction} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">שם</label>
            <input name="full_name" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-44 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">אימייל</label>
            <input name="email" type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-60 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">סיסמה (לא חובה)</label>
            <div className="w-48">
              <PasswordInput name="password" value={newPassword} onChange={setNewPassword} placeholder="ריק = סיסמה אקראית" />
            </div>
          </div>
          <button
            disabled={addPending}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 disabled:opacity-60"
          >
            {addPending ? "מוסיף..." : "הוספת אדמין"}
          </button>
        </form>
        <p className="mt-2 text-[11px] text-slate-400">
          אפשר לקבוע סיסמה בעצמכם (לפחות 6 תווים, ויכולה להיות פשוטה). אם משאירים ריק, נוצרת סיסמה אקראית שמוצגת פעם אחת. לאדמין גישה מלאה לכל הארגונים, חברות הרו״ח, בסיס המידע והתשלומים.
        </p>
        {addState.error && <p className="mt-2 text-sm text-red-600">{addState.error}</p>}
      </div>
    </section>
  );
}
