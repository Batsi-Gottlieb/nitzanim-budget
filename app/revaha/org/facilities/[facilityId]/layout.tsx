import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FacilityTabs } from "./FacilityTabs";

export default async function RevahaFacilityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ facilityId: string }>;
}) {
  const { facilityId } = await params;
  const supabase = await createClient();
  const { data: facility } = await supabase.from("facilities_revaha").select("id, name").eq("id", facilityId).maybeSingle();

  if (!facility) notFound();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-2xs">
        <Link href="/revaha/org/facilities" className="text-xs text-slate-500 hover:text-indigo-600">
          ← הפנימיות שלי
        </Link>
        <h1 className="mt-1 text-xl font-black tracking-tight text-slate-900">{facility.name}</h1>
      </div>

      <FacilityTabs facilityId={facilityId} />

      {children}
    </div>
  );
}
