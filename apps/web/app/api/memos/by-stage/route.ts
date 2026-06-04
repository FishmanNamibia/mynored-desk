import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/pms/prisma";
import { getAuthenticatedUser } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const stage = searchParams.get("stage");

    if (!stage) {
      return NextResponse.json({ error: "Stage parameter required" }, { status: 400 });
    }

    // Map stage to valid MemoStatus enum values
    const stageStatusMap: Record<string, string[]> = {
      INITIATOR_REVIEW: [
        "RETURNED_BY_MANAGER", 
        "RETURNED_BY_SENIOR", 
        "RETURNED_BY_EXECUTIVE", 
        "RETURNED_BY_FINANCE",
        "RETURNED_BY_SG",
        "DRAFT"
      ],
      MANAGER_REVIEW: ["SUBMITTED_TO_MANAGER"],
      SUBMITTED_TO_MANAGER: ["SUBMITTED_TO_MANAGER"],
      SENIOR_REVIEW: ["SUBMITTED_TO_SENIOR"],
      SUBMITTED_TO_SENIOR: ["SUBMITTED_TO_SENIOR"],
      EXECUTIVE_REVIEW: ["SUBMITTED_TO_EXECUTIVE"],
      SUBMITTED_TO_EXECUTIVE: ["SUBMITTED_TO_EXECUTIVE"],
      PMU_REVIEW: ["PENDING_FINANCIAL_REVIEW", "PENDING_FINANCE_APPROVAL"],
      PENDING_PMU_REVIEW: ["PENDING_FINANCIAL_REVIEW", "PENDING_FINANCE_APPROVAL"],
      SG_REVIEW: ["PENDING_SG_APPROVAL"],
      SG_APPROVAL: ["PENDING_SG_APPROVAL"],
      PENDING_SG_APPROVAL: ["PENDING_SG_APPROVAL"],
      RETURNED_TO_INITIATOR: [
        "RETURNED_BY_MANAGER", 
        "RETURNED_BY_SENIOR", 
        "RETURNED_BY_EXECUTIVE", 
        "RETURNED_BY_FINANCE",
        "RETURNED_BY_SG"
      ],
    };

    const statuses = stageStatusMap[stage] || [stage];

    const memos = await prisma.memo.findMany({
      where: {
        status: { in: statuses as any },
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
    });

    // Map createdBy to creator for frontend compatibility
    const mappedMemos = memos.map(memo => ({
      ...memo,
      creator: memo.createdBy,
    }));

    return NextResponse.json(mappedMemos);
  } catch (error) {
    console.error("Error fetching memos by stage:", error);
    return NextResponse.json({ error: "Failed to fetch memos" }, { status: 500 });
  }
}
