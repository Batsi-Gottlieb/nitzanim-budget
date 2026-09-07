import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentRevahaProfile } from "@/lib/revaha/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { RevahaSidebar } from "@/components/RevahaSidebar";
import { REVAHA_IMPERSONATOR_COOKIE, verifySignedAdminId } from "@/lib/revaha/impersonation";
import { returnToRevahaAdmin } from "@/app/revaha/admin/organizations/actions";

export default async function RevahaLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentRevahaProfile();
  if (!session) redirect("/login");
  if (!session.profile) redirect("/");

  const { profile } = session;
  const isAdmin = profile.role === "admin";
  const isCompanyRole = profile.role === "company_admin" || profile.role === "company_staff";
  const supabase = await createClient();

  const cookieStore = await cookies();
  const isImpersonating = !!verifySignedAdminId(cookieStore.get(REVAHA_IMPERSONATOR_COOKIE)?.value);

  let stats: { label: string; value: number; accent?: boolean }[];
  let navCounts: { organizations?: number; resellerCompanies?: number; facilities?: number } = {};
  if (isAdmin) {
    const [{ count: orgCount }, { count: facilityCount }, { count: resellerCompanyCount }] = await Promise.all([
      supabase.from("organizations_revaha").select("*", { count: "exact", head: true }),
      supabase.from("facilities_revaha").select("*", { count: "exact", head: true }),
      supabase.from("reseller_companies_revaha").select("*", { count: "exact", head: true }),
    ]);
    stats = [
      { label: "לקוחות", value: orgCount ?? 0 },
      { label: "פנימיות", value: facilityCount ?? 0, accent: true },
    ];
    navCounts = { organizations: orgCount ?? 0, resellerCompanies: resellerCompanyCount ?? 0 };
  } else if (isCompanyRole) {
    const [{ count: orgCount }, { count: facilityCount }] = await Promise.all([
      supabase.from("organizations_revaha").select("*", { count: "exact", head: true }),
      supabase.from("facilities_revaha").select("*", { count: "exact", head: true }),
    ]);
    stats = [
      { label: "לקוחות", value: orgCount ?? 0 },
      { label: "פנימיות", value: facilityCount ?? 0, accent: true },
    ];
    navCounts = { organizations: orgCount ?? 0 };
  } else {
    const { count: facilityCount } = profile.organization_id
      ? await supabase
          .from("facilities_revaha")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", profile.organization_id)
      : { count: 0 };
    stats = [{ label: "פנימיות", value: facilityCount ?? 0, accent: true }];
    navCounts = { facilities: facilityCount ?? 0 };
  }

  // Branding: super-admin gets the default revaha brand; everyone else inherits their reseller company's logo/name.
  let companyName: string | null = null;
  let companyLogoUrl: string | null = null;
  if (!isAdmin) {
    let resellerCompanyId = profile.reseller_company_id;
    if (!resellerCompanyId && profile.organization_id) {
      const { data: org } = await supabase
        .from("organizations_revaha")
        .select("reseller_company_id")
        .eq("id", profile.organization_id)
        .maybeSingle();
      resellerCompanyId = org?.reseller_company_id ?? null;
    }
    if (resellerCompanyId) {
      // Read-only, safe-field lookup via the service-role client: reseller_companies_revaha's RLS is
      // deliberately super-admin-only (it also holds billing_notes/billing_customer_ref/url_token), so a
      // company_admin/staff/org_user can't read even their own row through the regular RLS-bound client.
      const adminClient = createAdminClient();
      const { data: company } = await adminClient
        .from("reseller_companies_revaha")
        .select("name, logo_url")
        .eq("id", resellerCompanyId)
        .maybeSingle();
      companyName = company?.name ?? null;
      companyLogoUrl = company?.logo_url ?? null;
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-slate-900">
      {isImpersonating && (
        <form action={returnToRevahaAdmin} className="flex items-center justify-between bg-indigo-100 px-4 py-2 text-sm">
          <span className="font-medium text-indigo-800">מציג/ה כעת כארגון: {profile.full_name ?? ""}</span>
          <button className="rounded-lg bg-indigo-700 px-3 py-1 text-xs font-semibold text-white hover:opacity-90">
            חזרה לניהול
          </button>
        </form>
      )}
      <div className="flex flex-1">
        <RevahaSidebar
          role={profile.role}
          fullName={profile.full_name}
          stats={stats}
          navCounts={navCounts}
          companyName={companyName}
          companyLogoUrl={companyLogoUrl}
        />
        <div className="flex min-h-screen flex-1 flex-col">
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
