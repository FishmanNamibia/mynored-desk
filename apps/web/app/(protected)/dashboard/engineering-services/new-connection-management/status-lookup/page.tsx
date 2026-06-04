import { NewConnectionShell } from "@/components/engineering-services/new-connection-shell";
import { NewConnectionStatusLookup } from "@/components/engineering-services/new-connection-status-lookup";

export const dynamic = "force-dynamic";

export default function NewConnectionManagementStatusLookupPage() {
  return (
    <NewConnectionShell description="Look up a single connection by its reference number to answer customer status queries quickly, with the current status, priority, assignment, and a milestone timeline.">
      <NewConnectionStatusLookup />
    </NewConnectionShell>
  );
}
