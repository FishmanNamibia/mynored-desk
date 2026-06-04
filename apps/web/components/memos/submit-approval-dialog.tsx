"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Send, Plus, X, Search, Loader2, Users } from "lucide-react";

interface ApproverStep {
  approverId: string;
  stepLabel: string;
  approverName: string;
}

interface UserOption {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  position?: string;
  jobTitle?: string;
}

interface SubmitApprovalDialogProps {
  memoId: string;
  memoThrough?: Array<{ name: string; title: string }>;
  onSubmitted?: () => void;
  children?: React.ReactNode;
}

export function SubmitApprovalDialog({
  memoId,
  memoThrough,
  onSubmitted,
  children,
}: SubmitApprovalDialogProps) {
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<ApproverStep[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);

  useEffect(() => {
    if (open && steps.length === 0) {
      const initialSteps: ApproverStep[] = [];
      if (memoThrough && memoThrough.length > 0) {
        memoThrough.forEach((person, i) => {
          initialSteps.push({
            approverId: "",
            stepLabel: person.title || `Through ${person.name}`,
            approverName: person.name,
          });
        });
      }
      initialSteps.push({
        approverId: "",
        stepLabel: "Final Approval",
        approverName: "",
      });
      setSteps(initialSteps);
    }
  }, [open, memoThrough, steps.length]);

  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(query)}&limit=8`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : data.data || []);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const selectApprover = (stepIndex: number, user: UserOption) => {
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
    setSteps((prev) =>
      prev.map((s, i) =>
        i === stepIndex ? { ...s, approverId: user.id, approverName: name } : s
      )
    );
    setSearchQuery("");
    setSearchResults([]);
    setActiveStepIndex(null);
  };

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      { approverId: "", stepLabel: `Approval Step ${prev.length + 1}`, approverName: "" },
    ]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStepLabel = (index: number, label: string) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, stepLabel: label } : s)));
  };

  const handleSubmit = async () => {
    const invalid = steps.find((s) => !s.approverId);
    if (invalid) {
      setError("Please select an approver for every step");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/memos/${memoId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approverSteps: steps.map((s) => ({
            approverId: s.approverId,
            stepLabel: s.stepLabel,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit");
      }

      setOpen(false);
      onSubmitted?.();
    } catch (err: any) {
      setError(err.message || "Failed to submit for approval");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button style={{ backgroundColor: "#2563eb" }}>
            <Send className="w-4 h-4 mr-2" />
            Submit for Approval
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit Memo for Approval</DialogTitle>
          <DialogDescription>
            Define the approval chain. The memo will be routed through each step in order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {steps.map((step, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase">
                  Step {index + 1}
                </span>
                {steps.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeStep(index)} className="h-6 w-6 p-0 text-red-500">
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              <Input
                placeholder="Step label (e.g., Director Approval)"
                value={step.stepLabel}
                onChange={(e) => updateStepLabel(index, e.target.value)}
                className="text-sm"
              />

              {step.approverId ? (
                <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="w-3.5 h-3.5 text-blue-700" />
                    </div>
                    <span className="text-sm font-medium">{step.approverName}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-gray-500"
                    onClick={() => {
                      setSteps((prev) =>
                        prev.map((s, i) =>
                          i === index ? { ...s, approverId: "", approverName: "" } : s
                        )
                      );
                    }}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search for approver..."
                      className="pl-9 text-sm"
                      value={activeStepIndex === index ? searchQuery : ""}
                      onFocus={() => setActiveStepIndex(index)}
                      onChange={(e) => {
                        setActiveStepIndex(index);
                        setSearchQuery(e.target.value);
                      }}
                    />
                  </div>
                  {activeStepIndex === index && searchResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-50 last:border-0"
                          onClick={() => selectApprover(index, user)}
                        >
                          <div className="font-medium">
                            {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}
                          </div>
                          <div className="text-xs text-gray-500">
                            {user.position || user.jobTitle || user.email}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {activeStepIndex === index && isSearching && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg p-3 text-center text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                      Searching...
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <Button variant="outline" size="sm" className="w-full border-dashed" onClick={addStep}>
            <Plus className="w-4 h-4 mr-2" />
            Add Approval Step
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} style={{ backgroundColor: "#2563eb" }}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
