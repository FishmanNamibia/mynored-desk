"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function IntegrationsSettingsPage() {
  return (
    <div className="w-full px-6 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            External systems and data integrations will be configured here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
