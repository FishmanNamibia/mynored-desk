"use client";

import { toast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/pms-auth-adapter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { gradients, shadows } from "@/app/ui-standards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  Target as TargetIcon,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Info,
  Filter,
  X,
  Edit,
  Upload,
  List,
  Table as TableIcon,
  Shield,
  AlertCircle,
  FileSpreadsheet,
  RefreshCw,
  Settings,
} from "lucide-react";
import {
  getUpcomingPerformanceCycles,
  getCurrentPerformanceCycle,
} from "@/lib/pms/performance-cycle";
import { ManageGoalsObjectives } from "@/components/performance/components/goals/manage-goals-objectives";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { EditGoalWizard } from "@/components/performance/components/goals/edit-goal-wizard";
import { ImportGoalsDialog } from "@/components/performance/components/goals/import-goals-dialog";
import { ImportPerformanceContractDialog } from "@/components/performance/components/goals/import-performance-contract-dialog";
import { colors } from "@/app/ui-standards";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
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

interface Goal {
  id: string;
  goalNumber: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  bscPerspective?: string;
  performanceYear?: string;
  objectives: Objective[];
}

interface Objective {
  id: string;
  title: string;
  description?: string;
  initiatives: Initiative[];
}

interface Initiative {
  id: string;
  number?: string;
  title: string;
  description?: string;
  action?: string;
  measure?: string;
  reportingPeriods?: string[];
  target?: string;
  dueDate?: string;
  quarterDates?: Record<string, string>;
  targets?: Task[];
  primaryResponsibility?: string;
  secondaryResponsibility?: string;
  primaryResponsibleUser?: {
    id: string;
    name: string;
  };
  secondaryResponsibleUser?: {
    id: string;
    name: string;
  };
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  dueDate: string;
  percentComplete: number;
  responsible?: {
    id: string;
    name: string;
    email: string;
  };
  initiative?: {
    id: string;
    title: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  division?: {
    id: string;
    name: string;
  };
  department?: {
    id: string;
    name: string;
    division: {
      id: string;
      name: string;
    };
  };
}

export default function GoalsPage() {
  const { data: session } = useSession();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(
    new Set(),
  );
  const [expandedInitiatives, setExpandedInitiatives] = useState<Set<string>>(
    new Set(),
  );
  const [wizardOpen, setWizardOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importContractDialogOpen, setImportContractDialogOpen] =
    useState(false);
  const [deleteInitiativeDialogOpen, setDeleteInitiativeDialogOpen] =
    useState(false);
  const [initiativeToDelete, setInitiativeToDelete] =
    useState<Initiative | null>(null);
  const [deletingInitiative, setDeletingInitiative] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [editWizardOpen, setEditWizardOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [deleteTaskDialogOpen, setDeleteTaskDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState<
    "goals" | "objectives" | "initiatives" | "tasks" | null
  >(null);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  // Task creation states
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string>("");
  const [selectedInitiativeId, setSelectedInitiativeId] = useState<string>("");
  const [taskFormData, setTaskFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    responsibleId: "",
  });

  // Filters
  const [selectedGoalFilter, setSelectedGoalFilter] = useState<string>("all");
  const [selectedObjectiveFilter, setSelectedObjectiveFilter] =
    useState<string>("all");
  const [selectedInitiativeFilter, setSelectedInitiativeFilter] =
    useState<string>("all");

  // Due date editing
  const [dueDateDialogOpen, setDueDateDialogOpen] = useState(false);
  const [editingInitiative, setEditingInitiative] = useState<Initiative | null>(
    null,
  );
  const [newDueDate, setNewDueDate] = useState("");

  // View mode toggle
  const [viewMode, setViewMode] = useState<"table" | "accordion">("accordion");

  // Performance cycle selection
  const [selectedCycle, setSelectedCycle] = useState<string | null>(null);
  const [availableCycles, setAvailableCycles] = useState<string[]>([]);

  // Add new cycle dialog
  const [addCycleDialogOpen, setAddCycleDialogOpen] = useState(false);
  const [newCycleName, setNewCycleName] = useState("");
  const [addingCycle, setAddingCycle] = useState(false);

  // Delete cycle dialog
  const [deleteCycleDialogOpen, setDeleteCycleDialogOpen] = useState(false);
  const [cycleToDelete, setCycleToDelete] = useState<string | null>(null);
  const [deletingCycle, setDeletingCycle] = useState(false);

  // No predefined years - system starts empty until HC Executive creates periods
  const predefinedYears: string[] = [];

  // Manage 360 Cycles tab
  const [activeGoalsTab, setActiveGoalsTab] = useState<'task-management' | 'manage-360-cycles'>('task-management')
  const [cycles360, setCycles360] = useState<any[]>([])
  const [cycleForm360, setCycleForm360] = useState({ name: '', description: '', startDate: '', endDate: '' })
  const [savingCycle360, setSavingCycle360] = useState(false)
  const [initializingRaters, setInitializingRaters] = useState(false)
  const [initResult, setInitResult] = useState<string>('')
  const [deleteCycle360, setDeleteCycle360] = useState<any>(null)
  const [clearingAssignments, setClearingAssignments] = useState(false)

  const fetchCycles360 = () => {
    fetch('/dashboard/performance/api/360-rating/cycles')
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setCycles360(data) })
      .catch(() => {})
  }

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

  // Only these roles can create/edit goals, objectives, initiatives, and tasks
  const canManageImplementationPlan =
    session?.user?.role &&
    [
      "ADMIN",
      "SG",
      "DEPUTY_SG",
      "EXECUTIVE",
      "HUMAN_CAPITAL_EXECUTIVE",
      "ADMINISTRATIVE_ASSISTANT",
    ].includes(session.user.role);

  // Check if user can access Task Management (HC Executive and Admin only)
  const [canAccessPage, setCanAccessPage] = useState(false);
  const [canImportWorkplan, setCanImportWorkplan] = useState(false);

  useEffect(() => {
    const checkImportPermission = async () => {
      // Direct access for Human Capital Executive role
      if (session?.user?.role === "HUMAN_CAPITAL_EXECUTIVE") {
        setCanAccessPage(true);
        setCanImportWorkplan(true);
      } else if (
        session?.user?.role === "EXECUTIVE" &&
        session.user.departmentId
      ) {
        try {
          const response = await fetch(
            `/dashboard/performance/api/departments/${session.user.departmentId}`,
          );

          if (response.ok) {
            const dept = await response.json();
            const deptName = dept.name?.toLowerCase() || "";
            const isHC =
              deptName.includes("human capital") ||
              deptName.includes("human resources") ||
              deptName.includes("hr");
            setCanAccessPage(isHC);
            setCanImportWorkplan(isHC);
          } else {
            setCanAccessPage(false);
          }
        } catch (error) {
          setCanAccessPage(false);
        }
      } else if (session?.user?.role === "ADMIN") {
        // Only Admin has full access (SG removed)
        setCanAccessPage(true);
        setCanImportWorkplan(true);
      } else {
        setCanAccessPage(false);
      }
    };

    if (session) {
      checkImportPermission();
    }
  }, [session]);

