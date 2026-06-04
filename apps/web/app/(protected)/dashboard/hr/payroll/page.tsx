"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PayrollPage() {
  return (
    <div className="w-full px-6 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payroll</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Payroll processing and payslip access will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
