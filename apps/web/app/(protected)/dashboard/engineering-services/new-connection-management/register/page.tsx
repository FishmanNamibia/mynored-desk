import { Download } from "lucide-react";
import { NewConnectionBulkImport } from "@/components/engineering-services/new-connection-bulk-import";
import { NewConnectionRegisterBoard } from "@/components/engineering-services/new-connection-register-board";
import { NewConnectionShell } from "@/components/engineering-services/new-connection-shell";
import { getReportHref } from "@/lib/engineering-services/new-connection-management";

export const dynamic = "force-dynamic";

export default function NewConnectionManagementRegisterPage() {
  return (
    <NewConnectionShell description="Use the Connections area to retrieve active connection profiles, search by customer or reference details, update status, and keep energised connections in a separate history list.">
      <div className="flex justify-end">
        <a
          href={getReportHref("status-register", "csv")}
          className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700"
        >
          Download register
          <Download className="h-3.5 w-3.5" />
        </a>
      </div>

      <NewConnectionBulkImport />

      <NewConnectionRegisterBoard />
    </NewConnectionShell>
  );
}
