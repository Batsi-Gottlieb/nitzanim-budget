import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentRevahaProfile } from "@/lib/revaha/auth";
import { createClient } from "@/lib/supabase/server";
import { RevahaSidebar } from "@/components/RevahaSidebar";
import { REVAHA_IMPERSONATOR_COOKIE, verifySignedAdminId } from "@/lib/revaha/impersonation";
import { returnToRevahaAdmin } from "@/app/revaha/admin/organizations/actions";

export default async function RevahaLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentRevahaProfile();
  if (!session) redirect("/login");
  if (!session.profile) redirect("/");

  const { profile } = session;
  const isAdmin = profile.role === "admin";
  const supabase = await createClient();

  const cookieStore = await cookies();
  const isImpersonating = !!verifySignedAdminId(cookieStore.get(REVAHA_IMPERSONATOR_COOKIE)?.value);

  let stats: { label: string; value: number; accent?: boolean }[];
  if (isAdmin) {
    const [{ count: orgCount }, { count: facilityCount }] = await Promise.all([
      supabase.from("organizations_revaha").select("*", { count: "exact", head: true }),
      supabase.from("facilities_revaha").select("*", { count: "exact", head: true }),
    ]);
    stats = [
      { label: "לקוחות", value: orgCount ?? 0 },
      { label: "פנימיות", value: facilityCount ?? 0, accent: true },
    ];
  } else {
    const { count: facilityCount } = profile.organization_id
      ? await supabase
          .from("facilities_revaha")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", profile.organization_id)
      : { count: 0 };
    stats = [{ label: "פנימיות", value: facilityCount ?? 0, accent: true }];
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
        <RevahaSidebar isAdmin={isAdmin} fullName={profile.full_name} stats={stats} />
        <div className="flex min-h-screen flex-1 flex-col">
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
