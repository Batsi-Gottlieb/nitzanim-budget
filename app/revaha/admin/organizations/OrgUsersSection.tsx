"use client";

import { useActionState, useState, useTransition } from "react";
import { LogIn, Pencil, Trash2, UserPlus } from "lucide-react";
import { PasswordInput } from "@/components/revaha/PasswordInput";
import { addUserToOrganization, deleteOrgUser, impersonateOrgUser, updateOrgUser } from "./actions";

type UserRow = { id: string; email: string | null; full_name: string | null };

const INPUT = "w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm";

function UserEditForm({
  user,
  organizationId,
  onSaved,
  onCancel,
}: {
  user: UserRow;
  organizationId: string;
  onSaved: (u: UserRow, passwordChanged: boolean) => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateOrgUser(user.id, organizationId, formData);
      if (result?.error) setError(result.error);
      else onSaved({ id: user.id, email: result.email!, full_name: result.full_name ?? null }, !!result.passwordChanged);
    });
  }

  return (
    <form action={handleSave} className="mt-3 grid grid-cols-1 gap-3 rounded-xl border-2 border-indigo-200 bg-white p-3 sm:grid-cols-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">שם</label>
        <input name="full_name" defaultValue={user.full_name ?? ""} className={INPUT} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">אימייל (שם משתמש)</label>
        <input name="email" type="email" required dir="ltr" defaultValue={user.email ?? ""} className={`${INPUT} text-left`} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">סיסמה חדשה</label>
        <PasswordInput name="password" minLength={6} placeholder="ריק = ללא שינוי" />
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
        <button
          disabled={isPending}
          className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-60"
        >
          {isPending ? "שומר..." : "שמירה"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          ביטול
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </form>
  );
}

function UserCard({
  user,
  organizationId,
  onChanged,
  onDeleted,
  onNotice,
}: {
  user: UserRow;
  organizationId: string;
  onChanged: (u: UserRow) => void;
  onDeleted: (id: string) => void;
  onNotice: (msg: string) => void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "confirm-delete">("view");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const initial = (user.full_name || user.email || "?").trim().charAt(0).toUpperCase();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteOrgUser(user.id, organizationId);
      if (result?.error) setError(result.error);
      else {
        onDeleted(user.id);
        onNotice(`${user.full_name || user.email} נמחק`);
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900">{user.full_name || "ללא שם"}</div>
          <div className="truncate text-xs text-slate-500" dir="ltr" style={{ textAlign: "right" }}>
            {user.email}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <form action={impersonateOrgUser}>
            <input type="hidden" name="user_id" value={user.id} />
            <button
              type="submit"
              title="כניסה למערכת כמשתמש זה"
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <LogIn className="h-3.5 w-3.5" />
              כניסה כמשתמש
            </button>
          </form>
          <button
            type="button"
            onClick={() => setMode(mode === "edit" ? "view" : "edit")}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Pencil className="h-3.5 w-3.5" />
            עריכה
          </button>
          <button
            type="button"
            onClick={() => setMode("confirm-delete")}
            aria-label={`מחיקת ${user.full_name || user.email}`}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            מחיקה
          </button>
        </div>
      </div>

      {mode === "confirm-delete" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <span className="flex-1">
            למחוק את {user.full_name || user.email} לצמיתות? המשתמש לא יוכל להתחבר יותר. הארגון והפנימיות לא יושפעו.
          </span>
          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isPending ? "מוחק..." : "כן, למחוק"}
          </button>
          <button type="button" onClick={() => setMode("view")} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">
            ביטול
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {mode === "edit" && (
        <UserEditForm
          key={user.id + (user.email ?? "") + (user.full_name ?? "")}
          user={user}
          organizationId={organizationId}
          onCancel={() => setMode("view")}
          onSaved={(updated, passwordChanged) => {
            onChanged(updated);
            setMode("view");
            onNotice(passwordChanged ? `הפרטים והסיסמה של ${updated.email} עודכנו` : `הפרטים של ${updated.email} עודכנו`);
          }}
        />
      )}
    </div>
  );
}

export function OrgUsersSection({ organizationId, initialUsers }: { organizationId: string; initialUsers: UserRow[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [notice, setNotice] = useState<string | null>(null);
  // Controlled so a failed add (e.g. too-short password) doesn't wipe what was typed.
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const addAction = async (_prev: { error: string | null }, formData: FormData) => {
    setNotice(null);
    const result = await addUserToOrganization(organizationId, formData);
    if (result?.error) return { error: result.error };
    setUsers((prev) => [...prev, { id: result.id!, email: result.email!, full_name: result.full_name ?? null }]);
    setNewName("");
    setNewEmail("");
    setNewPassword("");
    setNotice(`${result.email} נוסף עם הסיסמה שבחרתם`);
    return { error: null };
  };
  const [addState, addFormAction, addPending] = useActionState(addAction, { error: null });

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-bold text-slate-900">משתמשים מקושרים לארגון זה</h2>
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">{users.length}</span>
      </div>

      <div className="space-y-3">
        {users.map((u) => (
          <UserCard
            key={u.id}
            user={u}
            organizationId={organizationId}
            onChanged={(updated) => setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))}
            onDeleted={(id) => setUsers((prev) => prev.filter((x) => x.id !== id))}
            onNotice={setNotice}
          />
        ))}
        {users.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">אין עדיין משתמשים לארגון זה</p>}
      </div>
      {notice && <p className="mt-3 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800">{notice}</p>}

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-slate-600">
          <UserPlus className="h-3.5 w-3.5" />
          הוספת משתמש
        </h3>
        <form action={addFormAction} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">שם</label>
            <input name="full_name" value={newName} onChange={(e) => setNewName(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">אימייל (שם משתמש)</label>
            <input name="email" type="email" required dir="ltr" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={`${INPUT} text-left`} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">סיסמה</label>
            <PasswordInput name="password" required minLength={6} value={newPassword} onChange={setNewPassword} placeholder="לפחות 6 תווים" />
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
            <button
              disabled={addPending}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 disabled:opacity-60"
            >
              {addPending ? "מוסיף..." : "הוספת משתמש"}
            </button>
            {addState.error && <span className="text-sm text-red-600">{addState.error}</span>}
          </div>
        </form>
      </div>
    </section>
  );
}
