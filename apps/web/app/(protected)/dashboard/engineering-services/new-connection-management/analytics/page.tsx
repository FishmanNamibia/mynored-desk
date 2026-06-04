import { Activity, CheckCircle2, Clock, Flame } from "lucide-react";
import { MonthlyMvConnectionsChart } from "@/components/engineering-services/monthly-mv-connections-chart";
import { NewConnectionShell } from "@/components/engineering-services/new-connection-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildConnectionAnalytics,
  connectionStatusBadgeClassNames,
  connectionPriorityBadgeClassNames,
  type ConnectionPriority,
  type ConnectionStatus,
  type DistributionSlice,
} from "@/lib/engineering-services/new-connection-management";
import { buildDynamicMonthlyEngineeringReport } from "@/lib/engineering-services/new-connection-reporting";
import { getNewConnectionRecords } from "@/lib/engineering-services/new-connection-server";

export const dynamic = "force-dynamic";

function DistributionList({
  slices,
  total,
  badgeClassNames,
}: {
  slices: DistributionSlice[];
  total: number;
  badgeClassNames?: Record<string, string>;
}) {
  if (slices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No records available yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {slices.map((slice) => {
        const percent = total === 0 ? 0 : Math.round((slice.count / total) * 100);
        return (
          <div key={slice.label} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-medium text-foreground">
                {badgeClassNames ? (
                  <Badge
                    className={
                      badgeClassNames[slice.label] || "bg-slate-100 text-slate-700"
                    }
                  >
                    {slice.label}
                  </Badge>
                ) : (
                  slice.label
                )}
              </span>
              <span className="text-muted-foreground">
                {slice.count} ({percent}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-red-50">
              <div
                className="h-full rounded-full bg-red-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function NewConnectionManagementAnalyticsPage() {
  const connections = await getNewConnectionRecords();
  const analytics = buildConnectionAnalytics(connections);
  const monthlyReport = buildDynamicMonthlyEngineeringReport(connections);

  const cards = [
    {
      title: "Total applications",
      value: String(analytics.total),
      helper: "Connection profiles currently tracked in the register.",
      icon: Activity,
    },
    {
      title: "Energised",
      value: `${analytics.energised} (${analytics.energisedRate}%)`,
      helper: "Completed connections that have been energised.",
      icon: CheckCircle2,
    },
    {
      title: "Open pipeline",
      value: String(analytics.open),
      helper: "Applications still moving through the workflow.",
      icon: Clock,
    },
    {
      title: "Urgent & open",
      value: String(analytics.urgentOpen),
      helper: "Urgent-priority applications that are not yet energised.",
      icon: Flame,
    },
  ];

  return (
    <NewConnectionShell description="Analytics summarise the live new connection register so you can see status, priority, region, and MV/LV distribution at a glance, alongside the six-month MV movement trend.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              className="border-red-100 bg-gradient-to-br from-white to-red-50"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                    <p className="text-3xl font-semibold tracking-tight text-foreground">
                      {card.value}
                    </p>
                    <p className="text-xs leading-5 text-muted-foreground">{card.helper}</p>
                  </div>
                  <div className="rounded-xl bg-red-600 p-2.5 text-white shadow-sm">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-red-100">
          <CardHeader className="pb-3">
            <CardTitle>Status distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionList
              slices={analytics.statusDistribution}
              total={analytics.total}
              badgeClassNames={
                connectionStatusBadgeClassNames as Record<ConnectionStatus, string>
              }
            />
          </CardContent>
        </Card>

        <Card className="border-red-100">
          <CardHeader className="pb-3">
            <CardTitle>Priority distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionList
              slices={analytics.priorityDistribution}
              total={analytics.total}
              badgeClassNames={
                connectionPriorityBadgeClassNames as Record<ConnectionPriority, string>
              }
            />
          </CardContent>
        </Card>

        <Card className="border-red-100">
          <CardHeader className="pb-3">
            <CardTitle>Region distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionList slices={analytics.regionDistribution} total={analytics.total} />
          </CardContent>
        </Card>

        <Card className="border-red-100">
          <CardHeader className="pb-3">
            <CardTitle>MV / LV split</CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionList slices={analytics.classDistribution} total={analytics.total} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-red-100">
        <CardHeader className="pb-3">
          <CardTitle>Six-month MV connections movement</CardTitle>
          <p className="text-sm text-muted-foreground">
            Received, energised, pending energising, pending, and backlog trend derived from the
            live MV register.
          </p>
        </CardHeader>
        <CardContent>
          <MonthlyMvConnectionsChart data={monthlyReport.mvMovementChart} />
        </CardContent>
      </Card>
    </NewConnectionShell>
  );
}
