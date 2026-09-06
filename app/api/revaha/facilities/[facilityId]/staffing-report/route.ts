import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assignmentHourlyRate, monthlyHoursForAssignment, roleStaffingSummary, weeklyHourSplitForAssignment } from "@/lib/revaha/calc";
import { ScheduleMethod, SCHEDULE_METHOD_LABELS } from "@/lib/revaha/types";
import { roleTypeHexColor } from "@/lib/revaha/roleTypeColors";

const HEADER_FILL = "FF4F46E5"; // indigo-600
const BAND_FILL = "FFF8FAFC"; // slate-50
const BORDER_COLOR = "FFCBD5E1"; // slate-300
const THIN_BORDER = { style: "thin" as const, color: { argb: BORDER_COLOR } };
const ALL_BORDERS = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER };
const DELTA_FORMAT_POSITIONS = '[Green]0.00;[Red]\\-0.00;0.00';
const DELTA_FORMAT_HOURS = '[Green]#,##0.0;[Red]\\-#,##0.0;0.0';

function styleTitleRow(sheet: ExcelJS.Worksheet, lastCol: string, title: string) {
  sheet.mergeCells(`A1:${lastCol}1`);
  const cell = sheet.getCell("A1");
  cell.value = title;
  cell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF1E293B" } };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 26;

  sheet.mergeCells(`A2:${lastCol}2`);
  const subtitle = sheet.getCell("A2");
  subtitle.value = `הופק בתאריך ${new Date().toLocaleDateString("he-IL")}`;
  subtitle.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF64748B" } };
  subtitle.alignment = { horizontal: "center" };
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = ALL_BORDERS;
  });
  row.height = 20;
}

function styleDataRow(row: ExcelJS.Row, rowIndexInData: number) {
  row.eachCell((cell) => {
    cell.border = ALL_BORDERS;
    cell.alignment = { horizontal: "center", vertical: "middle" };
    if (rowIndexInData % 2 === 1) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BAND_FILL } };
    }
  });
}

