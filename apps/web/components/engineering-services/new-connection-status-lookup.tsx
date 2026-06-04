"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  connectionPriorityBadgeClassNames,
  connectionStatusBadgeClassNames,
  newConnectionApiBase,
  type ConnectionPriority,
  type ConnectionStatus,
  type StatusTimelineEvent,
} from "@/lib/engineering-services/new-connection-management";

interface LookupSummary {
  reference: string;
  customer: string;
  status: ConnectionStatus;
  priority: ConnectionPriority;
  locality: string;
  constituency?: string;
  region: string;
  connectionClass: string;
  connectionType: string;
  assignedTo: string;
  nextAction: string;
  applicationDate: string;
  connectionDate: string;
}

interface LookupResponse {
  found: boolean;
  reference: string;
  summary?: LookupSummary;
  timeline?: StatusTimelineEvent[];
  error?: string;
}

export function NewConnectionStatusLookup() {
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LookupResponse | null>(null);

  async function lookup() {
    const trimmed = reference.trim();
    if (!trimmed) {
      setError("Enter a connection reference to search.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        `${newConnectionApiBase}/connections/lookup?reference=${encodeURIComponent(trimmed)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as LookupResponse;

      if (!response.ok) {
        setError(payload.error || "Failed to look up the connection status.");
        return;
      }

      setResult(payload);
    } catch (lookupError) {
      console.error("[new-connection-lookup] failed:", lookupError);
      setError("Failed to look up the connection status.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-red-100">
        <CardHeader className="pb-3">
          <CardTitle>Status lookup</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter a connection reference (e.g. NCM-2026-0181) to retrieve the current status and
            milestone timeline for customer queries.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void lookup();
                }}
                placeholder="Enter connection reference"
                className="border-red-100 bg-white pl-10"
              />
            </div>
            <Button
              type="button"
              onClick={() => void lookup()}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Look up status"}
            </Button>
          </div>
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        </CardContent>
      </Card>

      {result && !result.found ? (
        <Card className="border-red-100">
          <CardContent className="px-5 py-6 text-sm text-muted-foreground">
            No connection found for reference{" "}
            <span className="font-semibold text-foreground">{result.reference}</span>. Check the
            reference and try again.
          </CardContent>
        </Card>
      ) : null}

      {result?.found && result.summary ? (
        <Card className="border-red-100">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{result.summary.customer}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {result.summary.reference} - {result.summary.locality},{" "}
                  {result.summary.constituency || result.summary.region}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge
                  className={
                    connectionStatusBadgeClassNames[result.summary.status] ||
                    "bg-slate-100 text-slate-800"
                  }
                >
                  {result.summary.status}
                </Badge>
                <Badge
                  className={
                    connectionPriorityBadgeClassNames[result.summary.priority] ||
                    "bg-slate-100 text-slate-700"
                  }
                >
                  {result.summary.priority} priority
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
              <p>
                Type: {result.summary.connectionClass} / {result.summary.connectionType}
              </p>
              <p>Assigned to: {result.summary.assignedTo || "Pending assignment"}</p>
              <p>Next action: {result.summary.nextAction || "Pending"}</p>
              <p>Applied: {result.summary.applicationDate || "Pending"}</p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Milestone timeline</p>
              <ol className="space-y-3">
                {(result.timeline ?? []).map((event) => (
                  <li key={event.key} className="flex items-start gap-3">
                    {event.done ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    )}
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          event.done ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {event.label}
                        {event.date ? (
                          <span className="ml-2 text-xs text-muted-foreground">{event.date}</span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">{event.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
