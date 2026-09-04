import { redirect } from "next/navigation";
import { getCurrentRevahaProfile } from "@/lib/revaha/auth";
import { createClient } from "@/lib/supabase/server";
import { RevahaSidebar } from "@/components/RevahaSidebar";

export default async function RevahaLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentRevahaProfile();
  if (!session) redirect("/login");
  if (!session.profile) redirect("/");

  const { profile } = session;
  const isAdmin = profile.role === "admin";
  const supabase = await createClient();

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
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <RevahaSidebar isAdmin={isAdmin} fullName={profile.full_name} stats={stats} />
      <div className="flex min-h-screen flex-1 flex-col">
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
