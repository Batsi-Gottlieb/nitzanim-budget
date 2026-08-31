import ExcelJS from "exceljs";
import { MONTHS } from "./types";
import type { SubModelBudgetResult } from "./calc";
import { summarizeForReport, type ReportRow } from "./calc";

const NUM_FMT = '_ * #,##0_ ;_ * (#,##0)_ ;_ * "-"_ ;_ @_ ';
const TITLE_FILL = "FF1F4E79";
const CATEGORY_HEADER_FILL: Record<"גנים" | "בתי_ספר" | "total", string> = {
  גנים: "FF1F4E79",
  בתי_ספר: "FF1F4E79",
  total: "FF375623",
};
const COLUMN_HEADER_FILL = "FF2E75B6";
const ROW_LABEL_FILL = "FFF2F2F2";
const SUBTOTAL_FILL = "FFD9E1F2";
const BALANCE_FILL = "FFFCE4D6";
const WHITE_BOLD = { bold: true, color: { argb: "FFFFFFFF" } };

export type SubModelReportEntry = {
  name: string;
  modelName: string;
  category: "גנים" | "בתי_ספר";
  summary: ReturnType<typeof summarizeForReport>;
};

function sheetSafeName(name: string) {
  return name.replace(/[[\]*/\\?:]/g, " ").slice(0, 31);
}

function fillCell(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
}

/** Builds the per-sub-model sheet: parameters removed, just per-group and total-groups budget blocks by month. */
function buildSubModelSheet(wb: ExcelJS.Workbook, entry: SubModelReportEntry) {
  const sheet = wb.addWorksheet(sheetSafeName(`${entry.modelName} - ${entry.name}`), {
    properties: { tabColor: { argb: "FF00B050" } },
    views: [{ rightToLeft: true }],
  });

  sheet.mergeCells("B2:N2");
  const title = sheet.getCell("B2");
  title.value = `${entry.modelName} — ${entry.name}`;
  title.font = { ...WHITE_BOLD, size: 14 };
  fillCell(title, TITLE_FILL);
  for (let c = 2; c <= 14; c++) fillCell(sheet.getRow(2).getCell(c), TITLE_FILL);

  const writeBlock = (startRow: number, heading: string, rowSet: "perGroupMonthly" | "totalMonthly") => {
    sheet.getCell(`B${startRow}`).value = heading;
    sheet.getCell(`B${startRow}`).font = { bold: true };

    const headerRow = startRow + 1;
    sheet.getCell(`B${headerRow}`).value = "סעיף תקציבי";
    MONTHS.forEach((m, i) => {
      sheet.getCell(headerRow, 3 + i).value = m.label;
    });
    sheet.getCell(headerRow, 13).value = 'סה"כ';
    for (let c = 2; c <= 13; c++) {
      const cell = sheet.getRow(headerRow).getCell(c);
      cell.font = WHITE_BOLD;
      fillCell(cell, COLUMN_HEADER_FILL);
    }

    const {
      costRows,
      subtotalBeforeFeedingOverhead,
      feeding,
      overhead,
      totalCosts,
      participantIncome,
      ministryIncome,
      incomeRows,
      totalIncome,
      balance,
    } = entry.summary;

    let r = headerRow + 1;
    const writeRow = (row: ReportRow, opts?: { fill?: string; bold?: boolean }) => {
      sheet.getCell(`B${r}`).value = row.label;
      const monthly = row[rowSet];
      monthly.forEach((v, i) => {
        const cell = sheet.getRow(r).getCell(3 + i);
        cell.value = Math.round(v);
        cell.numFmt = NUM_FMT;
      });
      const totalCell = sheet.getRow(r).getCell(13);
      totalCell.value = Math.round(monthly.reduce((s, v) => s + v, 0));
      totalCell.numFmt = NUM_FMT;
      if (opts?.fill) {
        for (let c = 2; c <= 13; c++) fillCell(sheet.getRow(r).getCell(c), opts.fill);
      }
      if (opts?.bold) {
        for (let c = 2; c <= 13; c++) {
          const cell = sheet.getRow(r).getCell(c);
          cell.font = { ...(cell.font ?? {}), bold: true };
        }
      }
      r++;
    };

    costRows.forEach((row) => writeRow(row, { fill: ROW_LABEL_FILL }));
    writeRow(subtotalBeforeFeedingOverhead, { fill: SUBTOTAL_FILL, bold: true });
    writeRow(feeding, { fill: ROW_LABEL_FILL });
    writeRow(overhead, { fill: ROW_LABEL_FILL });
    writeRow(totalCosts, { fill: SUBTOTAL_FILL, bold: true });
    writeRow(participantIncome, { fill: ROW_LABEL_FILL });
    writeRow(ministryIncome, { fill: ROW_LABEL_FILL });
    incomeRows.forEach((row) => writeRow(row, { fill: ROW_LABEL_FILL }));
    writeRow(totalIncome, { fill: SUBTOTAL_FILL, bold: true });
    writeRow(balance, { fill: BALANCE_FILL, bold: true });

    return r;
  };

  const afterFirst = writeBlock(4, "ברמת קבוצה בודדת", "perGroupMonthly");
  writeBlock(afterFirst + 2, 'בסה"כ קבוצות', "totalMonthly");

  sheet.getColumn(2).width = 30;
  for (let c = 3; c <= 13; c++) sheet.getColumn(c).width = 12;
}

