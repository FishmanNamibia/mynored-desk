import { prisma } from "@/lib/pms/prisma";
import { createNotification } from "@/lib/pms/create-notification";

/**
 * Auto-Escalation Service for Overdue Memos
 * 
 * Automatically escalates memos that have exceeded SLA thresholds:
 * - Sends escalation notifications to supervisors
 * - Reassigns to backup approvers if needed
 * - Flags critical delays
 */

// SLA hours per stage
const STAGE_SLA_HOURS: Record<string, number> = {
  SENIOR_REVIEW: 24,
  MANAGER_REVIEW: 48,
  EXECUTIVE_REVIEW: 72,
  FINANCIAL_IMPLICATION: 48,
  SG_APPROVAL: 72,
  PMU_PROCESSING: 120,
};

// Escalation thresholds (percentage of SLA)
const ESCALATION_THRESHOLDS = {
  WARNING: 75, // 75% of SLA - send warning
  CRITICAL: 100, // 100% of SLA - escalate to supervisor
  SEVERE: 150, // 150% of SLA - reassign to backup
};

interface EscalationResult {
  memoId: string;
  subject: string;
  stage: string;
  ageHours: number;
  slaHours: number;
  escalationLevel: "none" | "warning" | "critical" | "severe";
  action: string;
  notificationsSent: number;
}

/**
 * Calculate memo age in hours
 */
function getMemoAgeHours(updatedAt: Date): number {
  return Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60));
}

/**
 * Get escalation level based on age and SLA
 */
function getEscalationLevel(ageHours: number, slaHours: number): "none" | "warning" | "critical" | "severe" {
  const percentage = (ageHours / slaHours) * 100;
  
  if (percentage >= ESCALATION_THRESHOLDS.SEVERE) return "severe";
  if (percentage >= ESCALATION_THRESHOLDS.CRITICAL) return "critical";
  if (percentage >= ESCALATION_THRESHOLDS.WARNING) return "warning";
  return "none";
}

/**
 * Find supervisor for a user
 */
async function findSupervisor(userId: string): Promise<{ id: string; email: string; name: string } | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      manager: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (user?.manager) {
    return {
      id: user.manager.id,
      email: user.manager.email,
      name: `${user.manager.firstName || ""} ${user.manager.lastName || ""}`.trim(),
    };
  }

  return null;
}

/**
 * Send escalation notification
 */
async function sendEscalationNotification(
  memoId: string,
  subject: string,
  stage: string,
  assigneeId: string,
  supervisorId: string,
  ageHours: number,
  slaHours: number,
  level: "warning" | "critical" | "severe"
): Promise<void> {
  const messages = {
    warning: `Memo "${subject}" at ${stage} is approaching SLA deadline (${ageHours}h / ${slaHours}h SLA)`,
    critical: `URGENT: Memo "${subject}" at ${stage} has exceeded SLA deadline (${ageHours}h / ${slaHours}h SLA)`,
    severe: `CRITICAL: Memo "${subject}" at ${stage} is severely overdue (${ageHours}h / ${slaHours}h SLA) - requires immediate attention`,
  };

  // Notify supervisor
  await createNotification({
    type: "MEMO_REMINDER",
    message: messages[level],
    receiverId: supervisorId,
    senderId: null,
    entityType: "MEMO",
    entityId: memoId,
    metadata: {
      escalationLevel: level,
      stage,
      ageHours,
      slaHours,
      assigneeId,
    },
  });

  // Also send urgent reminder to assignee
  if (level === "critical" || level === "severe") {
    await createNotification({
      type: "MEMO_REMINDER",
      message: `${messages[level]} - Your supervisor has been notified.`,
      receiverId: assigneeId,
      senderId: null,
      entityType: "MEMO",
      entityId: memoId,
      metadata: {
        escalationLevel: level,
        stage,
        ageHours,
        slaHours,
      },
    });
  }
}

/**
 * Find backup approver for a stage
 */
async function findBackupApprover(stage: string, currentAssigneeId: string): Promise<string | null> {
  const roleMap: Record<string, string[]> = {
    SENIOR_REVIEW: ["SENIOR_OFFICER", "SENIOR", "MANAGER"],
    MANAGER_REVIEW: ["MANAGER", "DEPARTMENT_MANAGER", "EXECUTIVE"],
    EXECUTIVE_REVIEW: ["EXECUTIVE", "EXECUTIVE_DIRECTOR", "ED"],
    FINANCIAL_IMPLICATION: ["FINANCE", "FINANCE_OFFICER", "CFO"],
    SG_APPROVAL: ["SG", "SECRETARY_GENERAL"],
    PMU_PROCESSING: ["PMU", "PMU_OFFICER", "PROCUREMENT"],
  };

  const roles = roleMap[stage];
  if (!roles) return null;

  // Find another user with the same role (excluding current assignee)
  const backupUser = await prisma.user.findFirst({
    where: {
      id: { not: currentAssigneeId },
      status: "ACTIVE",
      roles: {
        some: {
          role: {
            name: { in: roles },
          },
        },
      },
    },
    select: { id: true },
  });

  return backupUser?.id || null;
}