  const handleUpdateDueDate = async () => {
    if (!editingInitiative || !newDueDate) return;

    try {
      const response = await fetch(
        `/dashboard/performance/api/initiatives/${editingInitiative.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dueDate: new Date(newDueDate).toISOString() }),
        },
      );

      if (response.ok) {
        toast({ title: "Due date updated successfully!" });
        setDueDateDialogOpen(false);
        setEditingInitiative(null);
        setNewDueDate("");
        fetchGoals();
      } else {
        toast({ title: "Failed to update due date", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error updating due date:", error);
      toast({ title: "Error updating due date", variant: "destructive" });
    }
  };

  const fetchGoals = async () => {
    try {
      const response = await fetch("/dashboard/performance/api/goals", {
        credentials: "include", // Include authentication cookies
      });

      if (!response.ok) {
        console.error(
          "Failed to fetch goals:",
          response.status,
          response.statusText,
        );
        setLoading(false);
        return;
      }

      const data = await response.json();

      // Ensure data is an array
      if (!Array.isArray(data)) {
        console.error("Expected array but received:", typeof data, data);
        setLoading(false);
        return;
      }

      // Debug: Log responsibility data
      console.log("Goals data received:", data);
      if (
        data.length > 0 &&
        data[0].objectives?.length > 0 &&
        data[0].objectives[0].initiatives?.length > 0
      ) {
        const sampleInitiative = data[0].objectives[0].initiatives[0];
        console.log("Sample initiative responsibility data:", {
          primaryResponsibility: sampleInitiative.primaryResponsibility,
          secondaryResponsibility: sampleInitiative.secondaryResponsibility,
          primaryResponsibleUser: sampleInitiative.primaryResponsibleUser,
          secondaryResponsibleUser: sampleInitiative.secondaryResponsibleUser,
        });
      }

      setGoals(data);

      // Extract unique performance years from database
      const dbYears = Array.from(
        new Set(data.map((goal: Goal) => goal.performanceYear).filter(Boolean)),
      );

      // Fetch available cycles from database
      const dbCycles = await fetchAvailableCycles();

      // Merge predefined years with database years and db cycles (remove duplicates)
      const allYears = Array.from(
        new Set([...predefinedYears, ...dbYears, ...dbCycles]),
      ).sort(); // Chronological order: 2025/26 to 2028/29

      console.log("📊 Total goals in database:", data.length);
      console.log("📅 Predefined years:", predefinedYears);
      console.log("📅 Database years:", dbYears);
      console.log("📅 Database cycles:", dbCycles);
      console.log("📅 All available years:", allYears);
      console.log(
        "📋 Goals by year:",
        data.reduce((acc: any, goal: Goal) => {
          const year = goal.performanceYear || "No Year";
          acc[year] = (acc[year] || 0) + 1;
          return acc;
        }, {}),
      );

      setAvailableCycles(allYears as string[]);

      // Set the current financial year as default if not already selected
      if (allYears.length > 0 && !selectedCycle) {
        const currentCycle = getCurrentPerformanceCycle();
        // Use current cycle if it exists in available cycles, otherwise use first available
        const defaultCycle = allYears.includes(currentCycle)
          ? currentCycle
          : allYears[0];
        setSelectedCycle(defaultCycle as string);
      }

      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch goals:", err);
      setLoading(false);
    }
  };

  const fetchUsers = () => {
    fetch("/dashboard/performance/api/users", {
      credentials: "include",
    })
      .then((res) => {
        if (res.ok) return res.json();
        return [];
      })
      .then((data) => {
        setUsers(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        // Silent fail - users list will be empty
      });
  };

  // Helper functions for period dates
  const generatePeriodStartDate = (cycleName: string) => {
    const [startYear] = cycleName.split("/");
    return `${startYear}-04-01`; // Financial year starts April 1st
  };

  const generatePeriodEndDate = (cycleName: string) => {
    const [startYear] = cycleName.split("/");
    const endYear = parseInt(startYear) + 1;
    return `${endYear}-03-31`; // Financial year ends March 31st
  };

  // Helper to extract cycle name from period name
  const extractCycleNameFromPeriod = (periodName: string) => {
    // Handle "2025/2026 Performance Period" → "2025/26"
    const longMatch = periodName.match(/(\d{4})\/(\d{4})/);
    if (longMatch) return `${longMatch[1]}/${longMatch[2].slice(-2)}`;
    // Handle "2025/26 Performance Period" → "2025/26"
    const shortMatch = periodName.match(/(\d{4}\/\d{2})/);
    return shortMatch ? shortMatch[1] : periodName;
  };

  // Fetch available cycles from database
  const fetchAvailableCycles = async () => {
    try {
      const response = await fetch(
        "/dashboard/performance/api/performance-period/available",
        {
          credentials: "include",
        },
      );

      if (response.ok) {
        const periods = await response.json();
        const cycleNames = periods.map((period: any) =>
          extractCycleNameFromPeriod(period.name),
        );
        setAvailableCycles(cycleNames);
        return cycleNames;
      }
    } catch (error) {
      console.error("Error fetching available cycles:", error);
      // Return empty array if API fails
      return [];
    }
    return [];
  };

  const handleAddCycle = async () => {
    if (!newCycleName.trim()) {
      toast({
        title: "Please enter a performance cycle name",
        variant: "destructive",
      });
      return;
    }

    // Validate format (should be like "2025/26")
    const cycleRegex = /^\d{4}\/\d{2}$/;
    if (!cycleRegex.test(newCycleName)) {
      toast({
        title:
          'Performance cycle should be in format "YYYY/YY" (e.g., "2025/26")',
        variant: "destructive",
      });
      return;
    }

    // Check if cycle already exists
    if (availableCycles.includes(newCycleName)) {
      toast({
        title: "This performance cycle already exists",
        variant: "destructive",
      });
      return;
    }

    setAddingCycle(true);

    try {
      // Create performance period via API
      const startDate = generatePeriodStartDate(newCycleName);
      const endDate = generatePeriodEndDate(newCycleName);
      const periodData = {
        name: `${newCycleName} Performance Period`,
        submissionDeadline: startDate, // default: start of period; HC can update in Settings
        startDate,
        endDate,
      };

      const response = await fetch(
        "/dashboard/performance/api/performance-period",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(periodData),
        },
      );

      if (response.ok) {
        // Refresh available cycles from database
        await fetchAvailableCycles();

        setNewCycleName("");
        setAddCycleDialogOpen(false);
        toast({ title: `$1`, variant: "destructive" });
      } else {
        const error = await response.json();
        toast({ title: `$1`, variant: "destructive" });
      }
    } catch (error) {
      console.error("Error creating performance cycle:", error);
      toast({
        title: "Failed to create performance cycle. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAddingCycle(false);
    }
  };

  const handleDeleteCycle = async () => {
    console.log("🗑️ Delete handler called, cycleToDelete:", cycleToDelete);
    if (!cycleToDelete) {
      console.log("❌ No cycle to delete");
      return;
    }
    setDeletingCycle(true);

    try {
      // Check if cycle has any goals (workplan loaded)
      const cycleGoalsCount =
        goals?.filter((g) => g.performanceYear === cycleToDelete).length || 0;
      console.log("📊 Cycle goals count:", cycleGoalsCount);

      if (cycleGoalsCount > 0) {
        console.log("⚠️ Cannot delete - has goals");
        toast({ title: `$1`, variant: "destructive" });
        setDeletingCycle(false);
        setDeleteCycleDialogOpen(false);
        setCycleToDelete(null);
        return;
      }

      console.log("✓ Cycle is empty, proceeding with deletion");

      // Find and delete the performance period from database
      const periodsResponse = await fetch(
        "/dashboard/performance/api/performance-period/available",
        {
          credentials: "include",
        },
      );

      if (periodsResponse.ok) {
        const periods = await periodsResponse.json();
        const periodToDelete = periods.find(
          (p: any) => extractCycleNameFromPeriod(p.name) === cycleToDelete,
        );

        if (periodToDelete) {
          // Delete the performance period
          const deleteResponse = await fetch(
            `/dashboard/performance/api/performance-period/${periodToDelete.id}`,
            {
              method: "DELETE",
              credentials: "include",
            },
          );

          if (deleteResponse.ok) {
            // Refresh available cycles from database
            await fetchAvailableCycles();
          } else {
            const error = await deleteResponse.json();
            toast({ title: `$1`, variant: "destructive" });
            setDeletingCycle(false);
            return;
          }
        } else {
          // If not found in database, it might be a localStorage-only cycle
          console.log("Period not found in database, may be localStorage-only");
        }
      }

      // If deleted cycle was selected, clear selection
      if (selectedCycle === cycleToDelete) {
        console.log("🔄 Clearing selected cycle");
        setSelectedCycle(null);
      }

      setDeleteCycleDialogOpen(false);
      setCycleToDelete(null);
      console.log("✅ Deletion complete");
      toast({ title: `$1`, variant: "destructive" });
    } catch (error) {
      console.error("❌ Error deleting performance cycle:", error);
      toast({
        title: "Failed to delete performance cycle. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingCycle(false);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([fetchGoals(), fetchUsers(), fetchAvailableCycles()]);
    };

    initializeData();
  }, []);

  const handleEditInitiative = (
    initiative: Initiative,
    objective: Objective,
    goal: Goal,
  ) => {
    // Open the wizard to edit - user needs to navigate to the correct goal/objective/initiative
    setWizardOpen(true);
  };

  const handleDeleteInitiative = (initiative: Initiative) => {
    setInitiativeToDelete(initiative);
    setDeleteInitiativeDialogOpen(true);
  };

  const confirmDeleteInitiative = async () => {
    if (!initiativeToDelete) return;
    setDeletingInitiative(true);

    try {
      // Get current user's information
      const currentUserResponse = await fetch(
        "/dashboard/performance/api/users",
        {
          credentials: "include",
        },
      );

      if (!currentUserResponse.ok) {
        toast({
          title: "Failed to fetch users. Please try again.",
          variant: "destructive",
        });
        setDeletingInitiative(false);
        return;
      }

      const allUsers = await currentUserResponse.json();

      // Ensure allUsers is an array
      if (!Array.isArray(allUsers)) {
        console.error("Users response is not an array:", allUsers);
        toast({
          title: "Failed to fetch users. Please try again.",
          variant: "destructive",
        });
        setDeletingInitiative(false);
        return;
      }

      const currentUser = allUsers.find(
        (u: any) => u.email === session?.user?.email,
      );

      // If user is an EXECUTIVE, delete immediately
      if (currentUser?.role === "EXECUTIVE") {
        const deleteResponse = await fetch(
          `/dashboard/performance/api/initiatives/${initiativeToDelete.id}`,
          {
            method: "DELETE",
          },
        );

        if (deleteResponse.ok) {
          setDeleteInitiativeDialogOpen(false);
          setInitiativeToDelete(null);
          toast({ title: "Initiative deleted successfully!" });
          fetchGoals(); // Refresh the goals list
        } else {
          const error = await deleteResponse.json();
          console.error("Delete error:", error);
          toast({ title: `$1`, variant: "destructive" });
        }
        setDeletingInitiative(false);
        return;
      }

      // For non-executives, send notification to an executive
      let receiverId = null;
      let receiverName = "";

      // Find an executive to send the request to
      const executives = allUsers.filter((u: any) => u.role === "EXECUTIVE");
      if (executives.length === 0) {
        toast({
          title: "No executive found to approve deletion",
          variant: "destructive",
        });
        setDeletingInitiative(false);
        return;
      }

      // Send to the first executive (or could be based on department/division)
      receiverId = executives[0].id;
      receiverName = executives[0].name;

      // Send delete request notification
      const response = await fetch("/dashboard/performance/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "DELETE_REQUEST",
          title: `Delete Request: Initiative "${initiativeToDelete.title}"`,
          message: `Requesting approval to delete initiative and all associated tasks.`,
          entityType: "Initiative",
          entityId: initiativeToDelete.id,
          entityData: {
            title: initiativeToDelete.title,
            description: initiativeToDelete.description,
          },
          receiverId,
        }),
      });

      if (response.ok) {
        setDeleteInitiativeDialogOpen(false);
        setInitiativeToDelete(null);
        toast({ title: "Delete request sent to administrator for approval" });
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
      setDeletingInitiative(false);
    }
  };

  const handleClearAll = async () => {
    if (!selectedCycle) {
      toast({
        title: "Please select a performance cycle first",
        variant: "destructive",
      });
      return;
    }

    setClearingAll(true);

    try {
      // Delete all goals for the selected cycle
      const goalsToDelete = filteredGoals.map((goal) => goal.id);

      const deletePromises = goalsToDelete.map((goalId) =>
        fetch(`/dashboard/performance/api/goals/${goalId}`, {
          method: "DELETE",
        }),
      );

      const results = await Promise.all(deletePromises);

      const failedDeletes = results.filter((res) => !res.ok);

      if (failedDeletes.length > 0) {
        toast({ title: `$1`, variant: "destructive" });
      } else {
        toast({ title: `$1`, variant: "destructive" });
        fetchGoals(); // Refresh the goals list
      }

      setClearAllDialogOpen(false);
    } catch (error) {
      console.error("Error clearing all goals:", error);
      toast({
        title: "Failed to clear all goals. Please try again.",
        variant: "destructive",
      });
    } finally {
      setClearingAll(false);
    }
  };

  const handleReportingPeriodChange = async (
    initiativeId: string,
    period: string,
  ) => {
    try {
      const response = await fetch(
        `/dashboard/performance/api/initiatives/${initiativeId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportingPeriods: [period],
          }),
        },
      );

