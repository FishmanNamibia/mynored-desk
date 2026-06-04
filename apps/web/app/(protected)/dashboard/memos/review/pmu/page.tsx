"use client";

import { EnhancedRoleReviewPage } from "@/components/memos/enhanced-role-review-page";
import { FileCheck } from "lucide-react";

export default function PMUReviewPage() {
  return (
    <EnhancedRoleReviewPage
      config={{
        stage: "PENDING_PMU_REVIEW",
        role: "PMU Officer",
        label: "PMU Review",
        description: "Memos requiring PMU review for procurement and administrative compliance.",
        color: "#0284c7",
        Icon: FileCheck,
        canApprove: true,
        canReturn: true,
        canReject: false,
        approveLabel: "Approve & Forward to SG",
        returnLabel: "Return to Executive",
        guidance: "Review the memo for procurement compliance and administrative requirements. Approve and forward to SG, or return with feedback.",
        slaHours: 48,
        nextStage: "PENDING_SG_APPROVAL",
        previousStage: "SUBMITTED_TO_EXECUTIVE",
        keyResponsibilities: [
          "Verify procurement category and threshold compliance",
          "Ensure proper vendor selection process followed",
          "Check administrative requirements and documentation",
          "Validate contract terms and conditions",
          "Assess compliance with procurement policies",
        ],
        checklistItems: [
          "Procurement category correctly identified",
          "Threshold limits are within policy",
          "Vendor selection process documented",
          "Required quotations/bids attached",
          "Contract terms comply with regulations",
          "Administrative approvals obtained",
        ],
        tips: [
          "Flag memos requiring tender board approval",
          "Verify supplier registration and compliance status",
          "Check for sole source justification if applicable",
          "Ensure procurement timelines are realistic",
        ],
      }}
    />
  );
}
