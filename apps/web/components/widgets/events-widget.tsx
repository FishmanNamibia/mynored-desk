"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { canManageContent } from "@/lib/permissions";

interface SPEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
}

// Fallback events shown when SharePoint data is unavailable
const fallbackEvents: SPEvent[] = [
  { id: "1", title: "All Staff Meeting", date: "Jan 18, 2026", time: "09:00 AM", location: "Main Boardroom" },
  { id: "2", title: "Data Quality Workshop", date: "Jan 22, 2026", time: "10:00 AM", location: "Training Center" },
  { id: "3", title: "IT System Maintenance", date: "Jan 25, 2026", time: "06:00 PM", location: "IT Department" },
];

function formatDate(raw: string): string {
  try {
    return new Date(raw).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return raw;
  }
}

export function EventsWidget() {
  const { user } = useAuth();

  const [events, setEvents] = useState<SPEvent[]>(fallbackEvents);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setEvents(fallbackEvents);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <Card className="widget-card h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Events</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {canManageContent(user?.jobTitle) && (
              <a href="/dashboard/settings/widgets">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                  <Plus className="w-3 h-3" />
                  Add
                </Button>
              </a>
            )}
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={fetchEvents} title="Refresh">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 card-content flex-1 overflow-y-auto">
        {events.length === 0 && !loading && (
          <p className="text-xs text-muted-foreground italic py-4 text-center">No upcoming events</p>
        )}
        {events.map((event) => (
          <div key={event.id} className="flex gap-3 p-2 rounded-lg hover:bg-accent transition-colors">
            <div className="w-8 h-8 rounded bg-red-50 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm">{event.title}</h4>
              <p className="text-xs text-muted-foreground">
                {event.date}{event.time ? ` at ${event.time}` : ""}
              </p>
              {event.location && (
                <p className="text-xs text-muted-foreground opacity-75">{event.location}</p>
              )}
            </div>
          </div>
        ))}
        <Link
          href="/dashboard/events"
          className="text-sm text-primary hover:text-primary/80 font-medium inline-flex items-center pt-2"
        >
          View all events →
        </Link>
      </CardContent>
    </Card>
  );
}