/**
 * Process escalation for a single memo
 */
async function processMemoEscalation(memo: {
  id: string;
  subject: string;
  currentStage: string;
  updatedAt: Date;
  currentAssigneeId: string | null;
  priority: string;
}): Promise<EscalationResult> {
  const slaHours = STAGE_SLA_HOURS[memo.currentStage] || 48;
  const ageHours = getMemoAgeHours(memo.updatedAt);
  const level = getEscalationLevel(ageHours, slaHours);

  const result: EscalationResult = {
    memoId: memo.id,
    subject: memo.subject,
    stage: memo.currentStage,
    ageHours,
    slaHours,
    escalationLevel: level,
    action: "none",
    notificationsSent: 0,
  };

  if (level === "none") {
    return result;
  }

  if (!memo.currentAssigneeId) {
    result.action = "No assignee - skipped escalation";
    return result;
  }

  // Find supervisor
  const supervisor = await findSupervisor(memo.currentAssigneeId);

  if (level === "warning" && supervisor) {
    // Send warning to supervisor
    await sendEscalationNotification(
      memo.id,
      memo.subject,
      memo.currentStage,
      memo.currentAssigneeId,
      supervisor.id,
      ageHours,
      slaHours,
      "warning"
    );
    result.action = `Warning sent to supervisor (${supervisor.name})`;
    result.notificationsSent = 1;
  } else if (level === "critical" && supervisor) {
    // Send critical alert to supervisor and assignee
    await sendEscalationNotification(
      memo.id,
      memo.subject,
      memo.currentStage,
      memo.currentAssigneeId,
      supervisor.id,
      ageHours,
      slaHours,
      "critical"
    );
    result.action = `Critical alert sent to supervisor (${supervisor.name}) and assignee`;
    result.notificationsSent = 2;
  } else if (level === "severe") {
    // Severe - try to reassign to backup
    const backupId = await findBackupApprover(memo.currentStage, memo.currentAssigneeId);
    
    if (backupId) {
      await prisma.memo.update({
        where: { id: memo.id },
        // @ts-ignore
        data: { currentAssigneeId: backupId },
      });

      // Notify backup approver
      await createNotification({
        type: "MEMO_PENDING_APPROVAL",
        message: `URGENT: Severely overdue memo "${memo.subject}" has been reassigned to you (${ageHours}h overdue)`,
        receiverId: backupId,
        senderId: null,
        entityType: "MEMO",
        entityId: memo.id,
        metadata: {
          escalationLevel: "severe",
          stage: memo.currentStage,
          ageHours,
          slaHours,
          reassignedFrom: memo.currentAssigneeId,
        },
      });

      // Notify supervisor if available
      if (supervisor) {
        await sendEscalationNotification(
          memo.id,
          memo.subject,
          memo.currentStage,
          backupId,
          supervisor.id,
          ageHours,
          slaHours,
          "severe"
        );
        result.notificationsSent = 2;
      } else {
        result.notificationsSent = 1;
      }

      result.action = `Reassigned to backup approver due to severe delay`;
    } else {
      // No backup available - send severe alert
      if (supervisor) {
        await sendEscalationNotification(
          memo.id,
          memo.subject,
          memo.currentStage,
          memo.currentAssigneeId,
          supervisor.id,
          ageHours,
          slaHours,
          "severe"
        );
        result.action = `Severe alert sent (no backup approver available)`;
        result.notificationsSent = 2;
      } else {
        result.action = `Severe delay detected but no supervisor or backup found`;
      }
    }
  }

  return result;
}

/**
 * Run escalation check for all pending memos
 */
export async function processAllEscalations(): Promise<{
  processed: number;
  escalated: number;
  results: EscalationResult[];
}> {
  const pendingMemos = await prisma.memo.findMany({
    where: {
      status: {
        // @ts-ignore
        notIn: ["REJECTED", "COMPLETED", "ARCHIVED", "DRAFT"],
      },
      currentStage: {
        in: Object.keys(STAGE_SLA_HOURS) as any,
      },
    },
    select: {
      id: true,
      subject: true,
      // @ts-ignore
      currentStage: true,
      updatedAt: true,
      currentAssigneeId: true,
      priority: true,
    },
  });

  const results: EscalationResult[] = [];
  let escalated = 0;

  for (const memo of pendingMemos) {
    // @ts-ignore
    const result = await processMemoEscalation(memo);
    results.push(result);
    
    if (result.escalationLevel !== "none") {
      escalated++;
    }
  }

  return {
    processed: pendingMemos.length,
    escalated,
    results,
  };
}
