"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, XCircle, Plus } from "lucide-react";

export default function AdminApprovalsPage() {
  const approvals = [
    {
      id: "APR-001",
      item: "Budget Reallocation Q1",
      requester: "Finance Manager",
      amount: "N$250,000",
      date: "Jan 16, 2026",
      status: "pending",
    },
    {
      id: "APR-002",
      item: "New Hire: Systems Admin",
      requester: "HR Manager",
      amount: "-",
      date: "Jan 15, 2026",
      status: "pending",
    },
    {
      id: "APR-003",
      item: "Conference Attendance",
      requester: "IT Department",
      amount: "N$45,000",
      date: "Jan 14, 2026",
      status: "approved",
    },
    {
      id: "APR-004",
      item: "Equipment Purchase",
      requester: "Operations",
      amount: "N$125,000",
      date: "Jan 13, 2026",
      status: "rejected",
    },
  ];

  const stats = [
    { label: "Pending Review", value: "12", icon: Clock, color: "orange" },
    { label: "Approved", value: "156", icon: CheckCircle, color: "green" },
    { label: "Rejected", value: "8", icon: XCircle, color: "red" },
    {
      label: "Avg. Approval Time",
      value: "2.3 days",
      icon: AlertCircle,
      color: "blue",
    },
  ];

  return (
    <div className="w-full px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1 text-foreground">
            Approvals Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Review and manage pending requests requiring executive approval.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Submit Request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colorMap: any = {
            orange: "orange-500",
            green: "green-500",
            red: "red-500",
            blue: "blue-500",
          };
          return (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <Icon className={`w-8 h-8 text-${colorMap[stat.color]}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Approvals List */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {approvals.map((approval) => (
              <div
                key={approval.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium">{approval.item}</p>
                  <p className="text-sm text-muted-foreground">
                    {approval.id} • {approval.requester} • {approval.date}
                  </p>
                  {approval.amount && (
                    <p className="text-sm font-medium mt-1">
                      {approval.amount}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      approval.status === "pending"
                        ? "outline"
                        : approval.status === "approved"
                        ? "default"
                        : "destructive"
                    }
                  >
                    {approval.status}
                  </Badge>
                  {approval.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        Reject
                      </Button>
                      <Button size="sm">Approve</Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
