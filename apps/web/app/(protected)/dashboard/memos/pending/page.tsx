"use client";

import { MemoListView } from "@/components/memos/memo-list-view";

export default function PendingMemosPage() {
  return <MemoListView view="pending" showCreateButton={false} />;
}
