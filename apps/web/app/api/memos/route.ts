import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/pms/prisma";

/**
 * The generated Prisma client has a rich Memo model with proper columns:
 * memoTo, memoFrom, memoThrough (Json), subject, purpose, recommendation,
 * financial fields (Decimal), status (MemoStatus enum), priority (MemoPriority enum), etc.
 * 
 * MemoStatus enum: DRAFT, PENDING, APPROVED, REJECTED, ARCHIVED
 * MemoPriority enum: LOW, NORMAL, HIGH, URGENT
 */

function toMemoData(body: any) {
  const {
    createdById, memoTo, memoFrom, memoToTitle, memoFromTitle,
    memoDate, memoThrough, subject, purpose, recommendation,
    procurementActivity, budgetVote, budgetedAmount, amountSpent,
    availableFunds, executiveName, financialVerification, budgetApproved,
    financialComments, executiveSignatureDate, executiveSignaturePath,
    attachments, status, priority,
    // New fields stored in memoThrough Json or attachments Json
    initiatorSignature, throughSignatures, recipientSignature, financeSignature,
    department, position, routingOrder, currentRoutingStep,
    preparedBy,
    ...extra
  } = body;

  // Valid MemoStatus values in the DB enum
  const validStatuses = ["DRAFT", "PENDING", "APPROVED", "REJECTED", "ARCHIVED"];
  const safeStatus = validStatuses.includes(status) ? status : "DRAFT";

  const data: any = {
    memoTo: memoTo || "",
    memoFrom: memoFrom || "",
    subject: subject || "",
    purpose: purpose || "",
    recommendation: recommendation || "",
    status: safeStatus,
    priority: priority || "NORMAL",
  };

  if (createdById) data.createdById = createdById;
  if (memoToTitle !== undefined) data.memoToTitle = memoToTitle || null;
  if (memoFromTitle !== undefined) data.memoFromTitle = memoFromTitle || null;
  if (memoDate) {
    try { data.memoDate = new Date(memoDate); } catch { /* keep default */ }
  }

  // Store rich data as JSON in memoThrough
  // We pack extra fields (signatures, department, position, delegation, routing) alongside through persons
  const richJson: any = {};
  if (memoThrough) richJson.throughPersons = memoThrough;
  if (initiatorSignature) richJson.initiatorSignature = initiatorSignature;
  if (throughSignatures) richJson.throughSignatures = throughSignatures;
  if (recipientSignature) richJson.recipientSignature = recipientSignature;
  if (financeSignature) richJson.financeSignature = financeSignature;
  if (department) richJson.department = department;
  if (position) richJson.position = position;
  if (routingOrder) richJson.routingOrder = routingOrder;
  if (currentRoutingStep !== undefined) richJson.currentRoutingStep = currentRoutingStep;
  if (preparedBy) richJson.preparedBy = preparedBy;
  if (Object.keys(richJson).length > 0) data.memoThrough = richJson;

  // Financial fields — convert to number for Decimal columns
  if (procurementActivity !== undefined) data.procurementActivity = procurementActivity || null;
  if (budgetVote !== undefined) data.budgetVote = budgetVote || null;
  if (budgetedAmount !== undefined && budgetedAmount !== "") data.budgetedAmount = Number(budgetedAmount) || null;
  if (amountSpent !== undefined && amountSpent !== "") data.amountSpent = Number(amountSpent) || null;
  if (availableFunds !== undefined && availableFunds !== "") data.availableFunds = Number(availableFunds) || null;
  if (executiveName !== undefined) data.executiveName = executiveName || null;
  if (financialVerification !== undefined) data.financialVerification = financialVerification || null;
  if (budgetApproved !== undefined) data.budgetApproved = budgetApproved || null;
  if (financialComments !== undefined) data.financialComments = financialComments || null;
  if (executiveSignatureDate !== undefined && executiveSignatureDate) {
    try { data.executiveSignatureDate = new Date(executiveSignatureDate); } catch { data.executiveSignatureDate = null; }
  } else if (executiveSignatureDate !== undefined) {
    data.executiveSignatureDate = null;
  }
  if (executiveSignaturePath !== undefined) data.executiveSignaturePath = executiveSignaturePath || null;
  if (attachments !== undefined) data.attachments = attachments || null;

  return data;
}

function fromMemoRow(row: any) {
  // Unpack the rich JSON from memoThrough
  const rich = (typeof row.memoThrough === "string" ? JSON.parse(row.memoThrough) : row.memoThrough) || {};

  return {
    id: row.id,
    memoTo: row.memoTo,
    memoToTitle: row.memoToTitle,
    memoFrom: row.memoFrom,
    memoFromTitle: row.memoFromTitle,
    memoDate: row.memoDate?.toISOString?.()?.split("T")[0] || "",
    memoThrough: rich.throughPersons || [],
    subject: row.subject,
    purpose: row.purpose,
    recommendation: row.recommendation,
    // Financial
    procurementActivity: row.procurementActivity,
    budgetVote: row.budgetVote,
    budgetedAmount: row.budgetedAmount ? Number(row.budgetedAmount) : null,
    amountSpent: row.amountSpent ? Number(row.amountSpent) : null,
    availableFunds: row.availableFunds ? Number(row.availableFunds) : null,
    executiveName: row.executiveName,
    financialVerification: row.financialVerification,
    budgetApproved: row.budgetApproved,
    financialComments: row.financialComments,
    executiveSignatureDate: row.executiveSignatureDate,
    executiveSignaturePath: row.executiveSignaturePath,
    attachments: row.attachments,
    // Signatures & routing from rich JSON
    initiatorSignature: rich.initiatorSignature || null,
    throughSignatures: rich.throughSignatures || [],
    recipientSignature: rich.recipientSignature || null,
    financeSignature: rich.financeSignature || null,
    department: rich.department || "",
    position: rich.position || "",
    routingOrder: rich.routingOrder || null,
    currentRoutingStep: rich.currentRoutingStep ?? null,
    // Preparation
    preparedBy: rich.preparedBy || "",
    // Meta
    status: rich.realStatus || row.status,
    priority: row.priority,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const statusFilter = searchParams.get("status");
    const createdById = searchParams.get("createdById");

    const where: any = {};
    if (statusFilter) where.status = statusFilter;
    if (createdById) where.createdById = createdById;

    const rows = await prisma.memo.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const memos = rows.map(fromMemoRow);
    return NextResponse.json(memos);
  } catch (error: any) {
    console.error("Error fetching memos:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch memos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.createdById) {
      return NextResponse.json({ error: "createdById is required" }, { status: 400 });
    }

    const data = toMemoData(body);

    console.log("[Memo POST] Creating with data keys:", Object.keys(data));

    const row = await prisma.memo.create({ data });

    return NextResponse.json(fromMemoRow(row));
  } catch (error: any) {
    console.error("Error creating memo:", error?.message || error);
    console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    return NextResponse.json(
      { error: error?.message || String(error) || "Failed to create memo" },
      { status: 500 }
    );
  }
}
