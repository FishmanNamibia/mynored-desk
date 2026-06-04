"use client";

import { EnhancedRoleReviewPage } from "@/components/memos/enhanced-role-review-page";
import { Award } from "lucide-react";

export default function SeniorReviewPage() {
  return (
    <EnhancedRoleReviewPage
      config={{
        stage: "SUBMITTED_TO_SENIOR",
        role: "Senior Officer",
        label: "Senior Review",
        description: "Memos requiring senior officer review before executive approval.",
        color: "#dc2626",
        Icon: Award,
        canApprove: true,
        canReturn: true,
        canReject: false,
        approveLabel: "Approve & Forward to Executive",
        returnLabel: "Return to Manager",
        guidance: "Review the memo for technical accuracy and completeness. Approve and forward to Executive, or return to Manager with feedback.",
        slaHours: 24,
        nextStage: "SUBMITTED_TO_EXECUTIVE",
        previousStage: "SUBMITTED_TO_MANAGER",
        keyResponsibilities: [
          "Verify technical accuracy and feasibility",
          "Ensure completeness of information",
          "Check alignment with technical standards",
          "Review supporting documentation quality",
          "Assess resource requirements",
        ],
        checklistItems: [
          "Technical details are accurate",
          "All required information is complete",
          "Supporting documents are attached",
          "Justification is clear and sufficient",
          "Timeline is realistic",
          "Budget estimates are reasonable",
        ],
        tips: [
          "Focus on technical accuracy and completeness",
          "Provide constructive feedback when returning",
          "Flag urgent requests for expedited processing",
          "Consult with initiator if clarification needed",
        ],
      }}
    />
  );
}
