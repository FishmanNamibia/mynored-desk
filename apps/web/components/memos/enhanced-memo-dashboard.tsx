"use client"

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, Clock, CheckCircle, FileStack, Plus, Eye, AlertTriangle, ArrowRight,
  Search, Filter, Download, Printer, RefreshCw, Settings, LayoutTemplate,
  ChevronLeft, ChevronRight, Calendar, User, X, FileDown, CalendarDays,
  TrendingUp, BarChart3, Shield, Send
} from "lucide-react"
import { GoldSpinner } from "@/components/ui/gold-spinner"
import { KpiCard, KpiGrid } from "@/components/ui/kpi-card"
import { useAuth } from "@/lib/auth-context";
import { getStatusColor, getPriorityColor } from "@/lib/memo-helpers";
import { colors } from "@/app/ui-standards";

interface Memo {
  id: string;
  subject: string;
  memoTo: string;
  memoFrom: string;
  memoDate: string;
  purpose?: string;
  status: string;
  priority?: string;
  createdAt: string;
  createdById?: string;
  creator?: {
    firstName?: string;
    lastName?: string;
    departmentName?: string;
  };
}

interface FilterState {
  status: string;
  priority: string;
  dateFrom: string;
  dateTo: string;
  search: string;
  createdBy: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING", label: "Pending" },
  { value: "SUBMITTED_TO_MANAGER", label: "With Manager" },
  { value: "SUBMITTED_TO_SENIOR", label: "With Senior" },
  { value: "SUBMITTED_TO_EXECUTIVE", label: "With Executive" },
  { value: "PENDING_SG_APPROVAL", label: "With SG" },
  { value: "APPROVED", label: "Approved" },
  { value: "COMPLETED", label: "Completed" },
  { value: "REJECTED", label: "Rejected" },
  { value: "RETURNED_TO_INITIATOR", label: "Returned" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All Priorities" },
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

const ITEMS_PER_PAGE = 10;

export function EnhancedMemoDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<Memo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [filters, setFilters] = useState<FilterState>({
    status: "all",
    priority: "all",
    dateFrom: "",
    dateTo: "",
    search: "",
    createdBy: "all",
  });

  useEffect(() => {
    fetchMemos();
    if (user?.id) {
      fetchPendingApprovals();
    }
  }, [user?.id]);

  const fetchMemos = async () => {
    setIsLoading(true);
    try {
      const url = `/api/memos?userId=${user?.id || ""}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch memos");
      const data = await response.json();
      setMemos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching memos:", error);
      setMemos([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingApprovals = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`/api/memos/pending-approvals?approverId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setPendingApprovals(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching pending approvals:", error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchMemos(), fetchPendingApprovals()]);
    setIsRefreshing(false);
  };

  const handleExportCSV = () => {
    const csvData = filteredMemos.map(m => ({
      Reference: m.id.slice(0, 8).toUpperCase(),
      Subject: m.subject,
      From: m.memoFrom,
      To: m.memoTo,
      Status: m.status,
      Priority: m.priority || "NORMAL",
      Date: new Date(m.memoDate).toLocaleDateString("en-GB"),
      Created: new Date(m.createdAt).toLocaleDateString("en-GB"),
    }));

    const headers = Object.keys(csvData[0] || {}).join(",");
    const rows = csvData.map(row => Object.values(row).map(v => `"${v}"`).join(",")).join("\n");
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `memos-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearFilters = () => {
    setFilters({
      status: "all",
      priority: "all",
      dateFrom: "",
      dateTo: "",
      search: "",
      createdBy: "all",
    });
    setCurrentPage(1);
  };

  // Calculate statistics
  const stats = useMemo(() => ({
    total: memos.length,
    pending: memos.filter(m => 
      m.status === "PENDING" || 
      m.status?.startsWith("SUBMITTED_TO") || 
      m.status?.startsWith("PENDING_")
    ).length,
    approved: memos.filter(m => m.status === "APPROVED" || m.status === "COMPLETED").length,
    draft: memos.filter(m => m.status === "DRAFT").length,
    myMemos: memos.filter(m => m.createdById === user?.id).length,
    returned: memos.filter(m => m.status?.includes("RETURNED")).length,
  }), [memos, user?.id]);

  // Filter memos
  const filteredMemos = useMemo(() => {
    return memos.filter(memo => {
      // Status filter
      if (filters.status !== "all" && memo.status !== filters.status) return false;
      
      // Priority filter
      if (filters.priority !== "all" && memo.priority !== filters.priority) return false;
      
      // Date range filter
      if (filters.dateFrom) {
        const memoDate = new Date(memo.memoDate);
        const fromDate = new Date(filters.dateFrom);
        if (memoDate < fromDate) return false;
      }
      if (filters.dateTo) {
        const memoDate = new Date(memo.memoDate);
        const toDate = new Date(filters.dateTo);
        if (memoDate > toDate) return false;
      }
      
      // Created by filter
      if (filters.createdBy === "mine" && memo.createdById !== user?.id) return false;
      
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matches = 
          memo.subject?.toLowerCase().includes(searchLower) ||
          memo.memoFrom?.toLowerCase().includes(searchLower) ||
          memo.memoTo?.toLowerCase().includes(searchLower) ||
          memo.id.toLowerCase().includes(searchLower);
        if (!matches) return false;
      }
      
      return true;
    });
  }, [memos, filters, user?.id]);

  // Pagination
  const totalPages = Math.ceil(filteredMemos.length / ITEMS_PER_PAGE);
  const paginatedMemos = filteredMemos.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const hasActiveFilters = filters.status !== "all" || 
    filters.priority !== "all" || 
    filters.dateFrom || 
    filters.dateTo || 
    filters.search || 
    filters.createdBy !== "all";

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#0a1628] to-[#1a2550] rounded-xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Memo Management</h1>
            <p className="text-gray-300 text-sm mt-1">
              Create, track, and manage official memorandums
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/memos/templates")}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <LayoutTemplate className="w-4 h-4 mr-2" />
              Templates
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/memos/admin")}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Settings className="w-4 h-4 mr-2" />
              Admin
            </Button>
            <Button
              onClick={() => router.push("/dashboard/memos/create")}
              className="bg-[#d4a843] hover:bg-[#c49833] text-[#0a1628]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Memo
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-white border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <FileStack className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Draft</p>
                <p className="text-2xl font-bold text-purple-600">{stats.draft}</p>
              </div>
              <FileText className="w-8 h-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-l-4 border-l-indigo-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">My Memos</p>
                <p className="text-2xl font-bold text-indigo-600">{stats.myMemos}</p>
              </div>
              <User className="w-8 h-8 text-indigo-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Returned</p>
                <p className="text-2xl font-bold text-red-600">{stats.returned}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals Banner */}
      {pendingApprovals.length > 0 && (
        <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 relative overflow-hidden">
          <div className="absolute inset-0 bg-amber-400/5 animate-pulse" />
          <CardHeader className="pb-2 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center animate-bounce">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-amber-900">
                    {pendingApprovals.length} Memo{pendingApprovals.length > 1 ? "s" : ""} Awaiting Your Approval
                  </CardTitle>
                  <CardDescription className="text-amber-700">
                    Click to review and take action
                  </CardDescription>
                </div>
              </div>
              <Button 
                onClick={() => router.push("/dashboard/memos/pending")}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Review All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingApprovals.slice(0, 3).map((memo) => (
                <div
                  key={memo.id}
                  className="p-3 bg-white rounded-lg border border-amber-200 cursor-pointer hover:border-amber-400 hover:shadow-md transition-all"
                  onClick={() => router.push(`/dashboard/memos/${memo.id}`)}
                >
                  <p className="font-medium text-gray-900 truncate">{memo.subject}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span>From: {memo.memoFrom}</span>
                    <span>•</span>
                    <span>{new Date(memo.createdAt).toLocaleDateString("en-GB")}</span>
                  </div>
                </div>
              ))}
            </div>
            {pendingApprovals.length > 3 && (
              <p className="text-center text-amber-700 text-sm mt-3">
                + {pendingApprovals.length - 3} more awaiting review
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Navigation */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard/memos/my-memos")}
          className="flex items-center gap-2"
        >
          <User className="w-4 h-4" />
          My Memos
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard/memos/drafts")}
          className="flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          Drafts
          {stats.draft > 0 && (
            <Badge variant="secondary" className="ml-1">{stats.draft}</Badge>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard/memos/pending")}
          className="flex items-center gap-2"
        >
          <Clock className="w-4 h-4" />
          Pending
          {pendingApprovals.length > 0 && (
            <Badge variant="destructive" className="ml-1">{pendingApprovals.length}</Badge>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard/memos/approved")}
          className="flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Approved
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by subject, sender, recipient, or reference..."
                value={filters.search}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            
            {/* Filter Toggle */}
            <div className="flex gap-2">
              <Button
                variant={showFilters ? "default" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-700">
                    Active
                  </Badge>
                )}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Priority</label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters(f => ({ ...f, priority: e.target.value }))}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                >
                  {PRIORITY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Date From</label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Date To</label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Created By</label>
                <select
                  value={filters.createdBy}
                  onChange={(e) => setFilters(f => ({ ...f, createdBy: e.target.value }))}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All Users</option>
                  <option value="mine">My Memos Only</option>
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Memos Table */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {filters.status === "all" ? "All Memos" : filters.status.replace(/_/g, " ")}
              </CardTitle>
              <CardDescription>
                {isLoading ? "Loading..." : `${filteredMemos.length} memo(s) found`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Page {currentPage} of {Math.max(1, totalPages)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12">
              <GoldSpinner size="md" message="Loading memos..." />
            </div>
          ) : filteredMemos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No memos found</p>
              <p className="text-sm mt-1">
                {hasActiveFilters ? "Try adjusting your filters" : "Create your first memo to get started"}
              </p>
              {!hasActiveFilters && (
                <Button
                  className="mt-4"
                  onClick={() => router.push("/dashboard/memos/create")}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Memo
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Table View */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-y">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reference</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">From</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">To</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Date</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedMemos.map((memo) => (
                      <tr 
                        key={memo.id} 
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/dashboard/memos/${memo.id}`)}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-gray-500">
                            {memo.id.slice(0, 8).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate max-w-[200px] lg:max-w-[300px]">
                              {memo.subject}
                            </span>
                            {memo.priority && memo.priority !== "NORMAL" && (
                              <Badge className={getPriorityColor(memo.priority)} variant="secondary">
                                {memo.priority}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-sm text-gray-600 truncate max-w-[150px] block">
                            {memo.memoFrom}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-sm text-gray-600 truncate max-w-[150px] block">
                            {memo.memoTo}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={getStatusColor(memo.status)}>
                            {memo.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-sm text-gray-500">
                            {new Date(memo.memoDate).toLocaleDateString("en-GB")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/memos/${memo.id}`);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                  <p className="text-sm text-gray-500">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredMemos.length)} of{" "}
                    {filteredMemos.length} results
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-8"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
