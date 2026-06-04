import { NextRequest, NextResponse } from "next/server";
import {
  getNewConnectionRecordByReference,
  updateNewConnectionRecord,
} from "@/lib/engineering-services/new-connection-server";
import { connectionUpdateSchema } from "@/lib/engineering-services/new-connection-schema";
import { getAuthenticatedUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

function appendSetCookieHeaders(response: NextResponse, headers: string[]) {
  for (const value of headers) {
    response.headers.append("set-cookie", value);
  }

  return response;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ reference: string }> },
) {
  try {
    const { user, setCookieHeaders } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const record = await getNewConnectionRecordByReference(decodeURIComponent(params.reference));

    if (!record) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const response = NextResponse.json({ data: record });
    return appendSetCookieHeaders(response, setCookieHeaders);
  } catch (error: any) {
    console.error("[new-connection][GET by reference] Failed to fetch record:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch connection application" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ reference: string }> },
) {
  try {
    const { user, setCookieHeaders } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const reference = decodeURIComponent(params.reference);
    const body = await request.json();
    const validated = connectionUpdateSchema.parse(body);

    if (validated.reference && validated.reference !== reference) {
      return NextResponse.json(
        { error: "Reference cannot be changed from the application profile." },
        { status: 400 },
      );
    }

    const record = await updateNewConnectionRecord(reference, validated, user);

    if (!record) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const response = NextResponse.json({
      message: "Application profile updated successfully.",
      data: record,
    });

    return appendSetCookieHeaders(response, setCookieHeaders);
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues ?? [] },
        { status: 400 },
      );
    }

    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    console.error("[new-connection][PATCH by reference] Failed to update record:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update connection application" },
      { status: 500 },
    );
  }
}
