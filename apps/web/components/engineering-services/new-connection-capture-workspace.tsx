"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { NewConnectionSectionForm } from "@/components/engineering-services/new-connection-section-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import type { CaptureSection } from "@/lib/engineering-services/new-connection-management";
import {
  captureSections,
  newConnectionApiBase,
  workflowOperationalFieldKeys,
} from "@/lib/engineering-services/new-connection-management";

const draftStorageKey = "nored-new-connection-management-draft";
const reviewSectionKey = "review-submit";

function buildInitialFormData() {
  const initialData = captureSections.reduce<Record<string, string>>((accumulator, section) => {
    section.fields.forEach((field) => {
      accumulator[field.key] = "";
    });
    return accumulator;
  }, {});

  workflowOperationalFieldKeys.forEach((fieldKey) => {
    initialData[fieldKey] = "";
  });

  initialData.status = "Received";

  return initialData;
}

function getSectionErrors(section: CaptureSection, formData: Record<string, string>) {
  return section.fields.reduce<Record<string, string>>((accumulator, field) => {
    if (field.required && !formData[field.key]?.trim()) {
      accumulator[field.key] = `${field.label} is required before moving on.`;
    }
    return accumulator;
  }, {});
}

function getActionTimestamp() {
  return new Intl.DateTimeFormat("en-NA", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  }).format(new Date());
}

