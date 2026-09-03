"use client";

import { useTransition } from "react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#2A2560]">עריכת {organization.name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="rounded-lg p-1.5 text-[#7A76A8] hover:bg-[#F7F6FE]"
          >
            ✕
          </button>
        </div>

        <form action={handleSave} className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#7A76A8]">שם הארגון</label>
            <input
              name="name"
              defaultValue={organization.name}
              required
              className="w-full rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#7A76A8]">אימייל ליצירת קשר</label>
            <input
              name="contact_email"
              type="email"
              defaultValue={organization.contact_email ?? ""}
              className="w-full rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#7A76A8]">טלפון</label>
            <input
              name="contact_phone"
              defaultValue={organization.contact_phone ?? ""}
              className="w-full rounded-md border border-[#E4E1FA] px-2 py-1.5 text-sm"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              disabled={isPending}
              className="rounded-lg bg-[#5B4FE8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4A3FD4] disabled:opacity-60"
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
