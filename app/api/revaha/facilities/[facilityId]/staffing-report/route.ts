import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assignmentHourlyRate, monthlyHoursForAssignment, roleStaffingSummary, weeklyHourSplitForAssignment } from "@/lib/revaha/calc";
import { ScheduleMethod, SCHEDULE_METHOD_LABELS } from "@/lib/revaha/types";

export async function GET(_request: Request, { params }: { params: Promise<{ facilityId: string }> }) {
  const { facilityId } = await params;
  const supabase = await createClient();

  const { data: facility } = await supabase.from("facilities_revaha").select("*").eq("id", facilityId).maybeSingle();
  if (!facility) return new NextResponse("פנימייה לא נמצאה", { status: 404 });

  const [{ data: facilityModelRoles }, { data: roles }, { data: assignments }, { data: staff }] = await Promise.all([
    supabase.from("facility_model_roles_revaha").select("*").eq("facility_model_id", facility.facility_model_id ?? ""),
    supabase.from("roles_revaha").select("*"),
    supabase
      .from("staff_role_assignments_revaha")
      .select("*, staff_revaha!inner(facility_id)")
      .eq("staff_revaha.facility_id", facilityId),
    supabase.from("staff_revaha").select("id, full_name").eq("facility_id", facilityId),
  ]);

  const rolesList = roles ?? [];
  const assignmentList = assignments ?? [];
  const staffById = new Map((staff ?? []).map((s) => [s.id as string, s.full_name as string]));
  const summary = roleStaffingSummary(facility, facilityModelRoles ?? [], rolesList, assignmentList);

  const workbook = new ExcelJS.Workbook();

  const summarySheet = workbook.addWorksheet("סיכום לפי תפקיד", { views: [{ rightToLeft: true }] });
  const summaryHeader = summarySheet.addRow([
    "תפקיד",
    "תקנים נדרשים",
    "שעות נדרשות (חודשי)",
    "תקנים משובצים",
    "שעות משובצות (חודשי)",
    "פער תקנים",
    "פער שעות",
  ]);
  summaryHeader.font = { bold: true };
  for (const row of summary) {
    summarySheet.addRow([
      row.roleName,
      row.requiredPositions ?? "",
      row.requiredMonthlyHours ?? "",
      row.assignedPositionsEquivalent ?? "",
      row.assignedMonthlyHours,
      row.deltaPositions ?? "",
      row.deltaMonthlyHours ?? "",
    ]);
  }
  summarySheet.columns.forEach((col) => (col.width = 20));

  const detailSheet = workbook.addWorksheet("פירוט עובדים", { views: [{ rightToLeft: true }] });
  const detailHeader = detailSheet.addRow([
    "שם עובד",
    "תפקיד",
    "שיטת שיבוץ",
    "שעות שבועיות א-ה",
    "שעות שבועיות שישי-שבת",
    "שעות חודשיות",
    "תעריף שעתי אפקטיבי",
    "שכר חודשי",
  ]);
  detailHeader.font = { bold: true };
  for (const a of assignmentList) {
    const role = rolesList.find((r) => r.id === a.role_id);
    const { weekday, weekend } = weeklyHourSplitForAssignment(a);
    const monthlyHours = monthlyHoursForAssignment(a, facility);
    const hourlyRate = assignmentHourlyRate(a);
    detailSheet.addRow([
      staffById.get(a.staff_id) ?? "?",
      role?.name ?? "?",
      SCHEDULE_METHOD_LABELS[a.schedule_method as ScheduleMethod],
      weekday,
      weekend,
      Math.round(monthlyHours * 10) / 10,
      Math.round(hourlyRate * 100) / 100,
      Math.round(monthlyHours * hourlyRate),
    ]);
  }
  detailSheet.columns.forEach((col) => (col.width = 20));

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="doch-tzevet.xlsx"`,
    },
  });
}
