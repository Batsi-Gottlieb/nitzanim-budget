"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };

export function RevahaSidebar({ isAdmin, fullName }: { isAdmin: boolean; fullName: string | null }) {
  const pathname = usePathname();

  const navItems: NavItem[] = isAdmin
    ? [
        { href: "/revaha", label: "לוח בקרה" },
        { href: "/revaha/admin/organizations", label: "ארגונים ומשתמשים" },
        { href: "/revaha/admin/base-data", label: "בסיס מידע ומודלי תקן" },
      ]
    : [
        { href: "/revaha", label: "לוח בקרה" },
        { href: "/revaha/org/facilities", label: "הפנימיות שלי" },
      ];

  return (
    <aside className="flex w-64 shrink-0 flex-col justify-between border-l border-[#E4E1FA] bg-[#F7F6FE] px-4 py-6 text-[#2A2560]">
      <div>
        <div className="mb-8 px-2">
          <div className="text-lg font-extrabold text-[#5B4FE8]">תקצוב ובקרה</div>
          <div className="text-xs text-[#7A76A8]">פנימיות רווחה</div>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = item.href === "/revaha" ? pathname === "/revaha" : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active ? "bg-[#5B4FE8] text-white" : "text-[#4B4780] hover:bg-[#EDEBFC]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="space-y-3 border-t border-[#E4E1FA] pt-4 px-2">
        <div className="text-xs text-[#7A76A8]">
          <span className="text-[#2A2560]">{fullName ?? "משתמש"}</span>
          <br />
          <span className="text-[11px]">{isAdmin ? "מנהל מערכת" : "ארגון מפעיל"}</span>
        </div>
        <form action="/logout" method="post">
          <button className="w-full rounded-lg border border-[#E4E1FA] py-1.5 text-xs font-medium text-[#7A76A8] transition hover:border-[#5B4FE8]/50 hover:text-[#5B4FE8]">
            התנתקות
          </button>
        </form>
      </div>
    </aside>
  );
}
