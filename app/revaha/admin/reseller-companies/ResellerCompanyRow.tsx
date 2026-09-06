"use client";

import { useState } from "react";
import { Building2, Mail, Pencil, Phone } from "lucide-react";
import { EditResellerCompanyModal } from "./EditResellerCompanyModal";

type UserRow = { id: string; email: string | null; full_name: string | null; role: string };
type CompanyInfo = {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  url_token: string | null;
  billing_notes: string | null;
  is_active: boolean;
};

export function ResellerCompanyRow({
  company,
  users,
  orgCount,
}: {
  company: CompanyInfo;
  users: UserRow[];
  orgCount: number;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex flex-col items-start justify-between gap-3 p-4 text-right transition-all sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {company.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logo_url} alt="" className="h-full w-full object-contain" />
          ) : (
            <Building2 className="h-4 w-4 text-slate-300" />
          )}
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-bold text-slate-900">{company.name}</span>
            {!company.is_active && (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">מושבתת</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
            {company.contact_email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3 text-slate-400" />
                {company.contact_email}
              </span>
            )}
            {company.contact_phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3 text-slate-400" />
                {company.contact_phone}
              </span>
            )}
            <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
              {orgCount} ארגונים
            </span>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
              {users.length} משתמשים
            </span>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
      >
        <Pencil className="h-3.5 w-3.5" />
        עריכה
      </button>
      {modalOpen && <EditResellerCompanyModal company={company} initialUsers={users} onClose={() => setModalOpen(false)} />}
    </div>
  );
}
