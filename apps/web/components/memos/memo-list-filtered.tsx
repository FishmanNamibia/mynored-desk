"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Eye, Plus } from "lucide-react"
import { GoldSpinner } from "@/components/ui/gold-spinner"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context";
import { getStatusColor, getPriorityColor } from "@/lib/memo-helpers";
import { colors } from "@/app/ui-standards";

interface MemoListFilteredProps {
  statusFilter?: string;
  title?: string;
  description?: string;
  showCreateButton?: boolean;
}

export function MemoListFiltered({ 
  statusFilter = "all", 
  title = "Memos",
  description = "View and manage memos",
  showCreateButton = true
}: MemoListFilteredProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [memos, setMemos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMemos();
  }, [statusFilter]);

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

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 leading-tight">
            {description}
          </p>
        </div>
        {showCreateButton && (
          <Button
            onClick={() => router.push("/dashboard/memos/create")}
            className="sm:w-auto text-white hover:opacity-90"
            style={{ backgroundColor: colors.navyLightest }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Memo
          </Button>
        )}
      </div>

      {/* Memos List */}
      <Card className="widget-card">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${memos.length} memo(s) found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-500">Loading memos...</p>
            </div>
          ) : memos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No memos found</p>
              {showCreateButton && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => router.push("/dashboard/memos/create")}
                >
                  Create your first memo
                </Button>
              )}
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
  );
}
