import { prisma } from "@/lib/pms/prisma";

/**
 * Auto-Assignment Service for Memo Workflow
 * 
 * Automatically assigns memos to the appropriate approvers based on:
 * - Workflow stage
 * - Department hierarchy
 * - User roles
 * - Workload balancing
 */

// Stage to role mapping for auto-assignment
const STAGE_TO_ROLE_HIERARCHY: Record<string, { primary: string[]; fallback: string[] }> = {
  SENIOR_REVIEW: {
    primary: ["SENIOR_OFFICER", "SENIOR"],
    fallback: ["MANAGER"],
  },
  MANAGER_REVIEW: {
    primary: ["MANAGER", "DEPARTMENT_MANAGER"],
    fallback: ["EXECUTIVE"],
  },
  EXECUTIVE_REVIEW: {
    primary: ["EXECUTIVE", "EXECUTIVE_DIRECTOR", "ED"],
    fallback: ["SG"],
  },
  FINANCIAL_IMPLICATION: {
    primary: ["FINANCE", "FINANCE_OFFICER", "CFO"],
    fallback: ["EXECUTIVE"],
  },
  SG_APPROVAL: {
    primary: ["SG", "SECRETARY_GENERAL"],
    fallback: [], // No fallback - SG is mandatory
  },
  PMU_PROCESSING: {
    primary: ["PMU", "PMU_OFFICER", "PROCUREMENT"],
    fallback: ["MANAGER"],
  },
};

interface AssignmentResult {
  assigneeId: string | null;
  assigneeName: string;
  assignmentMethod: "department_match" | "role_match" | "workload_balance" | "fallback" | "none";
  reason: string;
}

/**
 * Get users with specific roles, optionally filtered by department
 */
async function getUsersByRole(
  roleNames: string[],
  departmentName?: string
): Promise<Array<{ id: string; firstName: string | null; lastName: string | null; departmentName: string | null; email: string }>> {
  const where: any = {
    status: "ACTIVE",
    roles: {
      some: {
        role: {
          name: { in: roleNames },
        },
      },
    },
  };

  if (departmentName) {
    where.departmentName = { contains: departmentName, mode: "insensitive" };
  }

  return prisma.user.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      departmentName: true,
      email: true,
    },
  });
}

/**
 * Get current workload for users (count of pending memos assigned to them)
 */
async function getUserWorkloads(userIds: string[]): Promise<Map<string, number>> {
  const workloads = await prisma.memo.groupBy({
    // @ts-ignore
    by: ["currentAssigneeId"],
    where: {
      currentAssigneeId: { in: userIds },
      status: {
        // @ts-ignore
        notIn: ["REJECTED", "COMPLETED", "ARCHIVED"],
      },
    },
    _count: true,
  });

  const workloadMap = new Map<string, number>();
  workloads.forEach((w) => {
    // @ts-ignore
    if (w.currentAssigneeId) {
      // @ts-ignore
      workloadMap.set(w.currentAssigneeId, w._count);
    }
  });

  // Initialize users with no workload
  userIds.forEach((id) => {
    if (!workloadMap.has(id)) {
      workloadMap.set(id, 0);
    }
  });

  return workloadMap;
}

/**
 * Select the best assignee based on workload balancing
 */
function selectByWorkload(
  users: Array<{ id: string; firstName: string | null; lastName: string | null }>,
  workloads: Map<string, number>
): { id: string; name: string } | null {
  if (users.length === 0) return null;

  // Sort by workload (ascending) and pick the user with least workload
  const sorted = users.sort((a, b) => {
    const workloadA = workloads.get(a.id) || 0;
    const workloadB = workloads.get(b.id) || 0;
    return workloadA - workloadB;
  });

  const selected = sorted[0];
  return {
    id: selected.id,
    name: `${selected.firstName || ""} ${selected.lastName || ""}`.trim() || selected.id,
  };
}

