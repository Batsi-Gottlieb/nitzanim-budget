"use client";

import { useState, useTransition } from "react";
import { MONTHS } from "@/lib/types";
import { saveGeneralData } from "./actions";

type Row = { calendar_month: number; activity_days: number; feeding_days: number };

export function GeneralDataForm({ yearId, initial }: { yearId: string; initial: Row[] }) {
  const initialByMonth = new Map(initial.map((r) => [r.calendar_month, r]));
  const [rows, setRows] = useState<Row[]>(
    MONTHS.map((m) => ({
      calendar_month: m.calendar_month,
      activity_days: initialByMonth.get(m.calendar_month)?.activity_days ?? 0,
      feeding_days: initialByMonth.get(m.calendar_month)?.feeding_days ?? 0,
    }))
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function update(calendar_month: number, field: "activity_days" | "feeding_days", value: number) {
    setSaved(false);
    setRows((prev) => prev.map((r) => (r.calendar_month === calendar_month ? { ...r, [field]: value } : r)));
  }

  function handleSave() {
    const fd = new FormData();
    fd.set("months_json", JSON.stringify(rows));
    startTransition(async () => {
      await saveGeneralData(yearId, fd);
      setSaved(true);
    });
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted text-right">
            <th className="px-4 py-3 font-semibold">חודש</th>
            <th className="px-4 py-3 font-semibold">ימי פעילות</th>
            <th className="px-4 py-3 font-semibold">ימי הזנה</th>
          </tr>
        </thead>
        <tbody>
          {MONTHS.map((m) => {
            const row = rows.find((r) => r.calendar_month === m.calendar_month)!;
            return (
              <tr key={m.calendar_month} className="border-b border-border last:border-0">
                <td className="px-4 py-2 font-medium">{m.label}</td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min={0}
                    value={row.activity_days}
                    onChange={(e) => update(m.calendar_month, "activity_days", Number(e.target.value))}
                    className="w-24 rounded-md border border-border px-2 py-1"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min={0}
                    value={row.feeding_days}
                    onChange={(e) => update(m.calendar_month, "feeding_days", Number(e.target.value))}
                    className="w-24 rounded-md border border-border px-2 py-1"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex items-center gap-3 border-t border-border px-4 py-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        >
          {isPending ? "שומר..." : "שמירה"}
        </button>
        {saved && <span className="text-sm text-success">נשמר בהצלחה</span>}
      </div>
    </div>
  );
}