function ReviewPanel({
  formData,
  reviewErrors,
}: {
  formData: Record<string, string>;
  reviewErrors: Record<string, string>;
}) {
  const completedRequiredFields = captureSections.reduce((count, section) => {
    return (
      count +
      section.fields.filter((field) => field.required && formData[field.key]?.trim()).length
    );
  }, 0);

  const totalRequiredFields = captureSections.reduce((count, section) => {
    return count + section.fields.filter((field) => field.required).length;
  }, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-red-100 bg-red-50/40 px-4 py-3">
        <p className="text-sm font-semibold text-foreground">Review and submit</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Check the full application before you submit it into the connection workflow.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-red-100 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Required fields</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {completedRequiredFields}/{totalRequiredFields}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Completed before submission.</p>
        </div>
        <div className="rounded-xl border border-red-100 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Reference</p>
          <p className="mt-2 text-base font-semibold text-foreground">
            {formData.reference || "Not yet captured"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Quotation: {formData.quotationRef || "Not yet captured"}
          </p>
        </div>
        <div className="rounded-xl border border-red-100 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Submission status</p>
          <p className="mt-2 text-base font-semibold text-foreground">
            {Object.keys(reviewErrors).length === 0 ? "Ready to submit" : "Needs attention"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Fix missing required fields if any are still highlighted below.
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {captureSections.map((section) => (
          <div key={section.key} className="rounded-xl border border-red-100 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{section.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
              </div>
              <Badge className="bg-red-50 text-red-700 hover:bg-red-50">
                {
                  section.fields.filter((field) =>
                    field.required ? formData[field.key]?.trim() : true,
                  ).length
                }
                /{section.fields.length}
              </Badge>
            </div>

            <div className="mt-4 space-y-2">
              {section.fields.map((field) => {
                const value = formData[field.key]?.trim();
                const hasError = Boolean(reviewErrors[field.key]);
                const displayValue = value
                  ? value
                  : field.required
                    ? "Required before submission"
                    : "Not provided";

                return (
                  <div
                    key={field.key}
                    className={`rounded-lg border px-3 py-2 ${
                      hasError ? "border-red-200 bg-red-50/50" : "border-border bg-muted/10"
                    }`}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {field.label}
                    </p>
                    <p className={`mt-1 text-sm ${hasError ? "text-red-700" : "text-foreground"}`}>
                      {displayValue}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NewConnectionCaptureWorkspace() {
  const router = useRouter();
  const defaultSection = captureSections[0]?.key ?? "customer";
  const stepKeys = useMemo(
    () => [...captureSections.map((section) => section.key), reviewSectionKey],
    [],
  );

  const [activeSection, setActiveSection] = useState(defaultSection);
  const [formData, setFormData] = useState<Record<string, string>>(() => buildInitialFormData());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState(
    "Complete each step, then review and submit the application.",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const storedDraft = window.localStorage.getItem(draftStorageKey);
    if (!storedDraft) return;

    try {
      const parsedDraft = JSON.parse(storedDraft) as {
        formData?: Record<string, string>;
        savedAt?: string;
        submittedAt?: string;
      };

      if (parsedDraft.formData) {
        setFormData((current) => ({ ...current, ...parsedDraft.formData }));
      }

      if (parsedDraft.submittedAt) {
        setSaveStatus(`Application already submitted locally on ${parsedDraft.submittedAt}.`);
      } else if (parsedDraft.savedAt) {
        setSaveStatus(`Draft restored from this browser at ${parsedDraft.savedAt}.`);
      }
    } catch {
      setSaveStatus("Saved draft could not be restored. Start a fresh capture.");
    }
  }, []);

  const currentStepIndex = stepKeys.indexOf(activeSection);
  const currentSection = captureSections.find((section) => section.key === activeSection);
  const isReviewStep = activeSection === reviewSectionKey;
  const isFirstStep = currentStepIndex <= 0;

  function validateAllSections() {
    const combinedErrors: Record<string, string> = {};
    let firstInvalidSectionKey: string | null = null;

    for (const section of captureSections) {
      const sectionErrors = getSectionErrors(section, formData);
      if (Object.keys(sectionErrors).length > 0 && !firstInvalidSectionKey) {
        firstInvalidSectionKey = section.key;
      }
      Object.assign(combinedErrors, sectionErrors);
    }

    return { combinedErrors, firstInvalidSectionKey };
  }

  function writeDraftToLocalStorage(savedAt: string, submittedAt?: string) {
    window.localStorage.setItem(
      draftStorageKey,
      JSON.stringify({
        formData,
        savedAt,
        submittedAt,
      }),
    );
  }

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

  function saveDraft(message?: string) {
    const savedAt = getActionTimestamp();
    writeDraftToLocalStorage(savedAt);
    setSaveStatus(message ?? `Draft saved locally in this browser at ${savedAt}.`);
  }

  function goToPreviousStep() {
    if (isFirstStep) return;
    setActiveSection(stepKeys[currentStepIndex - 1] ?? defaultSection);
    setSaveStatus("Moved to the previous step.");
  }

  function goToNextStep() {
    if (isReviewStep || !currentSection) return;

    const nextErrors = getSectionErrors(currentSection, formData);
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors((current) => ({ ...current, ...nextErrors }));
      setSaveStatus("Complete the required fields in this step before continuing.");
      return;
    }

    const savedAt = getActionTimestamp();
    writeDraftToLocalStorage(savedAt);

    const nextStepKey = stepKeys[currentStepIndex + 1];
    if (nextStepKey) {
      setActiveSection(nextStepKey);
      setSaveStatus(
        nextStepKey === reviewSectionKey
          ? "Section saved. Review the full application before submitting."
          : "Section saved. Continue with the next step.",
      );
    }
  }

  async function submitApplication() {
    const { combinedErrors, firstInvalidSectionKey } = validateAllSections();

    if (Object.keys(combinedErrors).length > 0) {
      setFieldErrors(combinedErrors);
      if (firstInvalidSectionKey) {
        setActiveSection(firstInvalidSectionKey);
      }
      setSaveStatus("Complete the missing required fields before submitting the application.");
      return;
    }

    const submittedAt = getActionTimestamp();
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${newConnectionApiBase}/connections`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        },
      );

      const payload = (await response.json()) as {
        error?: string;
        message?: string;
        data?: { reference?: string };
      };

      if (!response.ok) {
        setSaveStatus(payload.error || "Failed to submit the application to the online register.");
        return;
      }

      window.localStorage.removeItem(draftStorageKey);
      setSaveStatus("Application submitted. Moving it to the Connections area.");
      setFieldErrors({});
      router.push(
        `/dashboard/engineering-services/new-connection-management/register?tab=connections&created=${encodeURIComponent(
          payload.data?.reference || formData.reference,
        )}`,
      );
    } catch (error) {
      console.error("[new-connection] submit failed:", error);
      setSaveStatus("Failed to submit the application to the online register.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const advanceButtonLabel = isReviewStep
    ? "Submit application"
    : currentStepIndex === stepKeys.length - 2
      ? "Review and submit"
      : "Next section";

  return (
    <Card className="border-red-100">
      <CardHeader className="pb-3">
        <CardTitle>Application capture workspace</CardTitle>
        <p className="text-sm text-muted-foreground">
          Capture one application at a time without the operations dashboard and reports sitting on
          the same screen.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
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
            <TabsTrigger
              value={reviewSectionKey}
              className="min-w-[170px] border-b-red-600 data-[state=active]:border-red-600 data-[state=active]:bg-white data-[state=active]:text-red-700"
            >
              Review and submit
            </TabsTrigger>
          </TabsList>

          {captureSections.map((section) => (
            <TabsContent key={section.key} value={section.key}>
              <NewConnectionSectionForm
                section={section}
                formData={formData}
                fieldErrors={fieldErrors}
                onFieldChange={handleFieldChange}
                showStageComment
                stageCommentValue={formData.comment ?? ""}
                stageCommentError={fieldErrors.comment}
                onStageCommentChange={(value) => handleFieldChange("comment", value)}
              />
            </TabsContent>
          ))}

          <TabsContent value={reviewSectionKey}>
            <ReviewPanel formData={formData} reviewErrors={fieldErrors} />
          </TabsContent>
        </Tabs>

        <div className="rounded-2xl border border-red-100 bg-red-50/40 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Step {currentStepIndex + 1} of {stepKeys.length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{saveStatus}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={goToPreviousStep}
                disabled={isFirstStep}
                className="border-red-200 bg-white text-foreground hover:bg-red-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous section
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => saveDraft()}
                className="border-red-200 bg-white text-red-700 hover:bg-red-50"
              >
                <Save className="h-4 w-4" />
                Save draft
              </Button>
              <Button
                type="button"
                onClick={isReviewStep ? () => void submitApplication() : goToNextStep}
                disabled={isSubmitting}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {isSubmitting ? "Submitting..." : advanceButtonLabel}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
