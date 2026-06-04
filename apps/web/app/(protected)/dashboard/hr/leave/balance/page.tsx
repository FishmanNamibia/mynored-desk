"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LeaveBalancePage() {
  return (
    <div className="w-full px-6 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Leave Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Detailed leave balances by type will be shown here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
