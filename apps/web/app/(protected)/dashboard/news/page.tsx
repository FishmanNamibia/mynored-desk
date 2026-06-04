"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  CalendarDays,
  Megaphone,
  Newspaper,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
} from "lucide-react";
import { PageLayout } from "@/components/page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { canManageContent } from "@/lib/permissions";

type FeedTab = "all" | "announcements" | "news";
type Tone = "info" | "warning" | "success" | "urgent";

interface ContentAuthor {
  firstName?: string | null;
  lastName?: string | null;
}

interface NoticeRecord {
  id: string;
  title: string;
  message?: string;
  content?: string;
  type?: string;
  priority?: string;
  department?: string | null;
  createdAt?: string;
  createdBy?: ContentAuthor;
}

interface NewsRecord {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  date?: string;
  createdAt?: string;
  createdBy?: ContentAuthor;
}

interface FeedItem {
  id: string;
  kind: "announcement" | "news";
  title: string;
  summary: string;
  label: string;
  tone: Tone;
  author: string;
  displayDate: string;
  sortTime: number;
  department?: string;
}

const NOTICE_TONE_STYLES: Record<Tone, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  urgent: "border-red-200 bg-red-50 text-red-700",
};

const KIND_STYLES: Record<FeedItem["kind"], string> = {
  announcement: "border-red-200 bg-red-50 text-red-700",
  news: "border-slate-200 bg-slate-50 text-slate-700",
};

