import { NextRequest, NextResponse } from "next/server";
import { buildStatusTimeline } from "@/lib/engineering-services/new-connection-management";
import { getNewConnectionRecordByReference } from "@/lib/engineering-services/new-connection-server";
import { getAuthenticatedUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

function appendSetCookieHeaders(response: NextResponse, headers: string[]) {
  for (const value of headers) {
    response.headers.append("set-cookie", value);
  }
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const { user, setCookieHeaders } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reference = request.nextUrl.searchParams.get("reference")?.trim();
    if (!reference) {
      return NextResponse.json(
        { error: "A connection reference is required." },
        { status: 400 },
      );
    }

    const record = await getNewConnectionRecordByReference(reference);

    if (!record) {
      const response = NextResponse.json({ found: false, reference });
      return appendSetCookieHeaders(response, setCookieHeaders);
    }

    const response = NextResponse.json({
      found: true,
      summary: {
        reference: record.reference,
        customer: record.customer,
        status: record.status,
        priority: record.priority,
        locality: record.locality,
        constituency: record.constituency,
        region: record.region,
        connectionClass: record.connectionClass,
        connectionType: record.connectionType,
        assignedTo: record.assignedTo,
        nextAction: record.nextAction,
        applicationDate: record.applicationDate,
        connectionDate: record.connectionDate,
      },
      timeline: buildStatusTimeline(record),
    });

    return appendSetCookieHeaders(response, setCookieHeaders);
  } catch (error: any) {
    console.error("[dashboard new-connection][lookup] Failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to look up connection status" },
      { status: 500 },
    );
  }
}
