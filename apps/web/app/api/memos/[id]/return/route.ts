import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/pms/prisma";
import { getAuthenticatedUser } from "@/lib/server-auth";

// Map current status to appropriate "returned" status
const returnStatusMap: Record<string, string> = {
  SUBMITTED_TO_MANAGER: "RETURNED_BY_MANAGER",
  SUBMITTED_TO_SENIOR: "RETURNED_BY_SENIOR",
  SUBMITTED_TO_EXECUTIVE: "RETURNED_BY_EXECUTIVE",
  PENDING_FINANCIAL_REVIEW: "RETURNED_BY_FINANCE",
  PENDING_FINANCE_APPROVAL: "RETURNED_BY_FINANCE",
  PENDING_SG_APPROVAL: "RETURNED_BY_SG",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { comment } = body;

    const { user } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current memo
    const memo = await prisma.memo.findUnique({ where: { id } });
    if (!memo) {
      return NextResponse.json({ error: "Memo not found" }, { status: 404 });
    }

    // Determine return status based on current status
    const currentStatus = memo.status;
    const returnStatus = returnStatusMap[currentStatus] || "RETURNED_BY_MANAGER";

    // Update memo status to appropriate return state
    const updated = await prisma.memo.update({
      where: { id },
      data: {
        status: returnStatus as any,
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
      newStatus: returnStatus,
      message: "Memo returned to initiator",
    });
  } catch (error: any) {
    console.error("Error returning memo:", error);
    return NextResponse.json(
      { error: error.message || "Failed to return memo" },
      { status: 500 }
    );
  }
}
