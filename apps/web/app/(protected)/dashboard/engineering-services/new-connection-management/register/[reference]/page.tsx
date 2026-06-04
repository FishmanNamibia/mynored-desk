import { notFound } from "next/navigation";
import { NewConnectionProfileWorkspace } from "@/components/engineering-services/new-connection-profile-workspace";
import { NewConnectionShell } from "@/components/engineering-services/new-connection-shell";
import { getNewConnectionRecordByReference } from "@/lib/engineering-services/new-connection-server";

export const dynamic = "force-dynamic";

export default async function NewConnectionApplicationProfilePage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const record = await getNewConnectionRecordByReference(decodeURIComponent(reference));

  if (!record) {
    notFound();
  }

  return (
    <NewConnectionShell description="Open an application profile, update outstanding information, and keep the connection moving from one stage to the next until it is complete.">
      <NewConnectionProfileWorkspace record={record} />
    </NewConnectionShell>
  );
}
