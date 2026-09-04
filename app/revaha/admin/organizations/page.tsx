import { Building2, ShieldCheck, UserCog, Users2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CreateOrganizationForm } from "./CreateOrganizationForm";
import { OrganizationRow } from "./OrganizationRow";

export default async function RevahaOrganizationsPage() {
  const supabase = await createClient();
  const { data: organizations } = await supabase.from("organizations_revaha").select("*").order("name");

  const organizationIds = (organizations ?? []).map((o) => o.id);
  const [{ data: allUsers }, { count: facilityCount }] = await Promise.all([
    organizationIds.length
      ? supabase
          .from("profiles_revaha")
          .select("id, email, full_name, organization_id")
          .in("organization_id", organizationIds)
          .order("created_at")
      : Promise.resolve({ data: [] }),
    organizationIds.length
      ? supabase.from("facilities_revaha").select("*", { count: "exact", head: true }).in("organization_id", organizationIds)
      : Promise.resolve({ count: 0 }),
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-2xs">
        <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
          <Building2 className="h-5 w-5 text-indigo-600" />
          ניהול לקוחות, ארגונים ומשתמשי גישה
        </h1>
        <p className="mt-1 text-sm text-slate-500">ניהול הרשת: פתיחת ארגונים מפעילים, הגדרת חשבונות כניסה, וכניסה לכל לקוח.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="block text-[10px] font-bold uppercase text-slate-400">מצב מערכת</span>
          <div className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            רשת מרובת לקוחות (Multi-Org)
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="block text-[10px] font-bold uppercase text-slate-400">פנימיות פעילות ברשת</span>
          <div className="mt-0.5 flex items-center gap-1.5 text-xl font-bold text-slate-900">
            <Building2 className="h-5 w-5 text-indigo-600" />
            {facilityCount ?? 0}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="block text-[10px] font-bold uppercase text-slate-400">משתמשי מערכת רשומים</span>
          <div className="mt-0.5 flex items-center gap-1.5 text-xl font-bold text-slate-900">
            <UserCog className="h-5 w-5 text-indigo-600" />
            {allUsers?.length ?? 0}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="block text-[10px] font-bold uppercase text-slate-400">סך הכל לקוחות רשומים</span>
          <div className="mt-0.5 flex items-center gap-1.5 text-xl font-bold text-slate-900">
            <Users2 className="h-5 w-5 text-indigo-600" />
            {organizations?.length ?? 0}
          </div>
        </div>
      </div>

      <CreateOrganizationForm />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/70 px-4 py-3">
          <Building2 className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-900">רשימת כלל הלקוחות והארגונים</h2>
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
            {organizations?.length ?? 0} ארגונים
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {(organizations ?? []).map((o) => (
            <OrganizationRow key={o.id} organization={o} users={(allUsers ?? []).filter((u) => u.organization_id === o.id)} />
          ))}
          {(organizations ?? []).length === 0 && <div className="px-4 py-3 text-sm text-slate-500">אין ארגונים עדיין</div>}
        </div>
      </div>
    </div>
  );
}
