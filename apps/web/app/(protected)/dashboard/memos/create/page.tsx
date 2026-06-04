"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { MemoTemplateForm } from "@/components/memos/memo-template-form";
import { getTemplateDefaults } from "@/lib/memo-templates";

function CreateMemoContent() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template");
  const templateDefaults = templateId ? getTemplateDefaults(templateId) : null;

  // Include templateId in initial data for workflow detection
  const initialData = templateDefaults 
    ? { ...templateDefaults, templateId } 
    : undefined;

  return <MemoTemplateForm initialData={initialData} />;
}

export default function CreateMemoPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <CreateMemoContent />
    </Suspense>
  );
}
