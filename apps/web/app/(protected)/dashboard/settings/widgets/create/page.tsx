"use client";

import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Loader2, StickyNote, CheckSquare, Calendar, FileText } from "lucide-react";
import Link from "next/link";

const widgetTypes = [
  {
    id: "todo",
    name: "To-Do List",
    description: "Create a task list to track your daily activities",
    icon: CheckSquare,
    color: "bg-blue-500",
  },
  {
    id: "notes",
    name: "Notes",
    description: "Quick notes and reminders for yourself",
    icon: StickyNote,
    color: "bg-yellow-500",
  },
  {
    id: "calendar",
    name: "Calendar Widget",
    description: "Display important dates and events",
    icon: Calendar,
    color: "bg-green-500",
  },
  {
    id: "custom",
    name: "Custom Card",
    description: "Create a custom widget with your own content",
    icon: FileText,
    color: "bg-purple-500",
  },
];

export default function CreateWidgetPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedType) {
      toast({ title: "$1", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/widgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: selectedType,
          title: formData.title,
          description: formData.description,
          content: formData.content,
          isActive: true,
        }),
      });

      if (res.ok) {
        toast({ title: "$1", variant: "destructive" });
        router.push("/dashboard/settings/widgets");
      } else {
        const error = await res.json();
        toast({ title: $1 || "$2", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error creating widget:", error);
      toast({ title: "$1", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto p-6 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Create Widget</h1>
            <p className="text-muted-foreground">
              Create custom widgets for your dashboard. Choose a type and configure your widget.
            </p>
          </div>
        </div>

        {/* Widget Type Selection */}
        {!selectedType ? (
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Select Widget Type</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {widgetTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Card
                    key={type.id}
                    className="cursor-pointer hover:border-primary transition-all hover:shadow-lg"
                    onClick={() => setSelectedType(type.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-lg ${type.color} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-1">{type.name}</h3>
                          <p className="text-sm text-muted-foreground">{type.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">
                Configure {widgetTypes.find((t) => t.id === selectedType)?.name}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedType(null)}
              >
                Change Type
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Widget Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      Widget Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g., My Daily Tasks, Important Notes"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">
                      Description <span className="text-muted-foreground text-sm">(Optional)</span>
                    </Label>
                    <Input
                      id="description"
                      placeholder="Brief description of this widget"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <Label htmlFor="content">
                      Initial Content <span className="text-muted-foreground text-sm">(Optional)</span>
                    </Label>
                    <Textarea
                      id="content"
                      placeholder={
                        selectedType === "todo"
                          ? "Enter initial tasks (one per line)"
                          : selectedType === "notes"
                          ? "Enter your notes here"
                          : "Enter widget content"
                      }
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      rows={8}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      You can edit this content later in Widget Management
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-4">
                    <Button type="submit" disabled={loading} className="gap-2">
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Create Widget
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push("/dashboard/settings")}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h3 className="font-semibold text-foreground mb-2">
                    {formData.title || "Widget Title"}
                  </h3>
                  {formData.description && (
                    <p className="text-sm text-muted-foreground mb-3">{formData.description}</p>
                  )}
                  {formData.content && (
                    <div className="text-sm text-foreground whitespace-pre-wrap bg-background rounded p-3 border">
                      {formData.content}
                    </div>
                  )}
                  {!formData.content && (
                    <p className="text-sm text-muted-foreground italic">No content yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
