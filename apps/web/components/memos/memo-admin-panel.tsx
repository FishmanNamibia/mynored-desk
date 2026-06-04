"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText, Users, Settings, BarChart3, RefreshCw, Search, Download,
  CheckCircle, XCircle, Clock, AlertTriangle, TrendingUp, FileStack,
  Shield, Zap, ArrowRight, Eye, Edit, Trash2, Plus, Filter, ChevronDown,
  PieChart, Calendar, UserCheck, Workflow
} from "lucide-react";
import { GoldSpinner } from "@/components/ui/gold-spinner";
import { useAuth } from "@/lib/auth-context";
import { getStatusColor, getPriorityColor } from "@/lib/memo-helpers";

interface Memo {
  id: string;
  subject: string;
  memoFrom: string;
  memoTo: string;
  status: string;
  priority?: string;
  createdAt: string;
  updatedAt?: string;
  createdById?: string;
  creator?: {
    firstName?: string;
    lastName?: string;
    departmentName?: string;
  };
}

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "workflow", label: "Workflow", icon: Workflow },
  { id: "users", label: "Users", icon: Users },
  { id: "templates", label: "Templates", icon: FileText },
  { id: "reports", label: "Reports", icon: PieChart },
  { id: "settings", label: "Settings", icon: Settings },
];

export function MemoAdminPanel() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchMemos();
  }, []);

  const fetchMemos = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/memos");
      if (response.ok) {
        const data = await response.json();
        setMemos(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching memos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Statistics
  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      total: memos.length,
      draft: memos.filter((m) => m.status === "DRAFT").length,
      pending: memos.filter((m) => 
        m.status?.includes("PENDING") || m.status?.includes("SUBMITTED")
      ).length,
      approved: memos.filter((m) => m.status === "APPROVED" || m.status === "COMPLETED").length,
      rejected: memos.filter((m) => m.status === "REJECTED").length,
      returned: memos.filter((m) => m.status?.includes("RETURNED")).length,
      thisWeek: memos.filter((m) => new Date(m.createdAt) >= weekAgo).length,
      thisMonth: memos.filter((m) => new Date(m.createdAt) >= monthAgo).length,
      urgent: memos.filter((m) => m.priority === "URGENT" || m.priority === "HIGH").length,
    };
  }, [memos]);

  // Status distribution for chart
  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    memos.forEach((m) => {
      const status = m.status.replace(/_/g, " ");
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [memos]);

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab stats={stats} statusDistribution={statusDistribution} memos={memos} />;
      case "workflow":
        return <WorkflowTab />;
      case "users":
        return <UsersTab />;
      case "templates":
        return <TemplatesTab router={router} />;
      case "reports":
        return <ReportsTab stats={stats} memos={memos} />;
      case "settings":
        return <SettingsTab />;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0a1628] to-[#1a2550] rounded-xl p-5 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center">
            <Settings className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Memo Administration</h1>
            <p className="text-gray-300 text-sm">Manage workflows, users, and system settings</p>
          </div>
          <Button
            variant="outline"
            onClick={fetchMemos}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap border-b pb-2">
        {TABS.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id ? "bg-[#0a1628]" : ""}
            >
              <TabIcon className="w-4 h-4 mr-2" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-12 text-center">
          <GoldSpinner size="lg" message="Loading admin data..." />
        </div>
      ) : (
        renderContent()
      )}
    </div>
  );
}

