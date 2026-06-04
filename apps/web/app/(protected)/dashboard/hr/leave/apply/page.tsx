"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ApplyLeavePage() {
  return (
    <div className="w-full px-6 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Apply for Leave</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            A full leave application form will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
