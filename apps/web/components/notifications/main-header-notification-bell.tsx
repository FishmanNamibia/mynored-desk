"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck, ExternalLink, X, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { colors } from "@/app/ui-standards";

// ============================================================================
// Types
// ============================================================================

interface Notification {
  id: string;
  type: string;
  status: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: any;
  senderId?: string | null;
  receiverId: string;
  sender?: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Helpers
// ============================================================================

function getNotificationIcon(type: string): string {
  switch (type) {
    case "TARGET_ASSIGNED":
      return "🎯";
    case "TARGET_DUE":
      return "⏰";
    case "TARGET_COMPLETED":
      return "✅";
    case "APPROVAL_REQUESTED":
      return "📋";
    case "APPROVED":
      return "✅";
    case "REJECTED":
      return "❌";
    case "OVERDUE":
      return "🚨";
    case "REMINDER":
      return "🔔";
    case "SYSTEM":
      return "⚙️";
    case "RATING_360_ASSIGNED":
      return "⭐";
    case "RATING_360_COMPLETED":
      return "🏆";
    case "DELETE_REQUEST":
      return "🗑️";
    case "DELETE_APPROVED":
      return "✅";
    case "DELETE_REJECTED":
      return "❌";
    case "RATING_SUBMITTED":
      return "⭐";
    case "GENERAL":
      return "📢";
    default:
      return "🔔";
  }
}

function getNotificationTitle(type: string): string {
  switch (type) {
    case "TARGET_ASSIGNED":
      return "Target Assigned";
    case "TARGET_DUE":
      return "Target Due Soon";
    case "TARGET_COMPLETED":
      return "Target Completed";
    case "APPROVAL_REQUESTED":
      return "Approval Requested";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "OVERDUE":
      return "Overdue";
    case "REMINDER":
      return "Reminder";
    case "SYSTEM":
      return "System";
    case "RATING_360_ASSIGNED":
      return "360° Rating";
    case "RATING_360_COMPLETED":
      return "360° Complete";
    case "DELETE_REQUEST":
      return "Delete Request";
    case "DELETE_APPROVED":
      return "Delete Approved";
    case "DELETE_REJECTED":
      return "Delete Rejected";
    case "RATING_SUBMITTED":
      return "Rating Submitted";
    case "GENERAL":
      return "General";
    default:
      return "Notification";
  }
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

// ============================================================================
// Component — self-contained SSE bell for the main dashboard header
// ============================================================================

export function MainHeaderNotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [open, setOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const seenIds = useRef<Set<string>>(new Set());

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const es = new EventSource(
        "/dashboard/performance/api/notifications/stream",
      );
      eventSourceRef.current = es;

      es.addEventListener("init", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
          setIsConnected(true);
          reconnectAttempts.current = 0;
          seenIds.current = new Set(
            (data.notifications || []).map((n: Notification) => n.id),
          );
          // Track unread on load
          if ((data.unreadCount || 0) > 0) {
            // unread notifications present
          }
        } catch {}
      });

