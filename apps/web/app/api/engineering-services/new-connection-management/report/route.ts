import { NextRequest, NextResponse } from "next/server";
import {
  buildDashboardCards,
  buildStatusBuckets,
} from "@/lib/engineering-services/new-connection-management";
import { getNewConnectionRecords } from "@/lib/engineering-services/new-connection-server";

export const dynamic = "force-dynamic";

type ReportType = "summary" | "status-register" | "allocation-queue";
type ReportFormat = "json" | "csv";

function escapeCsvValue(value: unknown): string {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(",")),
  ];

  return lines.join("\n");
}

function getReportRows(
  type: ReportType,
  connections: Awaited<ReturnType<typeof getNewConnectionRecords>>,
) {
  const dashboardCards = buildDashboardCards(connections);
  const statusBuckets = buildStatusBuckets(connections);

  if (type === "summary") {
    return [
      ...dashboardCards.map((card) => ({
        section: "dashboard",
        metric: card.title,
        value: card.value,
        notes: card.helper,
      })),
      ...statusBuckets.map((bucket) => ({
        section: "status",
        metric: bucket.title,
        value: bucket.count,
        notes: bucket.helper,
      })),
    ];
  }

  if (type === "allocation-queue") {
    return connections
      .filter((connection) => connection.status !== "Energised")
      .map((connection) => ({
        reference: connection.reference,
        quotationRef: connection.quotationRef,
        customer: connection.customer,
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

function isReportType(value: string | null): value is ReportType {
  return value === "summary" || value === "status-register" || value === "allocation-queue";
}

function isReportFormat(value: string | null): value is ReportFormat {
  return value === "json" || value === "csv";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get("type");
  const formatParam = searchParams.get("format");

  const type: ReportType = isReportType(typeParam) ? typeParam : "summary";
  const format: ReportFormat = isReportFormat(formatParam) ? formatParam : "csv";
  const connections = await getNewConnectionRecords();
  const rows = getReportRows(type, connections);
  const generatedAt = new Date().toISOString();

  if (format === "json") {
    return NextResponse.json({
      reportType: type,
      generatedAt,
      rowCount: rows.length,
      data: rows,
    });
  }

  const csv = toCsv(rows);
  const datePart = generatedAt.slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"nored-new-connection-${type}-${datePart}.csv\"`,
      "Cache-Control": "no-store",
    },
  });
}
