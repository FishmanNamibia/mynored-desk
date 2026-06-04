"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Calendar, MapPin } from "lucide-react";

export default function RefreshmentsPage() {
  const refreshmentRequests = [
    {
      id: "RF-001",
      event: "Monthly Team Meeting",
      date: "Jan 20, 2026",
      time: "10:00 AM",
      people: 45,
      location: "Main Hall",
      status: "approved",
      budget: "N$2,500",
    },
    {
      id: "RF-002",
      event: "Training Workshop",
      date: "Jan 22, 2026",
      time: "9:00 AM",
      people: 30,
      location: "Training Room",
      status: "pending",
      budget: "N$1,800",
    },
    {
      id: "RF-003",
      event: "Department Lunch",
      date: "Jan 25, 2026",
      time: "12:00 PM",
      people: 60,
      location: "Conference Hall",
      status: "approved",
      budget: "N$4,200",
    },
    {
      id: "RF-004",
      event: "Client Reception",
      date: "Jan 28, 2026",
      time: "5:00 PM",
      people: 100,
      location: "Boardroom",
      status: "pending",
      budget: "N$6,500",
    },
  ];

  const catering = [
    {
      name: "Light Refreshments",
      items: "Beverages, snacks, pastries",
      costPer: "N$80/person",
    },
    {
      name: "Full Catering",
      items: "Full meal, beverages, desserts",
      costPer: "N$250/person",
    },
    {
      name: "Heavy Catering",
      items: "Multi-course, premium beverages",
      costPer: "N$400/person",
    },
    {
      name: "Beverages Only",
      items: "Coffee, tea, soft drinks",
      costPer: "N$30/person",
    },
  ];

  return (
    <div className="w-full px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1 text-foreground">
            Refreshments & Catering
          </h1>
          <p className="text-sm text-muted-foreground">
            Request event refreshments and catering services.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Request
        </Button>
      </div>

      {/* Catering Options */}
      <Card>
        <CardHeader>
          <CardTitle>Catering Packages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {catering.map((package_) => (
              <div
                key={package_.name}
                className="p-4 rounded-lg border border-border"
              >
                <p className="font-medium mb-2">{package_.name}</p>
                <p className="text-sm text-muted-foreground mb-3">
                  {package_.items}
                </p>
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{package_.costPer}</p>
                  <Button size="sm" variant="outline">
                    Select
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Event Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {refreshmentRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-start justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium">{request.event}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {request.date} at {request.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {request.people} people
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {request.location}
                    </span>
                  </div>
                  <p className="text-sm font-medium mt-2">
                    Budget: {request.budget}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      request.status === "approved" ? "default" : "outline"
                    }
                  >
                    {request.status}
                  </Badge>
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
