"use client";

import { ConnectionLocationPicker } from "@/components/engineering-services/connection-location-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  CaptureField,
  CaptureSection,
} from "@/lib/engineering-services/new-connection-management";

interface NewConnectionSectionFormProps {
  section: CaptureSection;
  formData: Record<string, string>;
  fieldErrors: Record<string, string>;
  onFieldChange: (key: string, value: string) => void;
  disabledFieldKeys?: ReadonlySet<string>;
  showStageComment?: boolean;
  stageCommentValue?: string;
  stageCommentError?: string;
  onStageCommentChange?: (value: string) => void;
  stageCommentLabel?: string;
  stageCommentHelper?: string;
  stageCommentDisabled?: boolean;
}

export function NewConnectionSectionForm({
  section,
  formData,
  fieldErrors,
  onFieldChange,
  disabledFieldKeys,
  showStageComment = false,
  stageCommentValue = "",
  stageCommentError,
  onStageCommentChange,
  stageCommentLabel = "Stage handover comment",
  stageCommentHelper = "Use this note to brief the next person on what has been done at this stage and what still needs to happen next.",
  stageCommentDisabled = false,
}: NewConnectionSectionFormProps) {
  function renderField(field: CaptureField) {
    const error = fieldErrors[field.key];
    const errorClassName = error ? "border-red-300 ring-1 ring-red-200" : "border-red-100";
    const selectOptions =
      field.optionGroups && field.dependsOn
        ? field.optionGroups[formData[field.dependsOn] ?? ""] ?? []
        : field.options ?? [];
    const isSelectDisabled = Boolean(field.dependsOn && !formData[field.dependsOn]);
    const isDisabled = disabledFieldKeys?.has(field.key) ?? false;

    if (field.type === "textarea") {
      return (
        <Textarea
          id={field.key}
          value={formData[field.key] ?? ""}
          disabled={isDisabled}
          onChange={(event) => onFieldChange(field.key, event.target.value)}
          placeholder={field.placeholder}
          className={`min-h-28 bg-white ${errorClassName}`}
        />
      );
    }

    if (field.type === "select") {
      return (
        <Select
          value={formData[field.key] ?? ""}
          onValueChange={(value) => onFieldChange(field.key, value)}
          disabled={isSelectDisabled || isDisabled}
        >
          <SelectTrigger className={`w-full bg-white ${errorClassName}`}>
            <SelectValue
              placeholder={
                isSelectDisabled
                  ? field.disabledPlaceholder ?? "Select the parent field first"
                  : `Select ${field.label.toLowerCase()}`
              }
            />
          </SelectTrigger>
          <SelectContent>
            {selectOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        id={field.key}
        type={field.type}
        value={formData[field.key] ?? ""}
        disabled={isDisabled}
        readOnly={isDisabled}
        onChange={(event) => onFieldChange(field.key, event.target.value)}
        placeholder={field.placeholder}
        className={`bg-white ${errorClassName}`}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-red-100 bg-red-50/40 px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{section.title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{section.description}</p>
      </div>

      {section.key === "gis" ? (
        <ConnectionLocationPicker
          coordinates={formData.coordinates ?? ""}
          locality={formData.locality ?? ""}
          onCoordinatesChange={(value) => onFieldChange("coordinates", value)}
          onCoordinateSourceChange={(value) => onFieldChange("coordinateSource", value)}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {section.fields.map((field) => (
          <div
            key={field.key}
            className={field.span === "wide" ? "space-y-2 md:col-span-2" : "space-y-2"}
          >
            <div className="flex items-center gap-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              {field.required ? (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                  Required
                </span>
              ) : null}
            </div>
            {renderField(field)}
            {fieldErrors[field.key] ? (
              <p className="text-xs text-red-700">{fieldErrors[field.key]}</p>
            ) : field.helper ? (
              <p className="text-xs text-muted-foreground">{field.helper}</p>
            ) : null}
          </div>
        ))}
      </div>

      {showStageComment ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor={`${section.key}-stage-comment`}>{stageCommentLabel}</Label>
          </div>
          <Textarea
            id={`${section.key}-stage-comment`}
            value={stageCommentValue}
            disabled={stageCommentDisabled}
            onChange={(event) => onStageCommentChange?.(event.target.value)}
            placeholder="Explain what has been done at this stage and what the next person should pick up."
            className={`min-h-28 bg-white ${
              stageCommentError ? "border-red-300 ring-1 ring-red-200" : "border-red-100"
            }`}
          />
          {stageCommentError ? (
            <p className="text-xs text-red-700">{stageCommentError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{stageCommentHelper}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
