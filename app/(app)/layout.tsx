import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");

  const { profile } = session;
  const isAdmin = profile?.role === "admin";

  const navItems = isAdmin
    ? [
        { href: "/", label: "לוח בקרה" },
        { href: "/admin/years", label: "שנות פעילות" },
        { href: "/admin/base-data", label: "בסיס מידע" },
        { href: "/admin/clients", label: "לקוחות" },
      ]
    : [
        { href: "/", label: "לוח בקרה" },
        { href: "/client/models", label: "המודלים שלי" },
        { href: "/client/reports", label: "דוחות" },
      ];

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col justify-between border-l border-border bg-surface px-4 py-6">
        <div>
          <div className="mb-8 px-2">
            <h1 className="text-xl font-extrabold text-primary">ניצנים</h1>
            <p className="text-xs text-foreground-muted">רוח גוטליב-ביטון</p>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="space-y-3 px-2">
          <div className="text-xs text-foreground-muted">
            {profile?.full_name ?? "משתמש"}
            <br />
            <span className="text-[11px]">{isAdmin ? "מנהל מערכת" : "לקוח"}</span>
          </div>
          <form action="/logout" method="post">
            <button className="w-full rounded-lg border border-border py-1.5 text-xs font-medium text-foreground-muted transition hover:bg-surface-muted">
              התנתקות
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
