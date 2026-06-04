"use client";

import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  User,
  Building2,
  BarChart3,
  AlertTriangle,
  Calendar,
  Settings,
} from "lucide-react";
import {
  BarChart,
  PieChart,
  LineChart,
  AreaChart,
} from "@/components/ui/echarts-wrapper";
import { chartColors, chartContainerSizes } from "@/lib/echarts-config";
import { useSession } from "@/lib/pms-auth-adapter";
import { gradients, shadows } from "@/app/ui-standards";

interface Stats {
  totalAgreements: number;
  totalUsers: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  overdue: number;
  completionRate: number;
}

interface DepartmentStats extends Stats {
  departmentId: string;
  departmentName: string;
  completedUsers?: UserDetail[];
  inProgressUsers?: UserDetail[];
  notStartedUsers?: UserDetail[];
  noAgreementsUsers?: UserDetail[];
  overdueUsers?: UserDetail[];
}

interface UserDetail {
  id: string;
  name: string;
  email: string;
}

interface DivisionStats extends Stats {
  divisionId: string;
  divisionName: string;
  completedUsers?: UserDetail[];
  inProgressUsers?: UserDetail[];
  notStartedUsers?: UserDetail[];
  noAgreementsUsers?: UserDetail[];
  overdueUsers?: UserDetail[];
}

interface AgreementData {
  organization: Stats;
  departments: DepartmentStats[];
  divisions: DivisionStats[];
}

interface DivisionInfo {
  id: string;
  name: string;
  departmentId: string;
}

export default function PerformanceAgreementsTrackingPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<AgreementData | null>(null);
  const [userDepartmentId, setUserDepartmentId] = useState<string | null>(null);
  const [departmentName, setDepartmentName] = useState<string>("");
  const [departmentDivisions, setDepartmentDivisions] = useState<
    DivisionInfo[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [isHCExecutive, setIsHCExecutive] = useState(false);
  const [selectedUser, setSelectedUser] = useState<
    (UserDetail & { status: string }) | null
  >(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userAgreements, setUserAgreements] = useState<any[]>([]);
  const [loadingAgreements, setLoadingAgreements] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [viewType, setViewType] = useState<"department" | "organization">(
    "department",
  );
  const [chartViewType, setChartViewType] = useState<
    "departments" | "divisions"
  >("departments");
  const [chartType, setChartType] = useState<"bar" | "line" | "area" | "pie">(
    "bar",
  );

  // Performance period settings state
  const [currentPeriod, setCurrentPeriod] = useState<any>(null);
  const [savingPeriod, setSavingPeriod] = useState(false);
  const [periodForm, setPeriodForm] = useState({
    name: "",
    submissionDeadline: "",
    startDate: "",
    endDate: "",
  });

  // Check if user is HC executive or admin
  const isHCOrAdmin =
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "SG" ||
    session?.user?.role === "DEPUTY_SG" ||
    session?.user?.role === "EXECUTIVE";

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const agreementResponse = await fetch(
          "/dashboard/performance/api/performance-agreements/completion-stats",
        );
        if (agreementResponse.ok) {
          const result = await agreementResponse.json();
          const safeNum = (val: any) =>
            Number.isFinite(val) ? Number(val) : 0;

          const transformed = {
            organization: {
              totalAgreements: safeNum(result.organization?.totalAgreements),
              totalUsers: safeNum(result.organization?.totalUsers),
              completed: safeNum(
                result.organization?.usersWithCompleteAgreements,
              ),
              inProgress: safeNum(result.organization?.usersInProgress),
              notStarted: safeNum(result.organization?.usersNotStarted),
              overdue: safeNum(result.organization?.usersOverdue),
              completionRate: safeNum(result.organization?.completionRate),
            },
            departments: (result.departments || []).map((dept: any) => ({
              departmentId: dept.departmentId,
              departmentName: dept.departmentName,
              totalAgreements: safeNum(dept.totalAgreements),
              totalUsers: safeNum(dept.totalUsers),
              completed: safeNum(dept.usersWithCompleteAgreements),
              inProgress: safeNum(dept.usersInProgress),
              notStarted: safeNum(dept.usersNotStarted),
              overdue: safeNum(dept.usersOverdue),
              completionRate: safeNum(dept.completionRate),
              completedUsers: dept.completedUsers || [],
              inProgressUsers: dept.inProgressUsers || [],
              notStartedUsers: dept.notStartedUsers || [],
              noAgreementsUsers: dept.noAgreementsUsers || [],
              overdueUsers: dept.overdueUsers || [],
            })),
            divisions: (result.divisions || []).map((div: any) => ({
              divisionId: div.divisionId,
              divisionName: div.divisionName,
              totalAgreements: safeNum(div.totalAgreements),
              totalUsers: safeNum(div.totalUsers),
              completed: safeNum(div.usersWithCompleteAgreements),
              inProgress: safeNum(div.usersInProgress),
              notStarted: safeNum(div.usersNotStarted),
              overdue: safeNum(div.usersOverdue),
              completionRate: safeNum(div.completionRate),
              completedUsers: div.completedUsers || [],
              inProgressUsers: div.inProgressUsers || [],
              notStartedUsers: div.notStartedUsers || [],
              noAgreementsUsers: div.noAgreementsUsers || [],
              overdueUsers: div.overdueUsers || [],
            })),
          };

          setData(transformed);
        }

        const userResponse = await fetch(
          "/dashboard/performance/api/user/current",
        );
        if (userResponse.ok) {
          const user = await userResponse.json();
          setUserDepartmentId(user.departmentId);
          setDepartmentName(user.department?.name || "My Department");
          setDepartmentDivisions(user.departmentDivisions || []);

          // Check if user is HC Executive
          if (user.role === "EXECUTIVE" && user.departmentId) {
            const deptRes = await fetch(
              `/dashboard/performance/api/departments/${user.departmentId}`,
            );
            if (deptRes.ok) {
              const dept = await deptRes.json();
              const deptName = dept.name?.toLowerCase() || "";
              const isHC =
                deptName.includes("human capital") ||
                deptName.includes("human resources") ||
                deptName.includes("hr");
              setIsHCExecutive(isHC);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchAllData();
      // Fetch performance period if HC or Admin
      if (isHCOrAdmin) {
        fetchPerformancePeriod();
      }
    }
  }, [session, isHCOrAdmin]);

  const fetchPerformancePeriod = async () => {
    try {
      const response = await fetch(
        "/dashboard/performance/api/performance-period",
      );
      if (response.ok) {
        const data = await response.json();
        setCurrentPeriod(data);
        if (data) {
          setPeriodForm({
            name: data.name,
            submissionDeadline: data.submissionDeadline?.split("T")[0] || "",
            startDate: data.startDate?.split("T")[0] || "",
            endDate: data.endDate?.split("T")[0] || "",
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch performance period:", error);
    }
  };

  const handleSavePeriod = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !periodForm.name ||
      !periodForm.submissionDeadline ||
      !periodForm.startDate ||
      !periodForm.endDate
    ) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }

    setSavingPeriod(true);
    try {
      const response = await fetch(
        "/dashboard/performance/api/performance-period",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(periodForm),
        },
      );

      const data = await response.json();

      if (response.ok) {
        toast({ title: "Performance period saved successfully!" });
        fetchPerformancePeriod();
      } else {
        toast({
          title: data.error || "Failed to save performance period",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving performance period:", error);
      toast({
        title: "Failed to save performance period",
        variant: "destructive",
      });
    } finally {
      setSavingPeriod(false);
    }
  };

  const handleUserClick = async (user: UserDetail, status: string) => {
    setSelectedUser({ ...user, status });
    setUserDialogOpen(true);
    setLoadingAgreements(true);

    try {
      const response = await fetch(
        `/dashboard/performance/api/performance-agreements/user/${user.id}`,
      );
      if (response.ok) {
        const agreements = await response.json();
        setUserAgreements(agreements);
      }
    } catch (error) {
      console.error("Error fetching user agreements:", error);
    } finally {
      setLoadingAgreements(false);
    }
  };

  const renderStatsCards = (stats: Stats, sectionId: string) => {
    const handleCardClick = (category: string) => {
      const cardId = `${sectionId}-${category}`;
      setExpandedCard(expandedCard === cardId ? null : cardId);
    };

    // Get current date for display
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    return (
      <div className="grid grid-cols-5 gap-4">
        <Card
          className="bg-blue-50 border-blue-200 cursor-pointer hover:shadow-lg transition-all"
          onClick={() => handleCardClick("total")}
        >
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Total Staff</p>
                <p className="text-3xl font-bold text-blue-900">
                  {stats.totalUsers}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  As of {currentDate}
                </p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-green-50 border-green-200 cursor-pointer hover:shadow-lg transition-all"
          onClick={() => handleCardClick("completed")}
        >
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-green-900">
                  {stats.completed}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  As of {currentDate}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-yellow-50 border-yellow-200 cursor-pointer hover:shadow-lg transition-all"
          onClick={() => handleCardClick("inProgress")}
        >
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-3xl font-bold text-yellow-900">
                  {stats.inProgress}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  As of {currentDate}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-red-50 border-red-200 cursor-pointer hover:shadow-lg transition-all"
          onClick={() => handleCardClick("notStarted")}
        >
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Not Started</p>
                <p className="text-3xl font-bold text-red-900">
                  {stats.notStarted}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  As of {currentDate}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-orange-50 border-orange-200 cursor-pointer hover:shadow-lg transition-all"
          onClick={() => handleCardClick("overdue")}
        >
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-3xl font-bold text-orange-900">
                  {stats.overdue}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  As of {currentDate}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderStaffList = (
    stats: DepartmentStats | DivisionStats,
    sectionId: string,
    category: string,
  ) => {
    const {
      completedUsers = [],
      inProgressUsers = [],
      notStartedUsers = [],
      noAgreementsUsers = [],
      overdueUsers = [],
    } = stats;
    const cardId = `${sectionId}-${category}`;

    if (expandedCard !== cardId) {
      return null;
    }

    let users: UserDetail[] = [];
    let title = "";
    let statusLabel = "";
    let bgColor = "";
    let borderColor = "";

    switch (category) {
      case "completed":
        users = completedUsers;
        title = "Completed";
        statusLabel = "Completed";
        bgColor = "bg-green-50";
        borderColor = "border-green-200";
        break;
      case "inProgress":
        users = inProgressUsers;
        title = "In Progress";
        statusLabel = "In Progress";
        bgColor = "bg-yellow-50";
        borderColor = "border-yellow-200";
        break;
      case "notStarted":
        users = notStartedUsers;
        title = "Not Started";
        statusLabel = "Not Started";
        bgColor = "bg-red-50";
        borderColor = "border-red-200";
        break;
      case "overdue":
        users = overdueUsers;
        title = "Overdue";
        statusLabel = "Overdue";
        bgColor = "bg-orange-50";
        borderColor = "border-orange-200";
        break;
      case "total":
        // Categories are now mutually exclusive, so no duplicates
        users = [
          ...completedUsers,
          ...inProgressUsers,
          ...notStartedUsers,
          ...noAgreementsUsers,
          ...overdueUsers,
        ];
        title = "All Staff";
        statusLabel = "All";
        bgColor = "bg-blue-50";
        borderColor = "border-blue-200";
        break;
    }

    if (users.length === 0) {
      return null;
    }

    return (
      <div className="mt-4">
        <Card className={`${bgColor} ${borderColor}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              {title} ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleUserClick(user, statusLabel)}
                  className="flex items-center justify-between p-2 bg-white rounded border cursor-pointer hover:shadow-md transition-all"
                >
                  <div>
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <Badge>{statusLabel}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  }

  if (!data) {
    // Check if it's because performance period is not set or has lapsed
    const today = new Date();
    const periodNotSet = !currentPeriod;
    const periodNotStarted =
      currentPeriod && new Date(currentPeriod.startDate) > today;
    const periodLapsed =
      currentPeriod && new Date(currentPeriod.endDate) < today;

    return (
      <div>
        <Card className="border-2 border-yellow-300 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-900">
              <AlertTriangle className="w-6 h-6" />
              {periodNotSet && "Performance Agreement Period Not Set"}
              {periodNotStarted && "Performance Agreement Period Not Started"}
              {periodLapsed && "Performance Agreement Period Has Lapsed"}
              {!periodNotSet &&
                !periodNotStarted &&
                !periodLapsed &&
                "No Data Available"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {periodNotSet && (
              <>
                <p className="text-yellow-800">
                  The performance agreement creation period has not been set by
                  Human Capital.
                </p>
                <p className="text-yellow-800 font-medium">
                  Please contact your supervisor or Human Capital department for
                  assistance.
                </p>
              </>
            )}
            {periodNotStarted && (
              <>
                <p className="text-yellow-800">
                  The performance agreement period "{currentPeriod.name}" has
                  not started yet.
                </p>
                <p className="text-yellow-800">
                  <strong>Start Date:</strong>{" "}
                  {new Date(currentPeriod.startDate).toLocaleDateString()}
                </p>
                <p className="text-yellow-800 font-medium">
                  Please contact your supervisor for assistance.
                </p>
              </>
            )}
            {periodLapsed && (
              <>
                <p className="text-yellow-800">
                  The performance agreement period "{currentPeriod.name}" has
                  lapsed.
                </p>
                <p className="text-yellow-800">
                  <strong>Period Ended:</strong>{" "}
                  {new Date(currentPeriod.endDate).toLocaleDateString()}
                </p>
                <p className="text-yellow-800 font-medium">
                  Please contact your supervisor for assistance.
                </p>
              </>
            )}
            {!periodNotSet && !periodNotStarted && !periodLapsed && (
              <p className="text-yellow-800">
                No performance agreement data is currently available. Please
                contact your supervisor for assistance.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const myDepartment = data.departments.find(
    (d) => d.departmentId === userDepartmentId,
  );
  const myDivisions = data.divisions.filter((div) =>
    departmentDivisions.some((d) => d.id === div.divisionId),
  );

  // Get the user's specific division if they belong to one
  const userDivisionId = session?.user?.divisionId;
  const myDivision = userDivisionId
    ? data.divisions.find((d) => d.divisionId === userDivisionId)
    : null;

  // Get completion data based on view type
  const getCompletionData = () => {
    switch (viewType) {
      case "department":
        // Show division if user belongs to one, otherwise show department
        return myDivision || myDepartment || data.organization;
      case "organization":
        return data.organization;
      default:
        return data.organization;
    }
  };

  const completionData = getCompletionData();
  const completionPercentage = completionData.completionRate || 0;

  // Prepare bar chart data
  const renderBarChart = () => {
    const chartData =
      chartViewType === "departments"
        ? data.departments.map((dept) => ({
            name: dept.departmentName,
            "Total Staff": dept.totalUsers,
            Completed: dept.completed,
            "In Progress": dept.inProgress,
            "Not Started": dept.notStarted,
            "Completion %": Number(dept.completionRate.toFixed(1)),
          }))
        : myDivisions.map((div) => ({
            name: div.divisionName,
            "Total Staff": div.totalUsers,
            Completed: div.completed,
            "In Progress": div.inProgress,
            "Not Started": div.notStarted,
            "Completion %": Number(div.completionRate.toFixed(1)),
          }));

    return (
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 overflow-hidden">
        <CardHeader
          className="border-b border-gray-100 rounded-t-md"
          style={{
            background: gradients.navyHeader,
            boxShadow: shadows.header,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-white/80" />
              <div>
                <CardTitle className="text-white">
                  Performance Overview by{" "}
                  {chartViewType === "departments" ? "Department" : "Division"}
                </CardTitle>
                {chartViewType === "departments" && (
                  <p className="text-xs text-gray-500 mt-1">
                    Departments include all their divisions
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={chartType}
                onValueChange={(value: any) => setChartType(value)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="area">Area Chart</SelectItem>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={chartViewType}
                onValueChange={(value: any) => setChartViewType(value)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="departments">Departments</SelectItem>
                  <SelectItem value="divisions">Divisions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No data available
            </div>
          ) : (
            <div className="mt-4 bg-gradient-to-br from-gray-50 to-white p-6 rounded-md shadow-sm">
              {chartType === "bar" ? (
                <BarChart
                  data={chartData}
                  xField="name"
                  yFields={[
                    {
                      key: "Total Staff",
                      name: "Total Staff",
                      color: chartColors.data.totalStaff,
                    },
                    {
                      key: "Completed",
                      name: "Completed",
                      color: chartColors.data.completed,
                    },
                    {
                      key: "In Progress",
                      name: "In Progress",
                      color: chartColors.data.inProgress,
                    },
                    {
                      key: "Not Started",
                      name: "Not Started",
                      color: chartColors.data.notStarted,
                    },
                    {
                      key: "Completion %",
                      name: "Completion %",
                      color: chartColors.data.completionRate,
                    },
                  ]}
                  height={chartContainerSizes.heights.small}
                />
              ) : chartType === "line" ? (
                <LineChart
                  data={chartData}
                  xField="name"
                  yFields={[
                    {
                      key: "Total Staff",
                      name: "Total Staff",
                      color: chartColors.data.totalStaff,
                      smooth: true,
                    },
                    {
                      key: "Completed",
                      name: "Completed",
                      color: chartColors.data.completed,
                      smooth: true,
                    },
                    {
                      key: "In Progress",
                      name: "In Progress",
                      color: chartColors.data.inProgress,
                      smooth: true,
                    },
                    {
                      key: "Not Started",
                      name: "Not Started",
                      color: chartColors.data.notStarted,
                      smooth: true,
                    },
                    {
                      key: "Completion %",
                      name: "Completion %",
                      color: chartColors.data.completionRate,
                      smooth: true,
                    },
                  ]}
                  height={chartContainerSizes.heights.small}
                />
              ) : chartType === "area" ? (
                <AreaChart
                  data={chartData}
                  xField="name"
                  yFields={[
                    {
                      key: "Total Staff",
                      name: "Total Staff",
                      color: chartColors.data.totalStaff,
                      smooth: true,
                    },
                    {
                      key: "Completed",
                      name: "Completed",
                      color: chartColors.data.completed,
                      smooth: true,
                    },
                    {
                      key: "In Progress",
                      name: "In Progress",
                      color: chartColors.data.inProgress,
                      smooth: true,
                    },
                    {
                      key: "Not Started",
                      name: "Not Started",
                      color: chartColors.data.notStarted,
                      smooth: true,
                    },
                    {
                      key: "Completion %",
                      name: "Completion %",
                      color: chartColors.data.completionRate,
                      smooth: true,
                    },
                  ]}
                  height={chartContainerSizes.heights.small}
                />
              ) : (
                <PieChart
                  data={chartData.map((item, index) => ({
                    name: item.name,
                    value: item["Completion %"],
                    color:
                      chartColors.extended[index % chartColors.extended.length],
                  }))}
                  height={chartContainerSizes.heights.small}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div>
      {isHCExecutive && (
        <div className="flex justify-end mb-6">
          <Button
            variant="outline"
            onClick={() => {
              const settingsSection = document.getElementById(
                "hc-settings-section-component",
              );
              settingsSection?.scrollIntoView({ behavior: "smooth" });
            }}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            HC Settings
          </Button>
        </div>
      )}

      <div className="space-y-8">
        {/* Big Completion Percentage Card */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardHeader
            className="rounded-t-md"
            style={{
              background: gradients.navyToGold,
              boxShadow: shadows.banner,
            }}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-white">
                Overall Completion Rate
              </CardTitle>
              <Select
                value={viewType}
                onValueChange={(value: any) => setViewType(value)}
              >
                <SelectTrigger className="w-[200px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="department">
                    {myDivision ? "My Division" : "My Department"}
                  </SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8">
              <div className="text-8xl font-bold text-blue-900 mb-4">
                {completionPercentage.toFixed(1)}%
              </div>
              <div className="text-center mb-6">
                <p className="text-xl text-gray-700">
                  {viewType === "department" &&
                    myDivision &&
                    `${myDivision.divisionName}`}
                  {viewType === "department" &&
                    !myDivision &&
                    myDepartment &&
                    departmentName}
                  {viewType === "organization" && "Organization-Wide"}
                </p>
                {viewType === "department" && myDivision && (
                  <p className="text-xs text-gray-500 mt-1">
                    Your division under {departmentName}
                  </p>
                )}
                {viewType === "department" &&
                  !myDivision &&
                  myDepartment &&
                  departmentName !== "OSG" &&
                  departmentName !== "ODSG" && (
                    <p className="text-xs text-gray-500 mt-1">
                      Includes all divisions under this department
                    </p>
                  )}
              </div>
              <div className="grid grid-cols-3 gap-8 text-center">
                <div>
                  <p className="text-3xl font-bold text-green-600">
                    {completionData.completed}
                  </p>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-yellow-600">
                    {completionData.inProgress}
                  </p>
                  <p className="text-sm text-gray-600">In Progress</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-red-600">
                    {completionData.notStarted}
                  </p>
                  <p className="text-sm text-gray-600">Not Started</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart Section */}
        {renderBarChart()}

        {/* Section 1: My Department/Division */}
        {myDivision ? (
          /* User belongs to a division - show division stats */
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="w-6 h-6 text-purple-600" />
              <div>
                <h2 className="text-2xl font-bold text-purple-900">
                  {myDivision.divisionName}
                </h2>
                <p className="text-sm text-gray-600">
                  Your division under {departmentName}
                </p>
              </div>
            </div>
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
              {renderStatsCards(myDivision, "my-division")}
              {renderStaffList(myDivision, "my-division", "completed")}
              {renderStaffList(myDivision, "my-division", "inProgress")}
              {renderStaffList(myDivision, "my-division", "notStarted")}
              {renderStaffList(myDivision, "my-division", "overdue")}
              {renderStaffList(myDivision, "my-division", "total")}
            </div>
          </div>
        ) : myDepartment ? (
          /* User belongs directly to a department - show department stats */
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-2xl font-bold text-blue-900">
                  {departmentName}
                </h2>
                {departmentName !== "OSG" && departmentName !== "ODSG" && (
                  <p className="text-sm text-gray-600">
                    Includes all divisions and staff under this department
                  </p>
                )}
              </div>
            </div>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
              {renderStatsCards(myDepartment, "my-department")}
              {renderStaffList(myDepartment, "my-department", "completed")}
              {renderStaffList(myDepartment, "my-department", "inProgress")}
              {renderStaffList(myDepartment, "my-department", "notStarted")}
              {renderStaffList(myDepartment, "my-department", "overdue")}
              {renderStaffList(myDepartment, "my-department", "total")}
            </div>
          </div>
        ) : null}

        {/* User Details Dialog */}
        <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {selectedUser?.name}
              </DialogTitle>
              <DialogDescription>{selectedUser?.email}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">
                  Status:
                </span>
                <Badge
                  variant={
                    selectedUser?.status === "Completed"
                      ? "default"
                      : selectedUser?.status === "In Progress"
                        ? "default"
                        : selectedUser?.status === "Not Started"
                          ? "destructive"
                          : "secondary"
                  }
                  className={
                    selectedUser?.status === "Completed"
                      ? "bg-green-600"
                      : selectedUser?.status === "In Progress"
                        ? "bg-yellow-600"
                        : ""
                  }
                >
                  {selectedUser?.status}
                </Badge>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  Performance Agreements
                </h4>
                {loadingAgreements ? (
                  <div className="text-center py-4 text-gray-500">
                    Loading agreements...
                  </div>
                ) : userAgreements.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 bg-gray-50 rounded border border-gray-200">
                    No performance agreements found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userAgreements.map((agreement: any) => (
                      <Card
                        key={agreement.id}
                        className="border-l-4 border-l-blue-500"
                      >
                        <CardContent className="pt-4">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">
                                  {agreement.title}
                                </p>
                                {agreement.description && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    {agreement.description}
                                  </p>
                                )}
                              </div>
                              <Badge
                                variant={
                                  agreement.approvalStatus === "APPROVED"
                                    ? "default"
                                    : agreement.approvalStatus === "PENDING"
                                      ? "default"
                                      : agreement.approvalStatus === "REJECTED"
                                        ? "destructive"
                                        : "secondary"
                                }
                                className={
                                  agreement.approvalStatus === "APPROVED"
                                    ? "bg-green-600"
                                    : agreement.approvalStatus === "PENDING"
                                      ? "bg-yellow-600"
                                      : ""
                                }
                              >
                                {agreement.approvalStatus || "DRAFT"}
                              </Badge>
                            </div>

                            {agreement.kpi && (
                              <div className="text-sm">
                                <span className="font-medium text-gray-700">
                                  KPI:
                                </span>{" "}
                                <span className="text-gray-600">
                                  {agreement.kpi}
                                </span>
                              </div>
                            )}

                            {agreement.target && (
                              <div className="text-sm">
                                <span className="font-medium text-gray-700">
                                  Target:
                                </span>{" "}
                                <span className="text-gray-600">
                                  {agreement.target}
                                </span>
                              </div>
                            )}

                            {agreement.weight && (
                              <div className="text-sm">
                                <span className="font-medium text-gray-700">
                                  Weight:
                                </span>{" "}
                                <span className="text-gray-600">
                                  {agreement.weight}%
                                </span>
                              </div>
                            )}

                            {agreement.dueDate && (
                              <div className="text-sm">
                                <span className="font-medium text-gray-700">
                                  Due Date:
                                </span>{" "}
                                <span className="text-gray-600">
                                  {new Date(
                                    agreement.dueDate,
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            )}

                            {agreement.percentComplete !== null &&
                              agreement.percentComplete !== undefined && (
                                <div className="text-sm">
                                  <span className="font-medium text-gray-700">
                                    Progress:
                                  </span>{" "}
                                  <span className="text-gray-600">
                                    {agreement.percentComplete}%
                                  </span>
                                </div>
                              )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
