import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_WEEKENDS_PER_MONTH,
  assignmentHourlyRate,
  assignmentMonthlyWage,
  monthlyHoursForAssignment,
  roleStaffingSummary,
  roleTypeStaffingSummary,
  weeklyFullTimeHoursForRole,
  weeklyHourSplitForAssignment,
  weeklyHoursForAssignment,
} from "@/lib/revaha/calc";
import { ScheduleMethod, SCHEDULE_METHOD_LABELS, WEEKDAY_LABELS } from "@/lib/revaha/types";
import { roleTypeHexColor } from "@/lib/revaha/roleTypeColors";
import { DELTA_FORMAT_HOURS, DELTA_FORMAT_POSITIONS, TAB_COLORS, applyArialFont, setTabColor, styleDataRow, styleHeaderRow, styleTitleRow } from "@/lib/revaha/xlsxStyle";

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
  const roleTypesList = roleTypes ?? [];
  const assignmentList = assignments ?? [];
  const facilityModelRolesList = facilityModelRoles ?? [];
  const allRoleTypeIds = roleTypesList.map((rt) => rt.id as string);
  const roleTypeNameById = new Map(roleTypesList.map((rt) => [rt.id as string, rt.name as string]));
  const staffById = new Map((staff ?? []).map((s) => [s.id as string, s.full_name as string]));
  const summary = roleStaffingSummary(facility, facilityModelRolesList, rolesList, assignmentList);
  const typeSummary = roleTypeStaffingSummary(summary, roleTypesList);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ניצנים";

  // ---- Sheet 1: שיבוץ עובדים — role-type summary header + day-by-day matrix ----
  const matrixLastCol = "K"; // "", שם עובד/סוג תפקיד, אחוז משרה, 7 days, סה"כ = 3 + 7 + 1 = 11 cols
  const scheduleSheet = workbook.addWorksheet("שיבוץ עובדים", { views: [{ rightToLeft: true }] });
  setTabColor(scheduleSheet, TAB_COLORS.schedule);
  styleTitleRow(scheduleSheet, matrixLastCol, `שיבוץ צוות — ${facility.name}`);

  scheduleSheet.mergeCells(`A3:${matrixLastCol}3`);
  const weekendsNote = scheduleSheet.getCell("A3");
  weekendsNote.value = `ברירת מחדל לכמות סופ"שים בחודש (לפנימייה): ${facility.weekends_per_month ?? DEFAULT_WEEKENDS_PER_MONTH} — ניתן לקבוע כמות שונה לכל עובד ותפקיד (ראו גיליון "פירוט שכר ותעריפים")`;
  weekendsNote.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF64748B" } };
  weekendsNote.alignment = { horizontal: "center" };
  scheduleSheet.getRow(3).height = 16;

  let row = 4;
  if (typeSummary.length > 0) {
    const typeHeader = scheduleSheet.getRow(row);
    typeHeader.values = ["", "סוג תפקיד", "תקנים נדרשים", "תקנים משובצים", "פער תקנים"];
    styleHeaderRow(typeHeader);
    scheduleSheet.mergeCells(`A${row}:A${row}`);
    row += 1;
    typeSummary.forEach((rt, i) => {
      const dataRow = scheduleSheet.getRow(row);
      dataRow.values = ["", rt.roleTypeName, rt.requiredPositions, rt.assignedPositionsEquivalent, rt.deltaPositions];
      styleDataRow(dataRow, i);
      dataRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${roleTypeHexColor(rt.roleTypeId, allRoleTypeIds)}` } };
      dataRow.getCell(3).numFmt = "0.00";
      dataRow.getCell(4).numFmt = "0.00";
      dataRow.getCell(5).numFmt = DELTA_FORMAT_POSITIONS;
      row += 1;
    });
    row += 1; // spacer
  }

  const matrixHeaderRowNum = row;
  const matrixHeader = scheduleSheet.getRow(matrixHeaderRowNum);
  matrixHeader.values = ["", "שם עובד", "תפקיד", "אחוז משרה", ...WEEKDAY_LABELS, "סה\"כ שעות שבועי"];
  styleHeaderRow(matrixHeader);
  scheduleSheet.autoFilter = { from: `B${matrixHeaderRowNum}`, to: `${matrixLastCol}${matrixHeaderRowNum}` };
  row += 1;

  assignmentList.forEach((a, i) => {
    const role = rolesList.find((r) => r.id === a.role_id);
    const weeklyTotal = weeklyHoursForAssignment(a);
    const fullTimeWeekly = weeklyFullTimeHoursForRole(a.role_id, facilityModelRolesList);
    const occupancyPercent = fullTimeWeekly ? weeklyTotal / fullTimeWeekly : null;
    const dayValues = WEEKDAY_LABELS.map((_, dayIndex) => {
      const shift = a.schedule_method === "detailed" ? a.daily_shifts?.[String(dayIndex) as "0"] : undefined;
      return shift?.start && shift?.end ? `${shift.start}–${shift.end}` : "—";
    });
    const dataRow = scheduleSheet.getRow(row);
    dataRow.values = ["", staffById.get(a.staff_id) ?? "?", role?.name ?? "?", occupancyPercent, ...dayValues, weeklyTotal];
    styleDataRow(dataRow, i);
    dataRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${roleTypeHexColor(role?.role_type_id ?? "", allRoleTypeIds)}` } };
    if (occupancyPercent !== null) dataRow.getCell(4).numFmt = "0%";
    dataRow.getCell(11).numFmt = "#,##0.0";
    row += 1;
  });

  scheduleSheet.getColumn(1).width = 3;
  scheduleSheet.getColumn(2).width = 22;
  scheduleSheet.getColumn(3).width = 20;
  scheduleSheet.getColumn(4).width = 12;
  for (let c = 5; c <= 11; c++) scheduleSheet.getColumn(c).width = c === 11 ? 16 : 14;

  // ---- Sheet 2: סיכום לפי תפקיד — per-role required vs. assigned ----
  const summarySheet = workbook.addWorksheet("סיכום לפי תפקיד", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 3 }],
  });
  setTabColor(summarySheet, TAB_COLORS.roleSummary);
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

  summary.forEach((r, i) => {
    const dataRow = summarySheet.addRow([
      "",
      r.roleName,
      roleTypeNameById.get(r.roleTypeId) ?? "",
      r.requiredPositions,
      r.requiredMonthlyHours,
      r.assignedPositionsEquivalent,
      r.assignedMonthlyHours,
      r.deltaPositions,
      r.deltaMonthlyHours,
    ]);
    styleDataRow(dataRow, i);
    dataRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${roleTypeHexColor(r.roleTypeId, allRoleTypeIds)}` } };
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

  // ---- Sheet 3: פירוט שכר ותעריפים ----
  const detailSheet = workbook.addWorksheet("פירוט שכר ותעריפים", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 3 }],
  });
  setTabColor(detailSheet, TAB_COLORS.payDetail);
  styleTitleRow(detailSheet, "H", `פירוט שכר ותעריפים — ${facility.name}`);

  const detailHeader = detailSheet.addRow([
    "שם עובד",
    "תפקיד",
    "שיטת שיבוץ",
    "שעות שבועיות א-ה",
    "שעות שבועיות שישי-שבת",
    "כמות סופש\"ים לעובד בחודש",
    "שעות חודשיות",
    "תעריף שעתי אפקטיבי",
    "שכר חודשי",
  ]);
  styleHeaderRow(detailHeader);
  detailSheet.autoFilter = { from: "A3", to: "I3" };

  assignmentList.forEach((a, i) => {
    const role = rolesList.find((r) => r.id === a.role_id);
    const { weekday, weekend } = weeklyHourSplitForAssignment(a);
    const monthlyHours = monthlyHoursForAssignment(a, facility);
    const hourlyRate = assignmentHourlyRate(a);
    const weekendOccurrences = a.weekend_occurrences_per_month ?? facility.weekends_per_month ?? DEFAULT_WEEKENDS_PER_MONTH;
    const dataRow = detailSheet.addRow([
      staffById.get(a.staff_id) ?? "?",
      role?.name ?? "?",
      SCHEDULE_METHOD_LABELS[a.schedule_method as ScheduleMethod],
      weekday,
      weekend,
      weekendOccurrences,
      Math.round(monthlyHours * 10) / 10,
      Math.round(hourlyRate * 100) / 100,
      Math.round(assignmentMonthlyWage(a, facility)),
    ]);
    styleDataRow(dataRow, i);
    dataRow.getCell(4).numFmt = "#,##0.0";
    dataRow.getCell(5).numFmt = "#,##0.0";
    dataRow.getCell(6).numFmt = "0.0";
    dataRow.getCell(7).numFmt = "#,##0.0";
    dataRow.getCell(8).numFmt = '"₪"#,##0.00';
    dataRow.getCell(9).numFmt = '"₪"#,##0';
  });

  detailSheet.getColumn(1).width = 22;
  detailSheet.getColumn(2).width = 20;
  detailSheet.getColumn(3).width = 26;
  detailSheet.getColumn(4).width = 18;
  detailSheet.getColumn(5).width = 20;
  detailSheet.getColumn(6).width = 20;
  detailSheet.getColumn(7).width = 16;
  detailSheet.getColumn(8).width = 18;
  detailSheet.getColumn(9).width = 16;

  applyArialFont(scheduleSheet);
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
