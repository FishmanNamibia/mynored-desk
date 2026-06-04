"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MyLeavePage() {
  return (
    <div className="min-h-full">
      <div className="p-3 sm:p-4 lg:p-5 space-y-3 sm:space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
            My Leave
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 leading-tight">
            Manage your leave balances, requests, and history.
          </p>
        </div>

        <Card className="widget-card">
          <CardHeader>
            <CardTitle>Leave Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Leave balances, requests, and history will be managed here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
