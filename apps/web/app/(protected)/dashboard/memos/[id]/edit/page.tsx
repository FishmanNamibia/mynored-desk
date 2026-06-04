"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { MemoTemplateForm } from "@/components/memos/memo-template-form";
import { Memo } from "@/types/memo.types";

export default function EditMemoPage() {
  const params = useParams();
  const router = useRouter();
  const [memo, setMemo] = useState<Memo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMemo = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/memos/${params.id}`);
        if (!response.ok) throw new Error("Memo not found");

        const data = await response.json();
        
        // Check if memo can be edited (only drafts)
        if (data.status !== "DRAFT") {
          throw new Error("Only draft memos can be edited");
        }

        setMemo(data);
      } catch (err: any) {
        setError(err.message || "Failed to load memo");
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchMemo();
    }
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading memo...</p>
        </div>
      </div>
    );
  }

  if (error || !memo) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Memo not found"}</p>
          <button
            onClick={() => router.push("/dashboard/memos")}
            className="text-blue-600 hover:underline text-sm"
          >
            Return to Memos
          </button>
        </div>
      </div>
    );
  }

  return (
    <MemoTemplateForm
      memoId={memo.id}
      initialData={Object.fromEntries(Object.entries(memo).map(([k, v]) => [k, v === null ? undefined : v])) as any}
      onSuccess={() => router.push(`/dashboard/memos/${memo.id}`)}
    />
  );
}