      es.addEventListener("notification", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          const notif = data.notification;
          if (notif && !seenIds.current.has(notif.id)) {
            seenIds.current.add(notif.id);
            setNotifications((prev) => [notif, ...prev]);
            setUnreadCount(data.unreadCount || 0);

            // Trigger zoom animation
            setIsAnimating(true);
            setTimeout(() => setIsAnimating(false), 600);

            toast({
              title: `${getNotificationIcon(notif.type)} ${getNotificationTitle(notif.type)}`,
              description:
                notif.message.length > 100
                  ? notif.message.substring(0, 100) + "..."
                  : notif.message,
              duration: 6000,
            });
          }
        } catch {}
      });

      es.onerror = () => {
        setIsConnected(false);
        es.close();
        eventSourceRef.current = null;

        if (reconnectAttempts.current < 10) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttempts.current),
            30000,
          );
          reconnectAttempts.current++;
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else {
          // Fallback to polling
          startPolling();
        }
      };
    } catch {
      startPolling();
    }
  }, []);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;

    const poll = async () => {
      try {
        const res = await fetch(
          "/dashboard/performance/api/notifications?limit=20",
        );
        if (res.ok) {
          const data = await res.json();
          setNotifications(
            Array.isArray(data) ? data : data.notifications || [],
          );
        }
        const countRes = await fetch(
          "/dashboard/performance/api/notifications/count",
        );
        if (countRes.ok) {
          const countData = await countRes.json();
          setUnreadCount(countData.count || 0);
        }
      } catch {}
    };

    poll();
    pollingRef.current = setInterval(poll, 15000);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(
        `/dashboard/performance/api/notifications/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "READ" }),
        },
      );
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, status: "READ" } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {}
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch(
        "/dashboard/performance/api/notifications/mark-all-read",
        {
          method: "POST",
        },
      );
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, status: "READ" })));
        setUnreadCount(0);
      }
    } catch {}
  };

  useEffect(() => {
    connect();
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [connect]);

  const displayNotifications = notifications.slice(0, 10);

  const refreshNotifications = async () => {
    try {
      const res = await fetch(
        "/dashboard/performance/api/notifications?limit=20",
      );
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : data.notifications || []);
      }
      const countRes = await fetch(
        "/dashboard/performance/api/notifications/count",
      );
      if (countRes.ok) {
        const countData = await countRes.json();
        setUnreadCount(countData.count || 0);
      }
    } catch {}
  };

  const handleWeightAction = async (
    notifId: string,
    action: "approve" | "reject",
  ) => {
    const comment =
      action === "reject"
        ? prompt("Please provide a reason for rejection:")
        : null;
    if (action === "reject" && !comment) return;

    try {
      const res = await fetch(
        `/dashboard/performance/api/notifications/${notifId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: action === "approve" ? "APPROVE" : "REJECT",
            adminNote: comment || undefined,
          }),
        },
      );
      if (res.ok) {
        refreshNotifications();
      } else {
        toast({ title: "Failed to process request", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to process request", variant: "destructive" });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "relative text-white/70 hover:text-white transition-colors cursor-pointer p-1",
            isAnimating && "animate-notification-bounce",
          )}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center p-0 px-1 bg-red-600 text-white text-[9px] font-bold border-2"
              style={{ borderColor: colors.navy }}
              variant="destructive"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <DropdownMenuLabel className="p-0 text-base font-semibold">
            Notifications
          </DropdownMenuLabel>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-red-700 hover:text-red-800 hover:bg-red-50"
                onClick={(e) => {
                  e.preventDefault();
                  markAllAsRead();
                }}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {displayNotifications.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No notifications yet</p>
          </div>
        ) : (
          <ScrollArea className="max-h-100">
            {displayNotifications.map((notif) => {
              const isUnread =
                notif.status === "PENDING" || notif.status === "SENT";
              const isWeightUnlock =
                notif.entityType === "UserTaskWeight" &&
                notif.type === "APPROVAL_REQUESTED" &&
                isUnread;

              return (
                <div
                  key={notif.id}
                  className={cn(
                    "flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 last:border-0",
                    isUnread && "bg-red-50/70 hover:bg-red-50",
                    isWeightUnlock && "bg-rose-50/80 hover:bg-rose-50",
                  )}
                  onClick={() => {
                    if (isUnread && !isWeightUnlock) markAsRead(notif.id);
                  }}
                >
                  <span className="text-lg shrink-0 mt-0.5">
                    {isWeightUnlock
                      ? "🔓"
                      : notif.metadata?.action === "rating_submitted"
                        ? "⭐"
                        : getNotificationIcon(notif.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-700">
                        {isWeightUnlock
                          ? "Weight Unlock Request"
                          : notif.metadata?.action === "rating_submitted"
                            ? "Rating Submitted"
                            : getNotificationTitle(notif.type)}
                      </span>
                      {isUnread && !isWeightUnlock && (
                        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                      )}
                      {isWeightUnlock && (
                        <Badge className="bg-rose-100 text-rose-800 text-[10px] px-1.5 py-0">
                          Action Required
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">
                        {timeAgo(notif.createdAt)}
                      </span>
                      {notif.sender?.name && (
                        <span className="text-xs text-gray-400">
                          from {notif.sender.name}
                        </span>
                      )}
                    </div>
                    {isWeightUnlock && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-red-600 hover:bg-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWeightAction(notif.id, "approve");
                          }}
                        >
                          <Unlock className="h-3 w-3 mr-1" /> Grant
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWeightAction(notif.id, "reject");
                          }}
                        >
                          <X className="h-3 w-3 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                  {isUnread && !isWeightUnlock && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notif.id);
                      }}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </ScrollArea>
        )}

        <DropdownMenuSeparator className="m-0" />
        <div className="p-2">
          <Link
            href="/dashboard/performance/dashboard/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1.5 w-full py-2 text-sm text-red-700 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
          >
            View all notifications
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
