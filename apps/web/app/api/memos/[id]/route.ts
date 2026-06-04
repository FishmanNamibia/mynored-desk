import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/pms/prisma";

function toMemoData(body: any) {
  const {
    createdById, memoTo, memoFrom, memoToTitle, memoFromTitle,
    memoDate, memoThrough, subject, purpose, recommendation,
    procurementActivity, budgetVote, budgetedAmount, amountSpent,
    availableFunds, executiveName, financialVerification, budgetApproved,
    financialComments, executiveSignatureDate, executiveSignaturePath,
    attachments, status, priority,
    initiatorSignature, throughSignatures, recipientSignature, financeSignature,
    department, position, routingOrder, currentRoutingStep,
    preparedBy,
    ...extra
  } = body;

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
  let rich: any = {};
  try {
    rich = (typeof row.memoThrough === "string" ? JSON.parse(row.memoThrough) : row.memoThrough) || {};
  } catch {
    rich = {};
  }

  return {
    id: row.id,
    title: row.title || "",
    content: row.content || "",
    memoTo: row.memoTo || "",
    memoToTitle: row.memoToTitle || "",
    memoFrom: row.memoFrom || "",
    memoFromTitle: row.memoFromTitle || "",
    memoDate: row.memoDate?.toISOString?.()?.split("T")[0] || "",
    memoThrough: rich.throughPersons || [],
    subject: row.subject || "",
    purpose: row.purpose || "",
    recommendation: row.recommendation || "",
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
    initiatorSignature: rich.initiatorSignature || null,
    throughSignatures: rich.throughSignatures || [],
    recipientSignature: rich.recipientSignature || null,
    financeSignature: rich.financeSignature || null,
    department: rich.department || "",
    position: rich.position || "",
    routingOrder: rich.routingOrder || null,
    currentRoutingStep: rich.currentRoutingStep ?? null,
    preparedBy: rich.preparedBy || "",
    status: row.status,
    priority: row.priority,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy || null,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log("[Memo GET] Fetching memo with id:", id);
    
    const row = await prisma.memo.findUnique({ 
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            departmentName: true,
          },
        },
      },
    });

    if (!row) {
      return NextResponse.json({ error: "Memo not found" }, { status: 404 });
    }

    return NextResponse.json(fromMemoRow(row));
  } catch (error: any) {
    console.error("Error fetching memo:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch memo" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = toMemoData(body);

    const row = await prisma.memo.update({
      where: { id },
      data,
    });

    return NextResponse.json(fromMemoRow(row));
  } catch (error: any) {
    console.error("Error updating memo:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update memo" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.memo.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting memo:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete memo" },
      { status: 500 }
    );
  }
}
