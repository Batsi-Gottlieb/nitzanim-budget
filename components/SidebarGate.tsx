"use client";

import { useSearchParams } from "next/navigation";
import { Sidebar } from "./Sidebar";

/**
 * Suppresses the citrus Sidebar specifically while the admin system-picker
 * (app/(app)/page.tsx) is showing, since that screen is meant to sit outside
 * either module's own shell. Layouts can't read searchParams directly, so
 * this client wrapper checks the same `?system=citrus` flag the page uses.
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
  const searchParams = useSearchParams();
  const showingPicker = isPickerEligible && searchParams.get("system") !== "citrus";
  if (showingPicker) return null;
  return <Sidebar isAdmin={isAdmin} fullName={fullName} />;
}
