"use client";

import { MemoListView } from "@/components/memos/memo-list-view";

export default function ApprovedMemosPage() {
  return <MemoListView view="approved" showCreateButton={false} />;
}
