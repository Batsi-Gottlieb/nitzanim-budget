import Link from "next/link";
import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRevahaProfile } from "@/lib/revaha/auth";
import { CreateFacilityForm } from "./CreateFacilityForm";

export default async function RevahaFacilitiesPage() {
  const session = await getCurrentRevahaProfile();
  const organizationId = session?.profile?.organization_id;
  const supabase = await createClient();

  const [{ data: facilities }, { data: models }] = await Promise.all([
    organizationId
      ? supabase.from("facilities_revaha").select("*, facility_models_revaha(name)").eq("organization_id", organizationId).order("name")
      : Promise.resolve({ data: [] }),
    supabase.from("facility_models_revaha").select("id, name").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-2xs">
        <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
          <Building2 className="h-5 w-5 text-indigo-600" />
          הפנימיות שלי
        </h1>
        <p className="mt-1 text-sm text-slate-500">ניהול הפנימיות של הארגון, שיוך מודל תקן ומושמים.</p>
      </div>

      <CreateFacilityForm models={models ?? []} />

      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        {(facilities ?? []).map((f) => (
          <Link
            key={f.id}
            href={`/revaha/org/facilities/${f.id}`}
            className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-slate-50"
          >
            <span className="font-semibold text-slate-900">{f.name}</span>
            <span className="text-xs text-slate-500">
              {(f.facility_models_revaha as unknown as { name: string } | null)?.name ?? "ללא מודל"}
            </span>
          </Link>
        ))}
        {(facilities ?? []).length === 0 && <div className="px-4 py-3 text-sm text-slate-500">אין פנימיות עדיין</div>}
      </div>
    </div>
  );
}
