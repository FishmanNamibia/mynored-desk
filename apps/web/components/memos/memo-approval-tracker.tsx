"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Clock,
  SkipForward,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Pen,
} from "lucide-react";
import { SignatureCapture } from "@/components/memos/signature-capture";

interface ApprovalStep {
  id: string;
  stepOrder: number;
  stepLabel: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED";
  comment?: string;
  decidedAt?: string;
  signaturePath?: string | null;
  approver: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    position?: string;
    jobTitle?: string;
  };
}

interface MemoApprovalTrackerProps {
  approvals: ApprovalStep[];
  memoId: string;
  memoStatus: string;
  currentUserId?: string;
  onAction?: () => void;
}

const statusConfig = {
  PENDING: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "Pending", badgeVariant: "outline" as const },
  APPROVED: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 border-green-200", label: "Approved", badgeVariant: "default" as const },
  REJECTED: { icon: XCircle, color: "text-red-600", bg: "bg-red-50 border-red-200", label: "Rejected", badgeVariant: "destructive" as const },
  SKIPPED: { icon: SkipForward, color: "text-gray-400", bg: "bg-gray-50 border-gray-200", label: "Skipped", badgeVariant: "secondary" as const },
};

export function MemoApprovalTracker({
  approvals,
  memoId,
  memoStatus,
  currentUserId,
  onAction,
}: MemoApprovalTrackerProps) {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [showSignature, setShowSignature] = useState(false);

  if (!approvals || approvals.length === 0) return null;

  const currentPendingStep = approvals.find((a) => a.status === "PENDING");
  const isCurrentApprover =
    currentPendingStep?.approver?.id === currentUserId && memoStatus === "PENDING";

  const handleApprove = async () => {
    if (!currentUserId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/memos/${memoId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approverId: currentUserId,
          comment: comment || undefined,
          signatureData: signatureData || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      setComment("");
      setShowComment(false);
      setSignatureData(null);
      setShowSignature(false);
      onAction?.();
    } catch {
      alert("Failed to approve memo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!currentUserId) return;
    if (!comment.trim()) {
      alert("Please provide a reason for rejection");
      setShowComment(true);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/memos/${memoId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approverId: currentUserId, comment }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      setComment("");
      setShowComment(false);
      onAction?.();
    } catch {
      alert("Failed to reject memo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const completedSteps = approvals.filter((a) => a.status === "APPROVED").length;
  const totalSteps = approvals.length;
  const progressPct = Math.round((completedSteps / totalSteps) * 100);

  return (
    <Card className="widget-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Approval Workflow</CardTitle>
          <Badge variant="outline" className="text-xs">
            {completedSteps}/{totalSteps} Complete
          </Badge>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {approvals.map((step, index) => {
          const config = statusConfig[step.status];
          const Icon = config.icon;
          const isActive = step === currentPendingStep && memoStatus === "PENDING";
          const approverName = [step.approver?.firstName, step.approver?.lastName]
            .filter(Boolean)
            .join(" ") || step.approver?.email || "Unknown";

          return (
            <div key={step.id}>
              <div
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  isActive ? "border-blue-300 bg-blue-50 ring-1 ring-blue-200" : config.bg
                }`}
              >
                <div className="flex flex-col items-center gap-1 pt-0.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center ${
                      isActive ? "bg-blue-100" : "bg-white"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : config.color}`} />
                  </div>
                  {index < approvals.length - 1 && (
                    <div className={`w-0.5 h-4 ${step.status === "APPROVED" ? "bg-green-300" : "bg-gray-200"}`} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Step {step.stepOrder}: {step.stepLabel}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {approverName}
                        {step.approver?.position && ` • ${step.approver.position}`}
                      </p>
                    </div>
                    <Badge variant={config.badgeVariant} className="shrink-0 text-xs">
                      {config.label}
                    </Badge>
                  </div>

                  {step.comment && (
                    <div className="mt-2 flex items-start gap-1.5 text-xs text-gray-600 bg-white rounded p-2 border border-gray-100">
                      <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{step.comment}</span>
                    </div>
                  )}

                  {(step.decidedAt || step.signaturePath) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {step.signaturePath && (
                        <div className="flex items-center gap-1.5">
                          <img
                            src={step.signaturePath}
                            alt="Signature"
                            className="h-8 border border-gray-200 rounded bg-white"
                          />
                          <span className="text-xs text-green-600 font-medium">Signed</span>
                        </div>
                      )}
                      {step.decidedAt && (
                        <p className="text-xs text-gray-400">
                          {new Date(step.decidedAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isCurrentApprover && (
          <div className="pt-3 border-t border-gray-200 space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-800">Your action is required</p>
              <p className="text-xs text-blue-600 mt-1">
                You are the current approver for this memo. Review the content and take action.
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-gray-600"
              onClick={() => setShowComment(!showComment)}
            >
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Add comment
              </span>
              {showComment ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>

            {showComment && (
              <Textarea
                placeholder="Add a comment (required for rejection)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-20 text-sm"
              />
            )}

            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-gray-600"
              onClick={() => setShowSignature(!showSignature)}
            >
              <span className="flex items-center gap-1.5">
                <Pen className="w-3.5 h-3.5" />
                Digital signature (optional)
              </span>
              {showSignature ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            {showSignature && (
              <SignatureCapture
                onCapture={(data) => setSignatureData(data)}
                onClear={() => setSignatureData(null)}
                disabled={isSubmitting}
              />
            )}
            {signatureData && (
              <p className="text-xs text-green-600">Signature will be attached when you approve.</p>
            )}

            <div className="flex gap-2">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={handleApprove}
                disabled={isSubmitting}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Approve
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                onClick={handleReject}
                disabled={isSubmitting}
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Reject
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
