"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LucideIcon, Eye, CheckCircle, XCircle, RotateCcw, Clock, User, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GoldSpinner } from "@/components/ui/gold-spinner";

export interface EnhancedRolePageConfig {
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
  creator?: {
    firstName?: string;
    lastName?: string;
    departmentName?: string;
  };
}

interface RoleReviewPageProps {
  config: EnhancedRolePageConfig;
}

export function RoleReviewPage({ config }: RoleReviewPageProps) {
  const router = useRouter();
  const { Icon, label, description, color, stage } = config;
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMemos();
  }, [stage]);

  const fetchMemos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/memos/by-stage?stage=${stage}`);
      if (!response.ok) {
        throw new Error("Failed to fetch memos");
      }
      const data = await response.json();
      setMemos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching memos:", err);
      setError("Failed to load memos");
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toUpperCase()) {
      case "HIGH":
      case "URGENT":
        return "bg-red-100 text-red-800";
      case "MEDIUM":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div 
          className="w-12 h-12 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: color + "20" }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{label}</h1>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {memos.length} pending
        </Badge>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Memos List - Takes 2 columns */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Pending Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center">
                  <GoldSpinner size="sm" message="Loading memos..." />
                </div>
              ) : error ? (
                <div className="py-8 text-center text-red-600">
                  <p>{error}</p>
                  <Button variant="outline" size="sm" onClick={fetchMemos} className="mt-2">
                    Retry
                  </Button>
                </div>
              ) : memos.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No memos pending review at this stage.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {memos.map((memo) => (
                    <div
                      key={memo.id}
                      className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => router.push(`/dashboard/memos/${memo.id}`)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {memo.subject}
                            </h3>
                            {memo.priority && memo.priority !== "NORMAL" && (
                              <Badge className={getPriorityColor(memo.priority)} variant="secondary">
                                {memo.priority}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {memo.creator?.firstName} {memo.creator?.lastName}
                            </span>
                            <span>From: {memo.memoFrom}</span>
                            <span>To: {memo.memoTo}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(memo.createdAt).toLocaleDateString("en-GB")}
                            </span>
                          </div>
                          {memo.purpose && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                              {memo.purpose.substring(0, 150)}
                              {memo.purpose.length > 150 ? "..." : ""}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/memos/${memo.id}`);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Review
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Guidelines */}
        <div className="space-y-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-blue-900 text-sm">Key Responsibilities</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-blue-800 space-y-1">
                {config.keyResponsibilities.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 mt-1 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-900 text-sm">Review Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-green-800 space-y-1">
                {config.checklistItems.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <div className="w-3 h-3 mt-1 border border-green-600 rounded shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-amber-900 text-sm">Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-amber-800 space-y-1">
                {config.tips.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-600">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* SLA Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">
                  SLA: <strong>{config.slaHours} hours</strong> to review
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
