import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportsSection } from "../ReportsSection";

export default async function RevahaFacilityReportsPage({ params }: { params: Promise<{ facilityId: string }> }) {
  const { facilityId } = await params;
  const supabase = await createClient();

  const [{ data: facility }, { data: roleTypes }, { data: roles }, { data: assignments }, { data: facilityModelRoles }, { data: staff }] =
    await Promise.all([
      supabase.from("facilities_revaha").select("*").eq("id", facilityId).maybeSingle(),
      supabase.from("role_types_revaha").select("*").order("name"),
      supabase.from("roles_revaha").select("*").order("name"),
      supabase.from("staff_role_assignments_revaha").select("*, staff_revaha!inner(facility_id)").eq("staff_revaha.facility_id", facilityId),
      supabase.from("facility_model_roles_revaha").select("*"),
      supabase.from("staff_revaha").select("id, full_name").eq("facility_id", facilityId),
    ]);

  if (!facility) notFound();

  const facilityModelRolesForFacility = (facilityModelRoles ?? []).filter(
    (fmr) => fmr.facility_model_id === facility.facility_model_id
  );

  return (
    <ReportsSection
      facility={facility}
      facilityModelRoles={facilityModelRolesForFacility}
      roles={roles ?? []}
      roleTypes={roleTypes ?? []}
      assignments={assignments ?? []}
      staff={staff ?? []}
    />
  );
}
