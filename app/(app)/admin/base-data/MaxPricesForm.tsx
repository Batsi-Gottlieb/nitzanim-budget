"use client";

import { useState, useTransition } from "react";
import { Year } from "@/lib/types";
import { saveMaxPrices } from "./actions";

const FIELDS: { key: keyof Pick<Year, "max_price_no_camp_gardens" | "max_price_with_camp_gardens" | "max_price_no_camp_schools" | "max_price_with_camp_schools">; label: string }[] = [
  { key: "max_price_no_camp_gardens", label: 'מחיר מקסימום ללא קייטנות (גנים)' },
  { key: "max_price_with_camp_gardens", label: 'מחיר מקסימום כולל קייטנות (גנים)' },
  { key: "max_price_no_camp_schools", label: 'מחיר מקסימום ללא קייטנות (בתי ספר)' },
  { key: "max_price_with_camp_schools", label: 'מחיר מקסימום כולל קייטנות (בתי ספר)' },
];

export function MaxPricesForm({ yearId, initial }: { yearId: string; initial: Partial<Year> }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      await saveMaxPrices(yearId, formData);
      setSaved(true);
    });
  }

  return (
    <form action={handleSubmit} className="mt-4 rounded-2xl border border-border bg-surface p-5">
      <h3 className="mb-3 text-sm font-bold text-foreground-muted">מחירי מקסימום לגביית הורים</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-xs font-medium text-foreground-muted">{f.label}</label>
            <input
              name={f.key}
              type="number"
              step="0.01"
              defaultValue={(initial[f.key] as number) ?? ""}
              className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          disabled={isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        >
          {isPending ? "שומר..." : "שמירת מחירי מקסימום"}
        </button>
        {saved && <span className="text-sm text-success">נשמר בהצלחה</span>}
      </div>
    </form>
  );
}
