import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

const HEADERS = [
  "שם עובד",
  "אופן תשלום (שעתי/חודשי)",
  "תעריף לשעה",
  "שכר חודשי",
  "שעות חודשיות",
  "תוספת חודשית",
  "נסיעות חודשי",
  "קרן השתלמות (כן/לא)",
  "סוג העסקה (שכיר/עצמאי)",
];

export async function GET() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("צוות", { views: [{ rightToLeft: true }] });

  const headerRow = sheet.addRow(HEADERS);
  headerRow.font = { bold: true };
  sheet.addRow(["ישראל ישראלי", "שעתי", 45, "", "", 300, 250, "לא", "שכיר"]);
  sheet.addRow(["שרה כהן", "חודשי", "", 9000, 182, 300, 250, "כן", "שכיר"]);

  sheet.columns.forEach((col) => (col.width = 22));

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="tavnit-tzevet.xlsx"`,
    },
  });
}
