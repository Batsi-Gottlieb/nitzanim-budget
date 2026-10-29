import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  AssignmentCostRow,
  assignmentHourlyRate,
  facilityEmployerCostByAssignment,
} from "@/lib/revaha/calc";
import { PayMode } from "@/lib/revaha/types";
import { TAB_COLORS, applyArialFont, setTabColor, styleDataRow, styleHeaderRow, styleTitleRow } from "@/lib/revaha/xlsxStyle";

const MONEY = '"₪"#,##0';
const MONEY_2 = '"₪"#,##0.00';
const HOURS = "#,##0.0";

export async function GET(_request: Request, { params }: { params: Promise<{ facilityId: string }> }) {
  const { facilityId } = await params;
  const supabase = await createClient();

  const { data: facility } = await supabase.from("facilities_revaha").select("*").eq("id", facilityId).maybeSingle();
  if (!facility) return new NextResponse("פנימייה לא נמצאה", { status: 404 });

  const [{ data: staff }, { data: assignments }, { data: roles }, { data: roleTypes }] = await Promise.all([
    supabase.from("staff_revaha").select("*").eq("facility_id", facilityId).order("full_name"),
    supabase
      .from("staff_role_assignments_revaha")
      .select("*, staff_revaha!inner(facility_id)")
      .eq("staff_revaha.facility_id", facilityId),
    supabase.from("roles_revaha").select("*"),
    supabase.from("role_types_revaha").select("id, name"),
  ]);

  const staffList = staff ?? [];
  const assignmentList = assignments ?? [];
  const rows = facilityEmployerCostByAssignment(staffList, assignmentList, facility, roles ?? [], roleTypes ?? []);
  const staffById = new Map(staffList.map((s) => [s.id as string, s]));
  const assignmentByKey = new Map(assignmentList.map((a) => [`${a.staff_id}:${a.role_id}`, a]));
  const PAY_MODE_LABELS: Record<PayMode, string> = { hourly: "שעתי", monthly: "חודשי" };

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ניצנים";

  // ---- Sheet 1: per (employee, role) ----
  const detail = workbook.addWorksheet("לפי עובד ותפקיד", { views: [{ rightToLeft: true, state: "frozen", ySplit: 3 }] });
  setTabColor(detail, TAB_COLORS.payDetail);
  styleTitleRow(detail, "N", `עלות שכר לפי עובד ותפקיד — ${facility.name}`);
  const detailHeader = detail.addRow([
    "ת.ז",
    "שם עובד",
    "סוג העסקה",
    "תפקיד",
    "סוג תפקיד",
    "אופן תשלום",
    "שעות חודשיות (משובצות)",
    "תעריף שעתי אפקטיבי",
    "שכר ברוטו",
    "עלות מעביד (חלק התפקיד, כולל שעות נוספות)",
    "שעות נוספות 125%",
    "שעות נוספות 150% (יומי)",
    "שעות שבת 150%",
    "תוספת שעות נוספות (עלות מעביד)",
  ]);
  styleHeaderRow(detailHeader);
  detail.autoFilter = { from: "A3", to: "N3" };
  rows.forEach((r, i) => {
    const s = staffById.get(r.staffId);
    const a = assignmentByKey.get(`${r.staffId}:${r.roleId}`);
    const dataRow = detail.addRow([
      s?.id_number ?? "",
      r.staffName,
      s?.employment_type ?? "",
      r.roleName,
      r.roleTypeName,
      a ? PAY_MODE_LABELS[a.pay_mode as PayMode] : "",
      Math.round(r.monthlyHours * 10) / 10,
      a ? Math.round(assignmentHourlyRate(a) * 100) / 100 : "",
      Math.round(r.grossMonthly),
      Math.round(r.employerCostMonthly),
      Math.round(r.overtimeHours.daily125 * 10) / 10,
      Math.round(r.overtimeHours.daily150 * 10) / 10,
      Math.round(r.overtimeHours.shabbat150 * 10) / 10,
      Math.round(r.overtimeEmployerCostMonthly),
    ]);
    styleDataRow(dataRow, i);
    dataRow.getCell(7).numFmt = HOURS;
    dataRow.getCell(8).numFmt = MONEY_2;
    dataRow.getCell(9).numFmt = MONEY;
    dataRow.getCell(10).numFmt = MONEY;
    for (let c = 11; c <= 13; c++) dataRow.getCell(c).numFmt = HOURS;
    dataRow.getCell(14).numFmt = MONEY;
  });
  [14, 22, 12, 22, 18, 12, 20, 18, 14, 26, 16, 18, 16, 22].forEach((w, i) => (detail.getColumn(i + 1).width = w));

  // ---- Sheet 2: per employee (to compare against the payroll software) ----
  const perStaff = workbook.addWorksheet("סיכום לפי עובד", { views: [{ rightToLeft: true, state: "frozen", ySplit: 3 }] });
  setTabColor(perStaff, TAB_COLORS.roleSummary);
  styleTitleRow(perStaff, "M", `סיכום עלות שכר לפי עובד — ${facility.name}`);
  const staffHeader = perStaff.addRow([
    "ת.ז",
    "שם עובד",
    "סוג העסקה",
    "קרן השתלמות",
    "שעות חודשיות (משובצות)",
    "שכר ברוטו",
    "תוספות קבועות",
    "נסיעות",
    "עלות מעביד (כולל שעות נוספות)",
    "שעות נוספות 125%",
    "שעות נוספות 150% (יומי)",
    "שעות שבת 150%",
    "תוספת שעות נוספות (עלות מעביד)",
  ]);
  styleHeaderRow(staffHeader);
  perStaff.autoFilter = { from: "A3", to: "M3" };
  const byStaff = new Map<string, AssignmentCostRow[]>();
  for (const r of rows) {
    if (!byStaff.has(r.staffId)) byStaff.set(r.staffId, []);
    byStaff.get(r.staffId)!.push(r);
  }
  let staffIndex = 0;
  let totals = { hours: 0, gross: 0, additions: 0, travel: 0, employer: 0, ot125: 0, ot150: 0, otShabbat: 0, otCost: 0 };
  for (const s of staffList) {
    const staffRows = byStaff.get(s.id) ?? [];
    const hours = staffRows.reduce((sum, r) => sum + r.monthlyHours, 0);
    const gross = staffRows.reduce((sum, r) => sum + r.grossMonthly, 0);
    const employer = staffRows.reduce((sum, r) => sum + r.employerCostMonthly, 0);
    const ot125 = staffRows.reduce((sum, r) => sum + r.overtimeHours.daily125, 0);
    const ot150 = staffRows.reduce((sum, r) => sum + r.overtimeHours.daily150, 0);
    const otShabbat = staffRows.reduce((sum, r) => sum + r.overtimeHours.shabbat150, 0);
    const otCost = staffRows.reduce((sum, r) => sum + r.overtimeEmployerCostMonthly, 0);
    const additions = s.monthly_addition ?? 0;
    const travel = s.monthly_travel ?? 0;
    totals = {
      hours: totals.hours + hours,
      gross: totals.gross + gross,
      additions: totals.additions + additions,
      travel: totals.travel + travel,
      employer: totals.employer + employer,
      ot125: totals.ot125 + ot125,
      ot150: totals.ot150 + ot150,
      otShabbat: totals.otShabbat + otShabbat,
      otCost: totals.otCost + otCost,
    };
    const dataRow = perStaff.addRow([
      s.id_number ?? "",
      s.full_name,
      s.employment_type,
      s.has_training_fund ? "כן" : "לא",
      Math.round(hours * 10) / 10,
      Math.round(gross),
      additions,
      travel,
      Math.round(employer),
      Math.round(ot125 * 10) / 10,
      Math.round(ot150 * 10) / 10,
      Math.round(otShabbat * 10) / 10,
      Math.round(otCost),
    ]);
    styleDataRow(dataRow, staffIndex++);
    dataRow.getCell(5).numFmt = HOURS;
    for (let c = 6; c <= 9; c++) dataRow.getCell(c).numFmt = MONEY;
    for (let c = 10; c <= 12; c++) dataRow.getCell(c).numFmt = HOURS;
    dataRow.getCell(13).numFmt = MONEY;
  }
  const totalRow = perStaff.addRow([
    "",
    'סה"כ',
    "",
    "",
    Math.round(totals.hours * 10) / 10,
    Math.round(totals.gross),
    totals.additions,
    totals.travel,
    Math.round(totals.employer),
    Math.round(totals.ot125 * 10) / 10,
    Math.round(totals.ot150 * 10) / 10,
    Math.round(totals.otShabbat * 10) / 10,
    Math.round(totals.otCost),
  ]);
  styleDataRow(totalRow, 0);
  totalRow.eachCell((cell) => (cell.font = { name: "Arial", bold: true }));
  totalRow.getCell(5).numFmt = HOURS;
  for (let c = 6; c <= 9; c++) totalRow.getCell(c).numFmt = MONEY;
  for (let c = 10; c <= 12; c++) totalRow.getCell(c).numFmt = HOURS;
  totalRow.getCell(13).numFmt = MONEY;
  [14, 22, 12, 14, 20, 14, 14, 12, 18, 16, 18, 16, 22].forEach((w, i) => (perStaff.getColumn(i + 1).width = w));

  // ---- Sheet 3: per role ----
  const perRole = workbook.addWorksheet("סיכום לפי תפקיד", { views: [{ rightToLeft: true, state: "frozen", ySplit: 3 }] });
  setTabColor(perRole, TAB_COLORS.schedule);
  styleTitleRow(perRole, "F", `סיכום עלות שכר ושעות לפי תפקיד — ${facility.name}`);
  const roleHeader = perRole.addRow(["תפקיד", "סוג תפקיד", "מס' עובדים", "שעות חודשיות (משובצות)", "שכר ברוטו", "עלות מעביד"]);
  styleHeaderRow(roleHeader);
  perRole.autoFilter = { from: "A3", to: "F3" };
  const byRole = new Map<string, AssignmentCostRow[]>();
  for (const r of rows) {
    const key = r.roleId || "none";
    if (!byRole.has(key)) byRole.set(key, []);
    byRole.get(key)!.push(r);
  }
  Array.from(byRole.values())
    .sort((a, b) => a[0].roleTypeName.localeCompare(b[0].roleTypeName, "he") || a[0].roleName.localeCompare(b[0].roleName, "he"))
    .forEach((group, i) => {
      const dataRow = perRole.addRow([
        group[0].roleName,
        group[0].roleTypeName,
        new Set(group.map((g) => g.staffId)).size,
        Math.round(group.reduce((s, r) => s + r.monthlyHours, 0) * 10) / 10,
        Math.round(group.reduce((s, r) => s + r.grossMonthly, 0)),
        Math.round(group.reduce((s, r) => s + r.employerCostMonthly, 0)),
      ]);
      styleDataRow(dataRow, i);
      dataRow.getCell(4).numFmt = HOURS;
      dataRow.getCell(5).numFmt = MONEY;
      dataRow.getCell(6).numFmt = MONEY;
    });
  [24, 20, 12, 22, 14, 14].forEach((w, i) => (perRole.getColumn(i + 1).width = w));

  const note = workbook.addWorksheet("הערות", { views: [{ rightToLeft: true }] });
  note.addRow(["השעות החודשיות הן שעות משובצות מתוכנית השיבוץ (שעות חול × 4.3 + שעות שישי-שבת × כמות סופ\"שים לעובד בחודש), ואינן שעות לפי תלוש."]);
  note.addRow(["עלות מעביד: שכיר — (ברוטו + תוספות קבועות) × 1.35 (או 1.425 עם קרן השתלמות) + נסיעות × 1.12; עצמאי — ברוטו + תוספות + נסיעות."]);
  note.addRow(["עובד עם כמה תפקידים: תוספות, נסיעות וקרן ההשתלמות שייכות לעובד, ולכן עלות המעביד שלו מחולקת בין תפקידיו ביחס לשכר הברוטו של כל תפקיד."]);
  note.getColumn(1).width = 140;

  applyArialFont(detail);
  applyArialFont(perStaff);
  applyArialFont(perRole);
  applyArialFont(note);

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="payroll-cost-by-role.xlsx"`,
    },
  });
}
