"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { NewConnectionSectionForm } from "@/components/engineering-services/new-connection-section-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  captureSections,
  connectionStatusOptions,
  connectionStatusBadgeClassNames,
  isCompletedConnectionStatus,
  newConnectionApiBase,
  normalizeConnectionStatus,
  type ConnectionRecord,
  workflowOperationalFieldKeys,
} from "@/lib/engineering-services/new-connection-management";

interface NewConnectionProfileWorkspaceProps {
  record: ConnectionRecord;
}

interface EngineerOption {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  department: string;
}

const UNASSIGNED_VALUE = "__unassigned__";
const CURRENT_ASSIGNEE_VALUE = "__current__";

function buildInitialFormData(record: ConnectionRecord) {
  const initialData = captureSections.reduce<Record<string, string>>((accumulator, section) => {
    section.fields.forEach((field) => {
      const fieldValue =
        field.key === "customerName"
          ? record.customer
          : (record as Record<string, string | undefined>)[field.key];

      accumulator[field.key] = fieldValue ?? "";
    });

    return accumulator;
  }, {});

  workflowOperationalFieldKeys.forEach((fieldKey) => {
    const fieldValue = (record as Record<string, string | undefined>)[fieldKey];
    initialData[fieldKey] = fieldValue ?? "";
  });

  initialData.status = normalizeConnectionStatus(record.status);

  return initialData;
}

function getBusinessRuleErrors(formData: Record<string, string>) {
  const nextErrors: Record<string, string> = {};
  const status = normalizeConnectionStatus(formData.status);

  if (status === "Not Allocated" && !formData.comment?.trim()) {
    nextErrors.comment =
      "Add an operational comment explaining why this application is still not allocated.";
  }

  if (status === "Energised") {
    if (!formData.connectionDate?.trim()) {
      nextErrors.connectionDate =
        "Connection date is required before the record can move into Connections.";
    }
    if (!formData.meterNumber?.trim()) {
      nextErrors.meterNumber =
        "Meter number is required before the record can move into Connections.";
    }
    if (!formData.sealNumber?.trim()) {
      nextErrors.sealNumber =
        "Seal number is required before the record can move into Connections.";
    }
    if (!formData.coordinates?.trim()) {
      nextErrors.coordinates =
        "Coordinates are required before the record can move into Connections.";
    }
  }

  return nextErrors;
}

