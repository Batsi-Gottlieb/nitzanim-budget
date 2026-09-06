"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users2, BarChart3 } from "lucide-react";

export function FacilityTabs({ facilityId }: { facilityId: string }) {
  const pathname = usePathname();
  const basePath = `/revaha/org/facilities/${facilityId}`;
  const tabs = [
    { href: basePath, label: "פרטים וצוות", icon: Users2 },
    { href: `${basePath}/reports`, label: "דוחות", icon: BarChart3 },
  ];

  return (
    <div className="inline-flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              isActive
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-500 hover:bg-white/60 hover:text-slate-700"
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
