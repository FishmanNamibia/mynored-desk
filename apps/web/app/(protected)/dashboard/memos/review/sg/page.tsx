"use client";

import { EnhancedRoleReviewPage } from "@/components/memos/enhanced-role-review-page";
import { Crown } from "lucide-react";

export default function SGReviewPage() {
  return (
    <EnhancedRoleReviewPage
      config={{
        stage: "PENDING_SG_APPROVAL",
        role: "Chief Executive Officer",
        label: "CEO Final Approval",
        description: "Memos requiring final approval from the Chief Executive Officer.",
        color: "#b91c1c",
        Icon: Crown,
        canApprove: true,
        canReturn: true,
        canReject: true,
        approveLabel: "Grant Final Approval",
        returnLabel: "Return for Revision",
        guidance: "Provide final approval or rejection for the memo. This is the final decision point in the workflow.",
        slaHours: 72,
        nextStage: "APPROVED",
        previousStage: "PENDING_PMU_REVIEW",
        keyResponsibilities: [
          "Make final decision on memo approval",
          "Assess strategic and organizational impact",
          "Ensure alignment with NORED strategy and service delivery goals",
          "Verify all prior approvals are in order",
          "Consider budget and resource implications",
        ],
        checklistItems: [
          "All required approvals obtained",
          "Financial implications certified",
          "Strategic alignment confirmed",
          "Risk assessment completed",
          "Implementation plan is sound",
          "Budget availability confirmed",
        ],
        tips: [
          "Consider long-term organizational impact",
          "Review all comments from prior reviewers",
          "Flag memos requiring Board notification",
          "Provide clear guidance when returning memos",
        ],
      }}
    />
  );
}
