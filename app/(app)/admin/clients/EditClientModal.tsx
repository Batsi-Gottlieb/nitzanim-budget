"use client";

import { useTransition } from "react";
import { updateClientDetails } from "./actions";
import { UsersSection } from "./UsersSection";

type UserRow = { id: string; email: string | null; full_name: string | null };
type ClientInfo = { id: string; name: string; contact_email: string | null; contact_phone: string | null };

export function EditClientModal({
  client,
  initialUsers,
  onClose,
}: {
  client: ClientInfo;
  initialUsers: UserRow[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSave(formData: FormData) {
    startTransition(() => updateClientDetails(client.id, formData));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">עריכת {client.name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="rounded-lg p-1.5 text-foreground-muted hover:bg-surface-muted"
          >
            ✕
          </button>
        </div>

        <form action={handleSave} className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-muted">שם הלקוח</label>
            <input
              name="name"
              defaultValue={client.name}
              required
              className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-muted">אימייל ליצירת קשר</label>
            <input
              name="contact_email"
              type="email"
              defaultValue={client.contact_email ?? ""}
              className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-muted">טלפון</label>
            <input
              name="contact_phone"
              defaultValue={client.contact_phone ?? ""}
              className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              disabled={isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
            >
              {isPending ? "שומר..." : "שמירת פרטים"}
            </button>
          </div>
        </form>

        <UsersSection clientId={client.id} initialUsers={initialUsers} />
      </div>
    </div>
  );
}
