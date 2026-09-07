"use client";

import { useState } from "react";
import { Banknote, Building2, LogIn, Mail, Pencil, Phone, UserCog } from "lucide-react";
import { impersonateOrgUser } from "./actions";
import { EditOrganizationModal } from "./EditOrganizationModal";

type UserRow = { id: string; email: string | null; full_name: string | null };
type OrganizationInfo = {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  reseller_company_id: string | null;
};
type ResellerCompanyOption = { id: string; name: string };
type FacilityOption = { id: string; name: string };

function fmtMoney(n: number) {
  return n.toLocaleString("he-IL", { maximumFractionDigits: 0 });
}

export function OrganizationRow({
  organization,
  users,
  companyName,
  companyContactEmail,
  facilities,
  monthlyBudget,
  resellerCompanies,
}: {
  organization: OrganizationInfo;
  users: UserRow[];
  companyName?: string | null;
  companyContactEmail?: string | null;
  facilities: FacilityOption[];
  monthlyBudget: number;
  resellerCompanies?: ResellerCompanyOption[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const primaryUser = users[0];

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-bold text-slate-900">{organization.name}</span>
            {companyName && (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">{companyName}</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            {companyName ? (
              <span className="flex items-center gap-1">
                <UserCog className="h-3 w-3 text-slate-400" />
                רו&quot;ח מלווה: {companyName}
                {companyContactEmail && <span className="text-slate-400"> · {companyContactEmail}</span>}
              </span>
            ) : (
              <>
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
                {!organization.contact_email && !organization.contact_phone && <span>ניצנים ישירות — אין פרטי קשר</span>}
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Building2 className="h-4 w-4" />
          </div>
          {primaryUser && (
            <form action={impersonateOrgUser}>
              <input type="hidden" name="user_id" value={primaryUser.id} />
              <button
                type="submit"
                title={`כניסה כ-${primaryUser.full_name ?? primaryUser.email ?? "משתמש הארגון"}`}
                aria-label="כניסה ללקוח"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-emerald-600 transition-colors hover:bg-emerald-50"
              >
                <LogIn className="h-4 w-4" />
              </button>
            </form>
          )}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            title="עריכת פרטי ארגון ומשתמשים"
            aria-label="עריכת פרטי ארגון ומשתמשים"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 text-xs sm:grid-cols-3">
        <div>
          <div className="mb-1 flex items-center gap-1 font-semibold text-slate-500">
            <UserCog className="h-3.5 w-3.5" />
            משתמשי גישה:
          </div>
          {users.length === 0 ? (
            <p className="text-slate-400">אין עדיין חשבונות כניסה</p>
          ) : (
            <ul className="space-y-0.5 text-slate-600">
              {users.slice(0, 3).map((u) => (
                <li key={u.id} className="truncate">
                  {u.full_name ?? u.email}
                </li>
              ))}
              {users.length > 3 && <li className="text-slate-400">+{users.length - 3} נוספים</li>}
            </ul>
          )}
        </div>

        <div>
          <div className="mb-1 flex items-center gap-1 font-semibold text-slate-500">
            <Banknote className="h-3.5 w-3.5" />
            תקציב חודשי:
          </div>
          <p className="text-sm font-bold text-slate-900">₪{fmtMoney(monthlyBudget)}</p>
          <p className="text-[10px] text-slate-400">מחושב לפי שיבוץ עובדים, שכר והוצאות הפנימיות</p>
        </div>

        <div>
          <div className="mb-1 flex items-center gap-1 font-semibold text-slate-500">
            <Building2 className="h-3.5 w-3.5" />
            פנימיות בפיקוח ישיר:
          </div>
          {facilities.length === 0 ? (
            <p className="text-slate-400">אין עדיין פנימיות</p>
          ) : (
            <ul className="space-y-0.5 text-slate-600">
              {facilities.map((f) => (
                <li key={f.id} className="truncate">
                  {f.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {modalOpen && (
        <EditOrganizationModal
          organization={organization}
          initialUsers={users}
          resellerCompanies={resellerCompanies}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
