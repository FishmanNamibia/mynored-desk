"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RecruitmentPage() {
  return (
    <div className="w-full px-6 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Recruitment</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Job postings, applications, and interview pipelines will be managed
            here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
