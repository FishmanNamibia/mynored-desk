"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Laptop,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
} from "lucide-react";

export default function ITRequestsPage() {
  const stats = [
    {
      title: "Total Requests",
      value: "24",
      description: "All time",
      icon: Laptop,
      color: "text-blue-600",
    },
    {
      title: "In Progress",
      value: "5",
      description: "Being handled",
      icon: Clock,
      color: "text-yellow-600",
    },
    {
      title: "Completed",
      value: "17",
      description: "Successfully resolved",
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      title: "Rejected",
      value: "2",
      description: "Not approved",
      icon: XCircle,
      color: "text-red-600",
    },
  ];

  const myRequests = [
    {
      id: "IT-2026-001",
      title: "New laptop request",
      type: "Equipment",
      status: "In Progress",
      priority: "High",
      date: "2026-01-28",
      assignedTo: "IT Support Team",
    },
    {
      id: "IT-2026-002",
      title: "Password reset - Email",
      type: "Password",
      status: "Completed",
      priority: "Medium",
      date: "2026-01-25",
      assignedTo: "John Doe",
    },
    {
      id: "IT-2026-003",
      title: "Software installation - Adobe",
      type: "Software",
      status: "Pending",
      priority: "Low",
      date: "2026-01-30",
      assignedTo: "Unassigned",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "default";
      case "In Progress":
        return "outline";
      case "Pending":
        return "secondary";
      default:
        return "destructive";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "destructive";
      case "Medium":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="w-full px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            My IT Requests
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and manage your IT support requests
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="pb-2">
                <CardDescription>{stat.title}</CardDescription>
                <CardTitle className={`text-3xl ${stat.color}`}>
                  {stat.value}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">
                    {stat.description}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Requests Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="h-10">
          <TabsTrigger value="all" className="px-4">
            All Requests
          </TabsTrigger>
          <TabsTrigger value="pending" className="px-4">
            Pending
          </TabsTrigger>
          <TabsTrigger value="progress" className="px-4">
            In Progress
          </TabsTrigger>
          <TabsTrigger value="completed" className="px-4">
            Completed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>All Requests</CardTitle>
              <CardDescription>
                Complete history of your IT requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {myRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{request.title}</h4>
                          <Badge variant={getStatusColor(request.status)}>
                            {request.status}
                          </Badge>
                          <Badge variant={getPriorityColor(request.priority)}>
                            {request.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{request.id}</span>
                          <span>•</span>
                          <span>{request.type}</span>
                          <span>•</span>
                          <span>{request.date}</span>
                          <span>•</span>
                          <span>Assigned to: {request.assignedTo}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Requests</CardTitle>
              <CardDescription>Requests awaiting assignment</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You have 1 pending request.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>In Progress</CardTitle>
              <CardDescription>
                Requests currently being handled
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You have 5 requests in progress.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Completed Requests</CardTitle>
              <CardDescription>Successfully resolved requests</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You have 17 completed requests.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
