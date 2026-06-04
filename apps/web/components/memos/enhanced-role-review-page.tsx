"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { LucideIcon, Eye, CheckCircle, XCircle, RotateCcw, Clock, User, FileText, 
  Search, Filter, ChevronDown, ChevronUp, AlertTriangle, TrendingUp, BarChart3,
  Send, MessageSquare, CheckSquare, ArrowRight, Calendar, Zap, Users, X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GoldSpinner } from "@/components/ui/gold-spinner";
import { useAuth } from "@/lib/auth-context";
import { getPriorityColor, getStatusColor } from "@/lib/memo-helpers";

export interface EnhancedRoleConfig {
  stage: string;
  role: string;
  label: string;
  description: string;
  color: string;
  Icon: LucideIcon;
  canApprove: boolean;
  canReturn: boolean;
  canReject: boolean;
  approveLabel: string;
  returnLabel: string;
  guidance: string;
  slaHours: number;
  nextStage: string;
  previousStage?: string;
  keyResponsibilities: string[];
  checklistItems: string[];
  tips: string[];
}

interface Memo {
  id: string;
  subject: string;
  memoFrom: string;
  memoTo: string;
  memoDate: string;
  purpose?: string;
  status: string;
  priority?: string;
  createdAt: string;
  updatedAt?: string;
  budgetedAmount?: number;
  creator?: {
    firstName?: string;
    lastName?: string;
    departmentName?: string;
  };
}

interface EnhancedRoleReviewPageProps {
  config: EnhancedRoleConfig;
}

interface ChecklistState {
  [key: string]: boolean;
}

