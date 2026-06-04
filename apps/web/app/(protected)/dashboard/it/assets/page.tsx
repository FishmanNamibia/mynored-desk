"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ITAssetsPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>IT Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Hardware and software asset inventories will be managed here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
