import Link from "next/link";
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
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2A2560]">בסיס מידע</h1>
          <p className="mt-1 text-sm text-[#7A76A8]">קטלוגים משותפים: סוגי תפקיד, תפקידים ותעריפי הכנסה.</p>
        </div>
        <Link
          href="/revaha/admin/base-data/models"
          className="rounded-lg bg-[#5B4FE8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4A3FD4]"
        >
          מודלי פנימיות ←
        </Link>
      </div>

      <RoleTypesSection roleTypes={roleTypes ?? []} />
      <RolesSection roleTypes={roleTypes ?? []} roles={roles ?? []} />
      <IncomeRatesSection categories={incomeRates ?? []} />
    </div>
  );
}
