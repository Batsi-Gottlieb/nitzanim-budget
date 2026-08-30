"use client";

import Link from "next/link";
import { useState } from "react";
import { impersonateUser } from "./actions";
import { EditClientModal } from "./EditClientModal";

type UserRow = { id: string; email: string | null; full_name: string | null };
type ClientInfo = { id: string; name: string; contact_email: string | null; contact_phone: string | null };

export function ClientRow({ client, users }: { client: ClientInfo; users: UserRow[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const primaryUser = users[0];

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-surface-muted">
      <Link href={`/admin/clients/${client.id}`} className="min-w-0 flex-1">
        <div className="truncate font-medium">{client.name}</div>
        <div className="truncate text-xs text-foreground-muted">{client.contact_email}</div>
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          title="עריכת פרטי לקוח ומשתמשים"
          aria-label="עריכת פרטי לקוח ומשתמשים"
          className="rounded-lg border border-border p-2 hover:bg-surface-muted"
        >
          ✏️
        </button>
        <form action={impersonateUser}>
          <input type="hidden" name="user_id" value={primaryUser?.id ?? ""} />
          <button
            type="submit"
            disabled={!primaryUser}
            title={primaryUser ? "כניסה ללקוח" : "אין משתמשים מקושרים ללקוח זה"}
            className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-primary hover:bg-surface-muted disabled:opacity-40"
          >
            כניסה ללקוח
          </button>
        </form>
      </div>
      {modalOpen && <EditClientModal client={client} initialUsers={users} onClose={() => setModalOpen(false)} />}
    </div>
  );
}
