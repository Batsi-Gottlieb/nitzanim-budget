import { createClient } from "@/lib/supabase/server";
import { getCurrentRevahaProfile } from "@/lib/revaha/auth";
import { computeFacilityBudget, addFacilityBudgets } from "@/lib/revaha/calc";

function fmt(n: number) {
  return n.toLocaleString("he-IL", { maximumFractionDigits: 0 });
}

export default async function RevahaDashboardPage() {
  const session = await getCurrentRevahaProfile();
  const supabase = await createClient();
  const isAdmin = session?.profile?.role === "admin";

  if (isAdmin) {
    const [{ count: orgCount }, { count: facilityCount }, { count: staffCount }] = await Promise.all([
      supabase.from("organizations_revaha").select("*", { count: "exact", head: true }),
      supabase.from("facilities_revaha").select("*", { count: "exact", head: true }),
      supabase.from("staff_revaha").select("*", { count: "exact", head: true }),
    ]);

    return (
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-[#2A2560]">
          שלום{session?.profile?.full_name ? `, ${session.profile.full_name}` : ""} 👋
        </h1>
        <p className="mt-1 text-[#7A76A8]">מערכת תקצוב ובקרה — פנימיות רווחה</p>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { label: "ארגונים מפעילים", value: orgCount ?? 0 },
            { label: "פנימיות", value: facilityCount ?? 0 },
            { label: "אנשי צוות", value: staffCount ?? 0 },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-[#E4E1FA] bg-white p-5">
              <div className="text-3xl font-extrabold text-[#5B4FE8]">{s.value}</div>
              <div className="mt-1 text-sm text-[#7A76A8]">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const organizationId = session?.profile?.organization_id;
  if (!organizationId) {
    return <p className="text-[#7A76A8]">חשבון זה אינו משויך לארגון.</p>;
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
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-[#2A2560]">
        שלום{session?.profile?.full_name ? `, ${session.profile.full_name}` : ""} 👋
      </h1>
      <p className="mt-1 text-[#7A76A8]">תקציב מאוחד — כלל הפנימיות שלכם</p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "פנימיות", value: fmt(facilities?.length ?? 0) },
          { label: 'סה"כ שכר חודשי', value: `₪${fmt(total.wageMonthly)}` },
          { label: 'סה"כ הוצאות חודשי', value: `₪${fmt(total.expensesMonthly)}` },
          { label: 'סה"כ תקציב חודשי', value: `₪${fmt(total.totalMonthly)}` },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-[#E4E1FA] bg-white p-5">
            <div className="text-2xl font-extrabold text-[#5B4FE8]">{s.value}</div>
            <div className="mt-1 text-sm text-[#7A76A8]">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 divide-y divide-[#E4E1FA] rounded-2xl border border-[#E4E1FA] bg-white">
        {summaries.map(({ facility, summary }) => (
          <a
            key={facility.id}
            href={`/revaha/org/facilities/${facility.id}`}
            className="flex items-center justify-between px-4 py-3 text-sm hover:bg-[#F7F6FE]"
          >
            <span className="font-medium text-[#2A2560]">{facility.name}</span>
            <span className="text-[#7A76A8]">₪{fmt(summary.totalMonthly)}/חודש</span>
          </a>
        ))}
        {summaries.length === 0 && <div className="px-4 py-3 text-sm text-[#7A76A8]">אין פנימיות עדיין</div>}
      </div>
    </div>
  );
}
