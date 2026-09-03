"use client";

import { useState } from "react";
import { EditOrganizationModal } from "./EditOrganizationModal";

type UserRow = { id: string; email: string | null; full_name: string | null };
type OrganizationInfo = { id: string; name: string; contact_email: string | null; contact_phone: string | null };

export function OrganizationRow({ organization, users }: { organization: OrganizationInfo; users: UserRow[] }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setModalOpen(true)}
      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right text-sm hover:bg-[#F7F6FE]"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-[#2A2560]">{organization.name}</div>
        <div className="truncate text-xs text-[#7A76A8]">{organization.contact_email}</div>
      </div>
      <span
        title="עריכת פרטי ארגון ומשתמשים"
        aria-label="עריכת פרטי ארגון ומשתמשים"
        className="shrink-0 rounded-lg border border-[#E4E1FA] p-2"
      >
        ✏️
      </span>
      {modalOpen && (
        <EditOrganizationModal organization={organization} initialUsers={users} onClose={() => setModalOpen(false)} />
      )}
    </button>
  );
}
