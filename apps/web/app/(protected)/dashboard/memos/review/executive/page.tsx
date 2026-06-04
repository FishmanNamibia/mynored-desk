"use client";

import { EnhancedRoleReviewPage } from "@/components/memos/enhanced-role-review-page";
import { Briefcase } from "lucide-react";

export default function ExecutiveReviewPage() {
  return (
    <EnhancedRoleReviewPage
      config={{
        stage: "SUBMITTED_TO_EXECUTIVE",
        role: "Executive",
        label: "Executive Review",
        description: "Memos requiring executive-level review and approval before PMU/SG.",
        color: "#7c3aed",
        Icon: Briefcase,
        canApprove: true,
        canReturn: true,
        canReject: false,
        approveLabel: "Approve & Forward to PMU",
        returnLabel: "Return to Senior",
        guidance: "Review the memo for strategic alignment and departmental impact. Approve and forward to PMU for compliance review, or return to Senior with feedback.",
        slaHours: 72,
        nextStage: "PENDING_PMU_REVIEW",
        previousStage: "SUBMITTED_TO_SENIOR",
        keyResponsibilities: [
          "Assess strategic alignment with departmental goals",
          "Evaluate resource requirements and impact",
          "Verify compliance with organizational policies",
          "Review financial implications at high level",
          "Ensure proper documentation and justification",
        ],
        checklistItems: [
          "Memo aligns with departmental strategic objectives",
          "Resource requirements are reasonable and justified",
          "All necessary approvals from lower levels obtained",
          "Financial implications are clearly stated",
          "Supporting documentation is complete",
          "Risks and mitigation strategies are identified",
        ],
        tips: [
          "Consider long-term implications beyond immediate request",
          "Verify alignment with annual departmental plans",
          "Flag memos that may require Board or SG special attention",
          "Add executive perspective in comments for PMU and SG",
        ],
      }}
    />
  );
}
