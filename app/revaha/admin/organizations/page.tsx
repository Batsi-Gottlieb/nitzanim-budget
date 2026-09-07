import { Building2, ShieldCheck, UserCog, Users2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRevahaProfile } from "@/lib/revaha/auth";
import { addFacilityBudgets, computeFacilityBudget } from "@/lib/revaha/calc";
import { CreateOrganizationForm } from "./CreateOrganizationForm";
import { OrganizationRow } from "./OrganizationRow";

export default async function RevahaOrganizationsPage() {
  const session = await getCurrentRevahaProfile();
  const isSuperAdmin = session?.profile?.role === "admin";
  const supabase = await createClient();
  const [{ data: organizations }, { data: resellerCompanies }] = await Promise.all([
    supabase.from("organizations_revaha").select("*, reseller_companies_revaha(name, contact_email)").order("name"),
    isSuperAdmin ? supabase.from("reseller_companies_revaha").select("id, name").order("name") : Promise.resolve({ data: [] }),
  ]);

  const organizationIds = (organizations ?? []).map((o) => o.id);
  const [{ data: allUsers }, { data: facilities }] = await Promise.all([
    organizationIds.length
      ? supabase
          .from("profiles_revaha")
          .select("id, email, full_name, organization_id")
          .in("organization_id", organizationIds)
          .order("created_at")
      : Promise.resolve({ data: [] }),
    organizationIds.length
      ? supabase.from("facilities_revaha").select("*").in("organization_id", organizationIds)
      : Promise.resolve({ data: [] }),
  ]);

  const facilityList = facilities ?? [];
  const facilityIds = facilityList.map((f) => f.id);
  const [{ data: staff }, { data: assignments }, { data: expenses }] = await Promise.all([
    facilityIds.length ? supabase.from("staff_revaha").select("*").in("facility_id", facilityIds) : Promise.resolve({ data: [] }),
    facilityIds.length
      ? supabase
          .from("staff_role_assignments_revaha")
          .select("*, staff_revaha!inner(facility_id)")
          .in("staff_revaha.facility_id", facilityIds)
      : Promise.resolve({ data: [] }),
    facilityIds.length
      ? supabase.from("facility_expense_line_items_revaha").select("*").in("facility_id", facilityIds)
      : Promise.resolve({ data: [] }),
  ]);

  const staffList = staff ?? [];
  const assignmentList = assignments ?? [];
  const expenseList = expenses ?? [];

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
            {facilityList.length}
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

      <CreateOrganizationForm resellerCompanies={isSuperAdmin ? resellerCompanies ?? [] : undefined} />

      <div>
        <div className="mb-3 flex items-center gap-2 px-1">
          <Building2 className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-900">רשימת כלל הלקוחות והארגונים</h2>
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
            {organizations?.length ?? 0} ארגונים
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {(organizations ?? []).map((o) => {
            const orgFacilities = facilityList.filter((f) => f.organization_id === o.id);
            const orgFacilityIds = new Set(orgFacilities.map((f) => f.id));
            const orgStaff = staffList.filter((s) => orgFacilityIds.has(s.facility_id));
            const orgStaffIds = new Set(orgStaff.map((s) => s.id));
            const orgAssignments = assignmentList.filter((a) => orgStaffIds.has(a.staff_id));
            const orgBudget = addFacilityBudgets(
              orgFacilities.map((f) =>
                computeFacilityBudget(
                  orgAssignments,
                  orgStaff.filter((s) => s.facility_id === f.id),
                  f,
                  expenseList.filter((e) => e.facility_id === f.id)
                )
              )
            );
            return (
              <OrganizationRow
                key={o.id}
                organization={o}
                companyName={(o.reseller_companies_revaha as unknown as { name: string; contact_email: string | null } | null)?.name ?? null}
                companyContactEmail={
                  (o.reseller_companies_revaha as unknown as { name: string; contact_email: string | null } | null)?.contact_email ?? null
                }
                users={(allUsers ?? []).filter((u) => u.organization_id === o.id)}
                facilities={orgFacilities.map((f) => ({ id: f.id, name: f.name }))}
                monthlyBudget={orgBudget.totalMonthly}
                resellerCompanies={isSuperAdmin ? resellerCompanies ?? [] : undefined}
              />
            );
          })}
          {(organizations ?? []).length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 lg:col-span-2">
              אין ארגונים עדיין
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