/**
 * Auto-assign a memo to the appropriate approver
 */
export async function autoAssignMemo(
  memoId: string,
  stage: string,
  initiatorDepartment?: string
): Promise<AssignmentResult> {
  const roleConfig = STAGE_TO_ROLE_HIERARCHY[stage];
  
  if (!roleConfig) {
    return {
      assigneeId: null,
      assigneeName: "Unknown",
      assignmentMethod: "none",
      reason: `No role configuration for stage: ${stage}`,
    };
  }

  // Try to find users in the same department first (for better context)
  if (initiatorDepartment) {
    const deptUsers = await getUsersByRole(roleConfig.primary, initiatorDepartment);
    if (deptUsers.length > 0) {
      const workloads = await getUserWorkloads(deptUsers.map((u) => u.id));
      const selected = selectByWorkload(deptUsers, workloads);
      
      if (selected) {
        await prisma.memo.update({
          where: { id: memoId },
          // @ts-ignore
          data: { currentAssigneeId: selected.id },
        });

        return {
          assigneeId: selected.id,
          assigneeName: selected.name,
          assignmentMethod: "department_match",
          reason: `Assigned to ${selected.name} from same department with lowest workload`,
        };
      }
    }
  }

  // Fall back to any user with the primary role
  const primaryUsers = await getUsersByRole(roleConfig.primary);
  if (primaryUsers.length > 0) {
    const workloads = await getUserWorkloads(primaryUsers.map((u) => u.id));
    const selected = selectByWorkload(primaryUsers, workloads);
    
    if (selected) {
      await prisma.memo.update({
        where: { id: memoId },
        // @ts-ignore
        data: { currentAssigneeId: selected.id },
      });

      return {
        assigneeId: selected.id,
        assigneeName: selected.name,
        assignmentMethod: "role_match",
        reason: `Assigned to ${selected.name} with role match and lowest workload`,
      };
    }
  }

  // Try fallback roles if primary not available
  if (roleConfig.fallback.length > 0) {
    const fallbackUsers = await getUsersByRole(roleConfig.fallback);
    if (fallbackUsers.length > 0) {
      const workloads = await getUserWorkloads(fallbackUsers.map((u) => u.id));
      const selected = selectByWorkload(fallbackUsers, workloads);
      
      if (selected) {
        await prisma.memo.update({
          where: { id: memoId },
          // @ts-ignore
          data: { currentAssigneeId: selected.id },
        });

        return {
          assigneeId: selected.id,
          assigneeName: selected.name,
          assignmentMethod: "fallback",
          reason: `Assigned to ${selected.name} (fallback role) - primary role users not available`,
        };
      }
    }
  }

  return {
    assigneeId: null,
    assigneeName: "Unassigned",
    assignmentMethod: "none",
    reason: `No available users found for stage ${stage}`,
  };
}

/**
 * Batch auto-assign all unassigned memos
 */
export async function autoAssignAllPendingMemos(): Promise<{
  processed: number;
  assigned: number;
  failed: number;
  results: AssignmentResult[];
}> {
  const unassignedMemos = await prisma.memo.findMany({
    where: {
      currentAssigneeId: null,
      status: {
        // @ts-ignore
        notIn: ["REJECTED", "COMPLETED", "ARCHIVED", "DRAFT"],
      },
    },
    include: {
      createdBy: {
        select: { departmentName: true },
      },
    },
  });

  const results: AssignmentResult[] = [];
  let assigned = 0;
  let failed = 0;

  for (const memo of unassignedMemos) {
    const result = await autoAssignMemo(
      memo.id,
      // @ts-ignore
      memo.currentStage,
      // @ts-ignore
      memo.createdBy?.departmentName || undefined
    );
    
    results.push(result);
    
    if (result.assigneeId) {
      assigned++;
    } else {
      failed++;
    }
  }

  return {
    processed: unassignedMemos.length,
    assigned,
    failed,
    results,
  };
}
