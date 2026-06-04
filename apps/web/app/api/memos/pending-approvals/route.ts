import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/pms/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const approverId = searchParams.get("approverId");

    if (!approverId) {
      return NextResponse.json(
        { error: "approverId is required" },
        { status: 400 }
      );
    }

    // Valid pending statuses from MemoStatus enum
    const pendingStatuses = [
      "PENDING",
      "SUBMITTED_TO_MANAGER",
      "SUBMITTED_TO_SENIOR",
      "SUBMITTED_TO_EXECUTIVE",
      "PENDING_FINANCIAL_REVIEW",
      "PENDING_FINANCE_APPROVAL",
      "PENDING_SG_APPROVAL",
      "UNDER_REVIEW",
    ];

    const memos = await prisma.memo.findMany({
      where: {
        status: { in: pendingStatuses as any },
      },
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
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Map for frontend compatibility
    const mappedMemos = memos.map(memo => ({
      ...memo,
      memoFrom: memo.memoFrom,
      currentApprovalStep: {
        stepLabel: memo.status.replace(/_/g, " "),
      },
    }));

    return NextResponse.json(mappedMemos);
  } catch (error: any) {
    console.error("Error fetching pending approvals:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch pending approvals" },
      { status: 500 }
    );
  }
}
