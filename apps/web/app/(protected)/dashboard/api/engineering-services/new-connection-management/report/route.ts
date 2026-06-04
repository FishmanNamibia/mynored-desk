import { NextRequest, NextResponse } from "next/server";
import type { ConnectionRecord } from "@/lib/engineering-services/new-connection-management";
import {
  buildDynamicMonthlyEngineeringReport,
  type EngineeringMonthlyReport,
  type EngineeringReportFormat,
  type EngineeringReportType,
  type ReportTableSection,
} from "@/lib/engineering-services/new-connection-reporting";
import { getNewConnectionRecords } from "@/lib/engineering-services/new-connection-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BRAND = {
  organisation: "NORED Electricity (Pty) Ltd",
  product: "NORED Desk · Engineering Services",
  tagline: "Electricity for development",
  darkRed: [122, 17, 29] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],
  headerFill: [254, 226, 226] as [number, number, number],
  headerText: [127, 29, 29] as [number, number, number],
  altRow: [248, 250, 252] as [number, number, number],
  bodyText: [51, 65, 85] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  ink: [15, 23, 42] as [number, number, number],
};

const operationalColumnLabels: Record<string, string> = {
  reference: "Reference",
  quotationRef: "Quotation Ref",
  customer: "Customer / Project",
  priority: "Priority",
  keyStakeholder: "Key Stakeholder",
  connectionClass: "Connection Class",
  config: "Configuration",
  connectionType: "Connection Type",
  locality: "Locality",
  region: "Region",
  constituency: "Constituency",
  status: "Status",
  applicationDate: "Application Date",
  receivedDate: "Received Date",
  investigationDate: "Investigation Date",
  quoteIssuedDate: "Quote Issued Date",
  fullPaymentDate: "Full Payment Date",
  assignedDate: "Assigned Date",
  connectionDate: "Connection Date",
  assignedTo: "Assigned To",
  projectValue: "Project Value",
  capitalContribution: "Capital Contribution",
  mvLength: "MV Length",
  mvConductor: "MV Conductor",
  lvLength: "LV Length",
  transformerRating: "Transformer Rating",
  voltageRating: "Voltage Rating",
  serviceConnection: "Service Connection",
  jobCardNumber: "Job Card No.",
  meterNumber: "Meter No.",
  sealNumber: "Seal No.",
  coordinates: "Coordinates",
  comment: "Comment",
  nextAction: "Next Action",
};

const operationalReportMeta: Record<
  "status-register" | "allocation-queue",
  { title: string; subtitle: string; pdfColumns: string[] }
> = {
  "status-register": {
    title: "New Connection Status Register",
    subtitle:
      "Full operational register for status queries, tracking, and handovers.",
    pdfColumns: [
      "reference",
      "customer",
      "connectionClass",
      "region",
      "status",
      "assignedTo",
      "applicationDate",
      "connectionDate",
    ],
  },
  "allocation-queue": {
    title: "Operations Follow-up Report",
    subtitle:
      "Outstanding connections that still need investigation, payment, allocation, or close-out.",
    pdfColumns: [
      "reference",
      "customer",
      "priority",
      "region",
      "status",
      "assignedTo",
      "applicationDate",
      "nextAction",
    ],
  },
};

function columnLetter(index: number): string {
  let remaining = index;
  let letter = "";
  while (remaining > 0) {
    const modulo = (remaining - 1) % 26;
    letter = String.fromCharCode(65 + modulo) + letter;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return letter || "A";
}

function formatGeneratedAt(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-NA", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(parsed);
}

function escapeCsvValue(value: unknown): string {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function toCsv(
  rows: Array<Record<string, unknown>>,
  labels: Record<string, string> = {},
): string {
  if (rows.length === 0) return "";

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map((header) => escapeCsvValue(labels[header] ?? header)).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(",")),
  ];

  return lines.join("\n");
}

