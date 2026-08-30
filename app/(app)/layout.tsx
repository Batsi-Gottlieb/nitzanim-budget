import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");

  const { profile } = session;
  const isAdmin = profile?.role === "admin";

  return (
    <div className="flex min-h-screen">
      <Sidebar isAdmin={isAdmin} fullName={profile?.full_name ?? null} />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
