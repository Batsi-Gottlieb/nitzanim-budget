"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, LayoutDashboard, ShieldCheck, Users } from "lucide-react";

type NavItem = {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

type StatusStat = { label: string; value: number; accent?: boolean };

export function RevahaSidebar({
  isAdmin,
  fullName,
  stats,
}: {
  isAdmin: boolean;
  fullName: string | null;
  stats: StatusStat[];
}) {
  const pathname = usePathname();

  const navItems: NavItem[] = isAdmin
    ? [
        { href: "/revaha", title: "לוח בקרה", subtitle: "תמונת מצב תקציבית כוללת", icon: LayoutDashboard },
        {
          href: "/revaha/admin/organizations",
          title: "ניהול לקוחות ומשתמשים",
          subtitle: "ארגונים מפעילים, חשבונות כניסה",
          icon: Users,
        },
        {
          href: "/revaha/admin/base-data",
          title: "בסיס מידע ומודלי תקן",
          subtitle: "תקני רווחה, תפקידים ושכר ייחוס",
          icon: Database,
        },
      ]
    : [
        { href: "/revaha", title: "לוח בקרה", subtitle: "תקציב מאוחד לכלל הפנימיות", icon: LayoutDashboard },
        { href: "/revaha/org/facilities", title: "הפנימיות שלי", subtitle: "ניהול פנימיות ותקציבים", icon: Users },
      ];

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-slate-200/80 bg-white shadow-xs min-h-screen select-none">
      <div className="border-b border-slate-100 bg-slate-50/50 p-5">
        <Link
          href="/revaha"
          className="group -m-1.5 flex w-full items-center gap-3 rounded-xl p-1.5 text-right transition-all hover:bg-white hover:shadow-2xs"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-lg font-black text-white shadow-xs transition-all group-hover:scale-105 group-hover:bg-indigo-700">
            ר
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-bold tracking-tight text-slate-900 transition-colors group-hover:text-indigo-600">
              תקצוב ובקרה
            </span>
            <p className="mt-0.5 text-[11px] font-medium leading-tight text-slate-400">פנימיות רווחה</p>
          </div>
        </Link>

        <div className="mt-3 space-y-0.5 rounded-xl border border-slate-200/70 bg-slate-100/70 p-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 font-semibold text-slate-800">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
              {fullName ?? "משתמש"}
            </span>
            <span className="rounded border border-indigo-100 bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700">
              {isAdmin ? "Admin" : "ארגון"}
            </span>
          </div>
          <p className="text-[10px] text-slate-500">{isAdmin ? "ניהול כלל הארגונים והפנימיות" : "ניהול הפנימיות שלכם"}</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        <div>
          <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {isAdmin ? "תפריט מנהל מערכת" : "תפריט ארגון"}
          </div>
          <nav className="space-y-1" aria-label="ניווט">
            {navItems.map((item) => {
              const active = item.href === "/revaha" ? pathname === "/revaha" : pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-right transition-all ${
                    active
                      ? "border-r-4 border-r-indigo-600 bg-indigo-50/70 text-indigo-700"
                      : "border border-slate-100 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={active ? "text-indigo-600" : "text-indigo-600"}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold leading-tight">{item.title}</div>
                      <div className="mt-0.5 truncate text-[10px] leading-tight text-slate-400">{item.subtitle}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2 rounded-xl border border-slate-200/60 bg-slate-50/70 p-3 text-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">סטטוס מערכת</div>
          <div className="grid grid-cols-2 gap-2 text-center">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border border-slate-200/60 bg-white p-2">
                <div className="text-[10px] font-medium text-slate-400">{s.label}</div>
                <div className={`text-sm font-bold ${s.accent ? "text-emerald-600" : "text-slate-900"}`}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/40 p-3">
        <form action="/logout" method="post">
          <button className="w-full rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700">
            התנתקות
          </button>
        </form>
      </div>
    </aside>
  );
}