export function NewConnectionProfileWorkspace({
  record,
}: NewConnectionProfileWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestUpdateMode = searchParams.get("action") === "request-update";
  const defaultSection =
    captureSections.find((section) => section.key === "technical")?.key ??
    captureSections[0]?.key ??
    "customer";
  const [activeSection, setActiveSection] = useState(defaultSection);
  const [formData, setFormData] = useState<Record<string, string>>(() =>
    buildInitialFormData(record),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState(
    "Assign an engineer, update the status, then click Update to save and notify the engineer by email.",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [energisedDialogOpen, setEnergisedDialogOpen] = useState(false);
  const [engineers, setEngineers] = useState<EngineerOption[]>([]);
  const [assigneeEmail, setAssigneeEmail] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadEngineers() {
      try {
        const response = await fetch(`${newConnectionApiBase}/engineers`, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { data?: EngineerOption[] };
        if (cancelled || !payload.data) return;
        setEngineers(payload.data);

        const currentName = (record.assignedTo ?? "").trim().toLowerCase();
        if (currentName) {
          const match = payload.data.find(
            (engineer) => engineer.name.trim().toLowerCase() === currentName,
          );
          if (match) setAssigneeEmail(match.email);
        }
      } catch (error) {
        console.error("[new-connection-profile] failed to load engineers:", error);
      }
    }

    void loadEngineers();

    return () => {
      cancelled = true;
    };
  }, [record.assignedTo]);

  const matchedEngineer = useMemo(() => {
    if (assigneeEmail) {
      return engineers.find((engineer) => engineer.email === assigneeEmail) ?? null;
    }
    const currentName = (formData.assignedTo ?? "").trim().toLowerCase();
    if (!currentName) return null;
    return (
      engineers.find((engineer) => engineer.name.trim().toLowerCase() === currentName) ?? null
    );
  }, [assigneeEmail, engineers, formData.assignedTo]);

  const assigneeSelectValue = matchedEngineer
    ? matchedEngineer.email
    : (formData.assignedTo ?? "").trim()
      ? CURRENT_ASSIGNEE_VALUE
      : UNASSIGNED_VALUE;

  function handleAssigneeChange(value: string) {
    if (value === UNASSIGNED_VALUE) {
      handleFieldChange("assignedTo", "");
      setAssigneeEmail("");
      return;
    }
    if (value === CURRENT_ASSIGNEE_VALUE) {
      setAssigneeEmail("");
      return;
    }
    const engineer = engineers.find((option) => option.email === value);
    if (engineer) {
      handleFieldChange("assignedTo", engineer.name);
      setAssigneeEmail(engineer.email);
    }
  }
  const status = normalizeConnectionStatus(formData.status);
  const isCompletedConnection = isCompletedConnectionStatus(status);
  const energisedConnectionsHref =
    "/dashboard/engineering-services/new-connection-management/register?tab=energised";
  const returnToEnergisedConnections =
    searchParams.get("tab") === "energised" || isCompletedConnection;
  const registerHref = returnToEnergisedConnections
    ? energisedConnectionsHref
    : "/dashboard/engineering-services/new-connection-management/register?tab=connections";

  const outstandingFields = captureSections
    .flatMap((section) => section.fields)
    .filter((field) => !formData[field.key]?.trim()).length;

  function handleFieldChange(key: string, value: string) {
    setFormData((current) => {
      const next = { ...current, [key]: value };

      if (key === "region") {
        next.constituency = "";
      }

      return next;
    });

    setFieldErrors((current) => {
      if (!current[key] && !(key === "region" && current.constituency)) return current;
      const nextErrors = { ...current };
      delete nextErrors[key];
      if (key === "region") {
        delete nextErrors.constituency;
      }
      return nextErrors;
    });
  }

  function handleEnergisedDialogOpenChange(nextOpen: boolean) {
    setEnergisedDialogOpen(nextOpen);

    if (!nextOpen) {
      router.push(energisedConnectionsHref);
    }
  }

  async function saveProfile() {
    const businessRuleErrors = getBusinessRuleErrors(formData);
    if (Object.keys(businessRuleErrors).length > 0) {
      setFieldErrors((current) => ({ ...current, ...businessRuleErrors }));

      if (
        businessRuleErrors.connectionDate &&
        captureSections.some((section) => section.key === "tracking")
      ) {
        setActiveSection("tracking");
      } else if (
        (businessRuleErrors.meterNumber ||
          businessRuleErrors.sealNumber ||
          businessRuleErrors.coordinates) &&
        captureSections.some((section) => section.key === "gis")
      ) {
        setActiveSection("gis");
      }

      setSaveStatus("Complete the required workflow details before saving this profile.");
      return;
    }

    setIsSaving(true);
    setFieldErrors({});

    try {
      const response = await fetch(
        `${newConnectionApiBase}/connections/${encodeURIComponent(record.reference)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            notifyEmail: assigneeEmail || undefined,
            notifyName: formData.assignedTo || undefined,
          }),
        },
      );

      const payload = (await response.json()) as {
        error?: string;
        message?: string;
        details?: Array<{ path?: Array<string | number>; message?: string }>;
        data?: ConnectionRecord;
      };

      if (!response.ok) {
        if (payload.details?.length) {
          const nextErrors = payload.details.reduce<Record<string, string>>((accumulator, issue) => {
            const fieldKey = typeof issue.path?.[0] === "string" ? issue.path[0] : null;
            if (fieldKey && issue.message) {
              accumulator[fieldKey] = issue.message;
            }
            return accumulator;
          }, {});

          setFieldErrors(nextErrors);
        }

        setSaveStatus(payload.error || "Failed to save the application profile.");
        return;
      }

      if (payload.data) {
        setFormData(buildInitialFormData(payload.data));
      }

      const savedStatus = normalizeConnectionStatus(payload.data?.status ?? formData.status);
      if (isCompletedConnectionStatus(savedStatus)) {
        setSaveStatus("Connection energised successfully.");
        setEnergisedDialogOpen(true);
      } else {
        setSaveStatus(payload.message || "Application profile updated and saved to the online queue.");
      }
      router.refresh();
    } catch (error) {
      console.error("[new-connection-profile] save failed:", error);
      setSaveStatus("Failed to save the application profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Dialog open={energisedDialogOpen} onOpenChange={handleEnergisedDialogOpenChange}>
        <DialogContent className="border-red-100 sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Connection energised successfully</DialogTitle>
            <DialogDescription>
              This profile has been moved to Energised Connections. Close this message to return
              to the completed connections queue.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => handleEnergisedDialogOpenChange(false)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Go to Energised Connections
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-red-100">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={
                    connectionStatusBadgeClassNames[status] ||
                    "bg-slate-100 text-slate-800"
                  }
                >
                  {status || "No status"}
                </Badge>
                <Badge className="bg-red-50 text-red-700 hover:bg-red-50">
                  {outstandingFields} outstanding field{outstandingFields === 1 ? "" : "s"}
                </Badge>
              </div>
              <div>
                <CardTitle>Application profile</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Open one connection record, update missing information, and move it through the
                  online workflow until completion.
                </p>
              </div>
            </div>

            <Button asChild variant="outline" className="border-red-200 bg-white hover:bg-red-50">
              <Link href={registerHref}>
                <ArrowLeft className="h-4 w-4" />
                {returnToEnergisedConnections
                  ? "Back to Energised Connections"
                  : "Back to Connections"}
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {requestUpdateMode ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Update requested for this connection. Review the record, add the reason in
              operational comments, and save the changes. If the record should return to the live
              Connections queue, change the status away from <span className="font-semibold">Energised</span>.
            </div>
          ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-red-100 bg-red-50/40 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Project</p>
            <p className="mt-2 text-base font-semibold text-foreground">{formData.customerName}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formData.reference}</p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50/40 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Location</p>
            <p className="mt-2 text-base font-semibold text-foreground">
              {formData.locality || "Not captured"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formData.constituency || "No constituency"} {formData.region ? `, ${formData.region}` : ""}
            </p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50/40 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Current owner</p>
            <p className="mt-2 text-base font-semibold text-foreground">
              {formData.assignedTo || "Not assigned"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Next action: {formData.nextAction || "Not yet captured"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-red-100 bg-white p-5">
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">Workflow actions</p>
            <p className="text-sm text-muted-foreground">
              Work this profile in the live queue, change the status, and move the record into
              Connections once it is energised.
            </p>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-status">Current status</Label>
              <Select value={status} onValueChange={(value) => handleFieldChange("status", value)}>
                <SelectTrigger
                  id="profile-status"
                  className={`bg-white ${
                    fieldErrors.status ? "border-red-300 ring-1 ring-red-200" : "border-red-100"
                  }`}
                >
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {connectionStatusOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.status ? (
                <p className="text-xs text-red-700">{fieldErrors.status}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Change the live stage here instead of reopening the capture form.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-assigned-to">Assign to engineer</Label>
              <Select value={assigneeSelectValue} onValueChange={handleAssigneeChange}>
                <SelectTrigger
                  id="profile-assigned-to"
                  className={`bg-white ${
                    fieldErrors.assignedTo
                      ? "border-red-300 ring-1 ring-red-200"
                      : "border-red-100"
                  }`}
                >
                  <SelectValue placeholder="Select an engineer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                  {!matchedEngineer && (formData.assignedTo ?? "").trim() ? (
                    <SelectItem value={CURRENT_ASSIGNEE_VALUE}>
                      {formData.assignedTo} (current)
                    </SelectItem>
                  ) : null}
                  {engineers.map((engineer) => (
                    <SelectItem key={engineer.id} value={engineer.email}>
                      {engineer.name}
                      {engineer.jobTitle ? ` — ${engineer.jobTitle}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.assignedTo ? (
                <p className="text-xs text-red-700">{fieldErrors.assignedTo}</p>
              ) : assigneeEmail ? (
                <p className="text-xs text-muted-foreground">
                  {assigneeEmail} will be emailed when you click Update.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Pick the engineer who owns the next step on this connection.
                </p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="profile-next-action">Next action</Label>
              <Textarea
                id="profile-next-action"
                value={formData.nextAction ?? ""}
                onChange={(event) => handleFieldChange("nextAction", event.target.value)}
                placeholder="Describe the immediate follow-up action for this application"
                className={`min-h-24 bg-white ${
                  fieldErrors.nextAction
                    ? "border-red-300 ring-1 ring-red-200"
                    : "border-red-100"
                }`}
              />
              {fieldErrors.nextAction ? (
                <p className="text-xs text-red-700">{fieldErrors.nextAction}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  This is what teams will see first in the queue view.
                </p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="profile-comment">Operational comments</Label>
              <Textarea
                id="profile-comment"
                value={formData.comment ?? ""}
                onChange={(event) => handleFieldChange("comment", event.target.value)}
                placeholder="Record allocation reasons, update requests, close-out notes, or anything that explains the current stage"
                className={`min-h-28 bg-white ${
                  fieldErrors.comment ? "border-red-300 ring-1 ring-red-200" : "border-red-100"
                }`}
              />
              {fieldErrors.comment ? (
                <p className="text-xs text-red-700">{fieldErrors.comment}</p>
              ) : status === "Not Allocated" ? (
                <p className="text-xs text-red-700">
                  A comment is required while the application is still not allocated.
                </p>
              ) : status === "Energised" ? (
                <p className="text-xs text-green-700">
                  Saving this profile as energised moves it from Connections into Energised
                  Connections.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Use this space to explain why the record is at its current stage.
                </p>
              )}
            </div>
          </div>
        </div>

        <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-4">
          <TabsList className="w-full gap-0 overflow-x-auto border-red-100 bg-red-50/40">
            {captureSections.map((section) => (
              <TabsTrigger
                key={section.key}
                value={section.key}
                className="min-w-[170px] border-b-red-600 data-[state=active]:border-red-600 data-[state=active]:bg-white data-[state=active]:text-red-700"
              >
                {section.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {captureSections.map((section) => (
            <TabsContent key={section.key} value={section.key}>
              {requestUpdateMode && section.key !== "technical" ? (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  This returned application opens in profile mode. Customer, milestone, and GIS
                  fields stay read-only here while the technical connection details are being
                  corrected.
                </div>
              ) : null}
              <NewConnectionSectionForm
                section={section}
                formData={formData}
                fieldErrors={fieldErrors}
                onFieldChange={handleFieldChange}
                disabledFieldKeys={
                  requestUpdateMode && section.key !== "technical"
                    ? new Set(section.fields.map((field) => field.key))
                    : new Set(["reference"])
                }
                showStageComment
                stageCommentValue={formData.comment ?? ""}
                stageCommentError={fieldErrors.comment}
                onStageCommentChange={
                  requestUpdateMode && section.key !== "technical"
                    ? undefined
                    : (value) => handleFieldChange("comment", value)
                }
                stageCommentDisabled={requestUpdateMode && section.key !== "technical"}
              />
            </TabsContent>
          ))}
        </Tabs>

        <div className="rounded-2xl border border-red-100 bg-red-50/40 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Update this profile</p>
              <p className="mt-1 text-xs text-muted-foreground">{saveStatus}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => void saveProfile()}
                disabled={isSaving}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Updating..." : "Update"}
              </Button>
            </div>
          </div>
        </div>
        </CardContent>
      </Card>
    </>
  );
}
