import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRevahaProfile } from "@/lib/revaha/auth";
import {
  assignmentHourlyRate,
  computeFacilityBudget,
  mergeRoleStaffingSummaries,
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

export async function GET() {
  const session = await getCurrentRevahaProfile();
  if (!session?.profile) return new NextResponse("יש להתחבר", { status: 401 });
  const supabase = await createClient();
  const role = session.profile.role;
  const isAdmin = role === "admin";
  const isCompanyRole = role === "company_admin" || role === "company_staff";

  let facilitiesResult;
  if (isAdmin || isCompanyRole) {
    facilitiesResult = await supabase.from("facilities_revaha").select("*");
  } else {
    const organizationId = session.profile.organization_id;
    if (!organizationId) return new NextResponse("חשבון זה אינו משויך לארגון", { status: 403 });
    facilitiesResult = await supabase.from("facilities_revaha").select("*").eq("organization_id", organizationId);
  }
  const facilities = facilitiesResult.data ?? [];
  if (facilities.length === 0) return new NextResponse("אין פנימיות זמינות", { status: 404 });

  const facilityIds = facilities.map((f) => f.id);
  const [{ data: roleTypes }, { data: roles }, { data: facilityModelRoles }, { data: staff }, { data: assignments }, { data: expenses }] =
    await Promise.all([
      supabase.from("role_types_revaha").select("id, name").order("name"),
      supabase.from("roles_revaha").select("*"),
      supabase.from("facility_model_roles_revaha").select("*"),
      supabase.from("staff_revaha").select("*").in("facility_id", facilityIds),
      supabase
        .from("staff_role_assignments_revaha")
        .select("*, staff_revaha!inner(facility_id)")
        .in("staff_revaha.facility_id", facilityIds),
      supabase.from("facility_expense_line_items_revaha").select("*").in("facility_id", facilityIds),
    ]);

  const rolesList = roles ?? [];
  const roleTypesList = roleTypes ?? [];
  const allRoleTypeIds = roleTypesList.map((rt) => rt.id as string);
  const roleTypeNameById = new Map(roleTypesList.map((rt) => [rt.id as string, rt.name as string]));
  const staffList = staff ?? [];
  const staffById = new Map(staffList.map((s) => [s.id as string, s.full_name as string]));
  const staffFacilityById = new Map(staffList.map((s) => [s.id as string, s.facility_id as string]));
  const facilityById = new Map(facilities.map((f) => [f.id as string, f]));
  const assignmentList = assignments ?? [];
  const expenseList = expenses ?? [];
  const facilityModelRolesAll = facilityModelRoles ?? [];
  const modelRolesByFacilityId = new Map(
    facilities.map((f) => [f.id as string, facilityModelRolesAll.filter((fmr) => fmr.facility_model_id === f.facility_model_id)])
  );

  const perFacility = facilities.map((f) => {
    const fStaff = staffList.filter((s) => s.facility_id === f.id);
    const fStaffIds = new Set(fStaff.map((s) => s.id));
    const fAssignments = assignmentList.filter((a) => fStaffIds.has(a.staff_id));
    const fExpenses = expenseList.filter((e) => e.facility_id === f.id);
    const fModelRoles = modelRolesByFacilityId.get(f.id) ?? [];
    return {
      facility: f,
      budget: computeFacilityBudget(fAssignments, fStaff, f, fExpenses),
      roleSummary: roleStaffingSummary(f, fModelRoles, rolesList, fAssignments),
      staffCount: fStaff.length,
    };
  });

  const mergedRoleSummary = mergeRoleStaffingSummaries(perFacility.map((p) => p.roleSummary));
  const mergedTypeSummary = roleTypeStaffingSummary(mergedRoleSummary, roleTypesList);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ניצנים";

  // ---- Sheet 1: סיכום לפי פנימייה ----
  const facilitySheet = workbook.addWorksheet("סיכום לפי פנימייה", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 3 }],
  });
  setTabColor(facilitySheet, TAB_COLORS.facilitySummary);
  styleTitleRow(facilitySheet, "F", "סיכום רשתי לפי פנימייה");
  const facilityHeader = facilitySheet.addRow([
    "פנימייה",
    "מס' עובדים",
    "שכר חודשי",
    "תוספות ונסיעות",
    "הוצאות שוטפות",
    "תקציב חודשי כולל",
  ]);
  styleHeaderRow(facilityHeader);
  facilitySheet.autoFilter = { from: "A3", to: "F3" };
  perFacility.forEach((p, i) => {
    const dataRow = facilitySheet.addRow([
      p.facility.name,
      p.staffCount,
      p.budget.wageMonthly,
      p.budget.staffAdditionsMonthly,
      p.budget.expensesMonthly,
      p.budget.totalMonthly,
    ]);
    styleDataRow(dataRow, i);
    for (let c = 3; c <= 6; c++) dataRow.getCell(c).numFmt = '"₪"#,##0';
  });
  facilitySheet.getColumn(1).width = 24;
  facilitySheet.getColumn(2).width = 12;
  for (let c = 3; c <= 6; c++) facilitySheet.getColumn(c).width = 18;

  // ---- Sheet 2: שיבוץ עובדים — כל הרשת (role-type header + day-by-day matrix, all facilities) ----
  const matrixLastCol = "M"; // "", פנימייה, שם עובד, תפקיד, אחוז משרה, 7 days, סה"כ = 5 + 7 + 1 = 13 cols
  const scheduleSheet = workbook.addWorksheet("שיבוץ עובדים - כל הרשת", { views: [{ rightToLeft: true }] });
  setTabColor(scheduleSheet, TAB_COLORS.schedule);
  styleTitleRow(scheduleSheet, matrixLastCol, "שיבוץ צוות — כל הרשת");

  let row = 3;
  if (mergedTypeSummary.length > 0) {
    const typeHeader = scheduleSheet.getRow(row);
    typeHeader.values = ["", "סוג תפקיד", "תקנים נדרשים", "תקנים משובצים", "פער תקנים"];
    styleHeaderRow(typeHeader);
    row += 1;
    mergedTypeSummary.forEach((rt, i) => {
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
  matrixHeader.values = ["", "פנימייה", "שם עובד", "תפקיד", "אחוז משרה", ...WEEKDAY_LABELS, "סה\"כ שעות שבועי"];
  styleHeaderRow(matrixHeader);
  scheduleSheet.autoFilter = { from: `B${matrixHeaderRowNum}`, to: `${matrixLastCol}${matrixHeaderRowNum}` };
  row += 1;

  assignmentList.forEach((a, i) => {
    const facilityId = staffFacilityById.get(a.staff_id);
    const facilityName = facilityId ? facilityById.get(facilityId)?.name ?? "?" : "?";
    const fModelRoles = facilityId ? modelRolesByFacilityId.get(facilityId) ?? [] : [];
    const role = rolesList.find((r) => r.id === a.role_id);
    const weeklyTotal = weeklyHoursForAssignment(a);
    const fullTimeWeekly = weeklyFullTimeHoursForRole(a.role_id, fModelRoles);
    const occupancyPercent = fullTimeWeekly ? weeklyTotal / fullTimeWeekly : null;
    const dayValues = WEEKDAY_LABELS.map((_, dayIndex) => {
      const shift = a.schedule_method === "detailed" ? a.daily_shifts?.[String(dayIndex) as "0"] : undefined;
      return shift?.start && shift?.end ? `${shift.start}–${shift.end}` : "—";
    });
    const dataRow = scheduleSheet.getRow(row);
    dataRow.values = ["", facilityName, staffById.get(a.staff_id) ?? "?", role?.name ?? "?", occupancyPercent, ...dayValues, weeklyTotal];
    styleDataRow(dataRow, i);
    dataRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${roleTypeHexColor(role?.role_type_id ?? "", allRoleTypeIds)}` } };
    if (occupancyPercent !== null) dataRow.getCell(5).numFmt = "0%";
    dataRow.getCell(13).numFmt = "#,##0.0";
    row += 1;
  });

  scheduleSheet.getColumn(1).width = 3;
  scheduleSheet.getColumn(2).width = 18;
  scheduleSheet.getColumn(3).width = 22;
  scheduleSheet.getColumn(4).width = 20;
  scheduleSheet.getColumn(5).width = 12;
  for (let c = 6; c <= 13; c++) scheduleSheet.getColumn(c).width = c === 13 ? 16 : 14;

  // ---- Sheet 3: סיכום לפי תפקיד — כל הרשת ----
  const summarySheet = workbook.addWorksheet("סיכום לפי תפקיד - כל הרשת", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 3 }],
  });
  setTabColor(summarySheet, TAB_COLORS.roleSummary);
  styleTitleRow(summarySheet, "I", "דוח שיבוץ צוות — כל הרשת");

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

  mergedRoleSummary.forEach((r, i) => {
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

  // ---- Sheet 4: פירוט שכר ותעריפים — כל הרשת ----
  const detailSheet = workbook.addWorksheet("פירוט שכר ותעריפים - כל הרשת", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 3 }],
  });
  setTabColor(detailSheet, TAB_COLORS.payDetail);
  styleTitleRow(detailSheet, "I", "פירוט שכר ותעריפים — כל הרשת");

  const detailHeader = detailSheet.addRow([
    "פנימייה",
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
  detailSheet.autoFilter = { from: "A3", to: "I3" };

  assignmentList.forEach((a, i) => {
    const facilityId = staffFacilityById.get(a.staff_id);
    const facility = facilityId ? facilityById.get(facilityId) : undefined;
    if (!facility) return;
    const role = rolesList.find((r) => r.id === a.role_id);
    const { weekday, weekend } = weeklyHourSplitForAssignment(a);
    const monthlyHours = monthlyHoursForAssignment(a, facility);
    const hourlyRate = assignmentHourlyRate(a);
    const dataRow = detailSheet.addRow([
      facility.name,
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
    dataRow.getCell(5).numFmt = "#,##0.0";
    dataRow.getCell(6).numFmt = "#,##0.0";
    dataRow.getCell(7).numFmt = "#,##0.0";
    dataRow.getCell(8).numFmt = '"₪"#,##0.00';
    dataRow.getCell(9).numFmt = '"₪"#,##0';
  });

  detailSheet.getColumn(1).width = 20;
  detailSheet.getColumn(2).width = 22;
  detailSheet.getColumn(3).width = 20;
  detailSheet.getColumn(4).width = 26;
  detailSheet.getColumn(5).width = 18;
  detailSheet.getColumn(6).width = 20;
  detailSheet.getColumn(7).width = 16;
  detailSheet.getColumn(8).width = 18;
  detailSheet.getColumn(9).width = 16;

  applyArialFont(facilitySheet);
  applyArialFont(scheduleSheet);
  applyArialFont(summarySheet);
  applyArialFont(detailSheet);

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="doch-tzevet-rasti.xlsx"`,
    },
  });
}
