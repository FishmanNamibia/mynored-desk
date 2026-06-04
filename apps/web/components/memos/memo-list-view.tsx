"use client"

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, Eye, Plus, Search, Download, RefreshCw, Filter, X, 
  Clock, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight,
  Calendar, User, ArrowUpDown, ArrowRight, Send, FileStack
} from "lucide-react"
import { GoldSpinner } from "@/components/ui/gold-spinner"
import { useAuth } from "@/lib/auth-context";
import { getStatusColor, getPriorityColor } from "@/lib/memo-helpers";

interface MemoListViewProps {
  view: "my-memos" | "drafts" | "pending" | "approved" | "all";
  title?: string;
  description?: string;
  showCreateButton?: boolean;
  showStats?: boolean;
}

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
  updatedAt?: string;
  createdById?: string;
  creator?: {
    firstName?: string;
    lastName?: string;
    departmentName?: string;
  };
}

interface FilterState {
  search: string;
  priority: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
}

const ITEMS_PER_PAGE = 10;

const VIEW_CONFIGS = {
  "my-memos": {
    title: "My Memos",
    description: "All memos created or assigned to you",
    icon: User,
    emptyMessage: "You haven't created any memos yet",
  },
  drafts: {
    title: "Draft Memos",
    description: "Incomplete memos saved for later",
    icon: FileText,
    emptyMessage: "No draft memos. Start creating one!",
  },
  pending: {
    title: "Pending Approval",
    description: "Memos awaiting review or action",
    icon: Clock,
    emptyMessage: "No memos pending approval",
  },
  approved: {
    title: "Approved Memos",
    description: "Successfully approved and completed memos",
    icon: CheckCircle,
    emptyMessage: "No approved memos found",
  },
  all: {
    title: "All Memos",
    description: "Complete list of all system memos",
    icon: FileStack,
    emptyMessage: "No memos in the system yet",
  },
};

