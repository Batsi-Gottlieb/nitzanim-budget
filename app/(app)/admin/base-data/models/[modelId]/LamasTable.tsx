"use client";

import { useState, useTransition } from "react";
import { saveLamasIncome } from "./actions";

type Row = { lamas_level: number; participant_income_monthly: number; ministry_income_monthly: number };

export function LamasTable({ yearId, modelId, initial }: { yearId: string; modelId: string; initial: Row[] }) {
  const byLevel = new Map(initial.map((r) => [r.lamas_level, r]));
  const [rows, setRows] = useState<Row[]>(
    Array.from({ length: 10 }, (_, i) => {
      const level = i + 1;
      return {
        lamas_level: level,
        participant_income_monthly: byLevel.get(level)?.participant_income_monthly ?? 0,
        ministry_income_monthly: byLevel.get(level)?.ministry_income_monthly ?? 0,
      };
    })
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function update(level: number, field: "participant_income_monthly" | "ministry_income_monthly", value: number) {
    setSaved(false);
    setRows((prev) => prev.map((r) => (r.lamas_level === level ? { ...r, [field]: value } : r)));
  }

  function handleSave() {
    const fd = new FormData();
    fd.set("rows_json", JSON.stringify(rows));
    startTransition(async () => {
      await saveLamasIncome(yearId, modelId, fd);
      setSaved(true);
    });
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted text-right">
            <th className="px-4 py-3 font-semibold">דרג למ&quot;ס</th>
            <th className="px-4 py-3 font-semibold">הכנסה למשתתף לחודש</th>
            <th className="px-4 py-3 font-semibold">הכנסת משרד החינוך למשתתף לחודש</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.lamas_level} className="border-b border-border last:border-0">
              <td className="px-4 py-2 font-medium">{r.lamas_level}</td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  step="0.01"
                  value={r.participant_income_monthly}
                  onChange={(e) => update(r.lamas_level, "participant_income_monthly", Number(e.target.value))}
                  className="w-32 rounded-md border border-border px-2 py-1"
                />
              </td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  step="0.01"
                  value={r.ministry_income_monthly}
                  onChange={(e) => update(r.lamas_level, "ministry_income_monthly", Number(e.target.value))}
                  className="w-32 rounded-md border border-border px-2 py-1"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-3 border-t border-border px-4 py-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        >
          {isPending ? "שומר..." : "שמירת טבלת למ״ס"}
        </button>
        {saved && <span className="text-sm text-success">נשמר בהצלחה</span>}
      </div>
    </div>
  );
}
