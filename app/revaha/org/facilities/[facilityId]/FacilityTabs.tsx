"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function FacilityTabs({ facilityId }: { facilityId: string }) {
  const pathname = usePathname();
  const basePath = `/revaha/org/facilities/${facilityId}`;
  const tabs = [
    { href: basePath, label: "פרטים וצוות" },
    { href: `${basePath}/reports`, label: "דוחות" },
  ];

  return (
    <div className="flex gap-1 border-b border-slate-200">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${
              isActive
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "border-b-2 border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
