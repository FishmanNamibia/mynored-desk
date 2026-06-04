"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LeaveCalendarPage() {
  return (
    <div className="w-full px-6 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Leave Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            A calendar view of leave across your team will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
