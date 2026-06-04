"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DocumentTemplatesPage() {
  return (
    <div className="w-full px-6 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Document Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Commonly used document templates will be managed here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