export function MemoListView({
  view,
  title,
  description,
  showCreateButton = true,
  showStats = true,
}: MemoListViewProps) {
  const router = useRouter();
  const { user } = useAuth();
  const config = VIEW_CONFIGS[view];
  const Icon = config.icon;

  const [memos, setMemos] = useState<Memo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    priority: "all",
    dateFrom: "",
    dateTo: "",
    sortBy: "newest",
  });

  useEffect(() => {
    fetchMemos();
  }, [view, user?.id]);

  const fetchMemos = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      // Determine status filter based on view
      let statusParam = "";
      switch (view) {
        case "drafts":
          statusParam = "DRAFT";
          break;
        case "pending":
          statusParam = "PENDING,SUBMITTED_TO_MANAGER,SUBMITTED_TO_SENIOR,SUBMITTED_TO_EXECUTIVE,PENDING_PMU_REVIEW,PENDING_SG_APPROVAL";
          break;
        case "approved":
          statusParam = "APPROVED,COMPLETED";
          break;
        default:
          statusParam = "";
      }

      const url = `/api/memos?userId=${user.id}${statusParam ? `&status=${statusParam}` : ""}`;
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchMemos();
    setIsRefreshing(false);
  };

  // Filter and sort memos
  const filteredMemos = useMemo(() => {
    let result = [...memos];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (m) =>
          m.subject?.toLowerCase().includes(searchLower) ||
          m.memoFrom?.toLowerCase().includes(searchLower) ||
          m.memoTo?.toLowerCase().includes(searchLower) ||
          m.id.toLowerCase().includes(searchLower)
      );
    }

    // Priority filter
    if (filters.priority !== "all") {
      result = result.filter((m) => m.priority === filters.priority);
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      result = result.filter((m) => new Date(m.memoDate) >= fromDate);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      result = result.filter((m) => new Date(m.memoDate) <= toDate);
    }

    // Sorting
    switch (filters.sortBy) {
      case "oldest":
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "newest":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "subject":
        result.sort((a, b) => a.subject.localeCompare(b.subject));
        break;
      case "priority-high":
        const priorityOrder = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
        result.sort((a, b) => 
          (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2) - 
          (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2)
        );
        break;
    }

    return result;
  }, [memos, filters]);

  // Statistics
  const stats = useMemo(() => ({
    total: memos.length,
    high: memos.filter((m) => m.priority === "HIGH" || m.priority === "URGENT").length,
    thisWeek: memos.filter((m) => {
      const date = new Date(m.createdAt);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return date >= weekAgo;
    }).length,
  }), [memos]);

  // Pagination
  const totalPages = Math.ceil(filteredMemos.length / ITEMS_PER_PAGE);
  const paginatedMemos = filteredMemos.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const hasActiveFilters = filters.search || 
    filters.priority !== "all" || 
    filters.dateFrom || 
    filters.dateTo;

  const handleClearFilters = () => {
    setFilters({
      search: "",
      priority: "all",
      dateFrom: "",
      dateTo: "",
      sortBy: "newest",
    });
    setCurrentPage(1);
  };

  const handleExport = () => {
    const csvData = filteredMemos.map((m) => ({
      Reference: m.id.slice(0, 8).toUpperCase(),
      Subject: m.subject,
      From: m.memoFrom,
      To: m.memoTo,
      Status: m.status,
      Priority: m.priority || "NORMAL",
      Date: new Date(m.memoDate).toLocaleDateString("en-GB"),
    }));

    const headers = Object.keys(csvData[0] || {}).join(",");
    const rows = csvData.map((row) => Object.values(row).map((v) => `"${v}"`).join(",")).join("\n");
    const csv = `${headers}\n${rows}`;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${view}-memos-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0a1628] to-[#1a2550] rounded-xl p-5 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{title || config.title}</h1>
              <p className="text-gray-300 text-sm">{description || config.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            {showCreateButton && (
              <Button
                onClick={() => router.push("/dashboard/memos/create")}
                className="bg-[#d4a843] hover:bg-[#c49833] text-[#0a1628]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Memo
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      {showStats && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileStack className="w-8 h-8 text-blue-500 opacity-40" />
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">High Priority</p>
                <p className="text-2xl font-bold text-red-600">{stats.high}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500 opacity-40" />
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">This Week</p>
                <p className="text-2xl font-bold text-green-600">{stats.thisWeek}</p>
              </div>
              <Calendar className="w-8 h-8 text-green-500 opacity-40" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search memos..."
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                className="pl-10"
              />
            </div>

            {/* Sort */}
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value }))}
              className="border rounded-md px-3 py-2 text-sm"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="subject">Subject A-Z</option>
              <option value="priority-high">Priority (High to Low)</option>
            </select>

            {/* Filter Toggle */}
            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {hasActiveFilters && <Badge className="ml-2 bg-blue-100 text-blue-700">Active</Badge>}
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" onClick={handleClearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}

            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Priority</label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All Priorities</option>
                  <option value="URGENT">Urgent</option>
                  <option value="HIGH">High</option>
                  <option value="NORMAL">Normal</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">From Date</label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">To Date</label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Memos List */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {config.title}
          </CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${filteredMemos.length} memo(s) found`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center">
              <GoldSpinner size="md" message="Loading memos..." />
            </div>
          ) : filteredMemos.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">{config.emptyMessage}</p>
              {hasActiveFilters && (
                <p className="text-sm mt-1">Try adjusting your filters</p>
              )}
              {showCreateButton && !hasActiveFilters && (
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
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-y">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                        Reference
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                        Subject
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">
                        From / To
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">
                        Date
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                        Actions
                      </th>
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
                            <span className="font-medium text-gray-900 truncate max-w-[180px] lg:max-w-[280px]">
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
                          <div className="text-sm text-gray-600 space-y-0.5">
                            <p className="truncate max-w-[150px]">
                              <span className="text-gray-400">From:</span> {memo.memoFrom}
                            </p>
                            <p className="truncate max-w-[150px]">
                              <span className="text-gray-400">To:</span> {memo.memoTo}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={getStatusColor(memo.status)}>
                            {memo.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
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
                    {filteredMemos.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
