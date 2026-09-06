import type ExcelJS from "exceljs";

export const HEADER_FILL = "FF4F46E5"; // indigo-600
export const BAND_FILL = "FFF8FAFC"; // slate-50
export const BORDER_COLOR = "FFCBD5E1"; // slate-300
const THIN_BORDER = { style: "thin" as const, color: { argb: BORDER_COLOR } };
export const ALL_BORDERS = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER };
export const DELTA_FORMAT_POSITIONS = '[Green]0.00;[Red]\\-0.00;0.00';
export const DELTA_FORMAT_HOURS = '[Green]#,##0.0;[Red]\\-#,##0.0;0.0';

export function styleTitleRow(sheet: ExcelJS.Worksheet, lastCol: string, title: string) {
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

export function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = ALL_BORDERS;
  });
  row.height = 20;
}

export function styleDataRow(row: ExcelJS.Row, rowIndexInData: number) {
  row.eachCell((cell) => {
    cell.border = ALL_BORDERS;
    cell.alignment = { horizontal: "center", vertical: "middle" };
    if (rowIndexInData % 2 === 1) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BAND_FILL } };
    }
  });
}

export function applyArialFont(sheet: ExcelJS.Worksheet) {
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (!cell.font?.name) cell.font = { ...cell.font, name: "Arial" };
    });
  });
}
