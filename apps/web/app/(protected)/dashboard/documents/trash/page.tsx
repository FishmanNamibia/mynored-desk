"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TrashDocumentsPage() {
  return (
    <div className="w-full px-6 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Trash</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Recently deleted documents will appear here before permanent
            removal.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
