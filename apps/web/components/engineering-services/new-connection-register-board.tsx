"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  connectionPriorityBadgeClassNames,
  connectionStatusOptions,
  connectionStatusBadgeClassNames,
  isCompletedConnectionStatus,
  newConnectionApiBase,
  regionOptions,
  type ConnectionRecord,
} from "@/lib/engineering-services/new-connection-management";

const statusOptions = ["All statuses", ...connectionStatusOptions];

const registerRegionOptions = ["All regions", ...regionOptions];

interface RegisterResponse {
  rowCount: number;
  data: ConnectionRecord[];
  error?: string;
}

export function NewConnectionRegisterBoard() {
  const searchParams = useSearchParams();
  const createdReference = searchParams.get("created") ?? "";
  const requestedQueueView = searchParams.get("tab") === "energised" ? "completed" : "active";
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [region, setRegion] = useState("All regions");
  const [queueView, setQueueView] = useState(requestedQueueView);
  const [records, setRecords] = useState<ConnectionRecord[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeRecords = records.filter((record) => !isCompletedConnectionStatus(record.status));
  const completedRecords = records.filter((record) => isCompletedConnectionStatus(record.status));

  async function loadRecords(next?: {
    query?: string;
    status?: string;
    region?: string;
  }) {
    const effectiveQuery = next?.query ?? query;
    const effectiveStatus = next?.status ?? status;
    const effectiveRegion = next?.region ?? region;

    const params = new URLSearchParams();
    if (effectiveQuery.trim()) {
      params.set("q", effectiveQuery.trim());
    }
    if (effectiveStatus !== "All statuses") {
      params.set("status", effectiveStatus);
    }
    if (effectiveRegion !== "All regions") {
      params.set("region", effectiveRegion);
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${newConnectionApiBase}/connections?${params.toString()}`,
        {
          cache: "no-store",
        },
      );

      const payload = (await response.json()) as RegisterResponse;

      if (!response.ok) {
        setError(payload.error || "Failed to load the online register.");
        setRecords([]);
        setRowCount(0);
        return;
      }

      setRecords(payload.data || []);
      setRowCount(payload.rowCount || 0);
    } catch (fetchError) {
      console.error("[new-connection-register] load failed:", fetchError);
      setError("Failed to load the online register.");
      setRecords([]);
      setRowCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setQueueView(requestedQueueView);
  }, [requestedQueueView]);

  return (
    <Card className="border-red-100">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Connections area</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Search active connections by customer, reference number, or quotation number, then
              open the profile and update the status through energising.
            </p>
          </div>
          <Badge className="bg-red-50 text-red-700 hover:bg-red-50">
            {loading ? "Loading..." : `${rowCount} live records`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {createdReference ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Application <span className="font-semibold">{createdReference}</span> is now in the
            Connections area. Open its profile to continue the workflow and capture any
            outstanding information.
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-red-50 text-red-700 hover:bg-red-50">
            {activeRecords.length} active connection{activeRecords.length === 1 ? "" : "s"}
          </Badge>
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            {completedRecords.length} connection{completedRecords.length === 1 ? "" : "s"} in Energised Connections
          </Badge>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by customer name, reference number, or quotation number"
              className="border-red-100 bg-white pl-10"
            />
          </div>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="border-red-100 bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="border-red-100 bg-white">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              {registerRegionOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            onClick={() => void loadRecords()}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </div>

        <Tabs value={queueView} onValueChange={setQueueView} className="space-y-4">
          <TabsList className="w-fit rounded-full border border-red-100 bg-red-50/40 p-1">
            <TabsTrigger
              value="active"
              className="min-w-[180px] rounded-full border-none px-5 py-2 text-sm data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-none"
            >
              Connections
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="min-w-[180px] rounded-full border-none px-5 py-2 text-sm data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-none"
            >
              Energised Connections
            </TabsTrigger>
          </TabsList>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="hidden grid-cols-[1.1fr_1fr_1fr_1fr_0.9fr] gap-3 rounded-lg border border-red-100 bg-red-50/60 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-red-700 lg:grid">
            <span>Application</span>
            <span>Milestones</span>
            <span>Technical</span>
            <span>Assignment / GIS</span>
            <span>Status / Profile</span>
          </div>

          {loading && records.length === 0 ? (
            <div className="rounded-xl border border-red-100 bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              Loading the online register...
            </div>
          ) : null}

          <TabsContent value="active" className="space-y-3">
            {!loading && activeRecords.length === 0 ? (
              <div className="rounded-xl border border-red-100 bg-white px-4 py-8 text-center text-sm text-muted-foreground">
                No active connections match the current search.
              </div>
            ) : null}

            {activeRecords.map((connection) => (
              <div
                key={connection.reference}
                className={`grid gap-3 rounded-xl border px-4 py-4 lg:grid-cols-[1.1fr_1fr_1fr_1fr_0.9fr] lg:items-center ${
                  createdReference === connection.reference
                    ? "border-red-300 bg-red-50/60"
                    : "border-border bg-card"
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{connection.customer}</p>
                  <p className="text-xs text-muted-foreground">{connection.reference}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {connection.quotationRef || "Quotation pending"} - {connection.locality},{" "}
                    {connection.constituency || connection.region}
                  </p>
                  <Badge
                    className={`mt-2 ${
                      connectionPriorityBadgeClassNames[connection.priority] ||
                      "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {connection.priority} priority
                  </Badge>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Application: {connection.applicationDate || "Pending"}</p>
                  <p>Investigation: {connection.investigationDate || "Pending"}</p>
                  <p>Payment: {connection.fullPaymentDate || "Pending"}</p>
                  <p>Connection: {connection.connectionDate || "Pending"}</p>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>
                    {connection.connectionClass} / {connection.connectionType}
                  </p>
                  <p>Config: {connection.config || "Pending"}</p>
                  <p>Value: {connection.projectValue || "Pending"}</p>
                  <p>MV: {connection.mvLength || "N/A"} - LV: {connection.lvLength || "N/A"}</p>
                  <p>Transformer: {connection.transformerRating || "N/A"}</p>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Assigned: {connection.assignedTo || "Pending assignment"}</p>
                  <p>Job card: {connection.jobCardNumber || "Not issued"}</p>
                  <p>Meter: {connection.meterNumber || "Pending"}</p>
                  <p>Coords: {connection.coordinates || "Pending"}</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Badge
                      className={
                        connectionStatusBadgeClassNames[connection.status] ||
                        "bg-slate-100 text-slate-800"
                      }
                    >
                      {connection.status}
                    </Badge>
                    <p className="mt-2 text-xs text-muted-foreground">{connection.nextAction}</p>
                  </div>

                  <Button asChild className="w-full bg-red-600 text-white hover:bg-red-700">
                    <Link
                      href={`/dashboard/engineering-services/new-connection-management/register/${encodeURIComponent(
                        connection.reference,
                      )}`}
                    >
                      Work on profile
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="completed" className="space-y-3">
            {!loading && completedRecords.length === 0 ? (
              <div className="rounded-xl border border-red-100 bg-white px-4 py-8 text-center text-sm text-muted-foreground">
                No energised connections match the current search.
              </div>
            ) : null}

            {completedRecords.map((connection) => (
              <div
                key={connection.reference}
                className="grid gap-3 rounded-xl border border-border bg-card px-4 py-4 lg:grid-cols-[1.1fr_1fr_1fr_1fr_0.9fr] lg:items-center"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{connection.customer}</p>
                  <p className="text-xs text-muted-foreground">{connection.reference}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Energised in {connection.locality}, {connection.constituency || connection.region}
                  </p>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Application: {connection.applicationDate || "Pending"}</p>
                  <p>Payment: {connection.fullPaymentDate || "Pending"}</p>
                  <p>Connection: {connection.connectionDate || "Pending"}</p>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>
                    {connection.connectionClass} / {connection.connectionType}
                  </p>
                  <p>Config: {connection.config || "Pending"}</p>
                  <p>Meter: {connection.meterNumber || "Pending"}</p>
                  <p>Transformer: {connection.transformerRating || "N/A"}</p>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Assigned: {connection.assignedTo || "Not captured"}</p>
                  <p>Job card: {connection.jobCardNumber || "Not captured"}</p>
                  <p>Coords: {connection.coordinates || "Not captured"}</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      Energised
                    </Badge>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Held here for preview, customer queries, historical tracking, and update
                      requests.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      asChild
                      variant="outline"
                      className="w-full border-red-200 bg-white hover:bg-red-50"
                    >
                      <Link
                        href={`/dashboard/engineering-services/new-connection-management/register/${encodeURIComponent(
                          connection.reference,
                        )}?tab=energised`}
                      >
                        Preview connection
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild className="w-full bg-red-600 text-white hover:bg-red-700">
                      <Link
                        href={`/dashboard/engineering-services/new-connection-management/register/${encodeURIComponent(
                          connection.reference,
                        )}?tab=energised&action=request-update`}
                      >
                        Request update
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