// Overview Tab
function OverviewTab({ 
  stats, 
  statusDistribution,
  memos 
}: { 
  stats: Record<string, number>;
  statusDistribution: [string, number][];
  memos: Memo[];
}) {
  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 uppercase">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileStack className="w-8 h-8 text-blue-500 opacity-40" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 uppercase">Draft</p>
                <p className="text-2xl font-bold text-purple-600">{stats.draft}</p>
              </div>
              <FileText className="w-8 h-8 text-purple-500 opacity-40" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 uppercase">In Review</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500 opacity-40" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 uppercase">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500 opacity-40" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 uppercase">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500 opacity-40" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 uppercase">Urgent</p>
                <p className="text-2xl font-bold text-orange-600">{stats.urgent}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500 opacity-40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statusDistribution.slice(0, 8).map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <div className="w-32 text-sm text-gray-600 truncate">{status}</div>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#0a1628] to-[#1a2550] rounded-full"
                      style={{ width: `${(count / stats.total) * 100}%` }}
                    />
                  </div>
                  <div className="w-12 text-sm font-medium text-right">{count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Activity Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 uppercase">This Week</p>
                <p className="text-3xl font-bold text-blue-700">{stats.thisWeek}</p>
                <p className="text-xs text-blue-600">new memos created</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-xs text-green-600 uppercase">This Month</p>
                <p className="text-3xl font-bold text-green-700">{stats.thisMonth}</p>
                <p className="text-xs text-green-600">total memos</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg">
                <p className="text-xs text-amber-600 uppercase">Returned</p>
                <p className="text-3xl font-bold text-amber-700">{stats.returned}</p>
                <p className="text-xs text-amber-600">for revision</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-xs text-purple-600 uppercase">Avg. Time</p>
                <p className="text-3xl font-bold text-purple-700">2.5d</p>
                <p className="text-xs text-purple-600">to approval</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Memos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-gray-50 border-y">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Subject</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">From</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {memos.slice(0, 5).map((memo) => (
                <tr key={memo.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900 truncate block max-w-[200px]">
                      {memo.subject}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-gray-600">{memo.memoFrom}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={getStatusColor(memo.status)}>
                      {memo.status.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-sm text-gray-500">
                      {new Date(memo.createdAt).toLocaleDateString("en-GB")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// Workflow Tab
function WorkflowTab() {
  const stages = [
    { id: "DRAFT", name: "Draft", color: "#6b7280", next: "SUBMITTED_TO_MANAGER" },
    { id: "SUBMITTED_TO_MANAGER", name: "Manager Review", color: "#ea580c", next: "SUBMITTED_TO_SENIOR" },
    { id: "SUBMITTED_TO_SENIOR", name: "Senior Review", color: "#dc2626", next: "SUBMITTED_TO_EXECUTIVE" },
    { id: "SUBMITTED_TO_EXECUTIVE", name: "Executive Review", color: "#7c3aed", next: "PENDING_PMU_REVIEW" },
    { id: "PENDING_PMU_REVIEW", name: "PMU Review", color: "#0284c7", next: "PENDING_SG_APPROVAL" },
    { id: "PENDING_SG_APPROVAL", name: "SG Approval", color: "#b91c1c", next: "APPROVED" },
    { id: "APPROVED", name: "Approved", color: "#16a34a", next: null },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="w-5 h-5" />
            Memo Approval Workflow
          </CardTitle>
          <CardDescription>
            Standard 6-stage approval process for official memorandums
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 py-4">
            {stages.map((stage, idx) => (
              <div key={stage.id} className="flex items-center gap-2">
                <div 
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                  style={{ backgroundColor: stage.color }}
                >
                  {stage.name}
                </div>
                {idx < stages.length - 1 && (
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Workflow Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium text-blue-900">Standard Workflow</p>
                <p className="text-xs text-blue-700">6-stage approval for general memos</p>
              </div>
              <Badge className="bg-blue-600">Default</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div>
                <p className="font-medium text-purple-900">Procurement Workflow</p>
                <p className="text-xs text-purple-700">Enhanced PMU review stage</p>
              </div>
              <Badge className="bg-purple-600">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="font-medium text-green-900">Financial Workflow</p>
                <p className="text-xs text-green-700">Includes finance verification</p>
              </div>
              <Badge className="bg-green-600">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div>
                <p className="font-medium text-red-900">Urgent Workflow</p>
                <p className="text-xs text-red-700">Expedited 24-hour SLA</p>
              </div>
              <Badge className="bg-red-600">Active</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">SLA Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { stage: "Manager Review", sla: "48 hours" },
              { stage: "Senior Review", sla: "24 hours" },
              { stage: "Executive Review", sla: "72 hours" },
              { stage: "PMU Review", sla: "48 hours" },
              { stage: "SG Approval", sla: "72 hours" },
            ].map((item) => (
              <div key={item.stage} className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm text-gray-700">{item.stage}</span>
                <Badge variant="outline">{item.sla}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Users Tab
function UsersTab() {
  const roles = [
    { name: "Employee", count: 150, permissions: ["Create memos", "View own memos"] },
    { name: "Manager", count: 24, permissions: ["Approve team memos", "View team memos"] },
    { name: "Senior Officer", count: 12, permissions: ["Review memos", "Technical approval"] },
    { name: "Executive", count: 6, permissions: ["Strategic approval", "View all department memos"] },
    { name: "PMU Officer", count: 4, permissions: ["Procurement review", "Compliance check"] },
    { name: "SG", count: 1, permissions: ["Final approval", "System administration"] },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">User Roles & Permissions</h2>
          <p className="text-sm text-gray-500">Manage memo system access levels</p>
        </div>
        <Button className="bg-[#d4a843] hover:bg-[#c49833] text-[#0a1628]">
          <Plus className="w-4 h-4 mr-2" />
          Add Role
        </Button>
      </div>

      <div className="grid gap-4">
        {roles.map((role) => (
          <Card key={role.name}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#0a1628] text-white flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{role.name}</p>
                    <p className="text-xs text-gray-500">{role.count} users</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden md:flex flex-wrap gap-1">
                    {role.permissions.map((perm) => (
                      <Badge key={perm} variant="secondary" className="text-xs">
                        {perm}
                      </Badge>
                    ))}
                  </div>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Templates Tab
function TemplatesTab({ router }: { router: ReturnType<typeof useRouter> }) {
  const templates = [
    { name: "Standard Internal Memo", usage: 45, category: "General" },
    { name: "Budget Request", usage: 32, category: "Financial" },
    { name: "Procurement Request", usage: 28, category: "Procurement" },
    { name: "Travel Authorization", usage: 21, category: "HR" },
    { name: "Project Approval", usage: 18, category: "Projects" },
    { name: "Policy Amendment", usage: 12, category: "Governance" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Memo Templates</h2>
          <p className="text-sm text-gray-500">Pre-configured memo formats and structures</p>
        </div>
        <Button 
          className="bg-[#d4a843] hover:bg-[#c49833] text-[#0a1628]"
          onClick={() => router.push("/dashboard/memos/templates")}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.name}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{template.name}</p>
                    <p className="text-xs text-gray-500">Used {template.usage} times</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{template.category}</Badge>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Reports Tab
function ReportsTab({ stats, memos }: { stats: Record<string, number>; memos: Memo[] }) {
  const handleExportAll = () => {
    const csv = memos.map((m) => ({
      ID: m.id.slice(0, 8).toUpperCase(),
      Subject: m.subject,
      From: m.memoFrom,
      To: m.memoTo,
      Status: m.status,
      Priority: m.priority || "NORMAL",
      Created: new Date(m.createdAt).toISOString(),
    }));

    const headers = Object.keys(csv[0] || {}).join(",");
    const rows = csv.map((row) => Object.values(row).map((v) => `"${v}"`).join(",")).join("\n");
    const csvStr = `${headers}\n${rows}`;

    const blob = new Blob([csvStr], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `memo-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Reports & Analytics</h2>
          <p className="text-sm text-gray-500">Generate and export system reports</p>
        </div>
        <Button onClick={handleExportAll} className="bg-[#0a1628]">
          <Download className="w-4 h-4 mr-2" />
          Export All Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Available Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: "Memo Status Summary", desc: "Overview of all memo statuses" },
              { name: "Approval Timeline Report", desc: "Average time at each stage" },
              { name: "User Activity Report", desc: "Memo creation by user" },
              { name: "Department Breakdown", desc: "Memos by department" },
              { name: "SLA Compliance Report", desc: "Track SLA adherence" },
            ].map((report) => (
              <div key={report.name} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{report.name}</p>
                  <p className="text-xs text-gray-500">{report.desc}</p>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick Stats Export</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Total Memos</p>
                    <p className="text-xl font-bold">{stats.total}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">This Month</p>
                    <p className="text-xl font-bold">{stats.thisMonth}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Approval Rate</p>
                    <p className="text-xl font-bold text-green-600">
                      {stats.total > 0 
                        ? Math.round((stats.approved / stats.total) * 100) 
                        : 0}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Pending</p>
                    <p className="text-xl font-bold text-amber-600">{stats.pending}</p>
                  </div>
                </div>
              </div>
              <Button className="w-full" variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Automated Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Settings Tab
function SettingsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">System Settings</h2>
        <p className="text-sm text-gray-500">Configure memo system behavior</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Notification Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Email notifications for new memos", enabled: true },
              { label: "Email notifications for approvals", enabled: true },
              { label: "Email notifications for returns", enabled: true },
              { label: "Daily digest email", enabled: false },
              { label: "SLA warning notifications", enabled: true },
            ].map((setting) => (
              <div key={setting.label} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{setting.label}</span>
                <input
                  type="checkbox"
                  defaultChecked={setting.enabled}
                  className="w-4 h-4 rounded"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Organization Name</label>
                <Input defaultValue="Namibia Statistics Agency" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tagline</label>
                <Input defaultValue="Excellence through Statistics" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Default Footer Text</label>
              <Textarea 
                defaultValue="Namibia Statistics Agency | Shiimi Building, 204 Independence Avenue, Windhoek"
                rows={2}
              />
            </div>
            <Button className="bg-[#d4a843] hover:bg-[#c49833] text-[#0a1628]">
              Save Changes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Data Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Download className="w-4 h-4 mr-2" />
              Export All Memos (CSV)
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Download className="w-4 h-4 mr-2" />
              Export System Configuration
            </Button>
            <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-2" />
              Archive Old Memos (90+ days)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
