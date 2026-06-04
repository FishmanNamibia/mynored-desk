import Link from "next/link";
import { ArrowRight, Download, FileText } from "lucide-react";
import { EngineeringReportTable } from "@/components/engineering-services/engineering-report-table";
import { MonthlyMvConnectionsChart } from "@/components/engineering-services/monthly-mv-connections-chart";
import { NewConnectionShell } from "@/components/engineering-services/new-connection-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildDynamicMonthlyEngineeringReport,
  buildEngineeringOverviewCardsFromConnections,
  getEngineeringReportHref,
} from "@/lib/engineering-services/new-connection-reporting";
import { getNewConnectionRecords } from "@/lib/engineering-services/new-connection-server";

const quickLinks = [
  {
    title: "Capture application",
    description: "Open the intake workspace and submit a new application into the workflow.",
    href: "/dashboard/engineering-services/new-connection-management/capture",
  },
  {
    title: "Connections register",
    description: "Retrieve live applications, update status, and work energising profiles.",
    href: "/dashboard/engineering-services/new-connection-management/register?tab=connections",
  },
  {
    title: "Reporting centre",
    description: "Download the monthly engineering report pack and detailed extracts.",
    href: "/dashboard/engineering-services/new-connection-management/reports",
  },
];

export default async function NewConnectionManagementOverviewPage() {
  const connections = await getNewConnectionRecords();
  const monthlyEngineeringReport = buildDynamicMonthlyEngineeringReport(connections);
  const overviewCards = buildEngineeringOverviewCardsFromConnections(connections);

  return (
    <NewConnectionShell description="This overview now follows the monthly engineering reporting structure so management snapshots, new connection movements, donated assets, and challenges sit in one place.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => {
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

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-red-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Badge className="bg-red-50 text-red-700 hover:bg-red-50">
                  Report Month: {monthlyEngineeringReport.monthLabel}
                </Badge>
                <CardTitle className="mt-3">{monthlyEngineeringReport.reportTitle}</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="rounded-2xl border border-red-100 bg-red-50/40 p-4">
              <p className="text-sm font-semibold text-foreground">1. Introduction</p>
              <p className="mt-2 leading-6">{monthlyEngineeringReport.introduction}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-2xl border border-red-100 bg-white p-4 transition-colors hover:bg-red-50"
                >
                  <p className="text-sm font-semibold text-foreground">{link.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {link.description}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-red-700">
                    Open workspace
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-100 bg-gradient-to-br from-white to-red-50">
          <CardHeader className="pb-3">
            <CardTitle>Pre-generated Report Pack</CardTitle>
            <p className="text-sm text-muted-foreground">
              Generate the monthly report in the same structure used for management reporting.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-red-100 bg-white p-4">
              <p className="text-sm font-semibold text-foreground">Table of contents</p>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                {monthlyEngineeringReport.tableOfContents.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild className="bg-red-600 text-white hover:bg-red-700">
                <a href={getEngineeringReportHref("monthly-engineering", "pdf")}>
                  <FileText className="h-4 w-4" />
                  Download PDF
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-red-200 bg-white hover:bg-red-50"
              >
                <a href={getEngineeringReportHref("monthly-engineering", "xlsx")}>
                  <Download className="h-4 w-4" />
                  Download Excel
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-red-100">
          <CardHeader className="pb-3">
            <CardTitle>2.1 Donated Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <EngineeringReportTable
              section={{
                ...monthlyEngineeringReport.donatedAssets,
                rows: monthlyEngineeringReport.donatedAssets.rows,
              }}
              compact
            />
          </CardContent>
        </Card>

        <Card className="border-red-100">
          <CardHeader className="pb-3">
            <CardTitle>2.2.4 Key Stakeholder MV Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <EngineeringReportTable
              section={monthlyEngineeringReport.keyStakeholderProjects}
              compact
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="border-red-100">
          <CardHeader className="pb-3">
            <CardTitle>2.2.1 NORED MV Connections Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <EngineeringReportTable section={monthlyEngineeringReport.mvSummary} compact />
          </CardContent>
        </Card>

        <Card className="border-red-100">
          <CardHeader className="pb-3">
            <CardTitle>2.2.5 NORED LV Connections Status</CardTitle>
          </CardHeader>
          <CardContent>
            <EngineeringReportTable section={monthlyEngineeringReport.lvStatus} compact />
          </CardContent>
        </Card>
      </div>

      <Card className="border-red-100">
        <CardHeader className="pb-3">
          <CardTitle>2.2.3 Six Months MV Connections Movement</CardTitle>
          <p className="text-sm text-muted-foreground">
            Movement trend used in the month-end report for received, energised, pending
            energising, pending, and backlog over six months.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <MonthlyMvConnectionsChart data={monthlyEngineeringReport.mvMovementChart} />
          <EngineeringReportTable section={monthlyEngineeringReport.mvMovementTable} compact />
        </CardContent>
      </Card>

      <Card className="border-red-100">
        <CardHeader className="pb-3">
          <CardTitle>2.3 Challenges</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {monthlyEngineeringReport.challenges.map((challenge) => (
            <div
              key={challenge}
              className="rounded-2xl border border-red-100 bg-red-50/40 p-4 text-sm text-muted-foreground"
            >
              {challenge}
            </div>
          ))}
        </CardContent>
      </Card>
    </NewConnectionShell>
  );
}
