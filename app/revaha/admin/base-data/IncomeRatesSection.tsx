"use client";

import { useActionState, useTransition } from "react";
import { createIncomeRateCategory, updateIncomeRateCategoryAmount } from "./actions";

type IncomeRateCategory = { id: string; rate_group: "participant" | "rent_reimbursement"; name: string; monthly_amount: number };

function GroupList({ title, categories }: { title: string; categories: IncomeRateCategory[] }) {
  const [isPending, startTransition] = useTransition();

  function handleBlur(id: string, value: string) {
    const fd = new FormData();
    fd.set("monthly_amount", value);
    startTransition(() => updateIncomeRateCategoryAmount(id, fd));
  }

  return (
    <div>
      <div className="mb-1 text-xs font-bold text-[#7A76A8]">{title}</div>
      <div className="space-y-1.5">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg bg-[#F7F6FE]/60 px-3 py-1.5">
            <span className="text-sm text-[#2A2560]">{c.name}</span>
            <div className="flex items-center gap-1 text-sm text-[#7A76A8]">
              ₪
              <input
                type="number"
                defaultValue={c.monthly_amount}
                disabled={isPending}
                onBlur={(e) => handleBlur(c.id, e.target.value)}
                className="w-24 rounded-md border border-[#E4E1FA] px-2 py-1 text-left text-sm text-[#2A2560]"
              />
            </div>
          </div>
        ))}
        {categories.length === 0 && <p className="text-sm text-[#7A76A8]">אין תעריפים עדיין</p>}
      </div>
    </div>
  );
}

export function IncomeRatesSection({ categories }: { categories: IncomeRateCategory[] }) {
  const participant = categories.filter((c) => c.rate_group === "participant");
  const rentReimbursement = categories.filter((c) => c.rate_group === "rent_reimbursement");

  const [state, formAction, isPending] = useActionState(
    async (_prev: { error: string | null }, formData: FormData) => createIncomeRateCategory(formData),
    { error: null }
  );

  return (
    <section className="rounded-2xl border border-[#E4E1FA] bg-white p-5">
      <h2 className="mb-1 text-sm font-semibold text-[#2A2560]">תעריפי הכנסה</h2>
      <p className="mb-3 text-xs text-[#7A76A8]">תעריף משתתף חודשי ותעריף שיפוי שכר דירה, לפי קטגוריה. שינוי הסכום נשמר אוטומטית.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <GroupList title="תעריף משתתף (חודשי)" categories={participant} />
        <GroupList title="תעריף שיפוי שכ״ד (חודשי)" categories={rentReimbursement} />
      </div>
      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-2 border-t border-[#E4E1FA] pt-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">שם קטגוריה</label>
          <input name="name" required className="w-56 rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">סוג תעריף</label>
          <select name="rate_group" required className="w-44 rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm">
            <option value="participant">משתתף</option>
            <option value="rent_reimbursement">שיפוי שכ״ד</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">סכום חודשי</label>
          <input
            name="monthly_amount"
            type="number"
            defaultValue={0}
            className="w-32 rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm"
          />
        </div>
        <button
          disabled={isPending}
          className="rounded-lg bg-[#5B4FE8] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#4A3FD4] disabled:opacity-60"
        >
          {isPending ? "מוסיף..." : "הוספה"}
        </button>
      </form>
      {state.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
    </section>
  );
}
