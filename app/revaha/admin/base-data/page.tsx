import Link from "next/link";
import { Database, LayoutGrid } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { RoleTypesSection } from "./RoleTypesSection";
import { RolesSection } from "./RolesSection";
import { IncomeRatesSection } from "./IncomeRatesSection";

export default async function RevahaBaseDataPage() {
  const supabase = await createClient();
  const [{ data: roleTypes }, { data: roles }, { data: incomeRates }] = await Promise.all([
    supabase.from("role_types_revaha").select("*").order("name"),
    supabase.from("roles_revaha").select("*").order("name"),
    supabase.from("income_rate_categories_revaha").select("*").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-2xs">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
            <Database className="h-5 w-5 text-indigo-600" />
            בסיס מידע — מודלי פנימיות ותקני שעות
          </h1>
          <p className="mt-1 text-sm text-slate-500">קטלוגים משותפים: סוגי תפקיד, תפקידים ותעריפי הכנסה.</p>
        </div>
        <Link
          href="/revaha/admin/base-data/models"
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          מודלי פנימיות
        </Link>
      </div>

      <RoleTypesSection roleTypes={roleTypes ?? []} />
      <RolesSection roleTypes={roleTypes ?? []} roles={roles ?? []} />
      <IncomeRatesSection categories={incomeRates ?? []} />
    </div>
  );
}
