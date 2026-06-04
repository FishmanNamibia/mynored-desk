"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Bell, AlertCircle, Info, CheckCircle, ExternalLink, RefreshCw, Newspaper, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { canCreateNotice } from "@/lib/permissions";
import { AddNoticeModal } from "./add-notice-modal";

interface SharePointNotice {
  id: string;
  title: string;
  description: string;
  date: string;
  author: string;
  url: string;
  isNews: boolean;
  bannerImage: string | null;
}

const fallbackNotices: SharePointNotice[] = [
  {
    id: "fallback-1",
    title: "NORED Desk local authentication is active",
    description:
      "Users now sign in with NORED Desk credentials instead of third-party Microsoft authentication.",
    date: "25 Mar 2026",
    author: "System Administration",
    url: "#",
    isNews: false,
    bannerImage: null,
  },
  {
    id: "fallback-2",
    title: "Branding updated for NORED",
    description:
      "Shared colours, logos, and key entry screens have been aligned to the NORED red visual identity.",
    date: "25 Mar 2026",
    author: "Digital Workplace",
    url: "#",
    isNews: false,
    bannerImage: null,
  },
  {
    id: "fallback-3",
    title: "SharePoint notice feeds are currently disabled",
    description:
      "This environment is running in local authentication mode, so Microsoft Graph notice feeds are not being used.",
    date: "25 Mar 2026",
    author: "System Administration",
    url: "#",
    isNews: false,
    bannerImage: null,
  },
];

// Detect notice urgency from title/description keywords
function detectType(title: string, description: string): "info" | "warning" | "success" | "urgent" {
  const text = (title + " " + description).toLowerCase();
  if (/urgent|emergency|immediate|critical|deadline|mandatory/.test(text)) return "urgent";
  if (/warning|alert|caution|maintenance|downtime/.test(text)) return "warning";
  if (/congratulation|completed|success|achievement|approved/.test(text)) return "success";
  return "info";
}

const getNoticeColor = (type: string) => {
  switch (type) {
    case "warning": return "from-rose-500 to-red-700";
    case "success": return "from-green-500 to-emerald-600";
    case "urgent":  return "from-red-600 to-red-800";
    default:        return "from-red-500 to-rose-600";
  }
};

const getNoticeTypeStyle = (type: string) => {
  switch (type) {
    case "warning": return { badge: "bg-rose-100 text-rose-800 border-rose-200", Icon: AlertCircle };
    case "success": return { badge: "bg-green-100 text-green-800 border-green-200",  Icon: CheckCircle };
    case "urgent":  return { badge: "bg-red-100 text-red-800 border-red-200",        Icon: Bell };
    default:        return { badge: "bg-red-100 text-red-800 border-red-200",        Icon: Info };
  }
};

export function NoticesCarouselWidget() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<SharePointNotice[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spToken, setSpToken] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSpToken(null);
    setNotices(fallbackNotices);
    setCurrentIndex(0);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  // Auto-advance every 8 seconds
  useEffect(() => {
    if (notices.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % notices.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [notices.length]);

  const nextNotice  = () => setCurrentIndex((prev) => (prev + 1) % notices.length);
  const prevNotice  = () => setCurrentIndex((prev) => (prev - 1 + notices.length) % notices.length);

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Card className="widget-card h-full flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
              <Bell className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-base font-semibold">Notices</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-red-500 animate-spin mx-auto" />
            <p className="text-xs text-muted-foreground">Loading notices…</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Error / empty state ──────────────────────────────────────────────────────
  if (error || notices.length === 0) {
    return (
      <>
        <Card className="widget-card h-full flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
                  <Bell className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="text-base font-semibold">Notices</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {canCreateNotice(user?.jobTitle, user?.email) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                    onClick={() => setShowAddModal(true)}
                  >
                    <Plus className="w-3 h-3" />
                    Add New
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-700" onClick={fetchNotices} title="Retry">
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2 px-4">
              <Newspaper className="w-8 h-8 text-red-200 mx-auto" />
              <p className="text-xs text-muted-foreground">{error ?? "No notices available"}</p>
            </div>
          </CardContent>
        </Card>
        {showAddModal && spToken && (
          <AddNoticeModal
            spToken={spToken}
            onClose={() => setShowAddModal(false)}
            onSuccess={() => { setShowAddModal(false); fetchNotices(); }}
          />
        )}
      </>
    );
  }

  // ── Main carousel ────────────────────────────────────────────────────────────
  const notice = notices[currentIndex];
  const type   = detectType(notice.title, notice.description);
  const { badge, Icon } = getNoticeTypeStyle(type);

  return (
    <>
      <Card className="widget-card h-full flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${getNoticeColor(type)} flex items-center justify-center shadow-lg`}>
                <Bell className="w-4 h-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Notices</CardTitle>
                <p className="text-[10px] text-muted-foreground">{currentIndex + 1}/{notices.length}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canCreateNotice(user?.jobTitle, user?.email) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus className="w-3 h-3" />
                  Add New
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-700" onClick={fetchNotices} title="Refresh from SharePoint">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <button
                onClick={prevNotice}
                className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                aria-label="Previous notice"
              >
                <ChevronLeft className="w-3 h-3 text-red-700" />
              </button>
              <button
                onClick={nextNotice}
                className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                aria-label="Next notice"
              >
                <ChevronRight className="w-3 h-3 text-red-700" />
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 pt-0 flex flex-col">
          <div className="space-y-3 flex-1">
            {/* Type badge + Date */}
            <div className="flex items-center justify-between">
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${badge}`}>
                <Icon className="w-3 h-3" />
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </div>
              <span className="text-xs text-muted-foreground">{notice.date}</span>
            </div>

            {/* Title */}
            <h3 className="font-semibold text-sm text-foreground leading-tight">
              {notice.title}
            </h3>

            {/* Description / content */}
            {notice.description ? (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                {notice.description}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">No summary available.</p>
            )}

            {/* Author */}
            {notice.author && (
              <p className="text-xs font-medium text-muted-foreground/80">— {notice.author}</p>
            )}

            {/* Read full notice link */}
            <a
              href={notice.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800 hover:underline"
            >
              Read full notice <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </CardContent>
      </Card>
      {showAddModal && spToken && (
        <AddNoticeModal
          spToken={spToken}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchNotices(); }}
        />
      )}
    </>
  );
}
