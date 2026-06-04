"use client";

import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function LicensesPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "overview";

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Software Licenses</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={tab} className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
              <TabsTrigger value="vendors">Vendors</TabsTrigger>
              <TabsTrigger value="systems">Systems</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-4">
              <p className="text-sm text-muted-foreground">
                High-level overview of licenses across the organisation.
              </p>
            </TabsContent>
            <TabsContent value="active" className="pt-4">
              <p className="text-sm text-muted-foreground">
                List of currently active licenses.
              </p>
            </TabsContent>
            <TabsContent value="expiring" className="pt-4">
              <p className="text-sm text-muted-foreground">
                Licenses expiring in the next 90 days.
              </p>
            </TabsContent>
            <TabsContent value="vendors" className="pt-4">
              <p className="text-sm text-muted-foreground">
                Software vendors and key contacts.
              </p>
            </TabsContent>
            <TabsContent value="systems" className="pt-4">
              <p className="text-sm text-muted-foreground">
                Mapping of licenses to internal systems.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
