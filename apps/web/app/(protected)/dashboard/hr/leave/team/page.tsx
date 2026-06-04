"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TeamLeavePage() {
  return (
    <div className="w-full px-6 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Team Leave</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Managers will be able to review and approve team leave here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
