import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SCHEDULE_METHOD_LABELS, WEEKDAY_LABELS } from "@/lib/revaha/types";

const DAY_GRID_HEADERS = WEEKDAY_LABELS.flatMap((label) => [`${label} כניסה`, `${label} יציאה`]);

const HEADERS = [
  "שם עובד",
  "טלפון",
  "ת.ז",
  "תפקיד",
  "אופן תשלום לתפקיד (שעתי/חודשי)",
  "תעריף לשעה",
  "שכר חודשי",
  "שעות חודשיות לשכר",
  "שיטת שיבוץ",
  ...DAY_GRID_HEADERS,
  "שעות שבועיות א-ה",
  "שעות שישי-שבת",
  "תוספת חודשית",
  "נסיעות חודשי",
  "קרן השתלמות (כן/לא)",
  "סוג העסקה (שכיר/עצמאי)",
  "כמות סופש\"ים לעובד בחודש",
];

/** עמודת "תפקיד" (D) — מספר השורות שעליהן חלה רשימת הבחירה. */
const ROLE_COLUMN = "D";
const VALIDATED_ROWS = 1000;

export async function GET() {
  const supabase = await createClient();
  const { data: roles } = await supabase.from("roles_revaha").select("name").order("name");
  const roleNames = Array.from(new Set((roles ?? []).map((r) => (r.name as string).trim()).filter(Boolean)));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("צוות", { views: [{ rightToLeft: true }] });

  const headerRow = sheet.addRow(HEADERS);
  headerRow.font = { bold: true };

  // עובד יחיד-תפקיד, שיבוץ מרוכז
  sheet.addRow([
    "ישראל ישראלי", "0501234567", "123456782", "עובד סוציאלי", "שעתי", 45, "", "",
    SCHEDULE_METHOD_LABELS.consolidated,
    ...Array(14).fill(""),
    32, 8,
    300, 250, "לא", "שכיר",
    4.3,
  ]);

  // עובד עם 2 תפקידים — שתי שורות תחת אותו שם, שכר ושיבוץ נפרדים לכל תפקיד.
  // שדות ברמת-עובד (טלפון/ת.ז/תוספת/נסיעות/קרן השתלמות/סוג העסקה) ממולאים רק בשורה הראשונה.
  const sundayShift = Array(14).fill("");
  sundayShift[0] = "15:00";
  sundayShift[1] = "23:00";
  sheet.addRow([
    "שרה כהן", "0507654321", "234567891", "מדריכים", "חודשי", "", 9000, 182,
    SCHEDULE_METHOD_LABELS.detailed,
    ...sundayShift,
    "", "", // שעות שבועיות א-ה / שישי-שבת — לא רלוונטי לשיטה המפורטת
    300, 250, "כן", "שכיר",
    4.3,
  ]);
  sheet.addRow([
    "שרה כהן", "", "", "עובד סוציאלי", "שעתי", 40, "", "",
    SCHEDULE_METHOD_LABELS.consolidated,
    ...Array(14).fill(""),
    10, 0,
    "", "", "", "",
    2,
  ]);

  sheet.columns.forEach((col) => (col.width = 20));

  // Roles are picked from a closed list (kept on a hidden sheet — an inline list is capped at 255 chars),
  // so free-typed role names that would not match the system never reach the import.
  if (roleNames.length > 0) {
    const lists = workbook.addWorksheet("רשימות", { state: "hidden" });
    lists.getColumn(1).values = ["תפקידים", ...roleNames];
    const range = `'רשימות'!$A$2:$A$${roleNames.length + 1}`;
    for (let row = 2; row <= VALIDATED_ROWS; row++) {
      sheet.getCell(`${ROLE_COLUMN}${row}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [range],
        showErrorMessage: true,
        errorStyle: "stop",
        errorTitle: "תפקיד לא תקין",
        error: "יש לבחור תפקיד מתוך הרשימה בלבד.",
      };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="tavnit-tzevet.xlsx"`,
    },
  });
}
