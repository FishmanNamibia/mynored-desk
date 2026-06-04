import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/pms/prisma";
import { getAuthenticatedUser } from "@/lib/server-auth";

// Map current status to next status in the workflow
const statusProgressionMap: Record<string, string> = {
  DRAFT: "SUBMITTED_TO_MANAGER",
  PENDING: "SUBMITTED_TO_MANAGER",
  SUBMITTED_TO_MANAGER: "SUBMITTED_TO_SENIOR",
  SUBMITTED_TO_SENIOR: "SUBMITTED_TO_EXECUTIVE",
  SUBMITTED_TO_EXECUTIVE: "PENDING_FINANCIAL_REVIEW",
  PENDING_FINANCIAL_REVIEW: "PENDING_FINANCE_APPROVAL",
  PENDING_FINANCE_APPROVAL: "PENDING_SG_APPROVAL",
  PENDING_SG_APPROVAL: "APPROVED",
  UNDER_REVIEW: "APPROVED",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { user } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current memo
    const memo = await prisma.memo.findUnique({ where: { id } });
    if (!memo) {
      return NextResponse.json({ error: "Memo not found" }, { status: 404 });
    }

    // Determine next status
    const currentStatus = memo.status;
    const nextStatus = statusProgressionMap[currentStatus] || "APPROVED";

    // Update memo status
    const updated = await prisma.memo.update({
      where: { id },
      data: {
        status: nextStatus as any,
        updatedAt: new Date(),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      memo: updated,
      previousStatus: currentStatus,
      newStatus: nextStatus,
    });
  } catch (error: any) {
    console.error("Error approving memo:", error);
    return NextResponse.json(
      { error: error.message || "Failed to approve memo" },
      { status: 500 }
    );
  }
}
