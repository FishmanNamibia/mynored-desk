import { NextRequest, NextResponse } from "next/server";
import { autoAssignMemo, autoAssignAllPendingMemos } from "@/lib/memos/auto-assignment";
import { processAllEscalations } from "@/lib/memos/auto-escalation";

/**
 * Memo Automation API
 * 
 * Endpoints for automated memo management:
 * - Auto-assignment of memos to approvers
 * - Auto-escalation of overdue memos
 * - Batch processing
 */

/**
 * POST /api/memos/automation?action=assign
 * Auto-assign a specific memo or all pending memos
 * 
 * Body (for single memo):
 * {
 *   "memoId": "uuid",
 *   "stage": "SENIOR_REVIEW",
 *   "department": "Finance" // optional
 * }
 * 
 * Query params:
 * - action=assign|escalate|all
 * - batch=true (for batch processing)
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action") || "assign";
    const batch = searchParams.get("batch") === "true";

    if (action === "assign") {
      if (batch) {
        // Batch auto-assign all pending memos
        const result = await autoAssignAllPendingMemos();
        return NextResponse.json({
          success: true,
          action: "batch_assign",
          ...result,
        });
      } else {
        // Auto-assign a single memo
        const body = await request.json();
        const { memoId, stage, department } = body;

        if (!memoId || !stage) {
          return NextResponse.json(
            { error: "memoId and stage are required" },
            { status: 400 }
          );
        }

        const result = await autoAssignMemo(memoId, stage, department);
        return NextResponse.json({
          success: true,
          action: "assign",
          ...result,
        });
      }
    } else if (action === "escalate") {
      // Process escalations for all overdue memos
      const result = await processAllEscalations();
      return NextResponse.json({
        success: true,
        action: "escalate",
        ...result,
      });
    } else if (action === "all") {
      // Run all automation tasks
      const assignResult = await autoAssignAllPendingMemos();
      const escalateResult = await processAllEscalations();

      return NextResponse.json({
        success: true,
        action: "all",
        assignment: assignResult,
        escalation: escalateResult,
      });
    } else {
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("[Memo Automation] Error:", error);
    return NextResponse.json(
      { error: error.message || "Automation failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/memos/automation
 * Get automation status and statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { prisma } = await import("@/lib/pms/prisma");

    // Get counts of unassigned memos
    const unassignedCount = await prisma.memo.count({
      where: {
        currentAssigneeId: null,
        status: {
          // @ts-ignore
          notIn: ["REJECTED", "COMPLETED", "ARCHIVED", "DRAFT"],
        },
      },
    });

    // Get counts of overdue memos by stage
    const STAGE_SLA_HOURS: Record<string, number> = {
      SENIOR_REVIEW: 24,
      MANAGER_REVIEW: 48,
      EXECUTIVE_REVIEW: 72,
      FINANCIAL_IMPLICATION: 48,
      SG_APPROVAL: 72,
      PMU_PROCESSING: 120,
    };

    const now = new Date();
    const overdueByStage: Record<string, number> = {};

    for (const [stage, slaHours] of Object.entries(STAGE_SLA_HOURS)) {
      const slaDate = new Date(now.getTime() - slaHours * 60 * 60 * 1000);
      
      const count = await prisma.memo.count({
        where: {
          currentStage: stage as any,
          updatedAt: { lt: slaDate },
          status: {
            // @ts-ignore
            notIn: ["REJECTED", "COMPLETED", "ARCHIVED", "DRAFT"],
          },
        },
      });

      overdueByStage[stage] = count;
    }

    const totalOverdue = Object.values(overdueByStage).reduce((sum, count) => sum + count, 0);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      unassigned: {
        count: unassignedCount,
        needsAction: unassignedCount > 0,
      },
      overdue: {
        total: totalOverdue,
        byStage: overdueByStage,
        needsAction: totalOverdue > 0,
      },
      recommendations: {
        runAssignment: unassignedCount > 0,
        runEscalation: totalOverdue > 0,
      },
    });
  } catch (error: any) {
    console.error("[Memo Automation] Status error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get automation status" },
      { status: 500 }
    );
  }
}
