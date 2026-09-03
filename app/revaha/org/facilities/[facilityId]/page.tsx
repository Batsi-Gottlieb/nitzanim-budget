import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeFacilityBudget } from "@/lib/revaha/calc";
import { FacilityDetailForm } from "./FacilityDetailForm";
import { StaffSection } from "./StaffSection";
import { RoleAssignmentsSection } from "./RoleAssignmentsSection";
import { ExpensesSection } from "./ExpensesSection";

function fmt(n: number) {
  return n.toLocaleString("he-IL", { maximumFractionDigits: 0 });
}

export default async function RevahaFacilityDetailPage({ params }: { params: Promise<{ facilityId: string }> }) {
  const { facilityId } = await params;
  const supabase = await createClient();

  const [{ data: facility }, { data: models }, { data: staff }, { data: roleTypes }, { data: roles }, { data: roleTypeRates }, { data: assignments }, { data: expenses }] =
    await Promise.all([
      supabase.from("facilities_revaha").select("*").eq("id", facilityId).maybeSingle(),
      supabase.from("facility_models_revaha").select("id, name").order("name"),
      supabase.from("staff_revaha").select("*").eq("facility_id", facilityId).order("full_name"),
      supabase.from("role_types_revaha").select("*").order("name"),
      supabase.from("roles_revaha").select("*").order("name"),
      supabase.from("staff_role_type_rates_revaha").select("*"),
      supabase.from("staff_role_assignments_revaha").select("*, staff_revaha!inner(facility_id)").eq("staff_revaha.facility_id", facilityId),
      supabase.from("facility_expense_line_items_revaha").select("*").eq("facility_id", facilityId).order("category"),
    ]);

  if (!facility) notFound();

  const staffList = staff ?? [];
  const staffIds = new Set(staffList.map((s) => s.id));
  const roleTypeRatesForStaff = (roleTypeRates ?? []).filter((r) => staffIds.has(r.staff_id));
  const assignmentList = assignments ?? [];

  const budget = computeFacilityBudget(assignmentList, staffList, roles ?? [], roleTypeRates ?? [], expenses ?? []);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/revaha/org/facilities" className="text-xs text-[#7A76A8] hover:text-[#5B4FE8]">
          ← הפנימיות שלי
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-[#2A2560]">{facility.name}</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'סה"כ שכר חודשי', value: `₪${fmt(budget.wageMonthly)}` },
          { label: "תוספות ונסיעות", value: `₪${fmt(budget.staffAdditionsMonthly)}` },
          { label: "הוצאות שוטפות", value: `₪${fmt(budget.expensesMonthly)}` },
          { label: 'סה"כ תקציב חודשי', value: `₪${fmt(budget.totalMonthly)}` },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-[#E4E1FA] bg-white p-4">
            <div className="text-xl font-extrabold text-[#5B4FE8]">{s.value}</div>
            <div className="mt-1 text-xs text-[#7A76A8]">{s.label}</div>
          </div>
        ))}
      </div>

      <FacilityDetailForm facility={facility} models={models ?? []} />
      <StaffSection facilityId={facilityId} staff={staffList} roleTypes={roleTypes ?? []} roleTypeRates={roleTypeRatesForStaff} />
      <RoleAssignmentsSection facilityId={facilityId} staff={staffList} roles={roles ?? []} assignments={assignmentList} />
      <ExpensesSection facilityId={facilityId} items={expenses ?? []} />
    </div>
  );
}
