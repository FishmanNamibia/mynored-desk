"use client";

import { toast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/pms-auth-adapter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { gradients, shadows } from "@/app/ui-standards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Edit,
  CheckCircle2,
  Trash2,
  Users,
  FileText,
  ExternalLink,
  RefreshCw,
  Settings,
  Calendar,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Task {
  id: string;
  title: string;
  description?: string;
  isAdhoc: boolean;
  dueDate: string;
  status: string;
  percentComplete: number;
  evidenceUrl?: string | null;
  evidenceNotes?: string | null;
  completedAt?: string | null;
  responsible?: {
    id: string;
    name: string;
    email: string;
    role: string;
    department?: {
      id: string;
      name: string;
    };
    division?: {
      id: string;
      name: string;
      department: {
        id: string;
        name: string;
      };
    };
  };
  initiative?: {
    id: string;
    title: string;
    objective: {
      id: string;
      title: string;
      goal: {
        id: string;
        title: string;
      };
    };
  } | null;
}

interface Goal {
  id: string;
  title: string;
  objectives: Objective[];
}

interface Objective {
  id: string;
  title: string;
  initiatives: Initiative[];
}

interface Initiative {
  id: string;
  title: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: {
    id: string;
    name: string;
  };
  division?: {
    id: string;
    name: string;
    department: {
      id: string;
      name: string;
    };
  };
}

interface Action {
  id: string;
  title: string;
  number: string;
  description?: string;
  measure?: string;
  action?: string;
  target?: string;
  reportingPeriods?: string[];
  quarterDates?: Record<string, string>;
  isPrimaryResponsible: boolean;
  isSecondaryResponsible: boolean;
  primaryResponsible?: { id: string; name: string; email: string };
  secondaryResponsible?: { id: string; name: string; email: string };
  objective: {
    id: string;
    title: string;
    goal: {
      id: string;
      title: string;
      goalNumber: string;
    };
  };
  tasks: any[];
  createdAt: string;
  updatedAt: string;
}

export default function TasksPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role || ''
  const jobTitleLower = (session?.user?.jobTitle || '').toLowerCase()
  const canManageCycles =
    jobTitleLower.includes('human capital') ||
    jobTitleLower.includes('od specialist') ||
    ['ADMIN', 'SG'].includes(userRole)

  const [tasks, setTasks] = useState<Task[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [subordinateTasks, setSubordinateTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [subordinatesLoading, setSubordinatesLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("my-tasks");
  const [cycles360, setCycles360] = useState<any[]>([])
  const [cycleForm360, setCycleForm360] = useState({ name: '', description: '', startDate: '', endDate: '' })
  const [savingCycle360, setSavingCycle360] = useState(false)
  const [initializingRaters, setInitializingRaters] = useState(false)
  const [initResult, setInitResult] = useState<string>('')
  const [deleteCycle360, setDeleteCycle360] = useState<any>(null)
  const [clearingAssignments, setClearingAssignments] = useState(false)
  const [taskFilter, setTaskFilter] = useState<
    "my-tasks" | "subordinate-tasks" | "all"
  >("my-tasks");
  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [departments, setDepartments] = useState<
    Array<{ id: string; name: string }>
  >([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    isAdhoc: false,
    goalId: "",
    objectiveId: "",
    initiativeId: "",
    assignedToId: "",
  });

  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    isAdhoc: false,
    goalId: "",
    objectiveId: "",
    initiativeId: "",
    assignedToId: "",
  });

  // Get objectives for selected goal
  const selectedGoal = goals.find((g) => g.id === formData.goalId);
  const selectedObjective = selectedGoal?.objectives.find(
    (o) => o.id === formData.objectiveId,
  );

  const editSelectedGoal = goals.find((g) => g.id === editFormData.goalId);
  const editSelectedObjective = editSelectedGoal?.objectives.find(
    (o) => o.id === editFormData.objectiveId,
  );

  // Filter tasks based on selected filter
  const filteredTasks = (() => {
    let filtered = [];
    if (taskFilter === "my-tasks") {
      filtered = tasks;
    } else if (taskFilter === "subordinate-tasks") {
      filtered = subordinateTasks;
    } else {
      // 'all' - combine both
      filtered = [...tasks, ...subordinateTasks];
    }

    console.log("Before department filter:", filtered.length, "tasks");
    console.log("Department filter:", departmentFilter);

    // Apply department filter
    if (departmentFilter !== "all") {
      filtered = filtered.filter((task) => {
        const userDepartment =
          task.responsible?.division?.department?.id ||
          task.responsible?.department?.id;
        console.log(
          "Task:",
          task.title,
          "Department:",
          userDepartment,
          "Matches:",
          userDepartment === departmentFilter,
        );
        return userDepartment === departmentFilter;
      });
    }

    console.log("After department filter:", filtered.length, "tasks");

    return filtered;
  })();

  const fetchActions = () => {
    console.log("[FETCH ACTIONS] Fetching performance agreements...");
    setLoading(true);
    fetch("/dashboard/performance/api/performance-agreements")
      .then((res) => res.json())
      .then((data) => {
        console.log("[FETCH ACTIONS] Received data:", data);
        if (Array.isArray(data)) {
          // Filter out containers and map to action format
          const agreements = data
            .filter((a: any) => !a.isAdhocContainer)
            .map((agreement: any) => ({
              id: agreement.id,
              title: agreement.title,
              number: agreement.initiative?.number || "",
              description: agreement.description,
              measure: agreement.kpi,
              action: agreement.customAction,
              target: agreement.target,
              reportingPeriods: agreement.reportingPeriods || [],
              quarterDates: agreement.quarterDates || {},
              status: agreement.status,
              percentComplete: agreement.percentComplete || 0,
              progressNotes: agreement.progressNotes || "",
              evidenceUrl: agreement.evidenceUrl || "",
              evidenceNotes: agreement.evidenceNotes || "",
              rating: agreement.rating || 0,
              isPrimaryResponsible: agreement.isPrimaryResponsible || false,
              isSecondaryResponsible: agreement.isSecondaryResponsible || false,
              primaryResponsible: agreement.responsible
                ? {
                    id: agreement.responsible.id,
                    name: agreement.responsible.name,
                    email: agreement.responsible.email,
                  }
                : undefined,
              secondaryResponsible: undefined,
              objective: agreement.initiative?.objective || {
                id: "",
                title: "",
                goal: { id: "", title: "", goalNumber: "" },
              },
              tasks: [],
              createdAt: agreement.createdAt,
              updatedAt: agreement.updatedAt,
            }));
          console.log(
            "[FETCH ACTIONS] Loaded",
            agreements.length,
            "performance agreements",
          );
          setActions(agreements);
        } else {
          console.error("[FETCH ACTIONS] Invalid data format:", data);
          setActions([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("[FETCH ACTIONS] Failed to fetch:", err);
        setActions([]);
        setLoading(false);
      });
  };

  const fetchTasks = () => {
    console.log("[FETCH TASKS] Starting to fetch tasks...");
    console.log("[FETCH TASKS] Current user:", session?.user);
    fetch("/dashboard/performance/api/targets")
      .then((res) => {
        console.log("[FETCH TASKS] Response status:", res.status);
        return res.json();
      })
      .then((data) => {
        console.log("[FETCH TASKS] Received data:", data);
        console.log(
          "[FETCH TASKS] Number of tasks:",
          Array.isArray(data) ? data.length : "not an array",
        );
        if (Array.isArray(data)) {
          console.log(
            "[FETCH TASKS] Task details:",
            data.map((t) => ({
              id: t.id,
              title: t.title,
              responsibleId: t.responsible?.id,
              responsibleName: t.responsible?.name,
            })),
          );
          setTasks(data);
        } else {
          console.error("[FETCH TASKS] Invalid data format:", data);
          setTasks([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("[FETCH TASKS] Failed to fetch tasks:", err);
        setTasks([]);
        setLoading(false);
      });
  };

  const fetchGoals = () => {
    fetch("/dashboard/performance/api/goals")
      .then((res) => res.json())
      .then((data) => setGoals(data))
      .catch((err) => console.error("Failed to fetch goals:", err));
  };

  const fetchUsers = () => {
    fetch("/dashboard/performance/api/users")
      .then((res) => res.json())
      .then((data) => setUsers(data.filter((u: User) => u.department))) // Only users with departments
      .catch((err) => console.error("Failed to fetch users:", err));
  };

  const fetchDepartments = () => {
    fetch("/dashboard/performance/api/departments")
      .then((res) => res.json())
      .then((data) => setDepartments(data))
      .catch((err) => console.error("Failed to fetch departments:", err));
  };

  const fetchSubordinateTasks = () => {
    setSubordinatesLoading(true);
    fetch("/dashboard/performance/api/targets/subordinates")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSubordinateTasks(data);
        } else {
          setSubordinateTasks([]);
        }
        setSubordinatesLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch subordinate tasks:", err);
        setSubordinateTasks([]);
        setSubordinatesLoading(false);
      });
  };

  const fetchCycles360 = () => {
    fetch('/dashboard/performance/api/360-rating/cycles')
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setCycles360(data) })
      .catch(() => {})
  }

  useEffect(() => {
    fetchActions();
    fetchTasks();
    fetchGoals();
    fetchUsers();
    fetchDepartments();
    fetchSubordinateTasks();
    if (canManageCycles) fetchCycles360();
  }, [canManageCycles]);

  const handleCreateCycle360 = async () => {
    if (!cycleForm360.name || !cycleForm360.startDate || !cycleForm360.endDate) {
      toast({ title: 'Name, start date and end date are required', variant: 'destructive' })
      return
    }
    setSavingCycle360(true)
    try {
      const res = await fetch('/dashboard/performance/api/360-rating/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cycleForm360),
      })
      if (res.ok) {
        const c = await res.json()
        setCycles360((prev) => [c, ...prev])
        setCycleForm360({ name: '', description: '', startDate: '', endDate: '' })
        toast({ title: 'Cycle created successfully' })
      } else {
        const e = await res.json()
        toast({ title: e.error || 'Failed to create cycle', variant: 'destructive' })
      }
    } finally { setSavingCycle360(false) }
  }

  const handleInitRaters = async (force = false) => {
    setInitializingRaters(true)
    setInitResult('')
    try {
      const res = await fetch('/dashboard/performance/api/360-rating/init-random-raters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      const data = await res.json()
      if (res.ok) {
        setInitResult(data.message || 'Done')
        fetchCycles360()
        toast({ title: data.message || 'Initialized successfully' })
      } else {
        setInitResult(data.error || 'Failed')
        toast({ title: data.error || 'Failed to initialize', variant: 'destructive' })
      }
    } finally { setInitializingRaters(false) }
  }

  const handleClearAssignments = async () => {
    setClearingAssignments(true)
    setInitResult('')
    try {
      const res = await fetch('/dashboard/performance/api/360-rating/clear-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearRated: false }),
      })
      const data = await res.json()
      if (res.ok) {
        setInitResult(data.message || 'Cleared')
        fetchCycles360()
        toast({ title: data.message || 'Assignments cleared' })
      } else {
        setInitResult(data.error || 'Failed to clear')
        toast({ title: data.error || 'Failed to clear', variant: 'destructive' })
      }
    } finally { setClearingAssignments(false) }
  }

  const handleActivateCycle360 = async (id: string) => {
    const res = await fetch(`/dashboard/performance/api/360-rating/cycles/${id}/activate`, { method: 'POST' })
    if (res.ok) { fetchCycles360(); toast({ title: 'Cycle activated' }) }
    else { const e = await res.json(); toast({ title: e.error || 'Failed to activate', variant: 'destructive' }) }
  }

  const handleDeleteCycle360 = async () => {
    if (!deleteCycle360) return
    const res = await fetch(`/dashboard/performance/api/360-rating/cycles/${deleteCycle360.id}`, { method: 'DELETE' })
    if (res.ok) { fetchCycles360(); setDeleteCycle360(null); toast({ title: 'Cycle deleted' }) }
    else { const e = await res.json(); toast({ title: e.error || 'Failed to delete', variant: 'destructive' }) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Auto-assign to current user (executive) if they're creating the task
      const assignedTo = formData.assignedToId || session?.user?.id;

      if (!formData.assignedToId) {
        console.log(
          "Task auto-assigned to you (executive) for later cascading",
        );
      } else {
        console.log("Task directly assigned to:", formData.assignedToId);
      }

      const response = await fetch("/dashboard/performance/api/targets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          dueDate: formData.dueDate,
          isAdhoc: formData.isAdhoc,
          initiativeId: formData.isAdhoc ? null : formData.initiativeId,
          assignedToId: assignedTo,
        }),
      });

      if (response.ok) {
        setOpen(false);
        setFormData({
          title: "",
          description: "",
          dueDate: "",
          isAdhoc: false,
          goalId: "",
          objectiveId: "",
          initiativeId: "",
          assignedToId: "",
        });
        fetchTasks();
      } else {
        const error = await response.json();
        toast({ title: `$1`, variant: "destructive" });
      }
    } catch (err) {
      console.error("Failed to create task:", err);
      toast({ title: "Failed to create task", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setEditFormData({
      title: task.title,
      description: task.description || "",
      dueDate: task.dueDate.split("T")[0],
      isAdhoc: task.isAdhoc || false,
      goalId: task.initiative?.objective?.goal?.id || "",
      objectiveId: task.initiative?.objective?.id || "",
      initiativeId: task.initiative?.id || "",
      assignedToId: task.responsible?.id || "",
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    setSubmitting(true);

    try {
      const response = await fetch(
        `/dashboard/performance/api/targets/${editingTask.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: editFormData.title,
            description: editFormData.description,
            dueDate: editFormData.dueDate,
            initiativeId: editFormData.initiativeId,
            assignedToId: editFormData.assignedToId,
          }),
        },
      );

      if (response.ok) {
        setEditOpen(false);
        setEditingTask(null);
        fetchTasks();
      } else {
        const error = await response.json();
        toast({ title: `$1`, variant: "destructive" });
      }
    } catch (err) {
      console.error("Failed to update task:", err);
      toast({ title: "Failed to update task", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = (task: Task) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    setDeleting(true);

    try {
      // Get first admin user to send notification to
      const adminsResponse = await fetch(
        "/dashboard/performance/api/users?role=ADMIN",
      );
      const admins = await adminsResponse.json();

      if (admins.length === 0) {
        toast({
          title: "No admin users found to approve deletion",
          variant: "destructive",
        });
        setDeleting(false);
        return;
      }

      // Send delete request notification
      const response = await fetch("/dashboard/performance/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "DELETE_REQUEST",
          title: `Delete Request: Task "${taskToDelete.title}"`,
          message: `Requesting approval to delete task assigned to ${taskToDelete.responsible?.name}`,
          entityType: "Target",
          entityId: taskToDelete.id,
          entityData: {
            title: taskToDelete.title,
            description: taskToDelete.description,
            goal: taskToDelete.initiative?.objective?.goal?.title || "",
            objective: taskToDelete.initiative?.objective?.title || "",
            initiative: taskToDelete.initiative?.title || "",
            assignedTo: taskToDelete.responsible?.name,
          },
          receiverId: admins[0].id, // Send to first admin
        }),
      });

      if (response.ok) {
        setDeleteDialogOpen(false);
        setTaskToDelete(null);
        toast({
          title: "Delete request sent to administrator for approval",
          variant: "destructive",
        });
      } else {
        const error = await response.json();
        console.error("Delete request error:", error);
        toast({
          title: `Failed to send delete request: ${error.error}${error.details ? ` - ${error.details}` : ""}`,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Failed to send delete request:", err);
      toast({ title: "Failed to send delete request", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      NOT_STARTED: "bg-red-500 text-white",
      IN_PROGRESS: "bg-amber-500 text-white",
      COMPLETED: "bg-green-500 text-white",
      OVERDUE: "bg-red-700 text-white",
      BLOCKED: "bg-red-700 text-white",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
            Action Management
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 leading-tight">
            Manage actions from implementation plans and cascade them to your
            team
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Action</DialogTitle>
              <DialogDescription>
                Create an action that will appear in your "My Action List". You
                can then cascade it down to your team members.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                {/* Task Details */}
                <div className="space-y-2">
                  <Label htmlFor="title">Task Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="e.g., Complete quarterly report"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Describe the task..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                    required
                  />
                </div>

                {/* Task Type Toggle */}
                <div className="border-t pt-4 space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isAdhoc"
                      checked={formData.isAdhoc}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isAdhoc: e.target.checked,
                          goalId: "",
                          objectiveId: "",
                          initiativeId: "",
                        })
                      }
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label
                      htmlFor="isAdhoc"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      This is an ad-hoc task (not linked to strategic goals)
                    </Label>
                  </div>
                  {formData.isAdhoc && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Ad-hoc Task:</strong> This task will not be
                        linked to any goal, objective, or initiative. It can be
                        used for one-off activities or urgent requests.
                      </p>
                    </div>
                  )}
                </div>

                {/* Goal/Objective/Initiative Selection - Only show if not ad-hoc */}
                {!formData.isAdhoc && (
                  <div className="border-t pt-4 space-y-4">
                    <h3 className="font-semibold">Link to Strategic Plan</h3>

                    <div className="space-y-2">
                      <Label htmlFor="goal">Goal *</Label>
                      <Select
                        value={formData.goalId}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            goalId: value,
                            objectiveId: "",
                            initiativeId: "",
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a goal" />
                        </SelectTrigger>
                        <SelectContent>
                          {goals.map((goal) => (
                            <SelectItem key={goal.id} value={goal.id}>
                              {goal.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.goalId && (
                      <div className="space-y-2">
                        <Label htmlFor="objective">Objective *</Label>
                        <Select
                          value={formData.objectiveId}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              objectiveId: value,
                              initiativeId: "",
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an objective" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedGoal?.objectives.map((objective) => (
                              <SelectItem
                                key={objective.id}
                                value={objective.id}
                              >
                                {objective.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {formData.objectiveId && (
                      <div className="space-y-2">
                        <Label htmlFor="initiative">Initiative *</Label>
                        <Select
                          value={formData.initiativeId}
                          onValueChange={(value) =>
                            setFormData({ ...formData, initiativeId: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an initiative" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedObjective?.initiatives.map(
                              (initiative) => (
                                <SelectItem
                                  key={initiative.id}
                                  value={initiative.id}
                                >
                                  {initiative.title}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                {/* Staff Assignment */}
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold">Assign to Staff</h3>

                  <div className="space-y-2">
                    <Label htmlFor="assignedTo">
                      Assign to Staff Member (Optional)
                    </Label>
                    <p className="text-xs text-gray-500 mb-2">
                      Leave empty to assign to yourself first. You can cascade
                      it down to your team later.
                    </p>
                    <Select
                      value={formData.assignedToId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, assignedToId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Assign to me first (cascade later)" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{user.name}</span>
                              <span className="text-xs text-gray-500">
                                {user.division
                                  ? `${user.division.name} - ${user.division.department.name}`
                                  : user.department
                                    ? user.department.name
                                    : user.role}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.assignedToId &&
                    (() => {
                      const selectedUser = users.find(
                        (u) => u.id === formData.assignedToId,
                      );
                      return (
                        <div className="p-3 bg-green-50 rounded-md">
                          <p className="text-sm font-medium text-green-900">
                            Task will be assigned to:
                          </p>
                          <p className="text-sm text-green-700 mt-1">
                            {selectedUser?.division
                              ? `Division: ${selectedUser.division.name} (${selectedUser.division.department.name})`
                              : selectedUser?.department
                                ? `Department: ${selectedUser.department.name}`
                                : `Role: ${selectedUser?.role}`}
                          </p>
                        </div>
                      );
                    })()}
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    submitting ||
                    !formData.title ||
                    !formData.dueDate ||
                    (!formData.isAdhoc && !formData.initiativeId)
                  }
                >
                  {submitting ? "Creating..." : "Create Task"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="my-tasks">
            My Action List ({actions.length})
          </TabsTrigger>
          <TabsTrigger value="team-tasks">
            <Users className="h-4 w-4 mr-2" />
            Team Tasks ({subordinateTasks.length})
          </TabsTrigger>
          {canManageCycles && (
            <TabsTrigger value="manage-360-cycles">
              <Settings className="h-4 w-4 mr-2" />
              Manage 360 Cycles
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-tasks">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>My Action List</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Actions from implementation plans where you are Primary or
                    Secondary Responsibility
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-12 text-center">
                  <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-full"></div>
                    <div className="h-8 bg-gray-200 rounded w-full"></div>
                    <div className="h-8 bg-gray-200 rounded w-full"></div>
                  </div>
                </div>
              ) : actions.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="font-medium">
                    No actions found in implementation plans
                  </p>
                  <p className="text-sm mt-1">
                    Actions will appear here when you are assigned as Primary or
                    Secondary Responsibility in initiatives
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action #</TableHead>
                      <TableHead>Action / Initiative</TableHead>
                      <TableHead>Goal → Objective</TableHead>
                      <TableHead>Responsibility</TableHead>
                      <TableHead>Measure / Target</TableHead>
                      <TableHead>Reporting Periods</TableHead>
                      <TableHead>Cascaded Tasks</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actions.map((action) => (
                      <TableRow key={action.id}>
                        <TableCell className="font-medium">
                          {action.number}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{action.title}</div>
                            {action.action && (
                              <div className="text-sm text-gray-600">
                                Action: {action.action}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm text-gray-600">
                              🎯 {action.objective.goal.goalNumber}:{" "}
                              {action.objective.goal.title}
                            </div>
                            <div className="text-sm text-gray-600 ml-3">
                              → {action.objective.title}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {action.isPrimaryResponsible && (
                              <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                                Primary
                              </Badge>
                            )}
                            {action.isSecondaryResponsible && (
                              <Badge
                                variant="outline"
                                className="bg-gray-100 text-gray-700"
                              >
                                Secondary
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            {action.measure && (
                              <div>
                                <span className="font-medium">Measure:</span>{" "}
                                {action.measure}
                              </div>
                            )}
                            {action.target && (
                              <div>
                                <span className="font-medium">Target:</span>{" "}
                                {action.target}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {action.reportingPeriods &&
                            action.reportingPeriods.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {action.reportingPeriods.map(
                                  (period: string) => (
                                    <Badge
                                      key={period}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {period}
                                    </Badge>
                                  ),
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <Badge variant="outline" className="font-mono">
                              {action.tasks.length}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="View Implementation Plan"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Cascade to Team"
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team-tasks">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Tasks - Subordinates Progress</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Track and monitor tasks assigned to your team members
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {(session?.user?.role === "ADMIN" ||
                    session?.user?.role === "SG" ||
                    session?.user?.role === "DEPUTY_SG") && (
                    <div className="w-56">
                      <Label
                        htmlFor="department-filter-team"
                        className="text-xs"
                      >
                        Filter by Department
                      </Label>
                      <Select
                        value={departmentFilter}
                        onValueChange={setDepartmentFilter}
                      >
                        <SelectTrigger id="department-filter-team">
                          <SelectValue placeholder="All Departments" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Departments</SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="w-56">
                    <Label htmlFor="division-filter" className="text-xs">
                      Filter by Division
                    </Label>
                    <Select
                      value={divisionFilter}
                      onValueChange={setDivisionFilter}
                    >
                      <SelectTrigger id="division-filter">
                        <SelectValue placeholder="All Divisions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Divisions</SelectItem>
                        {Array.from(
                          new Set(
                            subordinateTasks
                              .map((t) => t.responsible?.division?.id)
                              .filter(Boolean),
                          ),
                        ).map((divId) => {
                          const div = subordinateTasks.find(
                            (t) => t.responsible?.division?.id === divId,
                          )?.responsible?.division;
                          return div ? (
                            <SelectItem key={div.id} value={div.id}>
                              {div.name}
                            </SelectItem>
                          ) : null;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {subordinatesLoading ? (
                <div className="py-12 text-center">
                  <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-full"></div>
                    <div className="h-8 bg-gray-200 rounded w-full"></div>
                    <div className="h-8 bg-gray-200 rounded w-full"></div>
                  </div>
                </div>
              ) : subordinateTasks.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="font-medium">No subordinate tasks found</p>
                  <p className="text-sm mt-1">
                    Tasks assigned to your direct reports will appear here
                  </p>
                </div>
              ) : (
                (() => {
                  // Filter tasks by department and division
                  let filteredTasks = subordinateTasks;

                  console.log(
                    "[Team Tasks] Before filters:",
                    filteredTasks.length,
                    "tasks",
                  );
                  console.log(
                    "[Team Tasks] Department filter:",
                    departmentFilter,
                  );
                  console.log("[Team Tasks] Division filter:", divisionFilter);

                  // Apply department filter
                  if (departmentFilter !== "all") {
                    filteredTasks = filteredTasks.filter((task) => {
                      const userDepartment =
                        task.responsible?.division?.department?.id ||
                        task.responsible?.department?.id;
                      return userDepartment === departmentFilter;
                    });
                    console.log(
                      "[Team Tasks] After department filter:",
                      filteredTasks.length,
                      "tasks",
                    );
                  }

                  // Apply division filter
                  if (divisionFilter !== "all") {
                    filteredTasks = filteredTasks.filter(
                      (t) => t.responsible?.division?.id === divisionFilter,
                    );
                    console.log(
                      "[Team Tasks] After division filter:",
                      filteredTasks.length,
                      "tasks",
                    );
                  }

                  return (
                    <>
                      {/* Summary Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold">
                              {filteredTasks.length}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Total Tasks
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold text-green-600">
                              {
                                filteredTasks.filter(
                                  (t) => t.status === "COMPLETED",
                                ).length
                              }
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Completed
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold text-blue-600">
                              {
                                filteredTasks.filter(
                                  (t) => t.status === "IN_PROGRESS",
                                ).length
                              }
                            </div>
                            <p className="text-xs text-muted-foreground">
                              In Progress
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold text-red-600">
                              {
                                filteredTasks.filter(
                                  (t) => t.status === "OVERDUE",
                                ).length
                              }
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Overdue
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Tasks Table */}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Task</TableHead>
                            <TableHead>Goal → Objective → Initiative</TableHead>
                            <TableHead>Assigned To</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Progress</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTasks.map((task) => (
                            <TableRow key={task.id}>
                              <TableCell className="font-medium">
                                {task.title}
                              </TableCell>
                              <TableCell className="text-sm">
                                <div className="space-y-1">
                                  <div className="text-gray-600">
                                    🎯{" "}
                                    {task.initiative?.objective?.goal?.title ||
                                      ""}
                                  </div>
                                  <div className="text-gray-600 ml-3">
                                    → {task.initiative?.objective?.title || ""}
                                  </div>
                                  <div className="text-gray-600 ml-6">
                                    → {task.initiative?.title || ""}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                                    {task.responsible?.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .slice(0, 2)}
                                  </div>
                                  {task.responsible?.name || "Unassigned"}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {task.responsible?.division
                                  ? `${task.responsible.division.name} - ${task.responsible.division.department.name}`
                                  : task.responsible?.department?.name || "-"}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {new Date(task.dueDate).toLocaleDateString()}
                                  {new Date(task.dueDate) < new Date() &&
                                    task.status !== "COMPLETED" && (
                                      <span className="block text-xs text-red-600 font-medium">
                                        {Math.floor(
                                          (new Date().getTime() -
                                            new Date(task.dueDate).getTime()) /
                                            (1000 * 60 * 60 * 24),
                                        )}{" "}
                                        days overdue
                                      </span>
                                    )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    className={getStatusColor(task.status)}
                                  >
                                    {task.status.replace("_", " ")}
                                  </Badge>
                                  {task.status === "COMPLETED" &&
                                    task.evidenceUrl && (
                                      <a
                                        href={task.evidenceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                                        title="View Evidence"
                                      >
                                        <FileText className="h-4 w-4" />
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                                    <div
                                      className={`h-2 rounded-full ${
                                        task.percentComplete === 100
                                          ? "bg-green-600"
                                          : task.percentComplete >= 75
                                            ? "bg-blue-600"
                                            : task.percentComplete >= 50
                                              ? "bg-yellow-600"
                                              : "bg-orange-600"
                                      }`}
                                      style={{
                                        width: `${task.percentComplete}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium">
                                    {task.percentComplete}%
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  );
                })()
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════ MANAGE 360 CYCLES (HC Executive + OD Specialist only) ══════════ */}
        {canManageCycles && (
          <TabsContent value="manage-360-cycles" className="space-y-4 mt-4">
            {/* Initialize random raters */}
            <Card className="border-2 border-teal-200">
              <CardHeader style={{ background: gradients.navyHeader, boxShadow: shadows.header }} className="rounded-t-md">
                <CardTitle className="text-white flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" /> Initialize Random Rater Assignments
                </CardTitle>
                <CardDescription className="text-white/70">
                  Auto-assigns one org-wide random rater and one department random rater for every employee in the active cycle.
                  Supervisors are assigned automatically from the reporting line.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <Button
                    onClick={() => handleInitRaters(false)}
                    disabled={initializingRaters}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {initializingRaters ? 'Initializing...' : 'Initialize Random Raters'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm('Force re-initialize will clear all PENDING (unrated) assignments and reassign correctly. Completed ratings are preserved. Continue?')) {
                        handleInitRaters(true)
                      }
                    }}
                    disabled={initializingRaters}
                    className="border-amber-400 text-amber-700 hover:bg-amber-50"
                  >
                    Force Re-initialize
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm('This will PERMANENTLY delete all current random assignments (both pending and completed). Use this to start completely fresh. Continue?')) {
                        handleClearAssignments()
                      }
                    }}
                    disabled={clearingAssignments || initializingRaters}
                    className="border-red-400 text-red-700 hover:bg-red-50"
                  >
                    {clearingAssignments ? 'Clearing...' : 'Clear All Assignments'}
                  </Button>
                  {initResult && (
                    <p className={`text-sm font-medium ${initResult.includes('error') || initResult.includes('Failed') ? 'text-red-600' : 'text-green-700'}`}>
                      {initResult}
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  <strong>Initialize Random Raters</strong> — adds assignments if not yet done.<br />
                  <strong>Force Re-initialize</strong> — clears unrated assignments and reassigns.<br />
                  <strong>Clear All Assignments</strong> — wipes everything for a completely fresh start, then use Initialize.
                </p>
              </CardContent>
            </Card>

            {/* Create new cycle */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Create New Rating Cycle</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Cycle Name *</Label>
                    <Input placeholder="e.g. 2025/26 Annual Review" value={cycleForm360.name} onChange={(e) => setCycleForm360({ ...cycleForm360, name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Description</Label>
                    <Input placeholder="Optional" value={cycleForm360.description} onChange={(e) => setCycleForm360({ ...cycleForm360, description: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Start Date *</Label>
                    <Input type="date" value={cycleForm360.startDate} onChange={(e) => setCycleForm360({ ...cycleForm360, startDate: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>End Date *</Label>
                    <Input type="date" value={cycleForm360.endDate} onChange={(e) => setCycleForm360({ ...cycleForm360, endDate: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleCreateCycle360} disabled={savingCycle360}>
                    {savingCycle360 ? 'Creating...' : 'Create Cycle'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Existing cycles */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" /> Existing Cycles</CardTitle></CardHeader>
              <CardContent>
                {cycles360.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Calendar className="w-10 h-10 mx-auto mb-2" />
                    <p>No cycles yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cycles360.map((c) => (
                      <div key={c.id} className={`p-4 border rounded-lg ${c.isActive ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold">{c.name}</span>
                              {c.isActive && <Badge className="bg-green-100 text-green-800">Active</Badge>}
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {new Date(c.startDate).toLocaleDateString()} — {new Date(c.endDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {!c.isActive && (
                              <Button variant="outline" size="sm" onClick={() => handleActivateCycle360(c.id)}>Activate</Button>
                            )}
                            <Button
                              variant="outline" size="sm"
                              className="border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => setDeleteCycle360(c)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Delete 360 Cycle Confirmation */}
      <AlertDialog open={!!deleteCycle360} onOpenChange={(o) => !o && setDeleteCycle360(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Delete Cycle?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteCycle360?.name}</strong>? All ratings in this cycle will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCycle360} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Task Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update task details and assignment
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Task Title *</Label>
                <Input
                  id="edit-title"
                  value={editFormData.title}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, title: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <textarea
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      description: e.target.value,
                    })
                  }
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-dueDate">Due Date *</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={editFormData.dueDate}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      dueDate: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold">Link to Strategic Plan</h3>

                <div className="space-y-2">
                  <Label>Goal *</Label>
                  <Select
                    value={editFormData.goalId}
                    onValueChange={(value) =>
                      setEditFormData({
                        ...editFormData,
                        goalId: value,
                        objectiveId: "",
                        initiativeId: "",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {goals.map((goal) => (
                        <SelectItem key={goal.id} value={goal.id}>
                          {goal.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {editFormData.goalId && (
                  <div className="space-y-2">
                    <Label>Objective *</Label>
                    <Select
                      value={editFormData.objectiveId}
                      onValueChange={(value) =>
                        setEditFormData({
                          ...editFormData,
                          objectiveId: value,
                          initiativeId: "",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {editSelectedGoal?.objectives.map((objective) => (
                          <SelectItem key={objective.id} value={objective.id}>
                            {objective.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {editFormData.objectiveId && (
                  <div className="space-y-2">
                    <Label>Initiative *</Label>
                    <Select
                      value={editFormData.initiativeId}
                      onValueChange={(value) =>
                        setEditFormData({
                          ...editFormData,
                          initiativeId: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {editSelectedObjective?.initiatives.map(
                          (initiative) => (
                            <SelectItem
                              key={initiative.id}
                              value={initiative.id}
                            >
                              {initiative.title}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold">Assign to Staff</h3>

                <div className="space-y-2">
                  <Label>Staff Member *</Label>
                  <Select
                    value={editFormData.assignedToId}
                    onValueChange={(value) =>
                      setEditFormData({ ...editFormData, assignedToId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{user.name}</span>
                            <span className="text-xs text-gray-500">
                              {user.division
                                ? `${user.division.name} - ${user.division.department.name}`
                                : user.department
                                  ? user.department.name
                                  : user.role}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Updating..." : "Update Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Task Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{taskToDelete?.title}</strong>?
              <br />
              <br />
              Task Details:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  Goal: {taskToDelete?.initiative?.objective?.goal?.title || ""}
                </li>
                <li>
                  Objective: {taskToDelete?.initiative?.objective?.title || ""}
                </li>
                <li>Initiative: {taskToDelete?.initiative?.title || ""}</li>
                <li>Assigned to: {taskToDelete?.responsible?.name}</li>
              </ul>
              <br />
              <span className="text-blue-600 font-semibold">
                This will send a request to the administrator for approval.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTask}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Sending Request..." : "Request Deletion"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
