import Link from "next/link";
import { ArrowRight, ClipboardCheck, MapPinned, PlugZap, ShieldCheck, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const focusAreas = [
  {
    title: "Application intake",
    description:
      "Capture customer requests, premises details, tariff needs, and the required supporting documents.",
    icon: ClipboardCheck,
  },
  {
    title: "Technical vetting",
    description:
      "Coordinate site inspections, load assessment, route design, and compliance checks before approval.",
    icon: MapPinned,
  },
  {
    title: "Execution and energization",
    description:
      "Manage materials, contractor handoffs, metering readiness, commissioning, and final connection.",
    icon: PlugZap,
  },
];

export default function EngineeringServicesPage() {
  return (
    <div className="w-full px-6 py-8 space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Badge className="w-fit bg-red-50 text-red-700 hover:bg-red-50">
            Engineering Services
          </Badge>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Engineering operations workspace
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Start structuring NORED&apos;s engineering workflows from one place, beginning with
              customer connection requests, technical evaluation, approvals, and field delivery.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/engineering-services/new-connection-management"
          className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
        >
          Open New Connection Management
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <Card className="border-red-100 bg-gradient-to-br from-red-50 via-white to-rose-50">
        <CardContent className="p-6">
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-red-600 p-3 text-white shadow-sm">
                  <Workflow className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    New Connection Management is the first live engineering module
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    We can use this workspace to shape the full end-to-end process before adding
                    faults, maintenance, network planning, or outage workstreams.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {focusAreas.map((area) => {
                  const Icon = area.icon;
                  return (
                    <div key={area.title} className="rounded-xl border border-red-100 bg-white/80 p-4">
                      <div className="mb-3 inline-flex rounded-lg bg-red-50 p-2 text-red-600">
                        <Icon className="h-4 w-4" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">{area.title}</h3>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {area.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-red-700">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-sm font-semibold">Recommended first scope</span>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li>Customer application capture and validation</li>
                <li>Site inspection scheduling and technical notes</li>
                <li>Quotation, approval, and payment checkpoints</li>
                <li>Construction, metering, testing, and handover status</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
