import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { SCHEDULE_METHOD_LABELS, WEEKDAY_LABELS } from "@/lib/revaha/types";

const DAY_GRID_HEADERS = WEEKDAY_LABELS.flatMap((label) => [`${label} כניסה`, `${label} יציאה`]);

const HEADERS = [
  "שם עובד",
  "טלפון",
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
  "כמה סופי שבוע בחודש בממוצע (למילוי פעם אחת בלבד)",
];

export async function GET() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("צוות", { views: [{ rightToLeft: true }] });

  const headerRow = sheet.addRow(HEADERS);
  headerRow.font = { bold: true };

  // עובד יחיד-תפקיד, שיבוץ מרוכז
  sheet.addRow([
    "ישראל ישראלי", "0501234567", "עובד סוציאלי", "שעתי", 45, "", "",
    SCHEDULE_METHOD_LABELS.consolidated,
    ...Array(14).fill(""),
    32, 8,
    300, 250, "לא", "שכיר",
    4.3,
  ]);

  // עובד עם 2 תפקידים — שתי שורות תחת אותו שם, שכר ושיבוץ נפרדים לכל תפקיד.
  // שדות ברמת-עובד (טלפון/תוספת/נסיעות/קרן השתלמות/סוג העסקה) ממולאים רק בשורה הראשונה.
  const sundayShift = Array(14).fill("");
  sundayShift[0] = "15:00";
  sundayShift[1] = "23:00";
  sheet.addRow([
    "שרה כהן", "0507654321", "מדריכים", "חודשי", "", 9000, 182,
    SCHEDULE_METHOD_LABELS.detailed,
    ...sundayShift,
    "", "", // שעות שבועיות א-ה / שישי-שבת — לא רלוונטי לשיטה המפורטת
    300, 250, "כן", "שכיר",
    "",
  ]);
  sheet.addRow([
    "שרה כהן", "", "עובד סוציאלי", "שעתי", 40, "", "",
    SCHEDULE_METHOD_LABELS.consolidated,
    ...Array(14).fill(""),
    10, 0,
    "", "", "", "",
    "",
  ]);

  sheet.columns.forEach((col) => (col.width = 20));

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="tavnit-tzevet.xlsx"`,
    },
  });
}
