import Link from "next/link";
import { notFound } from "next/navigation";
import { Banknote, Coins, ReceiptText, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { computeFacilityBudget } from "@/lib/revaha/calc";
import { KpiCard } from "@/components/revaha/KpiCard";
import { FacilityDetailForm } from "./FacilityDetailForm";
import { StaffSection } from "./StaffSection";
import { ExpensesSection } from "./ExpensesSection";
import { ReportsSection } from "./ReportsSection";

function fmt(n: number) {
  return n.toLocaleString("he-IL", { maximumFractionDigits: 0 });
}

export default async function RevahaFacilityDetailPage({ params }: { params: Promise<{ facilityId: string }> }) {
  const { facilityId } = await params;
  const supabase = await createClient();

  const [{ data: facility }, { data: models }, { data: staff }, { data: roleTypes }, { data: roles }, { data: assignments }, { data: expenses }, { data: facilityModelRoles }] =
    await Promise.all([
      supabase.from("facilities_revaha").select("*").eq("id", facilityId).maybeSingle(),
      supabase.from("facility_models_revaha").select("id, name").order("name"),
      supabase.from("staff_revaha").select("*").eq("facility_id", facilityId).order("full_name"),
      supabase.from("role_types_revaha").select("*").order("name"),
      supabase.from("roles_revaha").select("*").order("name"),
      supabase.from("staff_role_assignments_revaha").select("*, staff_revaha!inner(facility_id)").eq("staff_revaha.facility_id", facilityId),
      supabase.from("facility_expense_line_items_revaha").select("*").eq("facility_id", facilityId).order("category"),
      supabase.from("facility_model_roles_revaha").select("*"),
    ]);

  if (!facility) notFound();

  const staffList = staff ?? [];
  const assignmentList = assignments ?? [];
  const facilityModelRolesForFacility = (facilityModelRoles ?? []).filter(
    (fmr) => fmr.facility_model_id === facility.facility_model_id
  );

  const budget = computeFacilityBudget(assignmentList, staffList, facility, expenses ?? []);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-2xs">
        <Link href="/revaha/org/facilities" className="text-xs text-slate-500 hover:text-indigo-600">
          ← הפנימיות שלי
        </Link>
        <h1 className="mt-1 text-xl font-black tracking-tight text-slate-900">{facility.name}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <KpiCard label='סה"כ שכר חודשי' value={`₪${fmt(budget.wageMonthly)}`} icon={Banknote} accent="emerald" />
        <KpiCard label="תוספות ונסיעות" value={`₪${fmt(budget.staffAdditionsMonthly)}`} icon={Coins} />
        <KpiCard label="הוצאות שוטפות" value={`₪${fmt(budget.expensesMonthly)}`} icon={ReceiptText} />
        <KpiCard label='סה"כ תקציב חודשי' value={`₪${fmt(budget.totalMonthly)}`} icon={Wallet} />
      </div>

      <FacilityDetailForm facility={facility} models={models ?? []} />
      <StaffSection
        facilityId={facilityId}
        facility={facility}
        staff={staffList}
        assignments={assignmentList}
        roles={roles ?? []}
      />
      <ExpensesSection facilityId={facilityId} items={expenses ?? []} />
      <ReportsSection
        facility={facility}
        facilityModelRoles={facilityModelRolesForFacility}
        roles={roles ?? []}
        roleTypes={roleTypes ?? []}
        assignments={assignmentList}
      />
    </div>
  );
}
