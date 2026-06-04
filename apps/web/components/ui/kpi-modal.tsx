"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Target } from "lucide-react";
import { KPI_DEFAULTS, type KpiType } from "./kpi-card";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GoldSpinner } from "./gold-spinner";
import { Badge } from "@/components/ui/badge";

interface KpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  kpiType: KpiType | null;
  value: number;
  href?: string;
}

interface TaskRecord {
  id: string;
  title: string;
  status: string;
  percentComplete: number;
  dueDate?: string;
  initiative?: {
    objective?: {
      goal?: {
        title: string;
      };
    };
  };
}

const KPI_SUMMARIES: Record<KpiType, { summary: string; details: string[] }> = {
  totalActions: {
    summary: "Your total performance actions across all categories and periods.",
    details: ["Includes all assigned actions", "Covers current and previous periods", "Tracks all status levels"],
  },
  notStarted: {
    summary: "Actions that haven't been initiated yet.",
    details: ["Assigned but not started", "Prioritize by deadline", "Plan your approach"],
  },
  inProgress: {
    summary: "Actions currently being worked on.",
    details: ["Active tasks in progress", "Update regularly", "Monitor for completion"],
  },
  completed: {
    summary: "Successfully finished actions.",
    details: ["Completed and verified", "Contributes to performance", "Review for insights"],
  },
  overdue: {
    summary: "Actions past their deadline.",
    details: ["Urgent attention needed", "May impact rating", "Contact supervisor if needed"],
  },
  completionRate: {
    summary: "Percentage of completed actions.",
    details: ["Completed vs total actions", "Performance efficiency indicator", "Target: Above 80%"],
  },
  tasks: { summary: "Your assigned tasks.", details: ["Track progress", "Monitor deadlines", "Collaborate"] },
  approvals: { summary: "Items awaiting approval.", details: ["Review carefully", "Timely decisions", "Keep workflows moving"] },
  memos: { summary: "Active memorandums.", details: ["Review directives", "Acknowledge", "Follow up"] },
  meetings: { summary: "Today's meetings.", details: ["Check agendas", "Prepare materials", "Join on time"] },
  reviews: { summary: "Reviews due.", details: ["Provide feedback", "Complete on time", "Be constructive"] },
  requests: { summary: "Open requests.", details: ["Track submissions", "Respond promptly", "Follow up"] },
  users: { summary: "Active users.", details: ["Real-time activity", "System engagement", "Usage tracking"] },
  messages: { summary: "Unread messages.", details: ["Internal communications", "Urgent first", "Stay organized"] },
  projects: { summary: "Active projects.", details: ["Track milestones", "Monitor progress", "Update status"] },
  budget: { summary: "Budget overview.", details: ["Track utilization", "Monitor expenses", "Plan ahead"] },
  goals: { summary: "Your goals.", details: ["Personal and team", "Track progress", "Align objectives"] },
  activity: { summary: "Activity metrics.", details: ["Usage tracking", "Productivity", "Engagement"] },
  notifications: { summary: "Unread notifications.", details: ["System alerts", "Announcements", "Reminders"] },
  ratings: { summary: "Performance ratings.", details: ["Current rating", "Feedback", "Improvement areas"] },
};

export function KpiModal({ isOpen, onClose, kpiType, value, href }: KpiModalProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !kpiType) return;
    
    // Only fetch for performance-related KPIs
    const performanceKpis = ['totalActions', 'notStarted', 'inProgress', 'completed', 'overdue'];
    if (!performanceKpis.includes(kpiType)) return;

    setLoading(true);
    fetch('/dashboard/performance/api/performance-agreements')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && Array.isArray(data)) {
          let filtered = data.filter((a: any) => !a.isAdhocContainer);
          
          // Filter by status based on KPI type
          switch (kpiType) {
            case 'notStarted':
              filtered = filtered.filter((a: any) => !a.status || a.status === 'NOT_STARTED');
              break;
            case 'inProgress':
              filtered = filtered.filter((a: any) => a.status === 'IN_PROGRESS');
              break;
            case 'completed':
              filtered = filtered.filter((a: any) => a.status === 'COMPLETED');
              break;
            case 'overdue':
              // For overdue, we'd need deadline logic - for now show blocked or past due
              filtered = filtered.filter((a: any) => a.status === 'BLOCKED' || (a.dueDate && new Date(a.dueDate) < new Date()));
              break;
          }
          
          setTasks(filtered.slice(0, 10)); // Limit to 10 records
        }
      })
      .catch(err => console.error('Failed to fetch tasks:', err))
      .finally(() => setLoading(false));
  }, [isOpen, kpiType]);

  if (!kpiType) return null;

  const kpiDefaults = KPI_DEFAULTS[kpiType];
  const kpiSummary = KPI_SUMMARIES[kpiType];
  const Icon = kpiDefaults.icon;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800 text-xs">Completed</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-amber-100 text-amber-800 text-xs">In Progress</Badge>;
      case 'BLOCKED':
        return <Badge className="bg-red-100 text-red-800 text-xs">Blocked</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 text-xs">Not Started</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-12 h-12 rounded-xl ${kpiDefaults.color === 'blue' ? 'bg-blue-100 text-blue-600' : 
            kpiDefaults.color === 'green' ? 'bg-green-100 text-green-600' : 
            kpiDefaults.color === 'red' ? 'bg-red-100 text-red-600' : 
            kpiDefaults.color === 'orange' ? 'bg-orange-100 text-orange-600' : 
            kpiDefaults.color === 'amber' ? 'bg-amber-100 text-amber-600' : 
            'bg-teal-100 text-teal-600'} flex items-center justify-center`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <DialogHeader>
              <DialogTitle>{kpiDefaults.label}</DialogTitle>
            </DialogHeader>
            <p className="text-3xl font-bold mt-2">{value}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Overview</h3>
            <p className="text-sm text-muted-foreground">{kpiSummary.summary}</p>
          </div>

          {/* Task Records Section */}
          {['totalActions', 'notStarted', 'inProgress', 'completed', 'overdue'].includes(kpiType) && (
            <div>
              <h3 className="font-semibold mb-2">Your Actions</h3>
              {loading ? (
                <div className="flex justify-center py-4">
                  <GoldSpinner size="sm" />
                </div>
              ) : tasks.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {tasks.map((task) => (
                    <div key={task.id} className="p-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2 leading-snug">{task.title}</p>
                        </div>
                        <div className="flex-shrink-0">
                          {getStatusBadge(task.status)}
                        </div>
                      </div>
                      {task.initiative?.objective?.goal?.title && (
                        <div className="flex items-start gap-1 mb-1.5">
                          <Target className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-muted-foreground line-clamp-1 leading-tight">
                            {task.initiative.objective.goal.title}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-medium">{task.percentComplete || 0}%</span>
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(task.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {value > 10 && (
                    <p className="text-xs text-center text-muted-foreground py-2">
                      Showing 10 of {value} actions
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No actions found</p>
              )}
            </div>
          )}

          {href && (
            <Button onClick={() => { router.push(href); onClose(); }} className="w-full gap-2">
              View All Actions <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
