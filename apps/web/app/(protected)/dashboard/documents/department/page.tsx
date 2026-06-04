"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DepartmentDocumentsPage() {
  return (
    <div className="w-full px-6 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Department Files</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Department-wide documents and templates will be available here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
