import Link from "next/link";
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
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2A2560]">הפנימיות שלי</h1>
        <p className="mt-1 text-sm text-[#7A76A8]">ניהול הפנימיות של הארגון, שיוך מודל תקן ומושמים.</p>
      </div>

      <CreateFacilityForm models={models ?? []} />

      <div className="divide-y divide-[#E4E1FA] rounded-2xl border border-[#E4E1FA] bg-white">
        {(facilities ?? []).map((f) => (
          <Link
            key={f.id}
            href={`/revaha/org/facilities/${f.id}`}
            className="flex items-center justify-between px-4 py-3 text-sm hover:bg-[#F7F6FE]"
          >
            <span className="font-medium text-[#2A2560]">{f.name}</span>
            <span className="text-xs text-[#7A76A8]">
              {(f.facility_models_revaha as unknown as { name: string } | null)?.name ?? "ללא מודל"}
            </span>
          </Link>
        ))}
        {(facilities ?? []).length === 0 && <div className="px-4 py-3 text-sm text-[#7A76A8]">אין פנימיות עדיין</div>}
      </div>
    </div>
  );
}
