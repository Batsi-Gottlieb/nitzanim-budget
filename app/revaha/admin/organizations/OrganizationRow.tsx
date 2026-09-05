"use client";

import { useState } from "react";
import { LogIn, Mail, Pencil, Phone, Users } from "lucide-react";
import { impersonateOrgUser } from "./actions";
import { EditOrganizationModal } from "./EditOrganizationModal";

type UserRow = { id: string; email: string | null; full_name: string | null };
type OrganizationInfo = { id: string; name: string; contact_email: string | null; contact_phone: string | null };

export function OrganizationRow({ organization, users }: { organization: OrganizationInfo; users: UserRow[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const primaryUser = users[0];

  return (
    <div className="flex flex-col items-start justify-between gap-3 p-4 text-right transition-all sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-bold text-slate-900">{organization.name}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
          {organization.contact_email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3 text-slate-400" />
              {organization.contact_email}
            </span>
          )}
          {organization.contact_phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3 text-slate-400" />
              {organization.contact_phone}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3 text-slate-400" />
            {users.length} משתמשי כניסה
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {primaryUser && (
          <form action={impersonateOrgUser}>
            <input type="hidden" name="user_id" value={primaryUser.id} />
            <button
              type="submit"
              title={`כניסה כ-${primaryUser.full_name ?? primaryUser.email ?? "משתמש הארגון"}`}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-emerald-700"
            >
              <LogIn className="h-3.5 w-3.5" />
              כניסה ללקוח
            </button>
          </form>
        )}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          title="עריכת פרטי ארגון ומשתמשים"
          aria-label="עריכת פרטי ארגון ומשתמשים"
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          עריכה
        </button>
      </div>
      {modalOpen && (
        <EditOrganizationModal organization={organization} initialUsers={users} onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}
