import { createClient } from "@/lib/supabase/server";
import { CreateOrganizationForm } from "./CreateOrganizationForm";
import { OrganizationRow } from "./OrganizationRow";

export default async function RevahaOrganizationsPage() {
  const supabase = await createClient();
  const { data: organizations } = await supabase.from("organizations_revaha").select("*").order("name");

  const organizationIds = (organizations ?? []).map((o) => o.id);
  const { data: allUsers } = organizationIds.length
    ? await supabase
        .from("profiles_revaha")
        .select("id, email, full_name, organization_id")
        .in("organization_id", organizationIds)
        .order("created_at")
    : { data: [] };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2A2560]">ארגונים מפעילים</h1>
        <p className="mt-1 text-sm text-[#7A76A8]">ניהול ארגונים ויצירת משתמשים מקושרים.</p>
      </div>

      <CreateOrganizationForm />

      <div className="divide-y divide-[#E4E1FA] rounded-2xl border border-[#E4E1FA] bg-white">
        {(organizations ?? []).map((o) => (
          <OrganizationRow key={o.id} organization={o} users={(allUsers ?? []).filter((u) => u.organization_id === o.id)} />
        ))}
        {(organizations ?? []).length === 0 && (
          <div className="px-4 py-3 text-sm text-[#7A76A8]">אין ארגונים עדיין</div>
        )}
      </div>
    </div>
  );
}