function applyArialFont(sheet: ExcelJS.Worksheet) {
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (!cell.font?.name) cell.font = { ...cell.font, name: "Arial" };
    });
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ facilityId: string }> }) {
  const { facilityId } = await params;
  const supabase = await createClient();

  const { data: facility } = await supabase.from("facilities_revaha").select("*").eq("id", facilityId).maybeSingle();
  if (!facility) return new NextResponse("פנימייה לא נמצאה", { status: 404 });

  const [{ data: facilityModelRoles }, { data: roleTypes }, { data: roles }, { data: assignments }, { data: staff }] = await Promise.all([
    supabase.from("facility_model_roles_revaha").select("*").eq("facility_model_id", facility.facility_model_id ?? ""),
    supabase.from("role_types_revaha").select("id, name").order("name"),
    supabase.from("roles_revaha").select("*"),
    supabase
      .from("staff_role_assignments_revaha")
      .select("*, staff_revaha!inner(facility_id)")
      .eq("staff_revaha.facility_id", facilityId),
    supabase.from("staff_revaha").select("id, full_name").eq("facility_id", facilityId),
  ]);

  const rolesList = roles ?? [];
  const assignmentList = assignments ?? [];
  const allRoleTypeIds = (roleTypes ?? []).map((rt) => rt.id as string);
  const roleTypeNameById = new Map((roleTypes ?? []).map((rt) => [rt.id as string, rt.name as string]));
  const staffById = new Map((staff ?? []).map((s) => [s.id as string, s.full_name as string]));
  const summary = roleStaffingSummary(facility, facilityModelRoles ?? [], rolesList, assignmentList);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ניצנים";

  // ---- Sheet 1: סיכום לפי תפקיד ----
  const summarySheet = workbook.addWorksheet("סיכום לפי תפקיד", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 3 }],
  });
  styleTitleRow(summarySheet, "I", `דוח שיבוץ צוות — ${facility.name}`);

  const summaryHeader = summarySheet.addRow([
    "",
    "תפקיד",
    "סוג תפקיד",
    "תקנים נדרשים",
    "שעות נדרשות (חודשי)",
    "תקנים משובצים",
    "שעות משובצות (חודשי)",
    "פער תקנים",
    "פער שעות",
  ]);
  styleHeaderRow(summaryHeader);
  summarySheet.autoFilter = { from: "B3", to: "I3" };

  summary.forEach((row, i) => {
    const dataRow = summarySheet.addRow([
      "",
      row.roleName,
      roleTypeNameById.get(row.roleTypeId) ?? "",
      row.requiredPositions,
      row.requiredMonthlyHours,
      row.assignedPositionsEquivalent,
      row.assignedMonthlyHours,
      row.deltaPositions,
      row.deltaMonthlyHours,
    ]);
    styleDataRow(dataRow, i);
    dataRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${roleTypeHexColor(row.roleTypeId, allRoleTypeIds)}` } };
    dataRow.getCell(4).numFmt = "0.00";
    dataRow.getCell(5).numFmt = "#,##0.0";
    dataRow.getCell(6).numFmt = "0.00";
    dataRow.getCell(7).numFmt = "#,##0.0";
    dataRow.getCell(8).numFmt = DELTA_FORMAT_POSITIONS;
    dataRow.getCell(9).numFmt = DELTA_FORMAT_HOURS;
  });

  summarySheet.getColumn(1).width = 3;
  summarySheet.getColumn(2).width = 22;
  summarySheet.getColumn(3).width = 20;
  summarySheet.getColumn(4).width = 14;
  summarySheet.getColumn(5).width = 18;
  summarySheet.getColumn(6).width = 14;
  summarySheet.getColumn(7).width = 18;
  summarySheet.getColumn(8).width = 12;
  summarySheet.getColumn(9).width = 12;

  // ---- Sheet 2: פירוט עובדים ----
  const detailSheet = workbook.addWorksheet("פירוט עובדים", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 3 }],
  });
  styleTitleRow(detailSheet, "H", `פירוט שיבוץ עובדים — ${facility.name}`);

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
  styleHeaderRow(detailHeader);
  detailSheet.autoFilter = { from: "A3", to: "H3" };

  assignmentList.forEach((a, i) => {
    const role = rolesList.find((r) => r.id === a.role_id);
    const { weekday, weekend } = weeklyHourSplitForAssignment(a);
    const monthlyHours = monthlyHoursForAssignment(a, facility);
    const hourlyRate = assignmentHourlyRate(a);
    const dataRow = detailSheet.addRow([
      staffById.get(a.staff_id) ?? "?",
      role?.name ?? "?",
      SCHEDULE_METHOD_LABELS[a.schedule_method as ScheduleMethod],
      weekday,
      weekend,
      Math.round(monthlyHours * 10) / 10,
      Math.round(hourlyRate * 100) / 100,
      Math.round(monthlyHours * hourlyRate),
    ]);
    styleDataRow(dataRow, i);
    dataRow.getCell(4).numFmt = "#,##0.0";
    dataRow.getCell(5).numFmt = "#,##0.0";
    dataRow.getCell(6).numFmt = "#,##0.0";
    dataRow.getCell(7).numFmt = '"₪"#,##0.00';
    dataRow.getCell(8).numFmt = '"₪"#,##0';
  });

  detailSheet.getColumn(1).width = 22;
  detailSheet.getColumn(2).width = 20;
  detailSheet.getColumn(3).width = 26;
  detailSheet.getColumn(4).width = 18;
  detailSheet.getColumn(5).width = 20;
  detailSheet.getColumn(6).width = 16;
  detailSheet.getColumn(7).width = 18;
  detailSheet.getColumn(8).width = 16;

  applyArialFont(summarySheet);
  applyArialFont(detailSheet);

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="doch-tzevet.xlsx"`,
    },
  });
}
