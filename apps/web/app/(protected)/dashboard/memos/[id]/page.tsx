"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { GoldSpinner } from "@/components/ui/gold-spinner";
import { MemoDetailView } from "@/components/memos/memo-detail-view";
import { Memo } from "@/types/memo.types";

export default function MemoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [memo, setMemo] = useState<Memo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMemo = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/memos/${params.id}`);
      if (!response.ok) throw new Error("Memo not found");

      const data = await response.json();
      setMemo(data);
    } catch (err: any) {
      setError(err.message || "Failed to load memo");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchMemo();
    }
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <GoldSpinner size="md" message="Loading memo..." />
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

  return <MemoDetailView memo={memo} onUpdate={fetchMemo} />;
}
