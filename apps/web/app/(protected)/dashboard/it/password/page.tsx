"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PasswordManagementPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Password Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Password reset and account unlock workflows will be implemented
            here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
