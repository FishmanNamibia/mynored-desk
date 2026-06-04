"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SharedDocumentsPage() {
  return (
    <div className="w-full px-6 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Shared With Me</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Documents that colleagues have shared with you will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
