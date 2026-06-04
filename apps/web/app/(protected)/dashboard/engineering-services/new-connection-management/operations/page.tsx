import { ConnectionMapBoard } from "@/components/engineering-services/connection-map-board";
import { NewConnectionShell } from "@/components/engineering-services/new-connection-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildMapPins,
  buildPriorityConnections,
  buildStatusBuckets,
  connectionStatusBadgeClassNames,
  gisLayers,
} from "@/lib/engineering-services/new-connection-management";
import { getNewConnectionRecords } from "@/lib/engineering-services/new-connection-server";

export const dynamic = "force-dynamic";

export default async function NewConnectionManagementOperationsPage() {
  const connections = await getNewConnectionRecords();
  const statusBuckets = buildStatusBuckets(connections);
  const priorityConnections = buildPriorityConnections(connections);
  const mapPins = buildMapPins(connections);

  return (
    <NewConnectionShell description="Use the operations board for status monitoring, priority follow-up, and GIS visibility without the capture form and report downloads on the same page.">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-red-100">
          <CardHeader className="pb-3">
            <CardTitle>Connection status snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {statusBuckets.map((bucket) => (
              <div key={bucket.title} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{bucket.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{bucket.helper}</p>
                  </div>
                  <Badge className="bg-red-600 text-white hover:bg-red-600">{bucket.count}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-red-100 bg-gradient-to-br from-white to-red-50">
          <CardHeader className="pb-3">
            <CardTitle>Priority queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {priorityConnections.map((connection) => (
              <div
                key={connection.reference}
                className="rounded-xl border border-red-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{connection.customer}</p>
                    <p className="text-xs text-muted-foreground">
                      {connection.reference} - {connection.connectionClass} - {connection.locality}
                    </p>
                  </div>
                  <Badge
                    className={
                      connectionStatusBadgeClassNames[connection.status] ||
                      "bg-slate-100 text-slate-800"
                    }
                  >
                    {connection.status}
                  </Badge>
                </div>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p>Quotation: {connection.quotationRef || "Not yet issued"}</p>
                  <p>Assigned to: {connection.assignedTo}</p>
                  <p>Next action: {connection.nextAction}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <ConnectionMapBoard layers={gisLayers} pins={mapPins} />
    </NewConnectionShell>
  );
}
