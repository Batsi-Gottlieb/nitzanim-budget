"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Sidebar } from "./Sidebar";

/**
 * Suppresses the citrus Sidebar specifically while the admin system-picker
 * (app/(app)/page.tsx) is showing, since that screen is meant to sit outside
 * either module's own shell. Layouts can't read searchParams directly, so
 * this client wrapper checks the same `?system=citrus` flag the page uses —
 * but only on the picker's own route ("/"): any other citrus route (e.g.
 * /admin/years) already firmly means we're inside the citrus module, so the
 * sidebar must always show there even without that query flag (e.g. a
 * bookmarked or directly-typed URL).
 */
export function SidebarGate({
  isAdmin,
  fullName,
  isPickerEligible,
}: {
  isAdmin: boolean;
  fullName: string | null;
  isPickerEligible: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showingPicker = pathname === "/" && isPickerEligible && searchParams.get("system") !== "citrus";
  if (showingPicker) return null;
  return <Sidebar isAdmin={isAdmin} fullName={fullName} />;
}
