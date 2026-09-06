"use client";

import { useActionState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { createPayment, deletePayment } from "./actions";

type Company = { id: string; name: string };
type Payment = {
  id: string;
  reseller_company_id: string;
  amount: number;
  payment_date: string;
  method: string | null;
  card_last4: string | null;
  reference: string | null;
  notes: string | null;
};

function fmt(n: number) {
  return n.toLocaleString("he-IL", { maximumFractionDigits: 0 });
}

export function PaymentsSection({ companies, payments }: { companies: Company[]; payments: Payment[] }) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error: string | null }, formData: FormData) => createPayment(formData),
    { error: null }
  );
  const [, startTransition] = useTransition();
  const companyName = (id: string) => companies.find((c) => c.id === id)?.name ?? "?";

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      <h2 className="mb-1 text-sm font-bold text-slate-900">יומן תשלומים</h2>
      <p className="mb-3 text-xs text-slate-500">
        מעקב פנימי בלבד לתשלומים שהתקבלו מחברות המערכת. נשמרות 4 הספרות האחרונות של אמצעי התשלום בלבד — לעולם לא מספר כרטיס מלא.
      </p>

      <div className="mb-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
        {payments.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
            <div className="min-w-0">
              <span className="font-semibold text-slate-900">{companyName(p.reseller_company_id)}</span>
              <span className="mx-2 text-slate-300">·</span>
              <span className="font-bold text-emerald-600">₪{fmt(p.amount)}</span>
              <span className="mx-2 text-slate-300">·</span>
              <span className="text-slate-500">{p.payment_date}</span>
              {p.method && (
                <>
                  <span className="mx-2 text-slate-300">·</span>
                  <span className="text-slate-500">{p.method}</span>
                </>
              )}
              {p.card_last4 && <span className="text-slate-400"> (**** {p.card_last4})</span>}
              {p.reference && <span className="text-slate-400"> · אסמכתא: {p.reference}</span>}
            </div>
            <button
              type="button"
              onClick={() => startTransition(() => deletePayment(p.id))}
              aria-label="מחיקה"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {payments.length === 0 && <div className="px-3 py-3 text-sm text-slate-500">אין תשלומים רשומים עדיין</div>}
      </div>

      <form action={formAction} className="flex flex-wrap items-end gap-2 border-t border-slate-200 pt-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">חברה</label>
          <select name="reseller_company_id" required className="w-48 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm">
            <option value="">בחירת חברה...</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">סכום</label>
          <input name="amount" type="number" step="0.01" required className="w-28 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">תאריך</label>
          <input name="payment_date" type="date" required className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">אמצעי תשלום</label>
          <select name="method" className="w-32 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm">
            <option value="אשראי">אשראי</option>
            <option value="העברה בנקאית">העברה בנקאית</option>
            <option value="צ׳ק">צ׳ק</option>
            <option value="מזומן">מזומן</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">4 ספרות אחרונות</label>
          <input
            name="card_last4"
            maxLength={4}
            placeholder="1234"
            className="w-20 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">אסמכתא</label>
          <input name="reference" className="w-32 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" />
        </div>
        <button
          disabled={isPending}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 disabled:opacity-60"
        >
          {isPending ? "מוסיף..." : "הוספת תשלום"}
        </button>
      </form>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
    </section>
  );
}