/** "מאוחד" sheet: monthly totals, aggregated across every sub-model in the given category. */
function buildConsolidatedSheet(
  wb: ExcelJS.Workbook,
  name: string,
  entries: SubModelReportEntry[]
) {
  const sheet = wb.addWorksheet(sheetSafeName(name), {
    properties: { tabColor: { argb: "FFFF0000" } },
    views: [{ rightToLeft: true }],
  });

  sheet.mergeCells("B2:N2");
  const title = sheet.getCell("B2");
  title.value = `${name} — תקציב חודשי מאוחד`;
  title.font = { ...WHITE_BOLD, size: 14 };
  fillCell(title, TITLE_FILL);
  for (let c = 2; c <= 14; c++) fillCell(sheet.getRow(2).getCell(c), TITLE_FILL);

  sheet.getCell("B4").value = "סעיף תקציבי";
  MONTHS.forEach((m, i) => (sheet.getCell(4, 3 + i).value = m.label));
  sheet.getCell(4, 13).value = 'סה"כ';
  for (let c = 2; c <= 13; c++) {
    const cell = sheet.getRow(4).getCell(c);
    cell.font = WHITE_BOLD;
    fillCell(cell, COLUMN_HEADER_FILL);
  }

  const zero = () => new Array(10).fill(0);
  const add = (a: number[], b: number[]) => a.map((v, i) => v + b[i]);

  const aggregate = (pick: (s: ReturnType<typeof summarizeForReport>) => ReportRow[] | ReportRow) => {
    const byLabel = new Map<string, number[]>();
    for (const entry of entries) {
      const rows = pick(entry.summary);
      const list = Array.isArray(rows) ? rows : [rows];
      for (const row of list) {
        byLabel.set(row.label, add(byLabel.get(row.label) ?? zero(), row.totalMonthly));
      }
    }
    return byLabel;
  };

  let r = 5;
  const writeAggRow = (label: string, monthly: number[], opts?: { fill?: string; bold?: boolean }) => {
    sheet.getCell(`B${r}`).value = label;
    monthly.forEach((v, i) => {
      const cell = sheet.getRow(r).getCell(3 + i);
      cell.value = Math.round(v);
      cell.numFmt = NUM_FMT;
    });
    const totalCell = sheet.getRow(r).getCell(13);
    totalCell.value = Math.round(monthly.reduce((s, v) => s + v, 0));
    totalCell.numFmt = NUM_FMT;
    if (opts?.fill) for (let c = 2; c <= 13; c++) fillCell(sheet.getRow(r).getCell(c), opts.fill);
    if (opts?.bold)
      for (let c = 2; c <= 13; c++) {
        const cell = sheet.getRow(r).getCell(c);
        cell.font = { ...(cell.font ?? {}), bold: true };
      }
    r++;
  };

  const costLabels = aggregate((s) => s.costRows);
  costLabels.forEach((monthly, label) => writeAggRow(label, monthly, { fill: ROW_LABEL_FILL }));

  const sumRows = (key: keyof ReturnType<typeof summarizeForReport>) => {
    const map = aggregate((s) => s[key] as ReportRow);
    return map.values().next().value ?? zero();
  };
  const subtotal = [...aggregate((s) => s.subtotalBeforeFeedingOverhead).values()][0] ?? zero();
  writeAggRow('סה"כ עלויות לפני הזנה ותקורה', subtotal, { fill: SUBTOTAL_FILL, bold: true });

  const feeding = [...aggregate((s) => s.feeding).values()][0] ?? zero();
  writeAggRow("הזנה", feeding, { fill: ROW_LABEL_FILL });
  const overhead = [...aggregate((s) => s.overhead).values()][0] ?? zero();
  writeAggRow("תקורה", overhead, { fill: ROW_LABEL_FILL });
  const totalCosts = [...aggregate((s) => s.totalCosts).values()][0] ?? zero();
  writeAggRow('סה"כ עלויות', totalCosts, { fill: SUBTOTAL_FILL, bold: true });

  const participantIncome = [...aggregate((s) => s.participantIncome).values()][0] ?? zero();
  writeAggRow("הכנסות משתתפים", participantIncome, { fill: ROW_LABEL_FILL });
  const ministryIncome = [...aggregate((s) => s.ministryIncome).values()][0] ?? zero();
  writeAggRow("הכנסות משרד החינוך", ministryIncome, { fill: ROW_LABEL_FILL });
  const incomeLabels = aggregate((s) => s.incomeRows);
  incomeLabels.forEach((monthly, label) => writeAggRow(label, monthly, { fill: ROW_LABEL_FILL }));
  const totalIncome = [...aggregate((s) => s.totalIncome).values()][0] ?? zero();
  writeAggRow('סה"כ הכנסות', totalIncome, { fill: SUBTOTAL_FILL, bold: true });
  const balance = totalIncome.map((v, i) => v - totalCosts[i]);
  writeAggRow("יתרה", balance, { fill: BALANCE_FILL, bold: true });

  sheet.getColumn(2).width = 30;
  for (let c = 3; c <= 13; c++) sheet.getColumn(c).width = 12;

  return { totalCosts, totalIncome, balance, rowLabels: [...costLabels.keys(), 'סה"כ עלויות לפני הזנה ותקורה', "הזנה", "תקורה", 'סה"כ עלויות', "הכנסות משתתפים", "הכנסות משרד החינוך", 'סה"כ הכנסות', "יתרה"] };
}

