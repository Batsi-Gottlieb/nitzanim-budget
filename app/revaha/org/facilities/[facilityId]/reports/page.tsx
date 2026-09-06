import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportsSection } from "../ReportsSection";

export default async function RevahaFacilityReportsPage({ params }: { params: Promise<{ facilityId: string }> }) {
  const { facilityId } = await params;
  const supabase = await createClient();

  const [
    { data: facility },
    { data: roleTypes },
    { data: roles },
    { data: assignments },
    { data: facilityModelRoles },
    { data: staff },
    { data: facilityModels },
    { data: incomeRateCategories },
    { data: expenses },
  ] = await Promise.all([
    supabase.from("facilities_revaha").select("*").eq("id", facilityId).maybeSingle(),
    supabase.from("role_types_revaha").select("*").order("name"),
    supabase.from("roles_revaha").select("*").order("name"),
    supabase.from("staff_role_assignments_revaha").select("*, staff_revaha!inner(facility_id)").eq("staff_revaha.facility_id", facilityId),
    supabase.from("facility_model_roles_revaha").select("*"),
    supabase.from("staff_revaha").select("*").eq("facility_id", facilityId),
    supabase.from("facility_models_revaha").select("*"),
    supabase.from("income_rate_categories_revaha").select("*"),
    supabase.from("facility_expense_line_items_revaha").select("*").eq("facility_id", facilityId),
  ]);

  if (!facility) notFound();

  const facilityModelRolesForFacility = (facilityModelRoles ?? []).filter(
    (fmr) => fmr.facility_model_id === facility.facility_model_id
  );
  const facilityModel = (facilityModels ?? []).find((m) => m.id === facility.facility_model_id);

  return (
    <ReportsSection
      facility={facility}
      facilityModelRoles={facilityModelRolesForFacility}
      facilityModel={facilityModel}
      incomeRateCategories={incomeRateCategories ?? []}
      expenses={expenses ?? []}
      roles={roles ?? []}
      roleTypes={roleTypes ?? []}
      assignments={assignments ?? []}
      staff={staff ?? []}
    />
  );
}
