"use client";

import { EnhancedRoleReviewPage } from "@/components/memos/enhanced-role-review-page";
import { Users } from "lucide-react";

export default function ManagerReviewPage() {
  return (
    <EnhancedRoleReviewPage
      config={{
        stage: "SUBMITTED_TO_MANAGER",
        role: "Manager",
        label: "Manager Review",
        description: "Memos from your team requiring managerial review and approval.",
        color: "#ea580c",
        Icon: Users,
        canApprove: true,
        canReturn: true,
        canReject: false,
        approveLabel: "Approve & Forward to Senior",
        returnLabel: "Return to Initiator",
        guidance: "Review the memo for operational feasibility and team impact. Approve and forward to Senior level, or return to initiator with feedback for revision.",
        slaHours: 48,
        nextStage: "SUBMITTED_TO_SENIOR",
        previousStage: "DRAFT",
        keyResponsibilities: [
          "Verify operational feasibility and resource availability",
          "Assess impact on team workload and priorities",
          "Ensure alignment with divisional objectives",
          "Review budget estimates for accuracy",
          "Validate timeline and implementation plan",
        ],
        checklistItems: [
          "Request is operationally feasible",
          "Team has capacity to implement/support",
          "Budget estimates are reasonable",
          "Timeline is realistic and achievable",
          "All required supporting documents attached",
          "Risks and dependencies identified",
        ],
        tips: [
          "Consider team capacity and current workload",
          "Verify budget codes and cost centers are correct",
          "Flag urgent requests that need expedited processing",
          "Provide detailed feedback when returning to initiator",
        ],
      }}
    />
  );
}
