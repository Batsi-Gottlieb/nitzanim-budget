import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { IMPERSONATOR_COOKIE, verifySignedAdminId } from "@/lib/impersonation";
import { returnToAdmin } from "@/app/(app)/admin/clients/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");

  const { profile } = session;
  const isAdmin = profile?.role === "admin";

  const cookieStore = await cookies();
  const isImpersonating = !!verifySignedAdminId(cookieStore.get(IMPERSONATOR_COOKIE)?.value);

  return (
    <div className="flex min-h-screen flex-col">
      {isImpersonating && (
        <form action={returnToAdmin} className="flex items-center justify-between bg-accent px-4 py-2 text-sm">
          <span className="font-medium text-accent-foreground">מציג/ה כעת כלקוח: {profile?.full_name ?? ""}</span>
          <button className="rounded-lg bg-accent-foreground px-3 py-1 text-xs font-semibold text-accent hover:opacity-90">
            חזרה לניהול
          </button>
        </form>
      )}
      <div className="flex flex-1">
        <Sidebar isAdmin={isAdmin} fullName={profile?.full_name ?? null} />
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
