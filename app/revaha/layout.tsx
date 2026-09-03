import { redirect } from "next/navigation";
import { getCurrentRevahaProfile } from "@/lib/revaha/auth";
import { RevahaSidebar } from "@/components/RevahaSidebar";

export default async function RevahaLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentRevahaProfile();
  if (!session) redirect("/login");
  if (!session.profile) redirect("/");

  const { profile } = session;
  const isAdmin = profile.role === "admin";

  return (
    <div className="flex min-h-screen">
      <RevahaSidebar isAdmin={isAdmin} fullName={profile.full_name} />
      <main className="flex-1 overflow-y-auto bg-[#FBFAFF] p-8">{children}</main>
    </div>
  );
}