function getOperationalReportRows(
  type: Extract<EngineeringReportType, "status-register" | "allocation-queue">,
  connections: ConnectionRecord[],
) {
  if (type === "allocation-queue") {
    return connections
      .filter((connection) => connection.status !== "Energised")
      .map((connection) => ({
        reference: connection.reference,
        quotationRef: connection.quotationRef,
        customer: connection.customer,
        priority: connection.priority,
        keyStakeholder: connection.keyStakeholder,
        connectionClass: connection.connectionClass,
        config: connection.config,
        locality: connection.locality,
        region: connection.region,
        constituency: connection.constituency,
        status: connection.status,
        applicationDate: connection.applicationDate,
        investigationDate: connection.investigationDate,
        quoteIssuedDate: connection.quoteIssuedDate,
        fullPaymentDate: connection.fullPaymentDate,
        assignedDate: connection.assignedDate,
        assignedTo: connection.assignedTo,
        jobCardNumber: connection.jobCardNumber,
        nextAction: connection.nextAction,
      }));
  }

  return connections.map((connection) => ({
    reference: connection.reference,
    quotationRef: connection.quotationRef,
    customer: connection.customer,
    priority: connection.priority,
    keyStakeholder: connection.keyStakeholder,
    connectionClass: connection.connectionClass,
    config: connection.config,
    connectionType: connection.connectionType,
    region: connection.region,
    locality: connection.locality,
    constituency: connection.constituency,
    status: connection.status,
    applicationDate: connection.applicationDate,
    receivedDate: connection.receivedDate,
    investigationDate: connection.investigationDate,
    quoteIssuedDate: connection.quoteIssuedDate,
    fullPaymentDate: connection.fullPaymentDate,
    assignedDate: connection.assignedDate,
    connectionDate: connection.connectionDate,
    assignedTo: connection.assignedTo,
    projectValue: connection.projectValue,
    capitalContribution: connection.capitalContribution,
    mvLength: connection.mvLength,
    mvConductor: connection.mvConductor,
    lvLength: connection.lvLength,
    transformerRating: connection.transformerRating,
    voltageRating: connection.voltageRating,
    serviceConnection: connection.serviceConnection,
    jobCardNumber: connection.jobCardNumber,
    meterNumber: connection.meterNumber,
    sealNumber: connection.sealNumber,
    coordinates: connection.coordinates,
    comment: connection.comment,
    nextAction: connection.nextAction,
  }));
}

function isReportType(value: string | null): value is EngineeringReportType {
  return (
    value === "monthly-engineering" ||
    value === "status-register" ||
    value === "allocation-queue"
  );
}

function isReportFormat(value: string | null): value is EngineeringReportFormat {
  return value === "json" || value === "csv" || value === "pdf" || value === "xlsx";
}

function addWrappedText(
  doc: {
    splitTextToSize: (text: string, width: number) => string[];
    text: (text: string | string[], x: number, y: number) => void;
    addPage: () => void;
  },
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 14,
) {
  const lines = doc.splitTextToSize(text, maxWidth);
  let currentY = y;

  if (currentY + lines.length * lineHeight > 780) {
    doc.addPage();
    currentY = 60;
  }

  doc.text(lines, x, currentY);
  return currentY + lines.length * lineHeight + 10;
}

function buildMonthlyReportSections(report: EngineeringMonthlyReport): ReportTableSection[] {
  return [
    report.donatedAssets,
    report.mvSummary,
    report.mvNoredTeams,
    ...report.mvContractorPhases,
    report.mvMovementTable,
    report.keyStakeholderProjects,
    report.lvStatus,
    report.lvCableOutstanding,
  ];
}

interface BrandedPdf {
  internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
  setFont: (family: string, style?: string) => void;
  setFontSize: (size: number) => void;
  setTextColor: (r: number, g: number, b: number) => void;
  setFillColor: (r: number, g: number, b: number) => void;
  setProperties?: (properties: Record<string, string>) => void;
  rect: (x: number, y: number, width: number, height: number, style?: string) => void;
  text: (
    text: string | string[],
    x: number,
    y: number,
    options?: { align?: "left" | "center" | "right" | "justify" },
  ) => unknown;
  getNumberOfPages: () => number;
  setPage: (pageNumber: number) => void;
}

