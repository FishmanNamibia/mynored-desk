"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import {
  Calendar, Bell, Star, FileText, CheckCircle,
  AlertTriangle, XCircle, Users, Inbox, ExternalLink, Activity, Video, MapPin, RefreshCw
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"

interface OutlookMeeting {
  id: string
  title: string
  time: string
  duration: string
  location: string
  isOnline: boolean
  joinUrl: string | null
  startIso: string
}

interface PmsNotification {
  id: string
  type: string
  title?: string | null
  message: string
  entityType?: string | null
  status: string
  createdAt: string
  sender?: { name?: string; email?: string } | null
}

function getNotifMeta(type: string, entityType?: string | null) {
  if (entityType === "performanceAgreement" || entityType === "agreement")
    return { Icon: FileText,      color: "text-red-700",    bg: "bg-red-50"    }
  if (entityType === "rating" || entityType === "performanceRating")
    return { Icon: Star,          color: "text-rose-700",   bg: "bg-rose-50"   }
  if (entityType === "review" || entityType === "performanceReview")
    return { Icon: Activity,      color: "text-pink-700",   bg: "bg-pink-50"   }
  if (entityType === "rating360" || entityType === "360Rating")
    return { Icon: Users,         color: "text-red-800",    bg: "bg-red-100"   }
  if (type === "DELETE_APPROVED" || type === "APPROVED")
    return { Icon: CheckCircle,   color: "text-green-600",  bg: "bg-green-50"  }
  if (type === "DELETE_REJECTED" || type === "REJECTED")
    return { Icon: XCircle,       color: "text-red-600",    bg: "bg-red-50"    }
  if (type === "DELETE_REQUEST")
    return { Icon: AlertTriangle, color: "text-rose-700",   bg: "bg-rose-50"   }
  return   { Icon: Bell,          color: "text-red-700",    bg: "bg-red-50"    }
}

function timeAgo(dateStr: string): string {
  const diffMin = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (diffMin < 1)  return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24)  return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7)  return `${diffDay}d ago`
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
}

