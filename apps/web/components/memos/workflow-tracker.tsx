"use client";

import { useState, useEffect } from "react";
import { 
  FileText, 
  UserCheck, 
  Users, 
  Briefcase, 
  DollarSign, 
  Shield, 
  CheckCircle2,
  ArrowRight,
  Clock,
  Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type WorkflowType = "standard" | "procurement" | "financial" | "urgent";

export interface WorkflowStage {
  id: string;
  label: string;
  shortLabel: string;
  status: "completed" | "current" | "pending" | "skipped";
  role: string;
  icon: typeof FileText;
  description: string;
  slaHours: number;
  statusValues: string[]; // Corresponding MemoStatus values
}

const WORKFLOW_STAGES: Record<WorkflowType, WorkflowStage[]> = {
  standard: [
    {
      id: "DRAFT",
      label: "Draft",
      shortLabel: "Draft",
      status: "current",
      role: "Initiator",
      icon: FileText,
      description: "Memo is being drafted",
      slaHours: 0,
      statusValues: ["DRAFT"],
    },
    {
      id: "MANAGER_REVIEW",
      label: "Manager Review",
      shortLabel: "Manager",
      status: "pending",
      role: "Manager",
      icon: UserCheck,
      description: "Direct manager reviews and endorses",
      slaHours: 48,
      statusValues: ["SUBMITTED_TO_MANAGER", "PENDING"],
    },
    {
      id: "SENIOR_REVIEW",
      label: "Senior Manager Review",
      shortLabel: "Senior",
      status: "pending",
      role: "Senior Manager",
      icon: Users,
      description: "Senior manager reviews for policy compliance",
      slaHours: 24,
      statusValues: ["SUBMITTED_TO_SENIOR"],
    },
    {
      id: "EXECUTIVE_REVIEW",
      label: "Executive Review",
      shortLabel: "Executive",
      status: "pending",
      role: "Executive",
      icon: Briefcase,
      description: "Executive director provides departmental approval",
      slaHours: 72,
      statusValues: ["SUBMITTED_TO_EXECUTIVE"],
    },
    {
      id: "SG_APPROVAL",
      label: "CEO Approval",
      shortLabel: "CEO",
      status: "pending",
      role: "Chief Executive Officer",
      icon: Shield,
      description: "Final approval by the Chief Executive Officer",
      slaHours: 72,
      statusValues: ["PENDING_SG_APPROVAL"],
    },
    {
      id: "COMPLETED",
      label: "Completed",
      shortLabel: "Done",
      status: "pending",
      role: "System",
      icon: CheckCircle2,
      description: "Memo approved and processed",
      slaHours: 0,
      statusValues: ["APPROVED", "COMPLETED"],
    },
  ],
  procurement: [
    {
      id: "DRAFT",
      label: "Draft",
      shortLabel: "Draft",
      status: "current",
      role: "Initiator",
      icon: FileText,
      description: "Memo is being drafted",
      slaHours: 0,
      statusValues: ["DRAFT"],
    },
    {
      id: "MANAGER_REVIEW",
      label: "Manager Review",
      shortLabel: "Manager",
      status: "pending",
      role: "Manager",
      icon: UserCheck,
      description: "Direct manager reviews and endorses",
      slaHours: 48,
      statusValues: ["SUBMITTED_TO_MANAGER", "PENDING"],
    },
    {
      id: "SENIOR_REVIEW",
      label: "Senior Manager Review",
      shortLabel: "Senior",
      status: "pending",
      role: "Senior Manager",
      icon: Users,
      description: "Senior manager reviews for policy compliance",
      slaHours: 24,
      statusValues: ["SUBMITTED_TO_SENIOR"],
    },
    {
      id: "EXECUTIVE_REVIEW",
      label: "Executive Review",
      shortLabel: "Executive",
      status: "pending",
      role: "Executive",
      icon: Briefcase,
      description: "Executive director provides departmental approval",
      slaHours: 72,
      statusValues: ["SUBMITTED_TO_EXECUTIVE"],
    },
    {
      id: "FINANCIAL_REVIEW",
      label: "Financial Review",
      shortLabel: "Finance",
      status: "pending",
      role: "Finance Executive",
      icon: DollarSign,
      description: "Finance verifies budget availability",
      slaHours: 48,
      statusValues: ["PENDING_FINANCIAL_REVIEW", "PENDING_FINANCE_APPROVAL"],
    },
    {
      id: "SG_APPROVAL",
      label: "CEO Approval",
      shortLabel: "CEO",
      status: "pending",
      role: "Chief Executive Officer",
      icon: Shield,
      description: "Final approval by the Chief Executive Officer",
      slaHours: 72,
      statusValues: ["PENDING_SG_APPROVAL"],
    },
    {
      id: "PMU_PROCESSING",
      label: "PMU Processing",
      shortLabel: "PMU",
      status: "pending",
      role: "PMU Officer",
      icon: CheckCircle2,
      description: "Procurement Management Unit processes the request",
      slaHours: 120,
      statusValues: ["SENT_TO_PROCUREMENT"],
    },
    {
      id: "COMPLETED",
      label: "Completed",
      shortLabel: "Done",
      status: "pending",
      role: "System",
      icon: CheckCircle2,
      description: "Memo approved and processed",
      slaHours: 0,
      statusValues: ["APPROVED", "COMPLETED"],
    },
  ],
  financial: [
    {
      id: "DRAFT",
      label: "Draft",
      shortLabel: "Draft",
      status: "current",
      role: "Initiator",
      icon: FileText,
      description: "Memo is being drafted",
      slaHours: 0,
      statusValues: ["DRAFT"],
    },
    {
      id: "MANAGER_REVIEW",
      label: "Manager Review",
      shortLabel: "Manager",
      status: "pending",
      role: "Manager",
      icon: UserCheck,
      description: "Direct manager reviews and endorses",
      slaHours: 48,
      statusValues: ["SUBMITTED_TO_MANAGER", "PENDING"],
    },
    {
      id: "FINANCIAL_REVIEW",
      label: "Financial Review",
      shortLabel: "Finance",
      status: "pending",
      role: "Finance Executive",
      icon: DollarSign,
      description: "Finance verifies budget availability",
      slaHours: 48,
      statusValues: ["PENDING_FINANCIAL_REVIEW", "PENDING_FINANCE_APPROVAL"],
    },
    {
      id: "EXECUTIVE_REVIEW",
      label: "Executive Review",
      shortLabel: "Executive",
      status: "pending",
      role: "Executive",
      icon: Briefcase,
      description: "Executive director provides approval",
      slaHours: 72,
      statusValues: ["SUBMITTED_TO_EXECUTIVE"],
    },
    {
      id: "SG_APPROVAL",
      label: "CEO Approval",
      shortLabel: "CEO",
      status: "pending",
      role: "Chief Executive Officer",
      icon: Shield,
      description: "Final approval by the Chief Executive Officer",
      slaHours: 72,
      statusValues: ["PENDING_SG_APPROVAL"],
    },
    {
      id: "COMPLETED",
      label: "Completed",
      shortLabel: "Done",
      status: "pending",
      role: "System",
      icon: CheckCircle2,
      description: "Memo approved and processed",
      slaHours: 0,
      statusValues: ["APPROVED", "COMPLETED"],
    },
  ],
  urgent: [
    {
      id: "DRAFT",
      label: "Draft",
      shortLabel: "Draft",
      status: "current",
      role: "Initiator",
      icon: FileText,
      description: "Memo is being drafted",
      slaHours: 0,
      statusValues: ["DRAFT"],
    },
    {
      id: "EXECUTIVE_REVIEW",
      label: "Executive Review",
      shortLabel: "Executive",
      status: "pending",
      role: "Executive",
      icon: Briefcase,
      description: "Direct executive approval (urgent path)",
      slaHours: 24,
      statusValues: ["SUBMITTED_TO_EXECUTIVE"],
    },
    {
      id: "SG_APPROVAL",
      label: "CEO Approval",
      shortLabel: "CEO",
      status: "pending",
      role: "Chief Executive Officer",
      icon: Shield,
      description: "Final approval by the Chief Executive Officer",
      slaHours: 24,
      statusValues: ["PENDING_SG_APPROVAL"],
    },
    {
      id: "COMPLETED",
      label: "Completed",
      shortLabel: "Done",
      status: "pending",
      role: "System",
      icon: CheckCircle2,
      description: "Memo approved and processed",
      slaHours: 0,
      statusValues: ["APPROVED", "COMPLETED"],
    },
  ],
};

const WORKFLOW_INFO: Record<WorkflowType, { title: string; description: string; color: string }> = {
  standard: {
    title: "Standard Workflow",
    description: "Full review chain: Manager → Senior → Executive → CEO",
    color: "bg-blue-500",
  },
  procurement: {
    title: "Procurement Workflow",
    description: "Includes financial review and PMU processing",
    color: "bg-purple-500",
  },
  financial: {
    title: "Financial Workflow",
    description: "Requires finance verification before executive approval",
    color: "bg-green-500",
  },
  urgent: {
    title: "Urgent Workflow",
    description: "Fast-tracked: Executive → CEO (requires HIGH priority)",
    color: "bg-red-500",
  },
};

interface WorkflowTrackerProps {
  workflowType: WorkflowType;
  currentStatus?: string;
  compact?: boolean;
  showInfo?: boolean;
  onWorkflowChange?: (type: WorkflowType) => void;
  editable?: boolean;
}

export function WorkflowTracker({
  workflowType,
  currentStatus = "DRAFT",
  compact = false,
  showInfo = true,
  onWorkflowChange,
  editable = false,
}: WorkflowTrackerProps) {
  const stages = WORKFLOW_STAGES[workflowType];
  const workflowInfo = WORKFLOW_INFO[workflowType];
  
  // Determine the current stage index based on status
  const getCurrentStageIndex = () => {
    for (let i = 0; i < stages.length; i++) {
      if (stages[i].statusValues.includes(currentStatus)) {
        return i;
      }
    }
    return 0;
  };

  const currentStageIndex = getCurrentStageIndex();

  // Calculate estimated completion time
  const estimatedHours = stages
    .slice(currentStageIndex)
    .reduce((total, stage) => total + stage.slaHours, 0);

  const formatDuration = (hours: number) => {
    if (hours < 24) return `${hours} hours`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) return `${days} day${days > 1 ? "s" : ""}`;
    return `${days} day${days > 1 ? "s" : ""} ${remainingHours}h`;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const isCompleted = index < currentStageIndex;
          const isCurrent = index === currentStageIndex;
          const isPending = index > currentStageIndex;

          return (
            <div key={stage.id} className="flex items-center">
              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                  isCompleted && "bg-green-100 text-green-700",
                  isCurrent && "bg-blue-100 text-blue-700 ring-2 ring-blue-300",
                  isPending && "bg-gray-100 text-gray-500"
                )}
                title={stage.description}
              >
                <Icon className="w-3 h-3" />
                <span>{stage.shortLabel}</span>
              </div>
              {index < stages.length - 1 && (
                <ArrowRight className={cn(
                  "w-3 h-3 mx-0.5",
                  isCompleted ? "text-green-400" : "text-gray-300"
                )} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Card className="widget-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", workflowInfo.color)} />
            <CardTitle className="text-lg">{workflowInfo.title}</CardTitle>
          </div>
          {editable && onWorkflowChange && (
            <select
              value={workflowType}
              onChange={(e) => onWorkflowChange(e.target.value as WorkflowType)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white"
            >
              <option value="standard">Standard</option>
              <option value="procurement">Procurement</option>
              <option value="financial">Financial</option>
              <option value="urgent">Urgent</option>
            </select>
          )}
        </div>
        <p className="text-sm text-gray-500">{workflowInfo.description}</p>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Progress Bar */}
        <div className="relative mb-6">
          <div className="h-1 bg-gray-200 rounded-full">
            <div
              className="h-1 bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(5, (currentStageIndex / (stages.length - 1)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Stages */}
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const isCompleted = index < currentStageIndex;
            const isCurrent = index === currentStageIndex;
            const isPending = index > currentStageIndex;

            return (
              <div
                key={stage.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-all",
                  isCompleted && "bg-green-50 border-green-200",
                  isCurrent && "bg-blue-50 border-blue-300 ring-1 ring-blue-200",
                  isPending && "bg-gray-50 border-gray-200 opacity-60"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    isCompleted && "bg-green-500 text-white",
                    isCurrent && "bg-blue-500 text-white",
                    isPending && "bg-gray-300 text-gray-500"
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={cn(
                      "font-medium text-sm",
                      isPending && "text-gray-500"
                    )}>
                      {stage.label}
                    </h4>
                    {stage.slaHours > 0 && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDuration(stage.slaHours)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{stage.description}</p>
                  <p className="text-xs text-gray-400 mt-1">Assigned to: {stage.role}</p>
                </div>
                {isCompleted && (
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Estimated Time */}
        {showInfo && estimatedHours > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-amber-700 text-sm">
              <Info className="w-4 h-4" />
              <span>
                Estimated time to completion: <strong>{formatDuration(estimatedHours)}</strong>
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Determine the appropriate workflow type based on memo data
 */
export function detectWorkflowType(
  templateId?: string,
  budgetedAmount?: number | string,
  priority?: string
): WorkflowType {
  // Urgent memos with HIGH/URGENT priority use expedited workflow
  if (priority === "HIGH" || priority === "URGENT") {
    return "urgent";
  }

  // Procurement templates use procurement workflow
  if (templateId === "procurement" || templateId === "it-equipment") {
    return "procurement";
  }

  // Budget transfer or requests with significant amounts use financial workflow
  if (templateId === "budget-transfer") {
    return "financial";
  }

  // Large amounts require financial review
  const amount = typeof budgetedAmount === "string" ? parseFloat(budgetedAmount) : budgetedAmount;
  if (amount && amount > 0) {
    if (amount > 50000) return "procurement";
    if (amount > 10000) return "financial";
  }

  return "standard";
}

/**
 * Get the next status based on current workflow and stage
 */
export function getNextWorkflowStatus(
  workflowType: WorkflowType,
  currentStatus: string
): string {
  const stages = WORKFLOW_STAGES[workflowType];
  const currentIndex = stages.findIndex(s => s.statusValues.includes(currentStatus));
  
  if (currentIndex === -1 || currentIndex >= stages.length - 1) {
    return "SUBMITTED_TO_MANAGER";
  }

  return stages[currentIndex + 1].statusValues[0];
}

/**
 * Get initial submission status based on workflow type
 */
export function getInitialSubmissionStatus(workflowType: WorkflowType): string {
  const stages = WORKFLOW_STAGES[workflowType];
  // Skip the DRAFT stage and get the first review stage
  if (stages.length > 1) {
    return stages[1].statusValues[0];
  }
  return "SUBMITTED_TO_MANAGER";
}

export { WORKFLOW_STAGES, WORKFLOW_INFO };
