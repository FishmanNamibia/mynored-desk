"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Clock, CheckCircle, FileStack, Plus, Eye, AlertTriangle, ArrowRight } from "lucide-react"
import { GoldSpinner } from "@/components/ui/gold-spinner"
import { Badge } from "@/components/ui/badge"
import { KpiCard, KpiGrid } from "@/components/ui/kpi-card"
import { useAuth } from "@/lib/auth-context";
import { getStatusColor, getPriorityColor } from "@/lib/memo-helpers";
import { colors } from "@/app/ui-standards";

export function MemoDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [memos, setMemos] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchMemos();
    if (user?.id) {
      fetchPendingApprovals();
    }
  }, [statusFilter, user?.id]);

  const fetchMemos = async () => {
    setIsLoading(true);
    try {
      const url = `/api/memos?userId=${user?.id || ""}&status=${statusFilter}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch memos");

      const data = await response.json();
      setMemos(data);
    } catch (error) {
      console.error("Error fetching memos:", error);
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
      // Silent fail — pending approvals is optional
    }
  };

  const stats = {
    total: memos.length,
    pending: memos.filter(m => m.status === "PENDING" || m.status?.startsWith("SUBMITTED_TO") || m.status?.startsWith("PENDING_")).length,
    approved: memos.filter(m => m.status === "APPROVED" || m.status === "COMPLETED").length,
    draft: memos.filter(m => m.status === "DRAFT").length,
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
            Memo Management
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 leading-tight">
            Create, track, and manage official memorandums.
          </p>
        </div>
        <Button
          onClick={() => router.push("/dashboard/memos/create")}
          className="sm:w-auto text-white hover:opacity-90"
          style={{ backgroundColor: colors.navyLightest }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Memo
        </Button>
      </div>

      {/* Stats Grid - Using KpiCard */}
      <KpiGrid columns={4}>
        <KpiCard
          icon={FileStack}
          label="Total Memos"
          value={stats.total.toString()}
          trend="All memos"
          color="blue"
          size="lg"
        />
        <KpiCard
          icon={Clock}
          label="Pending Review"
          value={stats.pending.toString()}
          trend="Awaiting approval"
          color="amber"
          size="lg"
        />
        <KpiCard
          icon={CheckCircle}
          label="Approved"
          value={stats.approved.toString()}
          trend="Completed"
          color="green"
          size="lg"
        />
        <KpiCard
          icon={FileText}
          label="Draft"
          value={stats.draft.toString()}
          trend="In progress"
          color="purple"
          size="lg"
        />
      </KpiGrid>

      {/* Pending Approvals Banner */}
      {pendingApprovals.length > 0 && (
        <Card className="widget-card border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <CardTitle className="text-sm font-semibold text-amber-800">
                  Memos Awaiting Your Approval ({pendingApprovals.length})
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingApprovals.slice(0, 3).map((memo: any) => (
                <div
                  key={memo.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-100 cursor-pointer hover:border-amber-300 transition-colors"
                  onClick={() => router.push(`/dashboard/memos/${memo.id}`)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{memo.subject}</p>
                    <p className="text-xs text-gray-500">
                      From: {memo.memoFrom} • {memo.currentApprovalStep?.stepLabel || "Pending"}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0 ml-3 text-amber-700 border-amber-300 hover:bg-amber-50">
                    Review
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              ))}
              {pendingApprovals.length > 3 && (
                <p className="text-xs text-amber-600 text-center pt-1">
                  + {pendingApprovals.length - 3} more awaiting your review
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="widget-card">
        <CardHeader>
          <CardTitle className="text-base">Filter Memos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {["all", "DRAFT", "PENDING", "APPROVED", "REJECTED", "COMPLETED", "SUBMITTED_TO_MANAGER"].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status)}
              >
                {status === "all" ? "All" : status.replace(/_/g, " ").charAt(0) + status.replace(/_/g, " ").slice(1).toLowerCase()}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Memos List */}
      <Card className="widget-card">
        <CardHeader>
          <CardTitle>
            {statusFilter === "all" ? "All Memos" : `${statusFilter} Memos`}
          </CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${memos.length} memo(s) found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <GoldSpinner size="sm" message="Loading memos..." />
            </div>
          ) : memos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No memos found</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => router.push("/dashboard/memos/create")}
              >
                Create your first memo
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {memos.map((memo) => (
                <div
                  key={memo.id}
                  className="p-4 rounded-xl bg-card border border-border hover:border-border/80 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => router.push(`/dashboard/memos/${memo.id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-foreground truncate">
                          {memo.subject}
                        </h3>
                        <Badge className={getStatusColor(memo.status)}>
                          {memo.status}
                        </Badge>
                        {memo.priority && memo.priority !== "NORMAL" && (
                          <Badge className={getPriorityColor(memo.priority)}>
                            {memo.priority}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
                        <span>
                          <strong>To:</strong> {memo.memoTo}
                        </span>
                        <span>
                          <strong>From:</strong> {memo.memoFrom}
                        </span>
                        <span>
                          <strong>Date:</strong>{" "}
                          {new Date(memo.memoDate).toLocaleDateString("en-GB")}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 line-clamp-2">
                        {memo.purpose?.substring(0, 150)}
                        {memo.purpose?.length > 150 ? "..." : ""}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/memos/${memo.id}`);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>
                      Created {new Date(memo.createdAt).toLocaleDateString("en-GB")}
                    </span>
                    <span className="font-mono text-[10px]">
                      {memo.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
