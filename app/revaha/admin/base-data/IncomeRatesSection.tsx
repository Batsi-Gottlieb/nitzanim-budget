"use client";

import { useActionState, useState, useTransition } from "react";
import { createIncomeRateCategory, deleteIncomeRateCategory, updateIncomeRateCategory } from "./actions";
import { RowActions } from "./RowActions";

type IncomeRateCategory = { id: string; rate_group: "participant" | "rent_reimbursement"; name: string; monthly_amount: number };

function RateRow({ c }: { c: IncomeRateCategory }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateIncomeRateCategory(c.id, formData);
      if (result?.error) setError(result.error);
      else setEditing(false);
    });
  }

  if (editing) {
    return (
      <form action={handleSave} className="space-y-2 rounded-lg border-2 border-indigo-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <input name="name" required defaultValue={c.name} aria-label="שם הקטגוריה" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-900" />
          <div className="flex items-center gap-1 text-sm text-slate-500">
            ₪
            <input
              name="monthly_amount"
              type="number"
              step="any"
              defaultValue={c.monthly_amount}
              aria-label="סכום חודשי"
              className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-left text-sm text-slate-900"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button disabled={isPending} className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {isPending ? "שומר..." : "שמירה"}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            ביטול
          </button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50/60 px-3 py-1.5">
      <span className="text-sm text-slate-900">{c.name}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-slate-700">₪{Number(c.monthly_amount).toLocaleString("he-IL")}</span>
        <RowActions label={c.name} onEdit={() => setEditing(true)} onDelete={() => deleteIncomeRateCategory(c.id)} />
      </div>
    </div>
  );
}

function GroupList({ title, categories }: { title: string; categories: IncomeRateCategory[] }) {
  return (
    <div>
      <div className="mb-1 text-xs font-bold text-slate-500">{title}</div>
      <div className="space-y-1.5">
        {categories.map((c) => (
          <RateRow key={c.id + c.name + c.monthly_amount} c={c} />
        ))}
        {categories.length === 0 && <p className="text-sm text-slate-500">אין תעריפים עדיין</p>}
      </div>
    </div>
  );
}

export function IncomeRatesSection({ categories }: { categories: IncomeRateCategory[] }) {
  const participant = categories.filter((c) => c.rate_group === "participant");
  const rentReimbursement = categories.filter((c) => c.rate_group === "rent_reimbursement");

  const [state, formAction, isPending] = useActionState(
    async (_prev: { error: string | null; added?: string }, formData: FormData) => {
      const result = await createIncomeRateCategory(formData);
      return result.error ? { error: result.error } : { error: null, added: (formData.get("name") as string).trim() };
    },
    { error: null } as { error: string | null; added?: string }
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      <h2 className="mb-1 text-sm font-bold text-slate-900">תעריפי הכנסה</h2>
      <p className="mb-3 text-xs text-slate-500">תעריף משתתף חודשי ותעריף שיפוי שכר דירה, לפי קטגוריה. ניתן לערוך (שם וסכום) ולמחוק כל תעריף.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <GroupList title="תעריף משתתף (חודשי)" categories={participant} />
        <GroupList title="תעריף שיפוי שכ״ד (חודשי)" categories={rentReimbursement} />
      </div>
      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-200 pt-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">שם קטגוריה</label>
          <input name="name" required className="w-56 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">סוג תעריף</label>
          <select name="rate_group" required className="w-44 rounded-lg border border-slate-200 px-2 py-1.5 text-sm">
            <option value="participant">משתתף</option>
            <option value="rent_reimbursement">שיפוי שכ״ד</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">סכום חודשי</label>
          <input
            name="monthly_amount"
            type="number"
            step="any"
            min={0}
            defaultValue={0}
            className="w-32 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
        </div>
        <button
          disabled={isPending}
          className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 disabled:opacity-60"
        >
          {isPending ? "מוסיף..." : "הוספה"}
        </button>
      </form>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state.added && !state.error && <p className="mt-2 text-sm text-emerald-700">התעריף ״{state.added}״ נוסף</p>}
    </section>
  );
}
