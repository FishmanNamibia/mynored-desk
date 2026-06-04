"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EmployeesPage() {
  return (
    <div className="w-full px-6 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            HR will manage employee records and profiles here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
