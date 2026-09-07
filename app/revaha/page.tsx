import Link from "next/link";
import { Banknote, Building2, FileDown, ReceiptText, Users2, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRevahaProfile } from "@/lib/revaha/auth";
import {
  addFacilityBudgets,
  addFacilityIncomes,
  addRoleTypeEmployerCosts,
  computeFacilityBudget,
  computeFacilityIncome,
  computeProfitLoss,
  facilityEmployerCostByRoleType,
  facilityEmployerCostMonthly,
} from "@/lib/revaha/calc";
import { KpiCard } from "@/components/revaha/KpiCard";
import { ProfitLossTable } from "@/components/revaha/ProfitLossTable";

function fmt(n: number) {
  return n.toLocaleString("he-IL", { maximumFractionDigits: 0 });
}

export default async function RevahaDashboardPage() {
  const session = await getCurrentRevahaProfile();
  const supabase = await createClient();
  const role = session?.profile?.role;
  const isAdmin = role === "admin";
  const isCompanyRole = role === "company_admin" || role === "company_staff";
  const greetingName = session?.profile?.full_name ? `, ${session.profile.full_name}` : "";

  if (isAdmin || isCompanyRole) {
    const [
      { count: orgCount },
      { data: facilities },
      { data: staff },
      { data: assignments },
      { data: expenses },
      { data: facilityModels },
      { data: incomeRateCategories },
      { data: roles },
      { data: roleTypes },
    ] = await Promise.all([
      supabase.from("organizations_revaha").select("*", { count: "exact", head: true }),
      supabase.from("facilities_revaha").select("*"),
      supabase.from("staff_revaha").select("*"),
      supabase.from("staff_role_assignments_revaha").select("*"),
      supabase.from("facility_expense_line_items_revaha").select("*"),
      supabase.from("facility_models_revaha").select("*"),
      supabase.from("income_rate_categories_revaha").select("*"),
      supabase.from("roles_revaha").select("*"),
      supabase.from("role_types_revaha").select("id, name"),
    ]);

    const facilityModelById = new Map((facilityModels ?? []).map((m) => [m.id, m]));
    const summaries = (facilities ?? []).map((f) => {
      const fStaff = (staff ?? []).filter((s) => s.facility_id === f.id);
      const fStaffIds = new Set(fStaff.map((s) => s.id));
      const fAssignments = (assignments ?? []).filter((a) => fStaffIds.has(a.staff_id));
      const fExpenses = (expenses ?? []).filter((e) => e.facility_id === f.id);
      return computeFacilityBudget(fAssignments, fStaff, f, fExpenses);
    });
    const total = addFacilityBudgets(summaries);

    const totalIncome = addFacilityIncomes(
      (facilities ?? []).map((f) =>
        computeFacilityIncome(f, facilityModelById.get(f.facility_model_id ?? ""), incomeRateCategories ?? [])
      )
    );
    const rolesList = roles ?? [];
    const roleTypesList = roleTypes ?? [];
    const totalWageEmployerCost = (facilities ?? []).reduce((sum, f) => {
      const fStaff = (staff ?? []).filter((s) => s.facility_id === f.id);
      const fStaffIds = new Set(fStaff.map((s) => s.id));
      const fAssignments = (assignments ?? []).filter((a) => fStaffIds.has(a.staff_id));
      return sum + facilityEmployerCostMonthly(fStaff, fAssignments, f);
    }, 0);
    const totalWageByRoleType = addRoleTypeEmployerCosts(
      (facilities ?? []).map((f) => {
        const fStaff = (staff ?? []).filter((s) => s.facility_id === f.id);
        const fStaffIds = new Set(fStaff.map((s) => s.id));
        const fAssignments = (assignments ?? []).filter((a) => fStaffIds.has(a.staff_id));
        return facilityEmployerCostByRoleType(fStaff, fAssignments, f, rolesList, roleTypesList);
      })
    );
    const profitLoss = computeProfitLoss(totalIncome, totalWageEmployerCost, total.expensesMonthly, totalWageByRoleType);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-2xs">
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              {isAdmin ? "מערכת ניהול תקציב רווחה" : "תמונת מצב הלקוחות שלכם"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">שלום{greetingName} 👋</p>
          </div>
          <a
            href="/api/revaha/staffing-report"
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700"
          >
            <FileDown className="h-3.5 w-3.5" />
            ייצוא לאקסל — כל הרשת
          </a>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
          <KpiCard label="לקוחות ברשת" value={orgCount ?? 0} subtitle="ארגונים מפעילים" icon={Building2} />
          <KpiCard label="פנימיות פעילות" value={facilities?.length ?? 0} subtitle="בפיקוח רווחה" icon={Building2} />
          <KpiCard label="מצבת כוח אדם" value={staff?.length ?? 0} subtitle="עובדים משובצים" icon={Users2} />
          <KpiCard
            label="עלות שכר בפועל"
            value={`₪${fmt(total.wageMonthly)}`}
            subtitle="עלות מעסיק חודשית"
            icon={Banknote}
            accent="emerald"
          />
          <KpiCard
            label="תקציב רשתי חודשי"
            value={`₪${fmt(total.totalMonthly)}`}
            subtitle="שכר + תוספות + הוצאות"
            icon={Wallet}
          />
        </div>

        <ProfitLossTable summary={profitLoss} title="דוח רווח והפסד — כל הרשת" />
      </div>
    );
  }

  const organizationId = session?.profile?.organization_id;
  if (!organizationId) {
    return <p className="text-sm text-slate-500">חשבון זה אינו משויך לארגון.</p>;
  }

  const { data: facilities } = await supabase
    .from("facilities_revaha")
    .select("*")
    .eq("organization_id", organizationId);

  const facilityIds = (facilities ?? []).map((f) => f.id);

  const [
    { data: staff },
    { data: assignments },
    { data: expenses },
    { data: facilityModels },
    { data: incomeRateCategories },
    { data: roles },
    { data: roleTypes },
  ] = await Promise.all([
    facilityIds.length
      ? supabase.from("staff_revaha").select("*").in("facility_id", facilityIds)
      : Promise.resolve({ data: [] }),
    facilityIds.length
      ? supabase
          .from("staff_role_assignments_revaha")
          .select("*, staff_revaha!inner(facility_id)")
          .in("staff_revaha.facility_id", facilityIds)
      : Promise.resolve({ data: [] }),
    facilityIds.length
      ? supabase.from("facility_expense_line_items_revaha").select("*").in("facility_id", facilityIds)
      : Promise.resolve({ data: [] }),
    supabase.from("facility_models_revaha").select("*"),
    supabase.from("income_rate_categories_revaha").select("*"),
    supabase.from("roles_revaha").select("*"),
    supabase.from("role_types_revaha").select("id, name"),
  ]);

  const facilityModelById = new Map((facilityModels ?? []).map((m) => [m.id, m]));
  const summaries = (facilities ?? []).map((f) => {
    const fStaff = (staff ?? []).filter((s) => s.facility_id === f.id);
    const fStaffIds = new Set(fStaff.map((s) => s.id));
    const fAssignments = (assignments ?? []).filter((a) => fStaffIds.has(a.staff_id));
    const fExpenses = (expenses ?? []).filter((e) => e.facility_id === f.id);
    return {
      facility: f,
      summary: computeFacilityBudget(fAssignments, fStaff, f, fExpenses),
    };
  });

  const total = addFacilityBudgets(summaries.map((s) => s.summary));

  const totalIncome = addFacilityIncomes(
    (facilities ?? []).map((f) => computeFacilityIncome(f, facilityModelById.get(f.facility_model_id ?? ""), incomeRateCategories ?? []))
  );
  const rolesList = roles ?? [];
  const roleTypesList = roleTypes ?? [];
  const totalWageEmployerCost = (facilities ?? []).reduce((sum, f) => {
    const fStaff = (staff ?? []).filter((s) => s.facility_id === f.id);
    const fStaffIds = new Set(fStaff.map((s) => s.id));
    const fAssignments = (assignments ?? []).filter((a) => fStaffIds.has(a.staff_id));
    return sum + facilityEmployerCostMonthly(fStaff, fAssignments, f);
  }, 0);
  const totalWageByRoleType = addRoleTypeEmployerCosts(
    (facilities ?? []).map((f) => {
      const fStaff = (staff ?? []).filter((s) => s.facility_id === f.id);
      const fStaffIds = new Set(fStaff.map((s) => s.id));
      const fAssignments = (assignments ?? []).filter((a) => fStaffIds.has(a.staff_id));
      return facilityEmployerCostByRoleType(fStaff, fAssignments, f, rolesList, roleTypesList);
    })
  );
  const profitLoss = computeProfitLoss(totalIncome, totalWageEmployerCost, total.expensesMonthly, totalWageByRoleType);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-2xs">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">תקציב מאוחד — כלל הפנימיות שלכם</h1>
          <p className="mt-1 text-sm text-slate-500">שלום{greetingName} 👋</p>
        </div>
        <a
          href="/api/revaha/staffing-report"
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700"
        >
          <FileDown className="h-3.5 w-3.5" />
          ייצוא לאקסל
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <KpiCard label="פנימיות" value={facilities?.length ?? 0} icon={Building2} />
        <KpiCard label='סה"כ שכר חודשי' value={`₪${fmt(total.wageMonthly)}`} icon={Banknote} accent="emerald" />
        <KpiCard label='סה"כ הוצאות חודשי' value={`₪${fmt(total.expensesMonthly)}`} icon={ReceiptText} />
        <KpiCard label='סה"כ תקציב חודשי' value={`₪${fmt(total.totalMonthly)}`} icon={Wallet} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="divide-y divide-slate-100">
          {summaries.map(({ facility, summary }) => (
            <Link
              key={facility.id}
              href={`/revaha/org/facilities/${facility.id}`}
              className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-slate-50/70"
            >
              <span className="font-semibold text-slate-900">{facility.name}</span>
              <span className="text-slate-500">₪{fmt(summary.totalMonthly)}/חודש</span>
            </Link>
          ))}
          {summaries.length === 0 && <div className="px-4 py-3 text-sm text-slate-500">אין פנימיות עדיין</div>}
        </div>
      </div>

      <ProfitLossTable summary={profitLoss} title="דוח רווח והפסד — כלל הפנימיות שלכם" />
    </div>
  );
}
