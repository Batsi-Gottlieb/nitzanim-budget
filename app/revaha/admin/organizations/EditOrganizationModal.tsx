"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { assignOrganizationToCompany, updateOrganizationDetails } from "./actions";
import { OrgUsersSection } from "./OrgUsersSection";

type UserRow = { id: string; email: string | null; full_name: string | null };
type OrganizationInfo = {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  reseller_company_id: string | null;
};
type ResellerCompanyOption = { id: string; name: string };

export function EditOrganizationModal({
  organization,
  initialUsers,
  resellerCompanies,
  onClose,
}: {
  organization: OrganizationInfo;
  initialUsers: UserRow[];
  resellerCompanies?: ResellerCompanyOption[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [companyPending, startCompanyTransition] = useTransition();

  function handleSave(formData: FormData) {
    startTransition(() => updateOrganizationDetails(organization.id, formData));
  }

  function handleCompanyChange(formData: FormData) {
    startCompanyTransition(() => assignOrganizationToCompany(organization.id, formData));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">עריכת {organization.name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <section className="mb-5 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-900">פרטי הארגון</h3>
          <form action={handleSave} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">שם הארגון</label>
              <input
                name="name"
                defaultValue={organization.name}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">אימייל ליצירת קשר</label>
              <input
                name="contact_email"
                type="email"
                dir="ltr"
                defaultValue={organization.contact_email ?? ""}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">טלפון</label>
              <input
                name="contact_phone"
                dir="ltr"
                defaultValue={organization.contact_phone ?? ""}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-sm"
              />
            </div>
            <div className="sm:col-span-3">
              <button
                disabled={isPending}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 disabled:opacity-60"
              >
                {isPending ? "שומר..." : "שמירת פרטים"}
              </button>
            </div>
          </form>
        </section>

        {resellerCompanies && (
          <section className="mb-5 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-900">שיוך לחברת רו״ח</h3>
            <form action={handleCompanyChange} className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1 sm:max-w-xs">
                <select
                  name="reseller_company_id"
                  defaultValue={organization.reseller_company_id ?? ""}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm"
                >
                  <option value="">ניצנים ישירות</option>
                  {resellerCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                disabled={companyPending}
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-60"
              >
                {companyPending ? "מעדכן..." : "עדכון שיוך"}
              </button>
            </form>
          </section>
        )}

        <OrgUsersSection organizationId={organization.id} initialUsers={initialUsers} />
      </div>
    </div>
  );
}
