"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EquipmentRequestPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Equipment Request</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Employees will be able to request hardware and software here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
