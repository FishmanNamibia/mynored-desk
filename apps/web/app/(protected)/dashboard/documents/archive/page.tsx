"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ArchivedDocumentsPage() {
  return (
    <div className="w-full px-6 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Archive</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Archived documents will be available for reference here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
