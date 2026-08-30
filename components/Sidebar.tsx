"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoLockup } from "./Logo";

type NavItem = { href: string; label: string; icon: React.ReactNode };

const ICONS: Record<string, React.ReactNode> = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  years: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
    </svg>
  ),
  base: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 5a8 3 0 0 0 16 0 8 3 0 0 0-16 0Z" />
      <path d="M4 5v6a8 3 0 0 0 16 0V5" />
      <path d="M4 11v6a8 3 0 0 0 16 0v-6" />
    </svg>
  ),
  clients: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6" strokeLinecap="round" />
      <path d="M16.5 14.3c2.7.5 4.5 2.6 4.5 5.7" strokeLinecap="round" />
      <circle cx="16" cy="7.5" r="2.3" />
    </svg>
  ),
  models: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3 20 7.5 12 12 4 7.5 12 3Z" />
      <path d="M4 7.5V16l8 4.5 8-4.5V7.5" />
      <path d="M12 12v8.5" />
    </svg>
  ),
  reports: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 20V10M11 20V4M18 20v-7" strokeLinecap="round" />
      <path d="M2.5 20h19" strokeLinecap="round" />
    </svg>
  ),
};

export function Sidebar({
  isAdmin,
  fullName,
}: {
  isAdmin: boolean;
  fullName: string | null;
}) {
  const pathname = usePathname();

  const navItems: NavItem[] = isAdmin
    ? [
        { href: "/", label: "לוח בקרה", icon: ICONS.dashboard },
        { href: "/admin/years", label: "שנות פעילות", icon: ICONS.years },
        { href: "/admin/base-data", label: "בסיס מידע", icon: ICONS.base },
        { href: "/admin/clients", label: "לקוחות", icon: ICONS.clients },
      ]
    : [
        { href: "/", label: "לוח בקרה", icon: ICONS.dashboard },
        { href: "/client/models", label: "המודלים שלי", icon: ICONS.models },
        { href: "/client/reports", label: "דוחות", icon: ICONS.reports },
      ];

  return (
    <aside className="flex w-64 shrink-0 flex-col justify-between bg-sidebar-bg px-4 py-6 text-sidebar-foreground">
      <div>
        <div className="mb-8 px-2">
          <LogoLockup size={38} />
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-sidebar-active-bg text-accent"
                    : "text-sidebar-foreground-muted hover:bg-sidebar-bg-elevated hover:text-sidebar-foreground"
                }`}
              >
                <span className={active ? "text-accent" : ""}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="space-y-3 border-t border-sidebar-border pt-4 px-2">
        <div className="text-xs text-sidebar-foreground-muted">
          <span className="text-sidebar-foreground">{fullName ?? "משתמש"}</span>
          <br />
          <span className="text-[11px]">{isAdmin ? "מנהל מערכת" : "לקוח"}</span>
        </div>
        <form action="/logout" method="post">
          <button className="w-full rounded-lg border border-sidebar-border py-1.5 text-xs font-medium text-sidebar-foreground-muted transition hover:border-accent/50 hover:text-accent">
            התנתקות
          </button>
        </form>
      </div>
    </aside>
  );
}