function formatDate(value?: string | null) {
  if (!value) return "Recently";

  const timestamp = Date.parse(value);
  if (!Number.isNaN(timestamp)) {
    return new Date(timestamp).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return value;
}

function getSortTime(primary?: string | null, fallback?: string | null) {
  const primaryTime = primary ? Date.parse(primary) : Number.NaN;
  if (!Number.isNaN(primaryTime)) return primaryTime;

  const fallbackTime = fallback ? Date.parse(fallback) : Number.NaN;
  if (!Number.isNaN(fallbackTime)) return fallbackTime;

  return 0;
}

function getAuthorName(author?: ContentAuthor) {
  const fullName = [author?.firstName, author?.lastName].filter(Boolean).join(" ").trim();
  return fullName || "NORED Communications";
}

function getNoticeTone(notice: NoticeRecord): Tone {
  const rawType = (notice.type || notice.priority || "info").toLowerCase();

  if (rawType === "high" || rawType === "urgent") return "urgent";
  if (rawType === "medium" || rawType === "warning") return "warning";
  if (rawType === "success") return "success";
  return "info";
}

function buildFeed(notices: NoticeRecord[], newsItems: NewsRecord[]) {
  const announcementFeed: FeedItem[] = notices.map((notice) => ({
    id: notice.id,
    kind: "announcement",
    title: notice.title,
    summary: notice.message || notice.content || "No announcement summary provided.",
    label: notice.type ? notice.type : "Announcement",
    tone: getNoticeTone(notice),
    author: getAuthorName(notice.createdBy),
    displayDate: formatDate(notice.createdAt),
    sortTime: getSortTime(notice.createdAt),
    department: notice.department || undefined,
  }));

  const newsFeed: FeedItem[] = newsItems.map((item) => ({
    id: item.id,
    kind: "news",
    title: item.title,
    summary: item.excerpt,
    label: item.category,
    tone: "info",
    author: getAuthorName(item.createdBy),
    displayDate: item.date || formatDate(item.createdAt),
    sortTime: getSortTime(item.createdAt, item.date),
  }));

  return [...announcementFeed, ...newsFeed].sort((a, b) => b.sortTime - a.sortTime);
}

export default function NewsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<FeedTab>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [notices, setNotices] = useState<NoticeRecord[]>([]);
  const [newsItems, setNewsItems] = useState<NewsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canManage = canManageContent((user as { jobTitle?: string | null } | null)?.jobTitle);

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [noticesResult, newsResult] = await Promise.allSettled([
      fetch("/api/dashboard/notices", { credentials: "include" }),
      fetch("/api/dashboard/news", { credentials: "include" }),
    ]);

    const nextNotices: NoticeRecord[] = [];
    const nextNews: NewsRecord[] = [];
    let failedRequests = 0;

    if (noticesResult.status === "fulfilled" && noticesResult.value.ok) {
      const data = await noticesResult.value.json();
      if (Array.isArray(data)) {
        nextNotices.push(...data);
      }
    } else {
      failedRequests += 1;
    }

    if (newsResult.status === "fulfilled" && newsResult.value.ok) {
      const data = await newsResult.value.json();
      if (Array.isArray(data)) {
        nextNews.push(...data);
      }
    } else {
      failedRequests += 1;
    }

    setNotices(nextNotices);
    setNewsItems(nextNews);

    if (failedRequests === 2) {
      setError("We could not load intranet updates right now.");
    } else if (failedRequests === 1) {
      setError("Some updates could not be loaded. Showing what is available.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const feed = useMemo(() => buildFeed(notices, newsItems), [notices, newsItems]);

  const filteredFeed = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return feed.filter((item) => {
      if (activeTab === "announcements" && item.kind !== "announcement") return false;
      if (activeTab === "news" && item.kind !== "news") return false;

      if (!normalizedSearch) return true;

      return [
        item.title,
        item.summary,
        item.label,
        item.author,
        item.department || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [activeTab, feed, searchTerm]);

  const latestItem = feed[0];
  const categoryCount = new Set(newsItems.map((item) => item.category).filter(Boolean)).size;

  return (
    <PageLayout>
      <div className="space-y-6 px-6 py-8">
        <Card className="border-red-100 bg-gradient-to-br from-white via-white to-red-50">
          <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700">
                <Sparkles className="h-3.5 w-3.5" />
                NORED Intranet Updates
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  News & Announcements
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-600">
                  This is the communications hub for staff updates, internal notices, and
                  published NORED stories. It gives the intranet a proper place for
                  organizational communication, not just workflows.
                </p>
              </div>
              {latestItem ? (
                <div className="rounded-xl border border-red-100 bg-white/90 p-4 shadow-sm">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={KIND_STYLES[latestItem.kind]}>
                      {latestItem.kind === "announcement" ? "Latest announcement" : "Latest story"}
                    </Badge>
                    <span className="text-xs text-slate-500">{latestItem.displayDate}</span>
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">{latestItem.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{latestItem.summary}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 p-4 text-sm text-slate-600">
                  No updates have been published yet. Once communications content is added,
                  it will appear here for staff.
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" className="gap-2" onClick={loadContent}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              {canManage && (
                <Button asChild className="gap-2 bg-slate-900 hover:bg-slate-800">
                  <Link href="/dashboard/settings/widgets">
                    <Settings2 className="h-4 w-4" />
                    Manage Content
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total updates</p>
                  <p className="mt-1 text-3xl font-semibold text-slate-900">{feed.length}</p>
                </div>
                <Megaphone className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Announcements</p>
                  <p className="mt-1 text-3xl font-semibold text-slate-900">{notices.length}</p>
                </div>
                <Bell className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">News stories</p>
                  <p className="mt-1 text-3xl font-semibold text-slate-900">{newsItems.length}</p>
                </div>
                <Newspaper className="h-8 w-8 text-slate-700" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Editorial categories</p>
                  <p className="mt-1 text-3xl font-semibold text-slate-900">{categoryCount}</p>
                </div>
                <Building2 className="h-8 w-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle>Publishing feed</CardTitle>
                <CardDescription>
                  Search across announcements and stories, then switch views depending on
                  what staff need to find.
                </CardDescription>
              </div>
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search titles, categories, authors, or departments..."
                  className="pl-9"
                />
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as FeedTab)}>
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="all">All updates</TabsTrigger>
                <TabsTrigger value="announcements">Announcements</TabsTrigger>
                <TabsTrigger value="news">News</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                Loading published updates...
              </div>
            ) : filteredFeed.length > 0 ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {filteredFeed.map((item) => (
                  <Card key={`${item.kind}-${item.id}`} className="border-slate-200 shadow-sm">
                    <CardContent className="space-y-4 p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={KIND_STYLES[item.kind]}>
                          {item.kind === "announcement" ? "Announcement" : "News"}
                        </Badge>
                        <Badge variant="outline" className={NOTICE_TONE_STYLES[item.tone]}>
                          {item.label}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                        <p className="text-sm leading-6 text-slate-600">{item.summary}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {item.displayDate}
                        </span>
                        <span>{item.author}</span>
                        {item.department && <span>{item.department}</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                  <Newspaper className="h-6 w-6 text-slate-500" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">Nothing matches this view yet</h3>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                  Try another filter or search term. If this section is meant to be active,
                  the communications team can add content from Widget Settings.
                </p>
                {canManage && (
                  <Button asChild variant="outline" className="mt-4 gap-2">
                    <Link href="/dashboard/settings/widgets">
                      <Settings2 className="h-4 w-4" />
                      Open Widget Settings
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
