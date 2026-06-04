"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck, ExternalLink, X, Unlock } from "lucide-react";
import { useNotifications, Notification } from "@/lib/pms/notification-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

// ============================================================================
// Notification type display helpers
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
// Notification Item
// ============================================================================

function NotificationItem({
  notification,
  onMarkAsRead,
  onAction,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onAction?: (notifId: string, action: "approve" | "reject") => void;
}) {
  const isUnread =
    notification.status === "PENDING" || notification.status === "SENT";
  const isWeightUnlock =
    notification.entityType === "UserTaskWeight" &&
    notification.type === "APPROVAL_REQUESTED" &&
    isUnread;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 last:border-0",
        isUnread && "bg-red-50/70 hover:bg-red-50",
        isWeightUnlock && "bg-rose-50/80 hover:bg-rose-50",
      )}
      onClick={() => {
        if (isUnread && !isWeightUnlock) onMarkAsRead(notification.id);
      }}
    >
      <span className="text-lg shrink-0 mt-0.5">
        {isWeightUnlock ? "🔓" : getNotificationIcon(notification.type)}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700">
            {isWeightUnlock
              ? "Weight Unlock Request"
              : getNotificationTitle(notification.type)}
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
          {notification.message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400">
            {timeAgo(notification.createdAt)}
          </span>
          {notification.sender?.name && (
            <span className="text-xs text-gray-400">
              from {notification.sender.name}
            </span>
          )}
        </div>
        {isWeightUnlock && onAction && (
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              className="h-7 text-xs bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.stopPropagation();
                onAction(notification.id, "approve");
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
                onAction(notification.id, "reject");
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
            onMarkAsRead(notification.id);
          }}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Notification Bell Component
// ============================================================================

interface NotificationBellProps {
  /** Style variant for different headers */
  variant?: "default" | "dark";
  /** Link to the full notifications page */
  notificationsPageUrl?: string;
}

export function NotificationBell({
  variant = "default",
  notificationsPageUrl = "/dashboard/performance/dashboard/notifications",
}: NotificationBellProps) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    isConnected,
  } = useNotifications();
  const [open, setOpen] = useState(false);

  const displayNotifications = notifications.slice(0, 10);

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

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "relative transition-colors cursor-pointer p-2 rounded-md",
            variant === "dark"
              ? "text-white/70 hover:text-white hover:bg-white/10"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
          )}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-0.5 -right-0.5 h-5 min-w-5 flex items-center justify-center p-0 px-1 bg-red-600 text-white text-[10px] font-bold border-2 border-white"
              variant="destructive"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
          {/* SSE connection indicator */}
          {isConnected && (
            <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-green-500" />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96 p-0">
        {/* Header */}
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

        {/* Notification List */}
        {displayNotifications.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No notifications yet</p>
          </div>
        ) : (
          <ScrollArea className="max-h-100">
            {displayNotifications.map((notif) => (
              <NotificationItem
                key={notif.id}
                notification={notif}
                onMarkAsRead={markAsRead}
                onAction={handleWeightAction}
              />
            ))}
          </ScrollArea>
        )}

        {/* Footer */}
        <DropdownMenuSeparator className="m-0" />
        <div className="p-2">
          <Link
            href={notificationsPageUrl}
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
