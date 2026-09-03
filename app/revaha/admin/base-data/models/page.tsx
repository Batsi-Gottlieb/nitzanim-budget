import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreateModelForm } from "./CreateModelForm";

export default async function RevahaFacilityModelsPage() {
  const supabase = await createClient();
  const { data: models } = await supabase.from("facility_models_revaha").select("*").order("name");

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/revaha/admin/base-data" className="text-xs text-[#7A76A8] hover:text-[#5B4FE8]">
          ← בסיס מידע
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-[#2A2560]">מודלי פנימיות</h1>
        <p className="mt-1 text-sm text-[#7A76A8]">מודל תקן קובע תעריפי הכנסה ברירת מחדל ותקן תפקידים לפנימייה.</p>
      </div>

      <CreateModelForm />

      <div className="divide-y divide-[#E4E1FA] rounded-2xl border border-[#E4E1FA] bg-white">
        {(models ?? []).map((m) => (
          <Link
            key={m.id}
            href={`/revaha/admin/base-data/models/${m.id}`}
            className="block px-4 py-3 text-sm font-medium text-[#2A2560] hover:bg-[#F7F6FE]"
          >
            {m.name}
          </Link>
        ))}
        {(models ?? []).length === 0 && <div className="px-4 py-3 text-sm text-[#7A76A8]">אין מודלים עדיין</div>}
      </div>
    </div>
  );
}
