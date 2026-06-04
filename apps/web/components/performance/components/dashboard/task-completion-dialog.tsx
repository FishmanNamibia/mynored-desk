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

interface TaskCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: any;
  onComplete: (data: {
    staffRating: number;
    evidenceUrl: string;
    evidenceNotes: string;
  }) => Promise<void>;
}

export function TaskCompletionDialog({
  open,
  onOpenChange,
  task,
  onComplete,
}: TaskCompletionDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceNotes, setEvidenceNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: "Please provide a rating", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await onComplete({
        staffRating: rating,
        evidenceUrl,
        evidenceNotes,
      });
      onOpenChange(false);
      // Reset form
      setRating(0);
      setEvidenceUrl("");
      setEvidenceNotes("");
    } catch (error) {
      console.error("Failed to complete task:", error);
      toast({
        title: "Failed to submit task completion",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Complete Task</DialogTitle>
          <DialogDescription>
            Submit your completed task with evidence and rating for supervisor
            approval
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-sm mb-2">{task?.title}</h4>
            <p className="text-xs text-gray-600">{task?.description}</p>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label>Rate Your Performance (1-5) *</Label>
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

          {/* Evidence URL */}
          <div className="space-y-2">
            <Label htmlFor="evidenceUrl">Evidence (Link/URL)</Label>
            <Input
              id="evidenceUrl"
              placeholder="https://drive.google.com/... or file path"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Provide a link to documents, files, or other evidence of
              completion
            </p>
          </div>

          {/* Evidence Notes */}
          <div className="space-y-2">
            <Label htmlFor="evidenceNotes">Evidence Description *</Label>
            <Textarea
              id="evidenceNotes"
              placeholder="Describe what you accomplished and provide details about the evidence..."
              value={evidenceNotes}
              onChange={(e) => setEvidenceNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || rating === 0 || !evidenceNotes}
          >
            {submitting ? "Submitting..." : "Submit for Approval"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
