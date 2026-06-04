"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, XCircle, Clock } from "lucide-react";

export default function SystemStatusPage() {
  const services = [
    {
      name: "Email Services",
      status: "operational",
      uptime: "99.9%",
      lastIncident: "2024-01-05",
      responseTime: "145ms",
    },
    {
      name: "VPN Gateway",
      status: "operational",
      uptime: "99.7%",
      lastIncident: "2024-01-08",
      responseTime: "52ms",
    },
    {
      name: "File Sharing",
      status: "operational",
      uptime: "99.95%",
      lastIncident: "2023-12-28",
      responseTime: "234ms",
    },
    {
      name: "Web Portal",
      status: "operational",
      uptime: "99.8%",
      lastIncident: "2024-01-10",
      responseTime: "89ms",
    },
    {
      name: "Database Cluster",
      status: "operational",
      uptime: "99.99%",
      lastIncident: "2023-12-15",
      responseTime: "12ms",
    },
    {
      name: "Authentication Service",
      status: "operational",
      uptime: "99.98%",
      lastIncident: "2024-01-02",
      responseTime: "78ms",
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "degraded":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "down":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
        return "default" as const;
      case "degraded":
        return "outline" as const;
      case "down":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <div className="w-full px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1 text-foreground">
          System Status
        </h1>
        <p className="text-sm text-muted-foreground">
          Real-time status of IT services and infrastructure.
        </p>
      </div>

      <Card className="border-2 border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
            <div>
              <h3 className="font-semibold text-lg text-green-900">
                All Systems Operational
              </h3>
              <p className="text-sm text-green-700">
                Last update: 2 minutes ago
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <Card
            key={service.name}
            className="hover:shadow-md transition-shadow"
          >
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{service.name}</h4>
                  {getStatusIcon(service.status)}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={getStatusColor(service.status)}>
                      {service.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uptime</span>
                    <span className="font-medium">{service.uptime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Response Time</span>
                    <span className="font-medium">{service.responseTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Incident</span>
                    <span className="text-xs">{service.lastIncident}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <p className="font-medium">VPN Gateway - Maintenance Window</p>
                <p className="text-sm text-muted-foreground">
                  Jan 10, 2024 02:00 - 04:00 UTC
                </p>
              </div>
              <Badge>Planned</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <p className="font-medium">Email Services - Brief Outage</p>
                <p className="text-sm text-muted-foreground">
                  Jan 5, 2024 14:30 - 15:15 UTC (45 min)
                </p>
              </div>
              <Badge variant="outline">Resolved</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
