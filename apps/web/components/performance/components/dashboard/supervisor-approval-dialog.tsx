"use client";

import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Star } from "lucide-react";

interface SupervisorApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: any;
  onApprove: (data: { supervisorRating: number }) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
}

export function SupervisorApprovalDialog({
  open,
  onOpenChange,
  task,
  onApprove,
  onReject,
}: SupervisorApprovalDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);

  const handleApprove = async () => {
    if (rating === 0) {
      toast({ title: "Please provide a rating", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    setAction("approve");
    try {
      await onApprove({ supervisorRating: rating });
      onOpenChange(false);
      setRating(0);
    } catch (error) {
      console.error("Failed to approve task:", error);
      toast({ title: "Failed to approve task", variant: "destructive" });
    } finally {
      setSubmitting(false);
      setAction(null);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    setAction("reject");
    try {
      await onReject(rejectionReason);
      onOpenChange(false);
      setRejectionReason("");
    } catch (error) {
      console.error("Failed to reject task:", error);
      toast({ title: "Failed to reject task", variant: "destructive" });
    } finally {
      setSubmitting(false);
      setAction(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review Task Completion</DialogTitle>
          <DialogDescription>
            Review the staff member's work and approve or reject their
            submission
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-sm mb-2">{task?.title}</h4>
            <p className="text-xs text-gray-600 mb-3">{task?.description}</p>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-500">Submitted by:</span>
                <p className="font-medium">{task?.responsible?.name}</p>
              </div>
              <div>
                <span className="text-gray-500">Staff Rating:</span>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= (task?.staffRating || 0)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="ml-1">{task?.staffRating}/5</span>
                </div>
              </div>
            </div>
          </div>

          {/* Evidence */}
          <div className="space-y-2">
            <Label>Evidence Provided</Label>
            {task?.evidenceUrl && (
              <a
                href={task.evidenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline block"
              >
                {task.evidenceUrl}
              </a>
            )}
            <div className="bg-gray-50 p-3 rounded text-sm">
              {task?.evidenceNotes || "No notes provided"}
            </div>
          </div>

          {/* Supervisor Rating */}
          <div className="space-y-2">
            <Label>Your Rating (1-5) *</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoverRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-gray-600 self-center">
                  {rating}/5
                </span>
              )}
            </div>
          </div>

          {/* Rejection Reason */}
          <div className="space-y-2">
            <Label htmlFor="rejectionReason">
              Rejection Reason (if rejecting)
            </Label>
            <Textarea
              id="rejectionReason"
              placeholder="Provide a reason if you're rejecting this task..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleReject}
            disabled={submitting || !rejectionReason.trim()}
          >
            {submitting && action === "reject" ? "Rejecting..." : "Reject"}
          </Button>
          <Button onClick={handleApprove} disabled={submitting || rating === 0}>
            {submitting && action === "approve" ? "Approving..." : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
