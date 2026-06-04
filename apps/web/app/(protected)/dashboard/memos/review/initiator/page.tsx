"use client";

import { EnhancedRoleReviewPage } from "@/components/memos/enhanced-role-review-page";
import { User } from "lucide-react";

export default function InitiatorReviewPage() {
  return (
    <EnhancedRoleReviewPage
      config={{
        stage: "RETURNED_TO_INITIATOR",
        role: "Initiator",
        label: "Initiator Review",
        description: "Memos returned to you for revision or additional information.",
        color: "#0891b2",
        Icon: User,
        canApprove: true,
        canReturn: false,
        canReject: true,
        approveLabel: "Resubmit to Manager",
        returnLabel: "",
        guidance: "Review the feedback provided and make necessary revisions. Resubmit the memo to continue the approval workflow, or withdraw if no longer needed.",
        slaHours: 48,
        nextStage: "SUBMITTED_TO_MANAGER",
        previousStage: undefined,
        keyResponsibilities: [
          "Address all feedback and comments from reviewers",
          "Update financial implications if changed",
          "Revise justification and supporting documentation",
          "Ensure all required information is complete",
          "Clarify any ambiguities identified by reviewers",
        ],
        checklistItems: [
          "All reviewer comments have been addressed",
          "Supporting documents updated if needed",
          "Financial figures are accurate and current",
          "Justification strengthened based on feedback",
          "Timeline remains realistic and achievable",
        ],
        tips: [
          "Read all comments carefully before making changes",
          "Contact reviewers directly if clarification needed",
          "Update the memo subject if scope has changed",
          "Consider withdrawing if the request is no longer valid",
        ],
      }}
    />
  );
}