/** "ניצול תקציב" sheet: single annual-total column per category, for a quick top-level view. */
function buildUtilizationSheet(wb: ExcelJS.Workbook, name: string, entries: SubModelReportEntry[]) {
  const sheet = wb.addWorksheet(sheetSafeName(name), {
    properties: { tabColor: { argb: "FFFFFF00" } },
    views: [{ rightToLeft: true }],
  });

  sheet.mergeCells("B2:D2");
  const title = sheet.getCell("B2");
  title.value = name;
  title.font = { ...WHITE_BOLD, size: 14 };
  fillCell(title, TITLE_FILL);
  fillCell(sheet.getCell("C2"), TITLE_FILL);
  fillCell(sheet.getCell("D2"), TITLE_FILL);

  sheet.getCell("B4").value = "סעיף תקציבי";
  sheet.getCell("C4").value = 'תקציב שנתי (סה"כ)';
  fillCell(sheet.getCell("B4"), COLUMN_HEADER_FILL);
  fillCell(sheet.getCell("C4"), COLUMN_HEADER_FILL);
  sheet.getCell("B4").font = WHITE_BOLD;
  sheet.getCell("C4").font = WHITE_BOLD;

  const zero = () => new Array(10).fill(0);
  const add = (a: number[], b: number[]) => a.map((v, i) => v + b[i]);
  const sumAnnual = (pick: (s: ReturnType<typeof summarizeForReport>) => ReportRow[] | ReportRow) => {
    const byLabel = new Map<string, number>();
    for (const entry of entries) {
      const rows = pick(entry.summary);
      const list = Array.isArray(rows) ? rows : [rows];
      for (const row of list) {
        const annual = row.totalMonthly.reduce((s, v) => s + v, 0);
        byLabel.set(row.label, (byLabel.get(row.label) ?? 0) + annual);
      }
    }
    return byLabel;
  };

  let r = 5;
  const writeRow = (label: string, value: number, opts?: { fill?: string; bold?: boolean }) => {
    sheet.getCell(`B${r}`).value = label;
    const cell = sheet.getCell(`C${r}`);
    cell.value = Math.round(value);
    cell.numFmt = NUM_FMT;
    if (opts?.fill) {
      fillCell(sheet.getCell(`B${r}`), opts.fill);
      fillCell(cell, opts.fill);
    }
    if (opts?.bold) {
      sheet.getCell(`B${r}`).font = { bold: true };
      cell.font = { bold: true };
    }
    r++;
  };

  const costRows = sumAnnual((s) => s.costRows);
  costRows.forEach((v, label) => writeRow(label, v, { fill: ROW_LABEL_FILL }));

  const one = (pick: (s: ReturnType<typeof summarizeForReport>) => ReportRow) =>
    [...sumAnnual(pick).values()].reduce((s, v) => s + v, 0);

  const subtotal = one((s) => s.subtotalBeforeFeedingOverhead);
  writeRow('סה"כ עלויות לפני הזנה ותקורה', subtotal, { fill: SUBTOTAL_FILL, bold: true });
  const feeding = one((s) => s.feeding);
  writeRow("הזנה", feeding, { fill: ROW_LABEL_FILL });
  const overhead = one((s) => s.overhead);
  writeRow("תקורה", overhead, { fill: ROW_LABEL_FILL });
  const totalCosts = one((s) => s.totalCosts);
  writeRow('סה"כ עלויות', totalCosts, { fill: SUBTOTAL_FILL, bold: true });
  const participantIncome = one((s) => s.participantIncome);
  writeRow("הכנסות משתתפים", participantIncome, { fill: ROW_LABEL_FILL });
  const ministryIncome = one((s) => s.ministryIncome);
  writeRow("הכנסות משרד החינוך", ministryIncome, { fill: ROW_LABEL_FILL });
  const incomeRows = sumAnnual((s) => s.incomeRows);
  incomeRows.forEach((v, label) => writeRow(label, v, { fill: ROW_LABEL_FILL }));
  const totalIncome = one((s) => s.totalIncome);
  writeRow('סה"כ הכנסות', totalIncome, { fill: SUBTOTAL_FILL, bold: true });
  writeRow("יתרה", totalIncome - totalCosts, { fill: BALANCE_FILL, bold: true });

  sheet.getColumn(2).width = 32;
  sheet.getColumn(3).width = 16;

  return { totalCosts, totalIncome, balance: totalIncome - totalCosts };
}

