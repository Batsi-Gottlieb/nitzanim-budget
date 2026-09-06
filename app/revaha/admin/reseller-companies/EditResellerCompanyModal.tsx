"use client";

import { useState, useTransition } from "react";
import { Copy, X } from "lucide-react";
import { regenerateCompanyUrlToken, updateResellerCompanyDetails } from "./actions";
import { CompanyUsersSection } from "./CompanyUsersSection";
import { LogoUploadField } from "./LogoUploadField";

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

export function EditResellerCompanyModal({
  company,
  initialUsers,
  onClose,
}: {
  company: CompanyInfo;
  initialUsers: UserRow[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [tokenPending, startTokenTransition] = useTransition();
  const [urlToken, setUrlToken] = useState(company.url_token);

  function handleSave(formData: FormData) {
    startTransition(() => updateResellerCompanyDetails(company.id, formData));
  }

  function handleRegenerateToken() {
    startTokenTransition(async () => {
      const result = await regenerateCompanyUrlToken(company.id);
      setUrlToken(result.token);
    });
  }

  const loginUrl = urlToken ? `${typeof window !== "undefined" ? window.location.origin : ""}/login/c/${urlToken}` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">עריכת {company.name}</h2>
          <button type="button" onClick={onClose} aria-label="סגירה" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={handleSave} className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">שם החברה</label>
            <input
              name="name"
              defaultValue={company.name}
              required
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">אימייל ליצירת קשר</label>
            <input
              name="contact_email"
              type="email"
              defaultValue={company.contact_email ?? ""}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">טלפון</label>
            <input
              name="contact_phone"
              defaultValue={company.contact_phone ?? ""}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
            />
          </div>
          <LogoUploadField companyId={company.id} currentLogoUrl={company.logo_url} />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500">הערות חיוב (פנימי, לא מוצג לחברה)</label>
            <textarea
              name="billing_notes"
              defaultValue={company.billing_notes ?? ""}
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <input type="checkbox" id="company-active" name="is_active" defaultChecked={company.is_active} className="h-4 w-4" />
            <label htmlFor="company-active" className="text-xs text-slate-500">
              חברה פעילה
            </label>
          </div>
          <div className="sm:col-span-2">
            <button
              disabled={isPending}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 disabled:opacity-60"
            >
              {isPending ? "שומר..." : "שמירת פרטים"}
            </button>
          </div>
        </form>

        <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <h3 className="mb-2 text-xs font-bold text-slate-900">קישור כניסה ממותג</h3>
          <div className="flex flex-wrap items-center gap-2">
            <code className="flex-1 truncate rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700">
              {loginUrl ?? "לא נוצר טוקן עדיין"}
            </code>
            {loginUrl && (
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(loginUrl)}
                title="העתקה"
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-white"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              disabled={tokenPending}
              onClick={handleRegenerateToken}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white disabled:opacity-60"
            >
              {tokenPending ? "יוצר..." : "יצירת טוקן חדש"}
            </button>
          </div>
        </div>

        <CompanyUsersSection companyId={company.id} initialUsers={initialUsers} />
      </div>
    </div>
  );
}
