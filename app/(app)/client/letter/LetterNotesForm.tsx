"use client";

import { useState, useTransition } from "react";
import { saveBudgetNotes } from "./actions";

export function LetterNotesForm({
  clientYearId,
  intro,
  points,
}: {
  clientYearId: string;
  intro: string;
  points: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  function handleSave(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await saveBudgetNotes(clientYearId, formData);
      setMessage(result.error ? { text: result.error, ok: false } : { text: "ההערות נשמרו ועודכנו במכתב", ok: true });
    });
  }

  return (
    <form action={handleSave} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-foreground-muted">שורת פתיח</label>
        <input
          name="intro"
          defaultValue={intro}
          placeholder="לדוגמה: להלן עיקרי התקציב המתוכנן לשנה הקרובה, לשימוש מנהל התחום מטעמכם"
          className="w-full rounded-md border border-border px-2.5 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-foreground-muted">
          נקודות עיקריות למנהל שיממש את התקציב (שורה לכל נקודה)
        </label>
        <textarea
          name="points"
          defaultValue={points}
          rows={6}
          className="w-full rounded-md border border-border px-2.5 py-2 text-sm leading-relaxed"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        >
          {isPending ? "שומר..." : "שמירת הערות"}
        </button>
        {message && <span className={`text-sm ${message.ok ? "text-success" : "text-danger"}`}>{message.text}</span>}
      </div>
    </form>
  );
}
