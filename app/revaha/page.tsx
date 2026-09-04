import Link from "next/link";
import { Banknote, Building2, ReceiptText, Users2, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRevahaProfile } from "@/lib/revaha/auth";
import { computeFacilityBudget, addFacilityBudgets } from "@/lib/revaha/calc";
import { KpiCard } from "@/components/revaha/KpiCard";

function fmt(n: number) {
  return n.toLocaleString("he-IL", { maximumFractionDigits: 0 });
}

export default async function RevahaDashboardPage() {
  const session = await getCurrentRevahaProfile();
  const supabase = await createClient();
  const isAdmin = session?.profile?.role === "admin";
  const greetingName = session?.profile?.full_name ? `, ${session.profile.full_name}` : "";

  if (isAdmin) {
    const [{ count: orgCount }, { data: facilities }, { data: staff }, { data: assignments }, { data: roleTypeRates }, { data: expenses }, { data: roles }] =
      await Promise.all([
        supabase.from("organizations_revaha").select("*", { count: "exact", head: true }),
        supabase.from("facilities_revaha").select("*"),
        supabase.from("staff_revaha").select("*"),
        supabase.from("staff_role_assignments_revaha").select("*"),
        supabase.from("staff_role_type_rates_revaha").select("*"),
        supabase.from("facility_expense_line_items_revaha").select("*"),
        supabase.from("roles_revaha").select("*"),
      ]);

    const summaries = (facilities ?? []).map((f) => {
      const fStaff = (staff ?? []).filter((s) => s.facility_id === f.id);
      const fStaffIds = new Set(fStaff.map((s) => s.id));
      const fAssignments = (assignments ?? []).filter((a) => fStaffIds.has(a.staff_id));
      const fExpenses = (expenses ?? []).filter((e) => e.facility_id === f.id);
      return computeFacilityBudget(fAssignments, fStaff, roles ?? [], roleTypeRates ?? [], fExpenses);
    });
    const total = addFacilityBudgets(summaries);

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-2xs">
          <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">מערכת ניהול תקציב רווחה</h1>
          <p className="mt-1 text-sm text-slate-500">שלום{greetingName} 👋</p>
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

  const [{ data: staff }, { data: assignments }, { data: roleTypeRates }, { data: expenses }, { data: roles }] =
    await Promise.all([
      facilityIds.length
        ? supabase.from("staff_revaha").select("*").in("facility_id", facilityIds)
        : Promise.resolve({ data: [] }),
      facilityIds.length
        ? supabase
            .from("staff_role_assignments_revaha")
            .select("*, staff_revaha!inner(facility_id)")
            .in("staff_revaha.facility_id", facilityIds)
        : Promise.resolve({ data: [] }),
      supabase.from("staff_role_type_rates_revaha").select("*"),
      facilityIds.length
        ? supabase.from("facility_expense_line_items_revaha").select("*").in("facility_id", facilityIds)
        : Promise.resolve({ data: [] }),
      supabase.from("roles_revaha").select("*"),
    ]);

  const summaries = (facilities ?? []).map((f) => {
    const fStaff = (staff ?? []).filter((s) => s.facility_id === f.id);
    const fStaffIds = new Set(fStaff.map((s) => s.id));
    const fAssignments = (assignments ?? []).filter((a) => fStaffIds.has(a.staff_id));
    const fExpenses = (expenses ?? []).filter((e) => e.facility_id === f.id);
    return {
      facility: f,
      summary: computeFacilityBudget(fAssignments, fStaff, roles ?? [], roleTypeRates ?? [], fExpenses),
    };
  });

  const total = addFacilityBudgets(summaries.map((s) => s.summary));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-2xs">
        <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">תקציב מאוחד — כלל הפנימיות שלכם</h1>
        <p className="mt-1 text-sm text-slate-500">שלום{greetingName} 👋</p>
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
    </div>
  );
}
