"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";

/** Edit + delete buttons for a base-data row; delete asks for an inline confirmation and surfaces server errors. */
export function RowActions({
  label,
  onEdit,
  onDelete,
}: {
  label: string;
  onEdit: () => void;
  onDelete: () => Promise<{ error: string | null }>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await onDelete();
      if (result?.error) {
        setError(result.error);
        setConfirming(false);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {confirming ? (
        <>
          <span className="text-xs text-red-700">למחוק את {label}?</span>
          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            className="rounded-md bg-red-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isPending ? "מוחק..." : "כן, למחוק"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            ביטול
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => {
              setError(null);
              onEdit();
            }}
            aria-label={`עריכת ${label}`}
            title="עריכה"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`מחיקת ${label}`}
            title="מחיקה"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
      {error && <p className="basis-full text-xs text-red-600">{error}</p>}
    </div>
  );
}