export function MeetingsWidget() {
  const { user } = useAuth()

  // ── Meetings state ──────────────────────────────────────────────────────────
  const [meetings, setMeetings]           = useState<OutlookMeeting[]>([])
  const [meetingsLoading, setMeetingsLoading] = useState(true)
  const [meetingsError, setMeetingsError] = useState<string | null>(null)

  // ── Notifications state ─────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<PmsNotification[]>([])
  const [notifLoading, setNotifLoading]   = useState(true)

  // ── Fetch Outlook calendar via MSAL silent token ────────────────────────────
  const fetchMeetings = useCallback(async () => {
    setMeetingsLoading(true)
    setMeetingsError(null)
    setMeetings([])
    setMeetingsError("Calendar integration is unavailable with local sign-in")
    setMeetingsLoading(false)
  }, [])

  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  // ── Fetch PMS notifications ─────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/dashboard/performance/api/notifications?limit=8", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setNotifications(Array.isArray(data) ? data : [])
      }
    } catch { /* silently ignore */ }
    finally { setNotifLoading(false) }
  }, [])

  useEffect(() => {
    if (!user?.id) return
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [user?.id, fetchNotifications])

  const markRead = async (id: string) => {
    try {
      await fetch(`/dashboard/performance/api/notifications/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "READ" }),
      })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: "READ" } : n))
    } catch { /* ignore */ }
  }

  const unreadCount = notifications.filter(n => n.status !== "READ").length

  // Determine which meeting is "current" (happening now) to highlight it
  const nowMs = Date.now()
  const highlightedId = meetings.find(m => {
    if (!m.startIso) return false
    const start = new Date(m.startIso + "Z").getTime()
    // roughly within 1 hour window starting from meeting start
    return nowMs >= start && nowMs <= start + 60 * 60 * 1000
  })?.id ?? null

  return (
    <Card className="widget-card h-full flex flex-col overflow-hidden">
      {/* ── Split header ── */}
      <div className="grid grid-cols-2 border-b border-border flex-shrink-0">
        <div className="px-3 py-2.5 border-r border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
              Today&apos;s Meetings
            </h3>
            <p className="text-[10px] text-muted-foreground">Local session mode</p>
          </div>
          <button
            onClick={fetchMeetings}
            disabled={meetingsLoading}
            className="p-1 rounded hover:bg-accent transition-colors shrink-0"
            title="Refresh meetings"
          >
            <RefreshCw className={`w-3 h-3 text-muted-foreground ${meetingsLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="px-3 py-2.5 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-red-500" />
              Notifications
            </h3>
            <p className="text-[10px] text-muted-foreground">System &amp; approvals</p>
          </div>
          {unreadCount > 0 && (
            <span className="text-[9px] bg-red-600 text-white rounded-full px-1.5 py-0.5 font-bold min-w-[18px] text-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* ── Split body ── */}
      <div className="grid grid-cols-2 flex-1 min-h-0 overflow-hidden">
        {/* ── Meetings panel ── */}
        <div className="border-r border-border overflow-y-auto">
          {meetingsLoading ? (
            <div className="space-y-0 divide-y divide-border">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex gap-3 px-3 py-3">
                  <div className="w-10 h-3 bg-gray-100 rounded shrink-0 mt-1" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : meetingsError ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 py-6 px-3 text-center">
              <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-red-400" />
              </div>
              <p className="px-3 text-[10px] leading-snug text-muted-foreground">{meetingsError}</p>
            </div>
          ) : meetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 py-6 text-center">
              <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-gray-300" />
              </div>
              <p className="text-xs text-muted-foreground">No meetings today</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {meetings.map(meeting => {
                const isNow = meeting.id === highlightedId
                return (
                  <div
                    key={meeting.id}
                    className={`flex items-start gap-3 px-3 py-3 ${isNow ? "bg-red-50/70" : ""}`}
                  >
                    <div className="text-xs text-muted-foreground font-semibold w-10 shrink-0 pt-0.5 tabular-nums">
                      {meeting.time}
                    </div>
                    <div className="flex-1 min-w-0">
                      {meeting.joinUrl ? (
                        <a
                          href={meeting.joinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs font-semibold truncate block hover:underline ${isNow ? "text-red-700" : "text-foreground"}`}
                        >
                          {meeting.title}
                        </a>
                      ) : (
                        <h4 className={`text-xs font-semibold truncate ${isNow ? "text-red-700" : "text-foreground"}`}>
                          {meeting.title}
                        </h4>
                      )}
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        {meeting.isOnline
                          ? <Video className="w-2.5 h-2.5 shrink-0" />
                          : <MapPin className="w-2.5 h-2.5 shrink-0" />}
                        {meeting.duration} · {meeting.location}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Notifications panel ── */}
        <div className="overflow-y-auto p-2 flex flex-col gap-1">
          {notifLoading ? (
            <div className="space-y-2 p-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex gap-2 p-2">
                  <div className="w-7 h-7 rounded-full bg-gray-100 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 bg-gray-100 rounded w-3/4" />
                    <div className="h-2 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 py-6 text-center">
              <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center">
                <Inbox className="w-4 h-4 text-gray-300" />
              </div>
              <p className="text-xs text-muted-foreground">All caught up!</p>
            </div>
          ) : (
            <>
              {notifications.map(notif => {
                const { Icon, color, bg } = getNotifMeta(notif.type, notif.entityType)
                const isUnread = notif.status !== "READ"
                return (
                  <div
                    key={notif.id}
                    onClick={() => isUnread && markRead(notif.id)}
                    className={`relative flex gap-2 p-2 rounded-lg transition-all cursor-pointer ${
                      isUnread
                        ? "bg-red-50/70 hover:bg-red-50 border border-red-100"
                        : "hover:bg-accent border border-transparent opacity-70"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${bg}`}>
                      <Icon className={`w-3.5 h-3.5 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      {notif.title && (
                        <p className={`text-[11px] font-semibold leading-tight line-clamp-1 ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>
                          {notif.title}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2 mt-0.5">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        {notif.sender?.name && (
                          <span className="text-[9px] text-muted-foreground/70 truncate max-w-[65px]">
                            {notif.sender.name}
                          </span>
                        )}
                        <span className="text-[9px] text-muted-foreground/50 ml-auto shrink-0">
                          {timeAgo(notif.createdAt)}
                        </span>
                      </div>
                    </div>
                    {isUnread && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500" />}
                  </div>
                )
              })}
              <Link
                href="/dashboard/performance/dashboard/notifications"
                className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 pt-1 px-1 mt-auto"
              >
                View all <ExternalLink className="w-3 h-3" />
              </Link>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}
