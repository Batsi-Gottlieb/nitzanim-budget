"use client";

import { useActionState, useState, useTransition } from "react";
import { createRoleType, deleteRoleType, updateRoleType } from "./actions";
import { roleTypeDotColor } from "@/lib/revaha/roleTypeColors";
import { RowActions } from "./RowActions";

type RoleType = { id: string; name: string };

function RoleTypeRow({ rt, dotColor }: { rt: RoleType; dotColor: string }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateRoleType(rt.id, formData);
      if (result?.error) setError(result.error);
      else setEditing(false);
    });
  }

  if (editing) {
    return (
      <form action={handleSave} className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-indigo-200 bg-white px-3 py-2">
        <input name="name" required defaultValue={rt.name} aria-label="שם סוג התפקיד" className="w-48 rounded-lg border border-slate-200 px-2 py-1 text-sm" />
        <button disabled={isPending} className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {isPending ? "שומר..." : "שמירה"}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          ביטול
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50/60 px-3 py-1.5">
      <span className="flex items-center gap-2 text-sm text-slate-900">
        <span className={`h-2 w-2 rounded-full ${dotColor}`} />
        {rt.name}
      </span>
      <RowActions label={rt.name} onEdit={() => setEditing(true)} onDelete={() => deleteRoleType(rt.id)} />
    </div>
  );
}

export function RoleTypesSection({ roleTypes }: { roleTypes: RoleType[] }) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error: string | null }, formData: FormData) => createRoleType(formData),
    { error: null }
  );
  const roleTypeIds = roleTypes.map((rt) => rt.id);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      <h2 className="mb-1 text-sm font-bold text-slate-900">סוגי תפקיד</h2>
      <p className="mb-3 text-xs text-slate-500">קטגוריה רחבה (לדוגמה: הדרכה, רפואי) — עובד שעובר בין תפקידים מאותו סוג תפקיד שומר על אותו תעריף.</p>
      <div className="space-y-1.5">
        {roleTypes.map((rt) => (
          <RoleTypeRow key={rt.id + rt.name} rt={rt} dotColor={roleTypeDotColor(rt.id, roleTypeIds)} />
        ))}
        {roleTypes.length === 0 && <p className="text-sm text-slate-500">אין סוגי תפקיד עדיין</p>}
      </div>
      <form action={formAction} className="mt-4 flex items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">סוג תפקיד חדש</label>
          <input name="name" required className="w-56 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
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
