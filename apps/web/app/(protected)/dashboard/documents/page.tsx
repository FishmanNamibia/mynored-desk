"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Folder, File, Star, Trash2 } from "lucide-react";

export default function DocumentsPage() {
  const fileStats = [
    { label: "Total Files", value: "248", icon: File },
    { label: "Folders", value: "32", icon: Folder },
    { label: "Shared", value: "45", icon: Star },
    { label: "Storage Used", value: "8.2 GB", icon: Folder },
  ];

  const recentFiles = [
    {
      id: 1,
      name: "Q4 Budget Review.xlsx",
      category: "Finance",
      modified: "2 hours ago",
      size: "2.4 MB",
    },
    {
      id: 2,
      name: "Employee Handbook 2026.pdf",
      category: "HR",
      modified: "Yesterday",
      size: "5.1 MB",
    },
    {
      id: 3,
      name: "Strategic Plan Presentation.pptx",
      category: "Strategy",
      modified: "Jan 14, 2026",
      size: "8.7 MB",
    },
    {
      id: 4,
      name: "IT Security Audit Report.pdf",
      category: "IT",
      modified: "Jan 12, 2026",
      size: "3.2 MB",
    },
  ];

  return (
    <div className="w-full px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1 text-foreground">
            My Documents
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage, organize, and share your work documents and files.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Upload File
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {fileStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <Icon className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* File Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Documents</CardTitle>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm"
                placeholder="Search documents..."
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="h-10">
              <TabsTrigger value="all">All Files</TabsTrigger>
              <TabsTrigger value="shared">Shared</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="starred">Starred</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="pt-4">
              <div className="space-y-3">
                {recentFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {file.category} • {file.size} • Modified {file.modified}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Star className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="shared" className="pt-4">
              <p className="text-sm text-muted-foreground py-4">
                Documents shared with you will appear here.
              </p>
            </TabsContent>

            <TabsContent value="recent" className="pt-4">
              <p className="text-sm text-muted-foreground py-4">
                Your recently accessed documents.
              </p>
            </TabsContent>

            <TabsContent value="starred" className="pt-4">
              <p className="text-sm text-muted-foreground py-4">
                Your starred documents for quick access.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
