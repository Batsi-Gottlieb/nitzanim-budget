import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CreateModelForm } from "./CreateModelForm";

export default async function RevahaFacilityModelsPage() {
  const supabase = await createClient();
  const { data: models } = await supabase.from("facility_models_revaha").select("*").order("name");

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-2xs">
        <Link href="/revaha/admin/base-data" className="text-xs text-slate-500 hover:text-indigo-600">
          ← בסיס מידע
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
          <LayoutGrid className="h-5 w-5 text-indigo-600" />
          מודלי פנימיות
        </h1>
        <p className="mt-1 text-sm text-slate-500">מודל תקן קובע תעריפי הכנסה ברירת מחדל ותקן תפקידים לפנימייה.</p>
      </div>

      <CreateModelForm />

      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        {(models ?? []).map((m) => (
          <Link
            key={m.id}
            href={`/revaha/admin/base-data/models/${m.id}`}
            className="block px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
          >
            {m.name}
          </Link>
        ))}
        {(models ?? []).length === 0 && <div className="px-4 py-3 text-sm text-slate-500">אין מודלים עדיין</div>}
      </div>
    </div>
  );
}
