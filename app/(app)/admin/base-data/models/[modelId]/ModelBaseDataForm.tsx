"use client";

import { useTransition } from "react";
import { ModelBaseData } from "@/lib/types";
import { saveModelBaseData } from "./actions";

const FIELDS: { key: keyof ModelBaseData; label: string }[] = [
  { key: "lead_daily_hours", label: "שעות יומיות מוביל" },
  { key: "lead_hourly_rate", label: "שכר שעתי מוביל" },
  { key: "assistant_daily_hours", label: "שעות יומיות סייעת" },
  { key: "assistant_hourly_rate", label: "שכר שעתי סייעת" },
  { key: "inclusion_assistant_daily_hours", label: "שעות יומיות סייעת שילוב" },
  { key: "inclusion_assistant_hourly_rate", label: "שכר שעתי סייעת שילוב" },
  { key: "coordinator_daily_hours", label: "שעות יומיות רכז" },
  { key: "coordinator_hourly_rate", label: "שכר שעתי רכז" },
  { key: "avg_participants", label: "ממוצע משתתפים" },
  { key: "min_clubs", label: "מינימום חוגים" },
  { key: "max_clubs", label: "מקסימום חוגים" },
];

export function ModelBaseDataForm({
  yearId,
  modelId,
  initial,
}: {
  yearId: string;
  modelId: string;
  initial: Partial<ModelBaseData>;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(() => saveModelBaseData(yearId, modelId, formData));
  }

  return (
    <form action={handleSubmit} className="rounded-2xl border border-border bg-surface p-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-xs font-medium text-foreground-muted">{f.label}</label>
            <input
              name={f.key}
              type="number"
              step="0.01"
              defaultValue={(initial[f.key] as number) ?? 0}
              className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
            />
          </div>
        ))}
      </div>
      <button
        disabled={isPending}
        className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
      >
        {isPending ? "שומר..." : "שמירת נתוני בסיס"}
      </button>
    </form>
  );
}
