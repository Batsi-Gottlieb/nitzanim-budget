import { Briefcase } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CreateResellerCompanyForm } from "./CreateResellerCompanyForm";
import { ResellerCompanyRow } from "./ResellerCompanyRow";

export default async function RevahaResellerCompaniesPage() {
  const supabase = await createClient();
  const { data: companies } = await supabase.from("reseller_companies_revaha").select("*").order("name");

  const companyIds = (companies ?? []).map((c) => c.id);
  const [{ data: allUsers }, { data: allOrgs }] = await Promise.all([
    companyIds.length
      ? supabase
          .from("profiles_revaha")
          .select("id, email, full_name, role, reseller_company_id")
          .in("reseller_company_id", companyIds)
          .order("created_at")
      : Promise.resolve({ data: [] }),
    companyIds.length
      ? supabase.from("organizations_revaha").select("id, reseller_company_id").in("reseller_company_id", companyIds)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-2xs">
        <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
          <Briefcase className="h-5 w-5 text-indigo-600" />
          לקוחות (חברות) מערכת
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          ניהול חברות רו״ח שמפעילות פאנל ניהול משלהן, עם המיתוג, הלקוחות והצוות שלהן.
        </p>
      </div>

      <CreateResellerCompanyForm />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/70 px-4 py-3">
          <Briefcase className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-900">רשימת חברות מערכת</h2>
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
            {companies?.length ?? 0} חברות
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {(companies ?? []).map((c) => (
            <ResellerCompanyRow
              key={c.id}
              company={c}
              users={(allUsers ?? []).filter((u) => u.reseller_company_id === c.id)}
              orgCount={(allOrgs ?? []).filter((o) => o.reseller_company_id === c.id).length}
            />
          ))}
          {(companies ?? []).length === 0 && <div className="px-4 py-3 text-sm text-slate-500">אין חברות עדיין</div>}
        </div>
      </div>
    </div>
  );
}
