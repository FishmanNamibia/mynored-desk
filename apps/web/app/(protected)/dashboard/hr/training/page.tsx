"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TrainingPage() {
  return (
    <div className="w-full px-6 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Training</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Learning and development programmes will be managed here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
