"use client";

import { useTransition } from "react";
import { createExpenseLineItem, deleteExpenseLineItem, updateExpenseLineItem } from "./actions";

type ExpenseLineItem = { id: string; category: string; monthly_amount: number | null; notes: string | null };

function ExpenseRow({ item, facilityId }: { item: ExpenseLineItem; facilityId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleSave(formData: FormData) {
    startTransition(() => updateExpenseLineItem(item.id, facilityId, formData));
  }

  return (
    <form action={handleSave} className="flex flex-wrap items-end gap-2 rounded-xl border border-[#E4E1FA] bg-[#F7F6FE]/40 p-3">
      <div>
        <label className="mb-1 block text-[11px] text-[#7A76A8]">קטגוריה</label>
        <input name="category" defaultValue={item.category} required className="w-44 rounded-md border border-[#E4E1FA] px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-[#7A76A8]">סכום חודשי</label>
        <input
          name="monthly_amount"
          type="number"
          defaultValue={item.monthly_amount ?? ""}
          className="w-32 rounded-md border border-[#E4E1FA] px-2 py-1 text-sm"
        />
      </div>
      <div className="min-w-0 flex-1">
        <label className="mb-1 block text-[11px] text-[#7A76A8]">הערות</label>
        <input name="notes" defaultValue={item.notes ?? ""} className="w-full rounded-md border border-[#E4E1FA] px-2 py-1 text-sm" />
      </div>
      <button
        disabled={isPending}
        className="rounded-lg bg-[#5B4FE8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4A3FD4] disabled:opacity-60"
      >
        {isPending ? "שומר..." : "שמירה"}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => deleteExpenseLineItem(item.id, facilityId))}
        className="rounded-lg border border-[#E4E1FA] px-3 py-1.5 text-xs font-semibold text-danger hover:bg-white disabled:opacity-60"
      >
        הסרה
      </button>
    </form>
  );
}

export function ExpensesSection({ facilityId, items }: { facilityId: string; items: ExpenseLineItem[] }) {
  const [isPending, startTransition] = useTransition();

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      await createExpenseLineItem(facilityId, formData);
    });
  }

  return (
    <section className="rounded-2xl border border-[#E4E1FA] bg-white p-5">
      <h2 className="mb-1 text-sm font-semibold text-[#2A2560]">הוצאות שאינן שכר</h2>
      <p className="mb-3 text-xs text-[#7A76A8]">הוצאות חודשיות שוטפות של הפנימייה (מטבח, חשמל, אחזקה, שכ״ד וכו׳).</p>
      <div className="space-y-2">
        {items.map((item) => (
          <ExpenseRow key={item.id} item={item} facilityId={facilityId} />
        ))}
        {items.length === 0 && <p className="text-sm text-[#7A76A8]">אין עדיין הוצאות</p>}
      </div>

      <form action={handleAdd} className="mt-4 flex flex-wrap items-end gap-2 border-t border-[#E4E1FA] pt-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">קטגוריה</label>
          <input name="category" required placeholder="לדוגמה: חשמל ומים" className="w-44 rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#7A76A8]">סכום חודשי</label>
          <input name="monthly_amount" type="number" className="w-32 rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm" />
        </div>
        <button
          disabled={isPending}
          className="rounded-lg bg-[#5B4FE8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4A3FD4] disabled:opacity-60"
        >
          {isPending ? "מוסיף..." : "הוספת הוצאה"}
        </button>
      </form>
    </section>
  );
}
