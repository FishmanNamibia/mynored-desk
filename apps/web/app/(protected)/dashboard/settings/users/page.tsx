"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UsersAndRolesSettingsPage() {
  return (
    <div className="w-full px-6 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Users &amp; Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Administration of user accounts, roles, and permissions will be
            managed here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