function buildExecutionSummarySheet(
  wb: ExcelJS.Workbook,
  gardenEntries: SubModelReportEntry[],
  schoolEntries: SubModelReportEntry[]
) {
  const sheet = wb.addWorksheet(sheetSafeName("סיכום ביצוע"), {
    properties: { tabColor: { argb: "FFFFFF00" } },
    views: [{ rightToLeft: true }],
  });

  sheet.mergeCells("B2:E2");
  const title = sheet.getCell("B2");
  title.value = "סיכום תקציבי — ספטמבר עד יוני";
  title.font = { ...WHITE_BOLD, size: 16 };
  for (let c = 2; c <= 5; c++) fillCell(sheet.getRow(2).getCell(c), TITLE_FILL);

  sheet.getCell("C4").value = "גנים";
  sheet.getCell("D4").value = "בתי ספר";
  sheet.getCell("E4").value = 'סה"כ';
  for (const col of ["C", "D"]) {
    sheet.getCell(`${col}4`).font = WHITE_BOLD;
    fillCell(sheet.getCell(`${col}4`), CATEGORY_HEADER_FILL.גנים);
  }
  sheet.getCell("E4").font = WHITE_BOLD;
  fillCell(sheet.getCell("E4"), CATEGORY_HEADER_FILL.total);
  sheet.getCell("B5").value = "סעיף";
  fillCell(sheet.getCell("B5"), COLUMN_HEADER_FILL);
  sheet.getCell("B5").font = WHITE_BOLD;

  const zero = () => new Array(10).fill(0);
  const annualOf = (entries: SubModelReportEntry[], pick: (s: ReturnType<typeof summarizeForReport>) => ReportRow[] | ReportRow) => {
    const byLabel = new Map<string, number>();
    for (const entry of entries) {
      const rows = pick(entry.summary);
      const list = Array.isArray(rows) ? rows : [rows];
      for (const row of list) {
        const annual = row.totalMonthly.reduce((s, v) => s + v, 0);
        byLabel.set(row.label, (byLabel.get(row.label) ?? 0) + annual);
      }
    }
    return byLabel;
  };

  const allLabels: string[] = [];
  const gardenCost = annualOf(gardenEntries, (s) => s.costRows);
  const schoolCost = annualOf(schoolEntries, (s) => s.costRows);
  [...gardenCost.keys(), ...schoolCost.keys()].forEach((l) => {
    if (!allLabels.includes(l)) allLabels.push(l);
  });

  let r = 6;
  const writeRow = (label: string, g: number, s: number, opts?: { fill?: string; bold?: boolean }) => {
    sheet.getCell(`B${r}`).value = label;
    sheet.getCell(`C${r}`).value = Math.round(g);
    sheet.getCell(`D${r}`).value = Math.round(s);
    sheet.getCell(`E${r}`).value = Math.round(g + s);
    ["C", "D", "E"].forEach((col) => (sheet.getCell(`${col}${r}`).numFmt = NUM_FMT));
    if (opts?.fill) ["B", "C", "D", "E"].forEach((col) => fillCell(sheet.getCell(`${col}${r}`), opts.fill!));
    if (opts?.bold) ["B", "C", "D", "E"].forEach((col) => (sheet.getCell(`${col}${r}`).font = { bold: true }));
    r++;
  };

  allLabels.forEach((label) => writeRow(label, gardenCost.get(label) ?? 0, schoolCost.get(label) ?? 0, { fill: ROW_LABEL_FILL }));

  const oneAnnual = (entries: SubModelReportEntry[], pick: (s: ReturnType<typeof summarizeForReport>) => ReportRow) =>
    [...annualOf(entries, pick).values()].reduce((s, v) => s + v, 0);

  const gSubtotal = oneAnnual(gardenEntries, (s) => s.subtotalBeforeFeedingOverhead);
  const sSubtotal = oneAnnual(schoolEntries, (s) => s.subtotalBeforeFeedingOverhead);
  writeRow('סה"כ עלויות לפני הזנה ותקורה', gSubtotal, sSubtotal, { fill: SUBTOTAL_FILL, bold: true });

  const gFeeding = oneAnnual(gardenEntries, (s) => s.feeding);
  const sFeeding = oneAnnual(schoolEntries, (s) => s.feeding);
  writeRow("הזנה", gFeeding, sFeeding, { fill: ROW_LABEL_FILL });

  const gOverhead = oneAnnual(gardenEntries, (s) => s.overhead);
  const sOverhead = oneAnnual(schoolEntries, (s) => s.overhead);
  writeRow("תקורה", gOverhead, sOverhead, { fill: ROW_LABEL_FILL });

  const gTotalCosts = oneAnnual(gardenEntries, (s) => s.totalCosts);
  const sTotalCosts = oneAnnual(schoolEntries, (s) => s.totalCosts);
  writeRow('סה"כ עלויות', gTotalCosts, sTotalCosts, { fill: SUBTOTAL_FILL, bold: true });

  const gParticipant = oneAnnual(gardenEntries, (s) => s.participantIncome);
  const sParticipant = oneAnnual(schoolEntries, (s) => s.participantIncome);
  writeRow("הכנסות משתתפים", gParticipant, sParticipant, { fill: ROW_LABEL_FILL });

  const gMinistry = oneAnnual(gardenEntries, (s) => s.ministryIncome);
  const sMinistry = oneAnnual(schoolEntries, (s) => s.ministryIncome);
  writeRow("הכנסות משרד החינוך", gMinistry, sMinistry, { fill: ROW_LABEL_FILL });

  const gIncomeRows = annualOf(gardenEntries, (s) => s.incomeRows);
  const sIncomeRows = annualOf(schoolEntries, (s) => s.incomeRows);
  const incomeLabels: string[] = [];
  [...gIncomeRows.keys(), ...sIncomeRows.keys()].forEach((l) => {
    if (!incomeLabels.includes(l)) incomeLabels.push(l);
  });
  incomeLabels.forEach((label) =>
    writeRow(label, gIncomeRows.get(label) ?? 0, sIncomeRows.get(label) ?? 0, { fill: ROW_LABEL_FILL })
  );

  const gTotalIncome = oneAnnual(gardenEntries, (s) => s.totalIncome);
  const sTotalIncome = oneAnnual(schoolEntries, (s) => s.totalIncome);
  writeRow('סה"כ הכנסות', gTotalIncome, sTotalIncome, { fill: SUBTOTAL_FILL, bold: true });

  writeRow("יתרה", gTotalIncome - gTotalCosts, sTotalIncome - sTotalCosts, { fill: BALANCE_FILL, bold: true });

  sheet.getColumn(2).width = 32;
  sheet.getColumn(3).width = 14;
  sheet.getColumn(4).width = 14;
  sheet.getColumn(5).width = 14;
}

export function buildClientAnnualReport(clientName: string, yearLabel: string, entries: SubModelReportEntry[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ניצנים";

  const gardenEntries = entries.filter((e) => e.category === "גנים");
  const schoolEntries = entries.filter((e) => e.category === "בתי_ספר");

  buildExecutionSummarySheet(wb, gardenEntries, schoolEntries);
  if (gardenEntries.length) buildUtilizationSheet(wb, "ניצול תקציב גנים", gardenEntries);
  if (schoolEntries.length) buildUtilizationSheet(wb, "ניצול תקציב בתי ספר", schoolEntries);
  if (gardenEntries.length) buildConsolidatedSheet(wb, "מאוחד גנים", gardenEntries);
  if (schoolEntries.length) buildConsolidatedSheet(wb, 'מאוחד בי"ס', schoolEntries);
  for (const entry of entries) buildSubModelSheet(wb, entry);

  return wb;
}