function drawBrandedHeader(
  doc: BrandedPdf,
  options: { title: string; subtitle?: string; generatedAt: string },
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const bandHeight = 62;

  doc.setFillColor(...BRAND.darkRed);
  doc.rect(0, 0, pageWidth, bandHeight, "F");
  doc.setFillColor(...BRAND.red);
  doc.rect(0, bandHeight, pageWidth, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text("NORED", 40, 32);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.headerFill);
  doc.text(BRAND.tagline.toUpperCase(), 40, 46);

  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(BRAND.organisation, pageWidth - 40, 28, { align: "right" });
  doc.setTextColor(...BRAND.headerFill);
  doc.text(
    `Generated ${formatGeneratedAt(options.generatedAt)}`,
    pageWidth - 40,
    44,
    { align: "right" },
  );

  let currentY = bandHeight + 30;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.darkRed);
  doc.setFontSize(16);
  doc.text(options.title, 40, currentY);
  currentY += 16;

  if (options.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.muted);
    doc.text(options.subtitle, 40, currentY);
    currentY += 14;
  }

  return currentY + 8;
}

function applyBrandedFooter(doc: BrandedPdf, footerLabel: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageCount = doc.getNumberOfPages();

  for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
    doc.setPage(pageIndex);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.muted);
    doc.text(footerLabel, 40, pageHeight - 22);
    doc.text(`Page ${pageIndex} of ${pageCount}`, pageWidth - 40, pageHeight - 22, {
      align: "right",
    });
  }
}