export function EnhancedRoleReviewPage({ config }: EnhancedRoleReviewPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { Icon, label, description, color, stage } = config;

  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "priority" | "age">("date");
  const [showFilters, setShowFilters] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  
  // Batch processing
  const [selectedMemos, setSelectedMemos] = useState<Set<string>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);
  
  // Quick action modal
  const [actionMemo, setActionMemo] = useState<Memo | null>(null);
  const [actionType, setActionType] = useState<"approve" | "return" | "reject" | null>(null);
  const [actionComment, setActionComment] = useState("");
  const [checklist, setChecklist] = useState<ChecklistState>({});
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchMemos();
    // Initialize checklist
    const initialChecklist: ChecklistState = {};
    config.checklistItems.forEach((_, idx) => {
      initialChecklist[`item-${idx}`] = false;
    });
    setChecklist(initialChecklist);
  }, [stage, config.checklistItems]);

  const fetchMemos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/memos/by-stage?stage=${stage}`);
      if (!response.ok) throw new Error("Failed to fetch memos");
      const data = await response.json();
      setMemos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching memos:", err);
      setError("Failed to load memos");
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort memos
  const filteredMemos = useMemo(() => {
    let result = [...memos];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        (m) =>
          m.subject?.toLowerCase().includes(search) ||
          m.memoFrom?.toLowerCase().includes(search) ||
          m.creator?.firstName?.toLowerCase().includes(search) ||
          m.creator?.lastName?.toLowerCase().includes(search)
      );
    }

    // Priority filter
    if (priorityFilter !== "all") {
      result = result.filter((m) => m.priority === priorityFilter);
    }

    // Sort
    switch (sortBy) {
      case "date":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "priority":
        const order = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
        result.sort((a, b) => 
          (order[a.priority as keyof typeof order] ?? 2) - 
          (order[b.priority as keyof typeof order] ?? 2)
        );
        break;
      case "age":
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
    }

    return result;
  }, [memos, searchTerm, priorityFilter, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: memos.length,
      urgent: memos.filter((m) => m.priority === "URGENT" || m.priority === "HIGH").length,
      overdue: memos.filter((m) => {
        const created = new Date(m.createdAt);
        const hours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
        return hours > config.slaHours;
      }).length,
      avgAge: memos.length > 0 
        ? Math.round(memos.reduce((sum, m) => {
            const hours = (now.getTime() - new Date(m.createdAt).getTime()) / (1000 * 60 * 60);
            return sum + hours;
          }, 0) / memos.length)
        : 0,
    };
  }, [memos, config.slaHours]);

  const toggleMemoSelection = (id: string) => {
    const newSelected = new Set(selectedMemos);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMemos(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedMemos.size === filteredMemos.length) {
      setSelectedMemos(new Set());
    } else {
      setSelectedMemos(new Set(filteredMemos.map((m) => m.id)));
    }
  };

  const handleAction = async (memo: Memo, type: "approve" | "return" | "reject") => {
    setActionMemo(memo);
    setActionType(type);
    setActionComment("");
  };

  const submitAction = async () => {
    if (!actionMemo || !actionType || !user?.id) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/memos/${actionMemo.id}/${actionType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approverId: user.id,
          comment: actionComment,
          stage,
          nextStage: actionType === "approve" ? config.nextStage : undefined,
        }),
      });

      if (!response.ok) throw new Error(`Failed to ${actionType} memo`);
      
      // Refresh list
      await fetchMemos();
      setActionMemo(null);
      setActionType(null);
      setActionComment("");
    } catch (err) {
      console.error(err);
      alert(`Failed to ${actionType} memo`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchApprove = async () => {
    if (!confirm(`Approve ${selectedMemos.size} selected memos?`)) return;
    
    setIsProcessing(true);
    try {
      const results = await Promise.allSettled(
        Array.from(selectedMemos).map((id) =>
          fetch(`/api/memos/${id}/approve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              approverId: user?.id,
              stage,
              nextStage: config.nextStage,
            }),
          })
        )
      );
      
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        alert(`${selectedMemos.size - failed} approved, ${failed} failed`);
      }
      
      setSelectedMemos(new Set());
      await fetchMemos();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const getMemoAge = (createdAt: string) => {
    const hours = Math.round((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
  };

  const isOverdue = (createdAt: string) => {
    const hours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    return hours > config.slaHours;
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0a1628] to-[#1a2550] rounded-xl p-5 text-white">
        <div className="flex items-center gap-4">
          <div 
            className="w-14 h-14 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: color + "30" }}
          >
            <Icon className="w-7 h-7" style={{ color }} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{label}</h1>
            <p className="text-gray-300 text-sm">{description}</p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2 bg-white/10 border-white/20 text-white">
            {memos.length} pending
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4" style={{ borderLeftColor: color }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Total Pending</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 opacity-40" style={{ color }} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Urgent/High</p>
                <p className="text-2xl font-bold text-red-600">{stats.urgent}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500 opacity-40" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Overdue</p>
                <p className="text-2xl font-bold text-amber-600">{stats.overdue}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500 opacity-40" />
            </div>
            <p className="text-xs text-gray-400 mt-1">SLA: {config.slaHours}h</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Avg Age</p>
                <p className="text-2xl font-bold text-blue-600">{stats.avgAge}h</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500 opacity-40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Memos List - 3 columns */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Pending Reviews
                  </CardTitle>
                  <CardDescription>
                    {filteredMemos.length} memo(s) {searchTerm || priorityFilter !== "all" ? "(filtered)" : ""}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {/* Batch actions */}
                  {selectedMemos.size > 0 && (
                    <div className="flex items-center gap-2 mr-2 px-3 py-1 bg-blue-50 rounded-lg">
                      <span className="text-sm text-blue-700">{selectedMemos.size} selected</span>
                      {config.canApprove && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={handleBatchApprove}
                          disabled={isProcessing}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve All
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedMemos(new Set())}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="border rounded-md px-2 py-1 text-sm"
                  >
                    <option value="date">Newest First</option>
                    <option value="age">Oldest First</option>
                    <option value="priority">Priority</option>
                  </select>
                </div>
              </div>

              {/* Search & Filter Row */}
              <div className="mt-3 flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search memos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="border rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All Priorities</option>
                  <option value="URGENT">Urgent</option>
                  <option value="HIGH">High</option>
                  <option value="NORMAL">Normal</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-12 text-center">
                  <GoldSpinner size="md" message="Loading memos..." />
                </div>
              ) : error ? (
                <div className="py-12 text-center text-red-600">
                  <p>{error}</p>
                  <Button variant="outline" size="sm" onClick={fetchMemos} className="mt-2">
                    Retry
                  </Button>
                </div>
              ) : filteredMemos.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-300" />
                  <p className="text-lg font-medium">All caught up!</p>
                  <p className="text-sm">No memos pending review at this stage.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {/* Select All Row */}
                  <div className="px-4 py-2 bg-gray-50 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedMemos.size === filteredMemos.length && filteredMemos.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-xs text-gray-500">Select All</span>
                  </div>
                  
                  {filteredMemos.map((memo) => (
                    <div
                      key={memo.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        selectedMemos.has(memo.id) ? "bg-blue-50" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedMemos.has(memo.id)}
                          onChange={() => toggleMemoSelection(memo.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded mt-1"
                        />
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => router.push(`/dashboard/memos/${memo.id}`)}
                        >
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {memo.subject}
                            </h3>
                            {memo.priority && memo.priority !== "NORMAL" && (
                              <Badge className={getPriorityColor(memo.priority)} variant="secondary">
                                {memo.priority}
                              </Badge>
                            )}
                            {isOverdue(memo.createdAt) && (
                              <Badge variant="destructive" className="text-xs">
                                Overdue
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {memo.creator?.firstName} {memo.creator?.lastName}
                            </span>
                            <span>From: {memo.memoFrom}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {getMemoAge(memo.createdAt)}
                            </span>
                            {memo.budgetedAmount && (
                              <span className="font-medium">
                                N${memo.budgetedAmount.toLocaleString()}
                              </span>
                            )}
                          </div>
                          {memo.purpose && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                              {memo.purpose.substring(0, 150)}...
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/memos/${memo.id}`)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          {config.canApprove && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleAction(memo, "approve")}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                          )}
                          {config.canReturn && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-amber-700 border-amber-300 hover:bg-amber-50"
                              onClick={() => handleAction(memo, "return")}
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Return
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-4">
          {/* Key Responsibilities */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-blue-900 text-sm flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                Key Responsibilities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-blue-800 space-y-2">
                {config.keyResponsibilities.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 mt-1 shrink-0 text-blue-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Review Checklist */}
          <Card className="bg-green-50 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-900 text-sm flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                Review Checklist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-green-800 space-y-2">
                {config.checklistItems.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={checklist[`item-${idx}`] || false}
                      onChange={(e) => setChecklist({
                        ...checklist,
                        [`item-${idx}`]: e.target.checked,
                      })}
                      className="mt-1 rounded w-3 h-3"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-amber-50 border-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-amber-900 text-sm flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-amber-800 space-y-2">
                {config.tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-600">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* SLA & Workflow Info */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">
                  SLA: <strong>{config.slaHours} hours</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ArrowRight className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">
                  Next: <strong>{config.nextStage.replace(/_/g, " ")}</strong>
                </span>
              </div>
              {config.previousStage && (
                <div className="flex items-center gap-2 text-sm">
                  <RotateCcw className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">
                    Return to: <strong>{config.previousStage.replace(/_/g, " ")}</strong>
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Modal */}
      {actionMemo && actionType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {actionType === "approve" && <CheckCircle className="w-5 h-5 text-green-600" />}
                {actionType === "return" && <RotateCcw className="w-5 h-5 text-amber-600" />}
                {actionType === "reject" && <XCircle className="w-5 h-5 text-red-600" />}
                {actionType === "approve" ? config.approveLabel : 
                 actionType === "return" ? config.returnLabel : "Reject Memo"}
              </CardTitle>
              <CardDescription>
                {actionMemo.subject}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Comment {actionType !== "approve" && "(required)"}
                </label>
                <Textarea
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  placeholder={
                    actionType === "approve" 
                      ? "Optional: Add any notes..." 
                      : "Provide feedback for the initiator..."
                  }
                  rows={4}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setActionMemo(null);
                    setActionType(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitAction}
                  disabled={isProcessing || (actionType !== "approve" && !actionComment.trim())}
                  className={
                    actionType === "approve" 
                      ? "bg-green-600 hover:bg-green-700" 
                      : actionType === "return"
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-red-600 hover:bg-red-700"
                  }
                >
                  {isProcessing ? (
                    <>
                      <GoldSpinner size="sm" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {actionType === "approve" && <CheckCircle className="w-4 h-4 mr-1" />}
                      {actionType === "return" && <RotateCcw className="w-4 h-4 mr-1" />}
                      {actionType === "reject" && <XCircle className="w-4 h-4 mr-1" />}
                      Confirm
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
