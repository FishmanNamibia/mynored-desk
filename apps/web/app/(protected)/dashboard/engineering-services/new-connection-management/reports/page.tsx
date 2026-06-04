import { ArrowUpRight, Download, FileSpreadsheet, FileText } from "lucide-react";
import { EngineeringReportTable } from "@/components/engineering-services/engineering-report-table";
import { NewConnectionShell } from "@/components/engineering-services/new-connection-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildDynamicMonthlyEngineeringReport,
  buildReportCoverageCards,
  engineeringReportDefinitions,
  getEngineeringReportHref,
  getMonthlyReportDownloadLabel,
} from "@/lib/engineering-services/new-connection-reporting";
import { getNewConnectionRecords } from "@/lib/engineering-services/new-connection-server";

export default async function NewConnectionManagementReportsPage() {
  const connections = await getNewConnectionRecords();
  const monthlyEngineeringReport = buildDynamicMonthlyEngineeringReport(connections);
  const coverageCards = buildReportCoverageCards(monthlyEngineeringReport);
  const detailedSections = [
    monthlyEngineeringReport.mvSummary,
    monthlyEngineeringReport.mvNoredTeams,
    ...monthlyEngineeringReport.mvContractorPhases,
    monthlyEngineeringReport.mvMovementTable,
    monthlyEngineeringReport.keyStakeholderProjects,
    monthlyEngineeringReport.lvStatus,
    monthlyEngineeringReport.lvCableOutstanding,
  ];

  return (
    <NewConnectionShell description="Use the reporting centre for pre-generated monthly engineering reports, management tables, and the operational extracts that support status queries and field follow-up.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {coverageCards.map((card) => {
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

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-red-100">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge className="bg-red-50 text-red-700 hover:bg-red-50">
                  Pre-generated for {monthlyEngineeringReport.monthLabel}
                </Badge>
                <CardTitle className="mt-3">Reporting Centre</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Download the formatted monthly engineering report or pull the operational
                  extracts used by the connections team.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {engineeringReportDefinitions.map((report) => (
              <div key={report.key} className="rounded-2xl border border-red-100 bg-red-50/40 p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {report.key === "monthly-engineering" ? (
                      <FileText className="h-4 w-4 text-red-600" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4 text-red-600" />
                    )}
                    <h3 className="text-sm font-semibold text-foreground">{report.title}</h3>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">{report.description}</p>
                  <p className="text-xs text-red-700">{report.helper}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {report.formats.map((format) => {
                    const isPrimary = format === "pdf" || format === "xlsx" || format === "csv";
                    const label = getMonthlyReportDownloadLabel(format);

                    return (
                      <a
                        key={`${report.key}-${format}`}
                        href={getEngineeringReportHref(report.key, format)}
                        target={format === "json" ? "_blank" : undefined}
                        rel={format === "json" ? "noreferrer" : undefined}
                        className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                          isPrimary
                            ? "bg-red-600 text-white hover:bg-red-700"
                            : "border border-red-200 bg-white text-foreground hover:bg-red-50"
                        }`}
                      >
                        {label}
                        {format === "json" ? (
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-red-100 bg-gradient-to-br from-white to-red-50">
          <CardHeader className="pb-3">
            <CardTitle>Table of Contents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {monthlyEngineeringReport.tableOfContents.map((item) => (
              <div
                key={item}
                className="rounded-xl border border-red-100 bg-white px-4 py-3 text-sm text-muted-foreground"
              >
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-red-100">
        <CardHeader className="pb-3">
          <CardTitle>Report preview</CardTitle>
          <p className="text-sm text-muted-foreground">
            The monthly engineering pack follows the same structure in the PDF and Excel exports.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-red-100 bg-red-50/40 p-4">
            <p className="text-sm font-semibold text-foreground">1. Introduction</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {monthlyEngineeringReport.introduction}
            </p>
          </div>

          <EngineeringReportTable section={monthlyEngineeringReport.donatedAssets} compact />

          <div className="rounded-2xl border border-red-100 bg-red-50/40 p-4">
            <p className="text-sm font-semibold text-foreground">2.2 New Connections</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Expand the sections below to preview the same MV and LV tables that will be included
              in the exported report pack.
            </p>
          </div>

          {detailedSections.map((section) => (
            <details
              key={section.key}
              className="rounded-2xl border border-red-100 bg-white open:bg-red-50/20"
            >
              <summary className="cursor-pointer list-none px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {section.sectionNumber} {section.title}
                    </p>
                    {section.tableLabel ? (
                      <p className="mt-1 text-xs text-muted-foreground">{section.tableLabel}</p>
                    ) : null}
                  </div>
                  <Badge className="bg-red-50 text-red-700 hover:bg-red-50">Preview</Badge>
                </div>
              </summary>
              <div className="px-5 pb-5">
                <EngineeringReportTable section={section} compact />
              </div>
            </details>
          ))}

          <div className="rounded-2xl border border-red-100 bg-red-50/40 p-4">
            <p className="text-sm font-semibold text-foreground">2.3 Challenges</p>
            <div className="mt-3 space-y-3">
              {monthlyEngineeringReport.challenges.map((challenge) => (
                <div
                  key={challenge}
                  className="rounded-xl border border-red-100 bg-white px-4 py-3 text-sm text-muted-foreground"
                >
                  {challenge}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </NewConnectionShell>
  );
}