async function buildMonthlyEngineeringPdf(
  report: EngineeringMonthlyReport,
  generatedAt: string,
) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setProperties({
    title: `NORED Engineering Monthly Report - ${report.monthLabel}`,
    subject: "Engineering Department Project Division Monthly Report",
    author: BRAND.product,
    creator: BRAND.product,
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = drawBrandedHeader(doc, {
    title: "Engineering Monthly Report",
    subtitle: `Report period: ${report.monthLabel}`,
    generatedAt,
  });

  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.text("TABLE OF CONTENTS", 40, currentY + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  currentY += 20;

  report.tableOfContents.forEach((item) => {
    currentY = addWrappedText(doc, item, 52, currentY, pageWidth - 104, 14);
  });

  currentY += 8;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.text("1. INTRODUCTION", 40, currentY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(11);
  currentY = addWrappedText(
    doc,
    report.introduction,
    40,
    currentY + 16,
    pageWidth - 80,
    15,
  );

  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.text("2. ASSET AND PROJECT MANAGEMENT DIVISION", 40, currentY + 8);
  currentY += 22;

  for (const section of buildMonthlyReportSections(report)) {
    if (currentY > 700) {
      doc.addPage();
      currentY = 56;
    }

    doc.setFont("helvetica", "bold");
    doc.setTextColor(122, 17, 29);
    doc.setFontSize(13);
    doc.text(`${section.sectionNumber} ${section.title}`, 40, currentY);
    currentY += 14;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(10);

    if (section.summary) {
      currentY = addWrappedText(doc, section.summary, 40, currentY + 6, pageWidth - 80, 14);
    } else {
      currentY += 10;
    }

    if (section.tableLabel) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(31, 41, 55);
      doc.text(section.tableLabel, 40, currentY);
      currentY += 10;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
    }

    autoTable(doc, {
      startY: currentY + 6,
      head: [section.columns.map((column) => column.label)],
      body: section.rows.map((row) =>
        section.columns.map((column) => String(row[column.key] ?? "")),
      ),
      margin: { left: 40, right: 40 },
      theme: "grid",
      headStyles: {
        fillColor: [254, 226, 226],
        textColor: [127, 29, 29],
        fontStyle: "bold",
      },
      bodyStyles: {
        textColor: [51, 65, 85],
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      didParseCell(data) {
        if (section.highlightLastRow && data.section === "body" && data.row.index === section.rows.length - 1) {
          data.cell.styles.fillColor = [254, 242, 242];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    const finalY =
      (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ??
      currentY;
    currentY = finalY + 16;

    if (section.note) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(10);
      currentY = addWrappedText(doc, section.note, 40, currentY, pageWidth - 80, 14);
    }
  }

  if (currentY > 710) {
    doc.addPage();
    currentY = 56;
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.text("2.3 CHALLENGES", 40, currentY);
  currentY += 18;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(10);

  report.challenges.forEach((challenge) => {
    currentY = addWrappedText(doc, `- ${challenge}`, 48, currentY, pageWidth - 96, 14);
  });

  applyBrandedFooter(doc, `NORED Engineering Monthly Report  ·  ${report.monthLabel}`);

  return Buffer.from(doc.output("arraybuffer"));
}

async function buildOperationalReportPdf(options: {
  reportType: "status-register" | "allocation-queue";
  rows: Array<Record<string, unknown>>;
  generatedAt: string;
}) {
  const { reportType, rows, generatedAt } = options;
  const meta = operationalReportMeta[reportType];
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  doc.setProperties({
    title: meta.title,
    subject: meta.subtitle,
    author: BRAND.product,
    creator: BRAND.product,
  });

  const startY = drawBrandedHeader(doc, {
    title: meta.title,
    subtitle: `${meta.subtitle}  ·  ${rows.length} record${rows.length === 1 ? "" : "s"}`,
    generatedAt,
  });

  const columns = meta.pdfColumns;

  autoTable(doc, {
    startY,
    head: [columns.map((key) => operationalColumnLabels[key] ?? key)],
    body: rows.map((row) => columns.map((key) => String(row[key] ?? "—"))),
    margin: { left: 40, right: 40 },
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: {
      fillColor: BRAND.darkRed,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: { textColor: BRAND.bodyText },
    alternateRowStyles: { fillColor: BRAND.altRow },
  });

  applyBrandedFooter(doc, `${meta.title}  ·  ${BRAND.organisation}`);

  return Buffer.from(doc.output("arraybuffer"));
}

function styleWorksheetHeaderCell(cell: {
  font: Record<string, unknown>;
  fill: Record<string, unknown>;
  border: Record<string, unknown>;
  alignment: Record<string, unknown>;
}) {
  cell.font = { bold: true, color: { argb: "FF7F1D1D" } };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFEE2E2" },
  };
  cell.border = {
    top: { style: "thin", color: { argb: "FFFECACA" } },
    left: { style: "thin", color: { argb: "FFFECACA" } },
    bottom: { style: "thin", color: { argb: "FFFECACA" } },
    right: { style: "thin", color: { argb: "FFFECACA" } },
  };
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
}

function styleBodyCell(cell: {
  border: Record<string, unknown>;
  alignment: Record<string, unknown>;
  fill: Record<string, unknown>;
  font: Record<string, unknown>;
}, isTotalRow: boolean) {
  cell.border = {
    top: { style: "thin", color: { argb: "FFFEE2E2" } },
    left: { style: "thin", color: { argb: "FFFEE2E2" } },
    bottom: { style: "thin", color: { argb: "FFFEE2E2" } },
    right: { style: "thin", color: { argb: "FFFEE2E2" } },
  };
  cell.alignment = { vertical: "top", wrapText: true };

  if (isTotalRow) {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFF1F2" },
    };
    cell.font = { bold: true };
  }
}

async function buildMonthlyEngineeringWorkbook(
  report: EngineeringMonthlyReport,
  generatedAt: string,
) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = BRAND.product;
  workbook.company = BRAND.organisation;
  workbook.created = new Date();
  workbook.modified = new Date();

  const summarySheet = workbook.addWorksheet("Contents");
  summarySheet.getCell("A1").value = "NORED Engineering Monthly Report";
  summarySheet.getCell("A1").font = { size: 18, bold: true, color: { argb: "FF7A111D" } };
  summarySheet.getCell("A2").value = `Report period: ${report.monthLabel}`;
  summarySheet.getCell("A2").font = { bold: true, color: { argb: "FFDC2626" } };
  summarySheet.getCell("A3").value = `Generated ${formatGeneratedAt(generatedAt)} · ${BRAND.organisation}`;
  summarySheet.getCell("A3").font = { size: 10, color: { argb: "FF64748B" } };
  summarySheet.getCell("A4").value = "TABLE OF CONTENTS";
  summarySheet.getCell("A4").font = { size: 13, bold: true };

  report.tableOfContents.forEach((item, index) => {
    summarySheet.getCell(`A${5 + index}`).value = item;
  });

  summarySheet.getCell("A12").value = "1. INTRODUCTION";
  summarySheet.getCell("A12").font = { size: 13, bold: true };
  summarySheet.getCell("A13").value = report.introduction;
  summarySheet.getCell("A13").alignment = { wrapText: true, vertical: "top" };

  summarySheet.getCell("A17").value = "2.3 CHALLENGES";
  summarySheet.getCell("A17").font = { size: 13, bold: true };
  report.challenges.forEach((challenge, index) => {
    summarySheet.getCell(`A${18 + index}`).value = `- ${challenge}`;
  });
  summarySheet.columns = [{ width: 110 }];

  const addTableSheet = (sheetName: string, section: ReportTableSection) => {
    const worksheet = workbook.addWorksheet(sheetName);
    worksheet.getCell("A1").value = `${section.sectionNumber} ${section.title}`;
    worksheet.getCell("A1").font = { size: 16, bold: true, color: { argb: "FF7F1D1D" } };
    worksheet.getCell("A2").value = section.tableLabel ?? "";
    worksheet.getCell("A2").font = { bold: true };

    let currentRowNumber = 4;
    if (section.summary) {
      worksheet.getCell(`A${currentRowNumber}`).value = section.summary;
      worksheet.getCell(`A${currentRowNumber}`).alignment = { wrapText: true };
      currentRowNumber += 2;
    }

    const headerRow = worksheet.getRow(currentRowNumber);
    section.columns.forEach((column, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = column.label;
      styleWorksheetHeaderCell(cell as never);
    });
    headerRow.height = 24;

    section.rows.forEach((row, rowIndex) => {
      const excelRow = worksheet.getRow(currentRowNumber + rowIndex + 1);
      const isTotalRow = Boolean(section.highlightLastRow && rowIndex === section.rows.length - 1);

      section.columns.forEach((column, columnIndex) => {
        const cell = excelRow.getCell(columnIndex + 1);
        cell.value = String(row[column.key] ?? "");
        styleBodyCell(cell as never, isTotalRow);
      });
    });

    worksheet.columns = section.columns.map((column) => ({
      key: column.key,
      width:
        column.key === "description" || column.key === "statusComment"
          ? 48
          : column.key === "budget"
            ? 24
            : 18,
    }));
    worksheet.views = [{ state: "frozen", ySplit: currentRowNumber }];

    if (section.note) {
      const noteRow = currentRowNumber + section.rows.length + 3;
      worksheet.getCell(`A${noteRow}`).value = section.note;
      worksheet.getCell(`A${noteRow}`).alignment = { wrapText: true, vertical: "top" };
    }
  };

  addTableSheet("Donated Assets", report.donatedAssets);
  addTableSheet("MV Synopsis", report.mvSummary);
  addTableSheet("MV NORED Teams", report.mvNoredTeams);
  report.mvContractorPhases.forEach((section, index) => {
    addTableSheet(`MV Phase ${index + 1}`, section);
  });
  addTableSheet("MV Movement", report.mvMovementTable);
  addTableSheet("Stakeholders", report.keyStakeholderProjects);
  addTableSheet("LV Status", report.lvStatus);
  addTableSheet("LV Cable", report.lvCableOutstanding);

  const challengesSheet = workbook.addWorksheet("Challenges");
  challengesSheet.getCell("A1").value = "2.3 Challenges";
  challengesSheet.getCell("A1").font = { size: 16, bold: true, color: { argb: "FF7F1D1D" } };
  report.challenges.forEach((challenge, index) => {
    challengesSheet.getCell(`A${3 + index}`).value = `- ${challenge}`;
  });
  challengesSheet.columns = [{ width: 120 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}

async function buildOperationalReportWorkbook(options: {
  reportType: "status-register" | "allocation-queue";
  rows: Array<Record<string, unknown>>;
  generatedAt: string;
}) {
  const { reportType, rows, generatedAt } = options;
  const meta = operationalReportMeta[reportType];
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = BRAND.product;
  workbook.company = BRAND.organisation;
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet(meta.title.slice(0, 28), {
    views: [{ state: "frozen", ySplit: 4 }],
  });

  const columnKeys = rows.length > 0 ? Object.keys(rows[0]) : Object.keys(operationalColumnLabels);
  const columnCount = Math.max(columnKeys.length, 1);
  const lastColumn = columnLetter(columnCount);

  sheet.mergeCells(`A1:${lastColumn}1`);
  sheet.getCell("A1").value = `NORED  ·  ${meta.title}`;
  sheet.getCell("A1").font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF7A111D" },
  };
  sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sheet.getRow(1).height = 28;

  sheet.mergeCells(`A2:${lastColumn}2`);
  sheet.getCell("A2").value = meta.subtitle;
  sheet.getCell("A2").font = { italic: true, color: { argb: "FF475569" } };

  sheet.mergeCells(`A3:${lastColumn}3`);
  sheet.getCell("A3").value = `Generated ${formatGeneratedAt(generatedAt)} · ${rows.length} record${
    rows.length === 1 ? "" : "s"
  } · ${BRAND.organisation}`;
  sheet.getCell("A3").font = { size: 10, color: { argb: "FF64748B" } };

  const headerRow = sheet.getRow(4);
  columnKeys.forEach((key, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = operationalColumnLabels[key] ?? key;
    cell.font = { bold: true, color: { argb: "FF7F1D1D" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFEE2E2" },
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FFFECACA" } },
      left: { style: "thin", color: { argb: "FFFECACA" } },
      bottom: { style: "thin", color: { argb: "FFFECACA" } },
      right: { style: "thin", color: { argb: "FFFECACA" } },
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  headerRow.height = 24;

  rows.forEach((row, rowIndex) => {
    const excelRow = sheet.getRow(5 + rowIndex);
    columnKeys.forEach((key, columnIndex) => {
      const cell = excelRow.getCell(columnIndex + 1);
      cell.value = String(row[key] ?? "");
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FFF1F5F9" } },
        left: { style: "thin", color: { argb: "FFF1F5F9" } },
        bottom: { style: "thin", color: { argb: "FFF1F5F9" } },
        right: { style: "thin", color: { argb: "FFF1F5F9" } },
      };
    });
  });

  sheet.columns = columnKeys.map((key) => ({
    width:
      key === "comment" || key === "nextAction" || key === "customer"
        ? 38
        : key === "reference" || key === "assignedTo" || key === "locality"
          ? 22
          : 16,
  }));

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get("type");
  const formatParam = searchParams.get("format");

  const type: EngineeringReportType = isReportType(typeParam)
    ? typeParam
    : "monthly-engineering";
  const format: EngineeringReportFormat = isReportFormat(formatParam)
    ? formatParam
    : type === "monthly-engineering"
      ? "pdf"
      : "csv";

  const generatedAt = new Date().toISOString();

  if (type === "monthly-engineering") {
    const connections = await getNewConnectionRecords();
    const report = buildDynamicMonthlyEngineeringReport(connections);

    if (format === "json") {
      return NextResponse.json({
        reportType: type,
        generatedAt,
        data: report,
      });
    }

    if (format === "pdf") {
      const pdfBuffer = await buildMonthlyEngineeringPdf(report, generatedAt);
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition":
            `attachment; filename="nored-engineering-monthly-report-${report.monthLabel.toLowerCase().replace(/\s+/g, "-")}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (format === "xlsx") {
      const workbookBuffer = await buildMonthlyEngineeringWorkbook(report, generatedAt);
      return new NextResponse(workbookBuffer, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition":
            `attachment; filename="nored-engineering-monthly-report-${report.monthLabel.toLowerCase().replace(/\s+/g, "-")}.xlsx"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(
      { error: "Format not supported for the monthly engineering report." },
      { status: 400 },
    );
  }

  const connections = await getNewConnectionRecords();
  const rows = getOperationalReportRows(type, connections);
  const datePart = generatedAt.slice(0, 10);

  if (format === "json") {
    return NextResponse.json({
      reportType: type,
      generatedAt,
      rowCount: rows.length,
      data: rows,
    });
  }

  if (format === "csv") {
    const csv = toCsv(rows, operationalColumnLabels);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="nored-new-connection-${type}-${datePart}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (format === "pdf") {
    const pdfBuffer = await buildOperationalReportPdf({
      reportType: type,
      rows,
      generatedAt,
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="nored-new-connection-${type}-${datePart}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (format === "xlsx") {
    const workbookBuffer = await buildOperationalReportWorkbook({
      reportType: type,
      rows,
      generatedAt,
    });

    return new NextResponse(workbookBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="nored-new-connection-${type}-${datePart}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json(
    { error: "Format not supported for this report type." },
    { status: 400 },
  );
}