      if (response.ok) {
        // Refresh goals to show updated data
        fetchGoals();
      } else {
        toast({
          title: "Failed to update reporting period",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating reporting period:", error);
      toast({
        title: "Failed to update reporting period",
        variant: "destructive",
      });
    }
  };

  const toggleGoal = (id: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedGoals(newExpanded);
  };

  const toggleObjective = (id: string) => {
    const newExpanded = new Set(expandedObjectives);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedObjectives(newExpanded);
  };

  const toggleInitiative = (id: string) => {
    const newExpanded = new Set(expandedInitiatives);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedInitiatives(newExpanded);
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

  const getInitiativeTasks = (initiativeId: string) => {
    return tasks.filter((task) => task.initiative?.id === initiativeId);
  };

  // Calculate row spans for goals, objectives, and initiatives
  const calculateRowSpans = (goalsToCalculate: Goal[]) => {
    const rowSpans: any = {};
    let rowIndex = 0;

    goalsToCalculate.forEach((goal, goalIndex) => {
      let goalRowCount = 0;

      goal.objectives.forEach((objective, objIndex) => {
        let objectiveRowCount = 0;

        objective.initiatives.forEach((initiative, initIndex) => {
          const initiativeTasks = getInitiativeTasks(initiative.id);
          const initiativeRowCount =
            initiativeTasks.length > 0 ? initiativeTasks.length : 1;

          objectiveRowCount += initiativeRowCount;
          goalRowCount += initiativeRowCount;

          rowSpans[`${goal.id}-${objective.id}-${initiative.id}`] = {
            initiative: initiativeRowCount,
            isFirstInitiative: initIndex === 0,
          };
        });

        rowSpans[`${goal.id}-${objective.id}`] = {
          objective: objectiveRowCount,
          isFirstObjective: objIndex === 0,
        };
      });

      rowSpans[goal.id] = {
        goal: goalRowCount,
        isFirstGoal: true,
      };
    });

    return rowSpans;
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

  // Check page access - only HC Executive and Admin
  if (!canAccessPage && session) {
    return (
      <div className="p-3 sm:p-4 lg:p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-16 w-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Access Restricted
            </h2>
            <p className="text-gray-600 mb-4">
              Task Management is only accessible to the{" "}
              <strong>System Administrator</strong> and{" "}
              <strong>Human Capital Executive</strong> roles.
            </p>
            <p className="text-sm text-gray-500">
              Your current role: <strong>{session.user?.role}</strong>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter goals by selected cycle
  const filteredGoals = selectedCycle
    ? (goals || []).filter((goal) => goal.performanceYear === selectedCycle)
    : goals || [];

  // Calculate row spans for filtered goals
  const rowSpans = calculateRowSpans(filteredGoals);

  // Calculate statistics
  const stats = {
    totalGoals: filteredGoals.length,
    totalObjectives: filteredGoals.reduce(
      (sum, goal) => sum + goal.objectives.length,
      0,
    ),
    totalInitiatives: filteredGoals.reduce(
      (sum, goal) =>
        sum +
        goal.objectives.reduce(
          (objSum, obj) => objSum + obj.initiatives.length,
          0,
        ),
      0,
    ),
    totalActions: filteredGoals.reduce(
      (sum, goal) =>
        sum +
        goal.objectives.reduce(
          (objSum, obj) =>
            objSum + obj.initiatives.filter((init) => init.action).length,
          0,
        ),
      0,
    ),
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
            Task Management
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 leading-tight">
            Strategic goals, objectives, initiatives, and tasks from the Annual
            Work Plan
          </p>
          {selectedCycle && (
            <div
              className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: colors.navyLightest }}
            >
              <Calendar className="h-4 w-4" />
              Current Cycle: {selectedCycle}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {canImportWorkplan && (
            <Button onClick={() => setImportDialogOpen(true)} variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import Annual Workplan
            </Button>
          )}
          {canImportWorkplan && (
            <Button
              onClick={() => setImportContractDialogOpen(true)}
              variant="outline"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Import Performance Contracts
            </Button>
          )}
          {canManageImplementationPlan && (
            <Button onClick={() => setWizardOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Manage Goals, Objectives & Initiatives
            </Button>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <Tabs value={activeGoalsTab} onValueChange={(v) => { setActiveGoalsTab(v as any); if (v === 'manage-360-cycles') fetchCycles360() }}>
        <TabsList className="mb-2">
          <TabsTrigger value="task-management" className="flex items-center gap-2">
            <TargetIcon className="h-4 w-4" />
            Task Management
          </TabsTrigger>
          <TabsTrigger value="manage-360-cycles" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Manage 360 Cycles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="task-management" className="space-y-3 sm:space-y-4 mt-0">

      {/* Performance Cycle Selector */}
      {availableCycles.length > 0 ? (
        <Card className="border-2 border-blue-200 shadow-lg">
          <CardHeader className="bg-linear-to-r from-blue-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Calendar className="h-6 w-6 text-blue-600" />
                  Select Performance Year
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Switch between different annual workplans. Each year maintains
                  its own goals, objectives, and initiatives.
                </p>
              </div>
              <div className="flex gap-2">
                {selectedCycle && (
                  <Badge className="bg-blue-600 text-white text-base px-4 py-2">
                    {filteredGoals.length} Goal
                    {filteredGoals.length !== 1 ? "s" : ""}
                  </Badge>
                )}
                <Button
                  onClick={() => setAddCycleDialogOpen(true)}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Period
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3">
              {availableCycles.map((cycle) => {
                const cycleGoalsCount =
                  goals?.filter((g) => g.performanceYear === cycle).length || 0;
                const isEmpty = cycleGoalsCount === 0;
                const isSelected = cycle === selectedCycle;

                return (
                  <div key={cycle} className="relative group">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setSelectedCycle(cycle)}
                      className={cn(
                        "relative h-auto flex-col items-start p-4 transition-all w-full",
                        isSelected
                          ? "bg-blue-600 text-white hover:bg-blue-700 border-blue-600 shadow-md scale-105"
                          : isEmpty
                            ? "border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                            : "border-gray-300 hover:border-blue-400 hover:bg-blue-50",
                      )}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Calendar
                          className={cn(
                            "h-5 w-5",
                            isEmpty && !isSelected && "text-gray-400",
                          )}
                        />
                        <span className="text-lg font-bold">{cycle}</span>
                        {isEmpty && !isSelected && (
                          <Badge
                            variant="outline"
                            className="ml-auto text-xs border-gray-300 text-gray-500"
                          >
                            Empty
                          </Badge>
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-xs mt-1",
                          isSelected
                            ? "text-blue-100"
                            : isEmpty
                              ? "text-gray-400 italic"
                              : "text-gray-500",
                        )}
                      >
                        {isEmpty
                          ? "No data yet - Import to add"
                          : `${cycleGoalsCount} goal${cycleGoalsCount !== 1 ? "s" : ""}`}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="h-5 w-5 absolute top-2 right-2" />
                      )}
                    </Button>
                    {canImportWorkplan && isEmpty && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCycleToDelete(cycle);
                          setDeleteCycleDialogOpen(true);
                        }}
                        className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-red-100 hover:bg-red-200 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3 text-red-600" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-dashed border-blue-300 bg-blue-50">
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Annual Workplans Yet
            </h3>
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                <p className="text-sm font-semibold text-yellow-900 mb-2">
                  ⚠️ Before importing workplans:
                </p>
                <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                  <li>
                    Create a <strong>Performance Period</strong> in Settings →
                    Performance Period
                  </li>
                  <li>
                    Set the agreement submission deadline and review dates
                  </li>
                  <li>Then return here to import your workplan</li>
                </ol>
              </div>
              <p className="text-gray-600">
                Each performance year will be tracked separately with its own
                workplan.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Cycle Dialog */}
      <Dialog open={addCycleDialogOpen} onOpenChange={setAddCycleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Performance Period</DialogTitle>
            <DialogDescription>
              Create a new performance cycle for tracking goals and objectives.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cycleName">Performance Cycle Name</Label>
              <Input
                id="cycleName"
                placeholder="e.g., 2025/26"
                value={newCycleName}
                onChange={(e) => setNewCycleName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCycle()}
              />
              <p className="text-sm text-gray-500 mt-1">
                Use format "YYYY/YY" (e.g., "2025/26")
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddCycleDialogOpen(false)}
              disabled={addingCycle}
            >
              Cancel
            </Button>
            <Button onClick={handleAddCycle} disabled={addingCycle}>
              {addingCycle ? "Adding..." : "Add Period"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="grid gap-4 md:grid-cols-4">
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setStatsDialogOpen("goals")}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <TargetIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Goals</p>
                <p className="text-2xl font-bold">{stats.totalGoals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setStatsDialogOpen("objectives")}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Objectives</p>
                <p className="text-2xl font-bold">{stats.totalObjectives}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setStatsDialogOpen("initiatives")}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Initiatives</p>
                <p className="text-2xl font-bold">{stats.totalInitiatives}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setStatsDialogOpen("tasks")}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Actions</p>
                <p className="text-2xl font-bold">{stats.totalActions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {filteredGoals.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="py-12 text-center">
            <div className="max-w-md mx-auto">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Data for {selectedCycle}
              </h3>
              <p className="text-gray-600 mb-6">
                The <strong>{selectedCycle}</strong> performance year doesn't
                have any goals yet.
              </p>

              {canImportWorkplan && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
                    <p className="text-sm text-blue-900 mb-2">
                      <strong>To add data for {selectedCycle}:</strong>
                    </p>
                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                      <li>Click "Import Annual Workplan" above</li>
                      <li>
                        Set Performance Year to <strong>{selectedCycle}</strong>
                      </li>
                      <li>Upload your Excel workplan file</li>
                    </ol>
                  </div>

                  <Button
                    onClick={() => setImportDialogOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Workplan for {selectedCycle}
                  </Button>
                </div>
              )}

              {!canImportWorkplan && (
                <p className="text-sm text-gray-500 italic">
                  Contact your HR administrator to import the {selectedCycle}{" "}
                  workplan.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* View Toggle and Clear All */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              {canManageImplementationPlan && filteredGoals.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setClearAllDialogOpen(true)}
                  className="border-red-600 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All ({selectedCycle})
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode("accordion")}
                className={
                  viewMode === "accordion"
                    ? "bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                    : ""
                }
              >
                <List className="h-4 w-4 mr-2" />
                Accordion View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode("table")}
                className={
                  viewMode === "table"
                    ? "bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                    : ""
                }
              >
                <TableIcon className="h-4 w-4 mr-2" />
                Table View
              </Button>
            </div>
          </div>

          {/* Accordion View */}
          {viewMode === "accordion" && (
            <div className="space-y-4">
              {filteredGoals.map((goal) => (
                <Card key={goal.id} className="overflow-hidden">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value={goal.id} className="border-0">
                      <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50">
                        <div className="flex items-center gap-4 text-left w-full">
                          <Badge className="bg-blue-600 text-white shrink-0">
                            Goal {goal.goalNumber}
                          </Badge>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">
                              {goal.title}
                            </h3>
                            {goal.bscPerspective && (
                              <p className="text-sm text-gray-500 mt-1">
                                {goal.bscPerspective}
                              </p>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 shrink-0">
                            {goal.objectives.length} objective
                            {goal.objectives.length !== 1 ? "s" : ""} •{" "}
                            {goal.objectives.reduce(
                              (sum, obj) => sum + obj.initiatives.length,
                              0,
                            )}{" "}
                            initiative
                            {goal.objectives.reduce(
                              (sum, obj) => sum + obj.initiatives.length,
                              0,
                            ) !== 1
                              ? "s"
                              : ""}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4 pt-2">
                        <Accordion
                          type="single"
                          collapsible
                          className="space-y-3"
                        >
                          {goal.objectives.map((objective) => (
                            <AccordionItem
                              key={objective.id}
                              value={objective.id}
                              className="border border-purple-200 rounded-lg"
                            >
                              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-purple-50">
                                <div className="flex items-center gap-3 text-left w-full">
                                  <Badge
                                    variant="outline"
                                    className="bg-purple-100 text-purple-800 shrink-0"
                                  >
                                    SO
                                  </Badge>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-base">
                                      {objective.title}
                                    </h4>
                                    {objective.description && (
                                      <p className="text-sm text-gray-600 mt-1">
                                        {objective.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500 shrink-0">
                                    {objective.initiatives.length} initiative
                                    {objective.initiatives.length !== 1
                                      ? "s"
                                      : ""}
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-3 pt-2">
                                <div className="space-y-3">
                                  {objective.initiatives.map((initiative) => {
                                    const initiativeTasks = getInitiativeTasks(
                                      initiative.id,
                                    );
                                    return (
                                      <div
                                        key={initiative.id}
                                        className="border rounded-lg p-4 bg-gray-50"
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                              <Badge
                                                variant="secondary"
                                                className="text-xs"
                                              >
                                                Initiative
                                              </Badge>
                                              <h5 className="font-medium">
                                                {initiative.title}
                                              </h5>
                                            </div>
                                            {initiative.description && (
                                              <p className="text-sm text-gray-600 mb-2">
                                                {initiative.description}
                                              </p>
                                            )}
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                              {initiative.measure && (
                                                <div>
                                                  <span className="font-medium text-gray-700">
                                                    Measure:
                                                  </span>
                                                  <p className="text-gray-600">
                                                    {initiative.measure}
                                                  </p>
                                                </div>
                                              )}
                                              {initiative.action && (
                                                <div>
                                                  <span className="font-medium text-gray-700">
                                                    Action:
                                                  </span>
                                                  <p className="text-gray-600">
                                                    {initiative.action}
                                                  </p>
                                                </div>
                                              )}
                                              {initiative.target && (
                                                <div>
                                                  <span className="font-medium text-gray-700">
                                                    Target:
                                                  </span>
                                                  <p className="text-gray-600">
                                                    {initiative.target}
                                                  </p>
                                                </div>
                                              )}
                                              {initiative.reportingPeriods &&
                                                initiative.reportingPeriods
                                                  .length > 0 && (
                                                  <div>
                                                    <span className="font-medium text-gray-700">
                                                      Reporting:
                                                    </span>
                                                    <p className="text-gray-600">
                                                      {initiative.reportingPeriods.join(
                                                        ", ",
                                                      )}
                                                    </p>
                                                  </div>
                                                )}
                                              {initiative.quarterDates && (
                                                <div className="col-span-2">
                                                  <span className="font-medium text-gray-700">
                                                    Quarterly Targets:
                                                  </span>
                                                  <div className="flex gap-2 mt-1">
                                                    {[
                                                      "q1",
                                                      "q2",
                                                      "q3",
                                                      "q4",
                                                    ].map((quarter, idx) => {
                                                      const value =
                                                        initiative
                                                          .quarterDates?.[
                                                          quarter as keyof typeof initiative.quarterDates
                                                        ];
                                                      if (!value) return null;
                                                      return (
                                                        <Badge
                                                          key={quarter}
                                                          variant="outline"
                                                          className="text-xs"
                                                        >
                                                          Q{idx + 1}: {value}
                                                        </Badge>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              )}
                                              {(initiative.primaryResponsibility ||
                                                initiative.secondaryResponsibility) && (
                                                <div className="col-span-2">
                                                  <span className="font-medium text-gray-700">
                                                    Responsibility:
                                                  </span>
                                                  <div className="flex gap-2 mt-1">
                                                    {initiative.primaryResponsibility && (
                                                      <Badge className="text-xs bg-green-100 text-green-800">
                                                        Primary:{" "}
                                                        {
                                                          initiative.primaryResponsibility
                                                        }
                                                      </Badge>
                                                    )}
                                                    {initiative.secondaryResponsibility && (
                                                      <Badge className="text-xs bg-blue-100 text-blue-800">
                                                        Secondary:{" "}
                                                        {
                                                          initiative.secondaryResponsibility
                                                        }
                                                      </Badge>
                                                    )}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                            {initiativeTasks.length > 0 && (
                                              <div className="mt-3 pt-3 border-t">
                                                <span className="font-medium text-gray-700 text-sm">
                                                  Tasks (
                                                  {initiativeTasks.length}):
                                                </span>
                                                <ul className="mt-2 space-y-1">
                                                  {initiativeTasks.map(
                                                    (task) => (
                                                      <li
                                                        key={task.id}
                                                        className="text-sm text-gray-600 flex items-center gap-2"
                                                      >
                                                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                                                        {task.title}
                                                      </li>
                                                    ),
                                                  )}
                                                </ul>
                                              </div>
                                            )}
                                          </div>
                                          {canManageImplementationPlan && (
                                            <div className="flex gap-2">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                  setInitiativeToDelete(
                                                    initiative,
                                                  );
                                                  setDeleteInitiativeDialogOpen(
                                                    true,
                                                  );
                                                }}
                                              >
                                                <Trash2 className="h-4 w-4 text-red-600" />
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </Card>
              ))}
            </div>
          )}

          {/* Table View */}
          {viewMode === "table" && (
            <Card>
              <CardContent className="p-0">
                <div
                  className="overflow-auto relative block"
                  style={{ maxHeight: "calc(100vh - 400px)" }}
                >
                  <Table>
                    <TableHeader className="sticky top-0 bg-gray-50 z-10 border-b-2 shadow-sm">
                      <TableRow>
                        <TableHead className="font-bold bg-gray-50 sticky left-0 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          Goal
                        </TableHead>
                        <TableHead className="font-bold bg-gray-50 border-r">
                          Strategic Objective
                        </TableHead>
                        <TableHead className="font-bold bg-gray-50 border-r">
                          Strategic Initiative
                        </TableHead>
                        <TableHead className="font-bold bg-gray-50 border-r">
                          Measure
                        </TableHead>
                        <TableHead className="font-bold bg-gray-50 border-r">
                          Action
                        </TableHead>
                        <TableHead className="font-bold bg-gray-50 border-r">
                          Reporting Period
                        </TableHead>
                        <TableHead className="font-bold bg-gray-50 border-r">
                          Annual Target
                        </TableHead>
                        <TableHead className="font-bold bg-gray-50 border-r">
                          Quarterly Targets
                        </TableHead>
                        <TableHead className="font-bold bg-gray-50 border-r">
                          Due Date
                        </TableHead>
                        <TableHead className="font-bold bg-gray-50 border-r">
                          Primary Responsibility
                        </TableHead>
                        <TableHead className="font-bold bg-gray-50 border-r">
                          Secondary Responsibility
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGoals.map((goal, goalIndex) =>
                        goal.objectives.map((objective, objIndex) =>
                          objective.initiatives.map((initiative, initIndex) => {
                            const initiativeTasks = getInitiativeTasks(
                              initiative.id,
                            );
                            const goalSpan = rowSpans[goal.id];
                            const objectiveSpan =
                              rowSpans[`${goal.id}-${objective.id}`];
                            const initiativeSpan =
                              rowSpans[
                                `${goal.id}-${objective.id}-${initiative.id}`
                              ];

                            // If no tasks, show one row with initiative info
                            if (initiativeTasks.length === 0) {
                              return (
                                <TableRow
                                  key={`${goal.id}-${objective.id}-${initiative.id}`}
                                >
                                  {objIndex === 0 && initIndex === 0 && (
                                    <TableCell
                                      className="border-r text-center font-bold bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                                      rowSpan={goalSpan.goal}
                                    >
                                      <div className="flex items-center justify-center gap-2">
                                        {goal.goalNumber}
                                      </div>
                                    </TableCell>
                                  )}
                                  {initIndex === 0 && (
                                    <TableCell
                                      className="border-r"
                                      rowSpan={objectiveSpan.objective}
                                    >
                                      {objective.title}
                                    </TableCell>
                                  )}
                                  <TableCell className="border-r">
                                    <div className="flex items-center gap-2">
                                      {initiative.title}
                                      {canManageImplementationPlan && (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              handleEditInitiative(
                                                initiative,
                                                objective,
                                                goal,
                                              )
                                            }
                                            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              handleDeleteInitiative(initiative)
                                            }
                                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="border-r text-sm">
                                    {initiative.measure || "-"}
                                  </TableCell>
                                  <TableCell className="border-r text-sm">
                                    {initiative.action || "-"}
                                  </TableCell>
                                  <TableCell className="border-r text-sm">
                                    {canManageImplementationPlan ? (
                                      <Select
                                        value={
                                          initiative.reportingPeriods?.[0] || ""
                                        }
                                        onValueChange={(value) =>
                                          handleReportingPeriodChange(
                                            initiative.id,
                                            value,
                                          )
                                        }
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Annual">
                                            Annual
                                          </SelectItem>
                                          <SelectItem value="Quarterly">
                                            Quarterly
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : initiative.reportingPeriods &&
                                      initiative.reportingPeriods.length > 0 ? (
                                      initiative.reportingPeriods.join(", ")
                                    ) : (
                                      "-"
                                    )}
                                  </TableCell>
                                  <TableCell className="border-r text-sm">
                                    {initiative.target || "-"}
                                  </TableCell>
                                  <TableCell className="border-r">
                                    <div className="flex gap-1">
                                      {["Q1", "Q2", "Q3", "Q4"].map(
                                        (quarter, idx) => {
                                          const quarterKey = `q${idx + 1}` as
                                            | "q1"
                                            | "q2"
                                            | "q3"
                                            | "q4";
                                          const isChecked =
                                            initiative.quarterDates?.[
                                              quarterKey
                                            ];
                                          const dateRange = isChecked
                                            ? (() => {
                                                const months = [
                                                  [
                                                    "Mar-Jun",
                                                    "Jul-Sep",
                                                    "Oct-Dec",
                                                    "Jan-Mar",
                                                  ],
                                                  [
                                                    "Mar-Jun",
                                                    "Jul-Sep",
                                                    "Oct-Dec",
                                                    "Jan-Mar",
                                                  ],
                                                ];
                                                return months[0][idx];
                                              })()
                                            : null;
                                          return (
                                            <div
                                              key={quarter}
                                              className={`px-2 py-1 text-xs rounded ${
                                                isChecked
                                                  ? "bg-blue-100 text-blue-700 font-medium"
                                                  : "bg-gray-100 text-gray-400"
                                              }`}
                                              title={dateRange || ""}
                                            >
                                              {quarter}
                                            </div>
                                          );
                                        },
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="border-r text-sm">
                                    <div className="flex items-center gap-2">
                                      <span>
                                        {(() => {
                                          if (initiative.dueDate) {
                                            return new Date(
                                              initiative.dueDate,
                                            ).toLocaleDateString("en-US", {
                                              year: "numeric",
                                              month: "short",
                                              day: "numeric",
                                            });
                                          }
                                          const calculateDueDate = (
                                            quarterDates: any,
                                          ) => {
                                            const currentYear =
                                              new Date().getFullYear();
                                            const nextYear = currentYear + 1;
                                            if (quarterDates?.q4)
                                              return new Date(nextYear, 2, 31);
                                            if (quarterDates?.q3)
                                              return new Date(
                                                currentYear,
                                                11,
                                                31,
                                              );
                                            if (quarterDates?.q2)
                                              return new Date(
                                                currentYear,
                                                8,
                                                30,
                                              );
                                            if (quarterDates?.q1)
                                              return new Date(
                                                currentYear,
                                                5,
                                                30,
                                              );
                                            return new Date(
                                              currentYear,
                                              11,
                                              31,
                                            );
                                          };
                                          const dueDate = calculateDueDate(
                                            initiative.quarterDates,
                                          );
                                          return dueDate.toLocaleDateString(
                                            "en-US",
                                            {
                                              year: "numeric",
                                              month: "short",
                                              day: "numeric",
                                            },
                                          );
                                        })()}
                                      </span>
                                      {canManageImplementationPlan && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setEditingInitiative(initiative);
                                            const currentDue =
                                              initiative.dueDate ||
                                              (() => {
                                                const calculateDueDate = (
                                                  quarterDates: any,
                                                ) => {
                                                  const currentYear =
                                                    new Date().getFullYear();
                                                  const nextYear =
                                                    currentYear + 1;
                                                  if (quarterDates?.q4)
                                                    return new Date(
                                                      nextYear,
                                                      2,
                                                      31,
                                                    );
                                                  if (quarterDates?.q3)
                                                    return new Date(
                                                      currentYear,
                                                      11,
                                                      31,
                                                    );
                                                  if (quarterDates?.q2)
                                                    return new Date(
                                                      currentYear,
                                                      8,
                                                      30,
                                                    );
                                                  if (quarterDates?.q1)
                                                    return new Date(
                                                      currentYear,
                                                      5,
                                                      30,
                                                    );
                                                  return new Date(
                                                    currentYear,
                                                    11,
                                                    31,
                                                  );
                                                };
                                                return calculateDueDate(
                                                  initiative.quarterDates,
                                                ).toISOString();
                                              })();
                                            setNewDueDate(
                                              new Date(currentDue)
                                                .toISOString()
                                                .split("T")[0],
                                            );
                                            setDueDateDialogOpen(true);
                                          }}
                                          className="h-6 w-6 p-0"
                                        >
                                          <Calendar className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="border-r text-sm">
                                    {initiative.primaryResponsibleUser?.name ||
                                      "-"}
                                  </TableCell>
                                  <TableCell className="border-r text-sm">
                                    {initiative.secondaryResponsibleUser
                                      ?.name || "-"}
                                  </TableCell>
                                </TableRow>
                              );
                            }

                            // Show one row per task
                            return initiativeTasks.map((task, taskIndex) => (
                              <TableRow
                                key={task.id}
                                className="hover:bg-gray-50"
                              >
                                {objIndex === 0 &&
                                  initIndex === 0 &&
                                  taskIndex === 0 && (
                                    <TableCell
                                      className="border-r text-center font-bold bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                                      rowSpan={goalSpan.goal}
                                    >
                                      <div className="flex items-center justify-center gap-2">
                                        {goal.goalNumber}
                                      </div>
                                    </TableCell>
                                  )}
                                {initIndex === 0 && taskIndex === 0 && (
                                  <TableCell
                                    className="border-r"
                                    rowSpan={objectiveSpan.objective}
                                  >
                                    {objective.title}
                                  </TableCell>
                                )}
                                {taskIndex === 0 && (
                                  <>
                                    <TableCell
                                      className="border-r"
                                      rowSpan={initiativeSpan.initiative}
                                    >
                                      <div className="flex items-center gap-2">
                                        {initiative.title}
                                        {canManageImplementationPlan && (
                                          <>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                handleEditInitiative(
                                                  initiative,
                                                  objective,
                                                  goal,
                                                )
                                              }
                                              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                                            >
                                              <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                handleDeleteInitiative(
                                                  initiative,
                                                )
                                              }
                                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell
                                      className="border-r text-sm"
                                      rowSpan={initiativeSpan.initiative}
                                    >
                                      {initiative.measure || "-"}
                                    </TableCell>
                                    <TableCell
                                      className="border-r text-sm"
                                      rowSpan={initiativeSpan.initiative}
                                    >
                                      {initiative.action || "-"}
                                    </TableCell>
                                    <TableCell
                                      className="border-r text-sm"
                                      rowSpan={initiativeSpan.initiative}
                                    >
                                      {canManageImplementationPlan ? (
                                        <Select
                                          value={
                                            initiative.reportingPeriods?.[0] ||
                                            ""
                                          }
                                          onValueChange={(value) =>
                                            handleReportingPeriodChange(
                                              initiative.id,
                                              value,
                                            )
                                          }
                                        >
                                          <SelectTrigger className="h-8">
                                            <SelectValue placeholder="Select" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Annual">
                                              Annual
                                            </SelectItem>
                                            <SelectItem value="Quarterly">
                                              Quarterly
                                            </SelectItem>
                                          </SelectContent>
                                        </Select>
                                      ) : initiative.reportingPeriods &&
                                        initiative.reportingPeriods.length >
                                          0 ? (
                                        initiative.reportingPeriods.join(", ")
                                      ) : (
                                        "-"
                                      )}
                                    </TableCell>
                                    <TableCell
                                      className="border-r text-sm"
                                      rowSpan={initiativeSpan.initiative}
                                    >
                                      {initiative.target || "-"}
                                    </TableCell>
                                    <TableCell
                                      className="border-r"
                                      rowSpan={initiativeSpan.initiative}
                                    >
                                      <div className="flex gap-1">
                                        {["Q1", "Q2", "Q3", "Q4"].map(
                                          (quarter, idx) => {
                                            const quarterKey = `q${idx + 1}` as
                                              | "q1"
                                              | "q2"
                                              | "q3"
                                              | "q4";
                                            const isChecked =
                                              initiative.quarterDates?.[
                                                quarterKey
                                              ];
                                            const dateRange = isChecked
                                              ? (() => {
                                                  const months = [
                                                    [
                                                      "Mar-Jun",
                                                      "Jul-Sep",
                                                      "Oct-Dec",
                                                      "Jan-Mar",
                                                    ],
                                                    [
                                                      "Mar-Jun",
                                                      "Jul-Sep",
                                                      "Oct-Dec",
                                                      "Jan-Mar",
                                                    ],
                                                  ];
                                                  return months[0][idx];
                                                })()
                                              : null;
                                            return (
                                              <div
                                                key={quarter}
                                                className={`px-2 py-1 text-xs rounded ${
                                                  isChecked
                                                    ? "bg-blue-100 text-blue-700 font-medium"
                                                    : "bg-gray-100 text-gray-400"
                                                }`}
                                                title={dateRange || ""}
                                              >
                                                {quarter}
                                              </div>
                                            );
                                          },
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell
                                      className="border-r text-sm"
                                      rowSpan={initiativeSpan.initiative}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span>
                                          {(() => {
                                            if (initiative.dueDate) {
                                              return new Date(
                                                initiative.dueDate,
                                              ).toLocaleDateString("en-US", {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                              });
                                            }
                                            const calculateDueDate = (
                                              quarterDates: any,
                                            ) => {
                                              const currentYear =
                                                new Date().getFullYear();
                                              const nextYear = currentYear + 1;
                                              if (quarterDates?.q4)
                                                return new Date(
                                                  nextYear,
                                                  2,
                                                  31,
                                                );
                                              if (quarterDates?.q3)
                                                return new Date(
                                                  currentYear,
                                                  11,
                                                  31,
                                                );
                                              if (quarterDates?.q2)
                                                return new Date(
                                                  currentYear,
                                                  8,
                                                  30,
                                                );
                                              if (quarterDates?.q1)
                                                return new Date(
                                                  currentYear,
                                                  5,
                                                  30,
                                                );
                                              return new Date(
                                                currentYear,
                                                11,
                                                31,
                                              );
                                            };
                                            const dueDate = calculateDueDate(
                                              initiative.quarterDates,
                                            );
                                            return dueDate.toLocaleDateString(
                                              "en-US",
                                              {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                              },
                                            );
                                          })()}
                                        </span>
                                        {canManageImplementationPlan && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              setEditingInitiative(initiative);
                                              const currentDue =
                                                initiative.dueDate ||
                                                (() => {
                                                  const calculateDueDate = (
                                                    quarterDates: any,
                                                  ) => {
                                                    const currentYear =
                                                      new Date().getFullYear();
                                                    const nextYear =
                                                      currentYear + 1;
                                                    if (quarterDates?.q4)
                                                      return new Date(
                                                        nextYear,
                                                        2,
                                                        31,
                                                      );
                                                    if (quarterDates?.q3)
                                                      return new Date(
                                                        currentYear,
                                                        11,
                                                        31,
                                                      );
                                                    if (quarterDates?.q2)
                                                      return new Date(
                                                        currentYear,
                                                        8,
                                                        30,
                                                      );
                                                    if (quarterDates?.q1)
                                                      return new Date(
                                                        currentYear,
                                                        5,
                                                        30,
                                                      );
                                                    return new Date(
                                                      currentYear,
                                                      11,
                                                      31,
                                                    );
                                                  };
                                                  return calculateDueDate(
                                                    initiative.quarterDates,
                                                  ).toISOString();
                                                })();
                                              setNewDueDate(
                                                new Date(currentDue)
                                                  .toISOString()
                                                  .split("T")[0],
                                              );
                                              setDueDateDialogOpen(true);
                                            }}
                                            className="h-6 w-6 p-0"
                                          >
                                            <Calendar className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell
                                      className="border-r text-sm"
                                      rowSpan={initiativeSpan.initiative}
                                    >
                                      {initiative.primaryResponsibleUser
                                        ?.name || "-"}
                                    </TableCell>
                                    <TableCell
                                      className="border-r text-sm"
                                      rowSpan={initiativeSpan.initiative}
                                    >
                                      {initiative.secondaryResponsibleUser
                                        ?.name || "-"}
                                    </TableCell>
                                  </>
                                )}
                              </TableRow>
                            ));
                          }),
                        ),
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

        </TabsContent>

        {/* ══════════ MANAGE 360 CYCLES TAB ══════════ */}
        <TabsContent value="manage-360-cycles" className="space-y-4 mt-0">
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
                  <p>No cycles yet. Create one above to get started.</p>
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
      </Tabs>

      {/* Delete 360 Cycle Confirmation */}
      <AlertDialog open={!!deleteCycle360} onOpenChange={(o) => !o && setDeleteCycle360(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Delete Rating Cycle?</AlertDialogTitle>
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

      {/* Manage Goals, Objectives & Initiatives */}
      <ManageGoalsObjectives
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onSuccess={fetchGoals}
      />

      {/* Goal Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Goal {selectedGoal?.goalNumber}: {selectedGoal?.title}
            </DialogTitle>
            <DialogDescription>
              Complete goal information and strategic alignment
            </DialogDescription>
          </DialogHeader>

          {selectedGoal && (
            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Goal Number
                  </Label>
                  <p className="text-lg font-semibold">
                    {selectedGoal.goalNumber}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Goal Title
                  </Label>
                  <p className="text-lg">{selectedGoal.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Start Date
                  </Label>
                  <p className="text-lg">
                    {new Date(selectedGoal.startDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    End Date
                  </Label>
                  <p className="text-lg">
                    {new Date(selectedGoal.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {selectedGoal.description && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Description
                  </Label>
                  <p className="text-gray-600 mt-1">
                    {selectedGoal.description}
                  </p>
                </div>
              )}

              {/* Statistics */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {selectedGoal.objectives.length}
                      </p>
                      <p className="text-sm text-gray-600">Objectives</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {selectedGoal.objectives.reduce(
                          (sum, obj) => sum + obj.initiatives.length,
                          0,
                        )}
                      </p>
                      <p className="text-sm text-gray-600">Initiatives</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Objectives List */}
              <div>
                <Label className="text-lg font-semibold mb-3 block">
                  Objectives & Initiatives
                </Label>
                <div className="space-y-4">
                  {selectedGoal.objectives.map((objective, idx) => (
                    <Card key={objective.id}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Badge variant="outline">{idx + 1}</Badge>
                          {objective.title}
                        </CardTitle>
                        {objective.description && (
                          <p className="text-sm text-gray-600">
                            {objective.description}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">
                            {objective.initiatives.length} Initiative(s):
                          </p>
                          {objective.initiatives.map((initiative, initIdx) => (
                            <div
                              key={initiative.id}
                              className="pl-4 border-l-2 border-gray-200"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium">
                                    {initIdx + 1}. {initiative.title}
                                  </p>
                                  {initiative.description && (
                                    <p className="text-xs text-gray-500">
                                      {initiative.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Goal Wizard */}
      <EditGoalWizard
        open={editWizardOpen}
        onOpenChange={setEditWizardOpen}
        onSuccess={fetchGoals}
        users={users}
        goal={goalToEdit}
      />

      {/* Edit Due Date Dialog */}
      <Dialog open={dueDateDialogOpen} onOpenChange={setDueDateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Due Date</DialogTitle>
            <DialogDescription>
              Update the due date for: {editingInitiative?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDueDateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateDueDate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Initiative Confirmation Dialog */}
      <AlertDialog
        open={deleteInitiativeDialogOpen}
        onOpenChange={setDeleteInitiativeDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Initiative?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{initiativeToDelete?.title}</strong>?
              <br />
              <br />
              This will permanently delete the initiative and all associated
              tasks.
              <br />
              <span className="text-yellow-600 font-semibold">
                Note: The goal and objectives will remain intact.
              </span>
              <br />
              <br />
              {session?.user?.role === "EXECUTIVE" ? (
                <span className="text-red-600 font-semibold">
                  This action cannot be undone.
                </span>
              ) : (
                <span className="text-blue-600 font-semibold">
                  This will send a deletion request to an executive for
                  approval.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingInitiative}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteInitiative}
              disabled={deletingInitiative}
              className="bg-red-600 hover:bg-red-700"
            >
              {session?.user?.role === "EXECUTIVE"
                ? deletingInitiative
                  ? "Deleting..."
                  : "Delete Initiative"
                : deletingInitiative
                  ? "Sending Request..."
                  : "Request Deletion"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stats Detail Dialog */}
      <Dialog
        open={statsDialogOpen !== null}
        onOpenChange={() => setStatsDialogOpen(null)}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {statsDialogOpen === "goals" && "All Goals"}
              {statsDialogOpen === "objectives" && "All Objectives"}
              {statsDialogOpen === "initiatives" && "All Initiatives"}
              {statsDialogOpen === "tasks" && "All Actions"}
            </DialogTitle>
            <DialogDescription>
              {statsDialogOpen === "goals" &&
                "View all strategic goals in the system"}
              {statsDialogOpen === "objectives" &&
                "View all strategic objectives in the system"}
              {statsDialogOpen === "initiatives" &&
                "View all strategic initiatives in the system"}
              {statsDialogOpen === "tasks" &&
                "View all actions defined in initiatives"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {statsDialogOpen === "goals" && (
              <>
                {filteredGoals
                  .sort((a, b) => {
                    const numA = parseInt(a.goalNumber) || 0;
                    const numB = parseInt(b.goalNumber) || 0;
                    return numA - numB;
                  })
                  .map((goal) => (
                    <div key={goal.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-semibold text-blue-600">
                        {goal.goalNumber} - {goal.title}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {goal.objectives.length} objectives
                      </div>
                    </div>
                  ))}
              </>
            )}
            {statsDialogOpen === "objectives" && (
              <>
                {filteredGoals.map((goal) =>
                  goal.objectives
                    .sort((a, b) => {
                      const numA = parseInt(a.title.split(".")[0]) || 0;
                      const numB = parseInt(b.title.split(".")[0]) || 0;
                      return numA - numB;
                    })
                    .map((objective) => (
                      <div
                        key={objective.id}
                        className="p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="font-semibold text-purple-600">
                          {objective.title}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Goal {goal.goalNumber} •{" "}
                          {objective.initiatives.length} initiatives
                        </div>
                      </div>
                    )),
                )}
              </>
            )}
            {statsDialogOpen === "initiatives" && (
              <>
                {filteredGoals.map((goal) =>
                  goal.objectives.map((objective) =>
                    objective.initiatives.map((initiative) => (
                      <div
                        key={initiative.id}
                        className="p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="font-semibold text-orange-600">
                          {initiative.title}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Goal {goal.goalNumber} • {objective.title}
                        </div>
                      </div>
                    )),
                  ),
                )}
              </>
            )}
            {statsDialogOpen === "tasks" && (
              <>
                {filteredGoals.map((goal) =>
                  goal.objectives.map((objective) =>
                    objective.initiatives
                      .filter((init) => init.action)
                      .map((initiative) => (
                        <div
                          key={initiative.id}
                          className="p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="font-semibold text-green-600">
                            {initiative.title}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            <div>
                              <strong>Action:</strong> {initiative.action}
                            </div>
                            {initiative.measure && (
                              <div className="mt-1">
                                <strong>Measure:</strong> {initiative.measure}
                              </div>
                            )}
                            {initiative.target && (
                              <div className="mt-1">
                                <strong>Target:</strong> {initiative.target}
                              </div>
                            )}
                            <div className="mt-1 text-xs text-gray-500">
                              Goal {goal.goalNumber} • {objective.title}
                            </div>
                          </div>
                        </div>
                      )),
                  ),
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Task Confirmation Dialog */}
      <AlertDialog
        open={deleteTaskDialogOpen}
        onOpenChange={setDeleteTaskDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingTask}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!taskToDelete) return;

                setDeletingTask(true);
                try {
                  const response = await fetch(
                    `/dashboard/performance/api/targets/${taskToDelete}`,
                    {
                      method: "DELETE",
                    },
                  );

                  if (response.ok) {
                    toast({ title: "Task deleted successfully!" });
                    setDeleteTaskDialogOpen(false);
                    setTaskToDelete(null);
                    fetchGoals();
                  } else {
                    toast({
                      title: "Failed to delete task",
                      variant: "destructive",
                    });
                  }
                } catch (error) {
                  console.error("Error deleting task:", error);
                  toast({
                    title: "Error deleting task",
                    variant: "destructive",
                  });
                } finally {
                  setDeletingTask(false);
                }
              }}
              disabled={deletingTask}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingTask ? "Deleting..." : "Delete Task"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Task Creation Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Select a goal, objective, and initiative to create a task under
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Goal Selection */}
            <div>
              <Label>Strategic Goal *</Label>
              <Select
                value={selectedGoalId}
                onValueChange={(value) => {
                  setSelectedGoalId(value);
                  setSelectedObjectiveId("");
                  setSelectedInitiativeId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a goal" />
                </SelectTrigger>
                <SelectContent>
                  {goals
                    .sort((a, b) => {
                      const numA = parseInt(a.goalNumber) || 0;
                      const numB = parseInt(b.goalNumber) || 0;
                      return numA - numB;
                    })
                    .map((goal) => (
                      <SelectItem key={goal.id} value={goal.id}>
                        {goal.goalNumber} - {goal.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Objective Selection */}
            {selectedGoalId && (
              <div>
                <Label>Strategic Objective *</Label>
                <Select
                  value={selectedObjectiveId}
                  onValueChange={(value) => {
                    setSelectedObjectiveId(value);
                    setSelectedInitiativeId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an objective" />
                  </SelectTrigger>
                  <SelectContent>
                    {goals
                      .find((g) => g.id === selectedGoalId)
                      ?.objectives.map((objective) => (
                        <SelectItem key={objective.id} value={objective.id}>
                          {objective.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Initiative Selection */}
            {selectedObjectiveId && (
              <div>
                <Label>Strategic Initiative *</Label>
                <Select
                  value={selectedInitiativeId}
                  onValueChange={setSelectedInitiativeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an initiative" />
                  </SelectTrigger>
                  <SelectContent>
                    {goals
                      .find((g) => g.id === selectedGoalId)
                      ?.objectives.find((o) => o.id === selectedObjectiveId)
                      ?.initiatives.map((initiative) => (
                        <SelectItem key={initiative.id} value={initiative.id}>
                          {initiative.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Task Details */}
            {selectedInitiativeId && (
              <>
                <div>
                  <Label htmlFor="task-title">Task Title *</Label>
                  <Input
                    id="task-title"
                    name="taskTitle"
                    value={taskFormData.title}
                    onChange={(e) =>
                      setTaskFormData({
                        ...taskFormData,
                        title: e.target.value,
                      })
                    }
                    placeholder="Enter task title"
                  />
                </div>

                <div>
                  <Label>Task Description</Label>
                  <Textarea
                    value={taskFormData.description}
                    onChange={(e) =>
                      setTaskFormData({
                        ...taskFormData,
                        description: e.target.value,
                      })
                    }
                    placeholder="Enter task description"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="task-due-date">Due Date</Label>
                  <Input
                    id="task-due-date"
                    name="taskDueDate"
                    type="date"
                    value={taskFormData.dueDate}
                    onChange={(e) =>
                      setTaskFormData({
                        ...taskFormData,
                        dueDate: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label>Assign To *</Label>
                  <Select
                    value={taskFormData.responsibleId}
                    onValueChange={(value) =>
                      setTaskFormData({ ...taskFormData, responsibleId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a person" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} - {user.division?.name || "No Division"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setTaskDialogOpen(false);
                setSelectedGoalId("");
                setSelectedObjectiveId("");
                setSelectedInitiativeId("");
                setTaskFormData({
                  title: "",
                  description: "",
                  dueDate: "",
                  responsibleId: "",
                });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (
                  !taskFormData.title ||
                  !taskFormData.responsibleId ||
                  !selectedInitiativeId
                ) {
                  toast({
                    title: "Please fill in all required fields",
                    variant: "destructive",
                  });
                  return;
                }

                try {
                  const response = await fetch(
                    "/dashboard/performance/api/targets",
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        title: taskFormData.title,
                        description: taskFormData.description,
                        dueDate: taskFormData.dueDate,
                        responsibleId: taskFormData.responsibleId,
                        initiativeId: selectedInitiativeId,
                      }),
                    },
                  );

                  if (response.ok) {
                    toast({ title: "Task created successfully!" });
                    setTaskDialogOpen(false);
                    setSelectedGoalId("");
                    setSelectedObjectiveId("");
                    setSelectedInitiativeId("");
                    setTaskFormData({
                      title: "",
                      description: "",
                      dueDate: "",
                      responsibleId: "",
                    });
                    fetchGoals();
                  } else {
                    toast({
                      title: "Failed to create task",
                      variant: "destructive",
                    });
                  }
                } catch (error) {
                  console.error("Error creating task:", error);
                  toast({
                    title: "Error creating task",
                    variant: "destructive",
                  });
                }
              }}
              disabled={
                !taskFormData.title ||
                !taskFormData.responsibleId ||
                !selectedInitiativeId
              }
            >
              Create Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Goals Dialog */}
      <ImportGoalsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={fetchGoals}
        defaultYear={selectedCycle || undefined}
      />

      {/* Import Performance Contracts Dialog */}
      <ImportPerformanceContractDialog
        open={importContractDialogOpen}
        onOpenChange={setImportContractDialogOpen}
        onImportComplete={fetchGoals}
      />

      {/* Clear All Confirmation Dialog */}
      <AlertDialog
        open={clearAllDialogOpen}
        onOpenChange={setClearAllDialogOpen}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Clear All Goals for {selectedCycle}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-muted-foreground text-sm space-y-3">
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-900 font-semibold mb-2">
                    ⚠️ Warning: This will permanently delete:
                  </p>
                  <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                    <li>
                      <strong>All {filteredGoals.length} goal(s)</strong> for{" "}
                      {selectedCycle}
                    </li>
                    <li>All associated objectives</li>
                    <li>All associated initiatives</li>
                    <li>All associated tasks</li>
                  </ul>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-900">
                    ℹ️ <strong>Note:</strong> Only data for{" "}
                    <strong>{selectedCycle}</strong> will be deleted. Other
                    performance years will not be affected.
                  </p>
                </div>

                <p className="text-red-600 font-bold text-center">
                  THIS ACTION CANNOT BE UNDONE!
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearingAll}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              disabled={clearingAll}
              className="bg-red-600 hover:bg-red-700"
            >
              {clearingAll
                ? "Deleting..."
                : `Yes, Delete All ${selectedCycle} Data`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Cycle Confirmation Dialog */}
      <AlertDialog
        open={deleteCycleDialogOpen}
        onOpenChange={setDeleteCycleDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Performance Cycle?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-muted-foreground text-sm space-y-3">
                <p>
                  Are you sure you want to delete the performance cycle{" "}
                  <strong>"{cycleToDelete}"</strong>?
                </p>

                {cycleToDelete &&
                goals?.filter((g) => g.performanceYear === cycleToDelete)
                  .length === 0 ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-green-800 font-semibold">
                      ✓ This cycle is empty and can be safely deleted.
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      No workplan has been loaded to this cycle yet.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-800 font-semibold">
                      ⚠️ Cannot Delete - Workplan Active
                    </p>
                    <p className="text-sm text-red-700 mt-2">
                      This cycle contains{" "}
                      {
                        goals?.filter(
                          (g) => g.performanceYear === cycleToDelete,
                        ).length
                      }{" "}
                      goal(s) and cannot be deleted.
                    </p>
                    <p className="text-sm text-red-700 mt-2">
                      <strong>Policy:</strong> Performance cycles with loaded
                      workplans are protected to maintain historical tracking
                      and ensure accountability for past performance periods.
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingCycle}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCycle}
              disabled={deletingCycle}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingCycle ? "Deleting..." : "Delete Cycle"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
