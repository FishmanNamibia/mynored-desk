"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, AlertCircle, CheckCircle } from "lucide-react";

export default function ITTicketsPage() {
  const tickets = [
    {
      id: "TKT-001",
      title: "Printer Setup Issue",
      description: "Unable to connect to network printer",
      priority: "medium",
      status: "open",
      created: "2024-01-15",
      sla: "8 hours",
    },
    {
      id: "TKT-002",
      title: "Email Sync Problem",
      description: "Outlook not syncing calendar events",
      priority: "high",
      status: "in-progress",
      created: "2024-01-14",
      sla: "4 hours",
    },
    {
      id: "TKT-003",
      title: "VPN Connection Timeout",
      description: "VPN disconnects every 30 minutes",
      priority: "high",
      status: "resolved",
      created: "2024-01-13",
      sla: "2 hours",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "destructive" as const;
      case "in-progress":
        return "outline" as const;
      case "resolved":
        return "default" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <div className="w-full px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1 text-foreground">
            Support Tickets
          </h1>
          <p className="text-sm text-muted-foreground">
            Track and manage your IT support requests.
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create New Ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Open Tickets
                </p>
                <p className="text-2xl font-bold">1</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  In Progress
                </p>
                <p className="text-2xl font-bold">1</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Resolved</p>
                <p className="text-2xl font-bold">8</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Avg Response
                </p>
                <p className="text-2xl font-bold">2h 15m</p>
              </div>
              <Clock className="w-8 h-8 text-teal-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-medium">{ticket.title}</p>
                    <span className="text-xs text-muted-foreground">
                      {ticket.id}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {ticket.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Created: {ticket.created}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">SLA</p>
                    <p className="text-sm font-medium">{ticket.sla}</p>
                  </div>
                  <Badge
                    variant={
                      ticket.priority === "high" ? "destructive" : "outline"
                    }
                  >
                    {ticket.priority}
                  </Badge>
                  <Badge variant={getStatusColor(ticket.status)}>
                    {ticket.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
