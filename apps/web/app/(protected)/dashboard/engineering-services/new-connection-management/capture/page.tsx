import { NewConnectionCaptureWorkspace } from "@/components/engineering-services/new-connection-capture-workspace";
import { NewConnectionShell } from "@/components/engineering-services/new-connection-shell";

export default function NewConnectionManagementCapturePage() {
  return (
    <NewConnectionShell description="Use the capture workspace for one application at a time. This keeps the form, map picker, review step, and submit action on a focused screen.">
      <NewConnectionCaptureWorkspace />
    </NewConnectionShell>
  );
}
