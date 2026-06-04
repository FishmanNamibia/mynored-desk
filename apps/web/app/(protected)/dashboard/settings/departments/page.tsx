"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DepartmentsSettingsPage() {
  return (
    <div className="w-full px-6 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Organisational structure and department metadata will be maintained
            here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
