"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { updateOrganizationDetails } from "./actions";
import { OrgUsersSection } from "./OrgUsersSection";

type UserRow = { id: string; email: string | null; full_name: string | null };
type OrganizationInfo = { id: string; name: string; contact_email: string | null; contact_phone: string | null };

export function EditOrganizationModal({
  organization,
  initialUsers,
  onClose,
}: {
  organization: OrganizationInfo;
  initialUsers: UserRow[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSave(formData: FormData) {
    startTransition(() => updateOrganizationDetails(organization.id, formData));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">עריכת {organization.name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={handleSave} className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">שם הארגון</label>
            <input
              name="name"
              defaultValue={organization.name}
              required
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">אימייל ליצירת קשר</label>
            <input
              name="contact_email"
              type="email"
              defaultValue={organization.contact_email ?? ""}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">טלפון</label>
            <input
              name="contact_phone"
              defaultValue={organization.contact_phone ?? ""}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
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

        <OrgUsersSection organizationId={organization.id} initialUsers={initialUsers} />
      </div>
    </div>
  );
}
