import { NextRequest, NextResponse } from "next/server";
import {
  createNewConnectionRecord,
  getNewConnectionRecords,
} from "@/lib/engineering-services/new-connection-server";
import { connectionSchema } from "@/lib/engineering-services/new-connection-schema";
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

    const searchParams = request.nextUrl.searchParams;
    const data = await getNewConnectionRecords({
      search: searchParams.get("q") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      region: searchParams.get("region") ?? undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
    });

    const response = NextResponse.json({
      rowCount: data.length,
      data,
    });

    return appendSetCookieHeaders(response, setCookieHeaders);
  } catch (error: any) {
    console.error("[dashboard new-connection][GET] Failed to fetch records:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch connection register" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, setCookieHeaders } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = connectionSchema.parse(body);
    const record = await createNewConnectionRecord(validated, user);

    const response = NextResponse.json(
      {
        message: "Connection application saved successfully.",
        data: record,
      },
      { status: 201 },
    );

    return appendSetCookieHeaders(response, setCookieHeaders);
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues ?? [] },
        { status: 400 },
      );
    }

    if (error?.name === "ConnectionValidationError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.details ?? [] },
        { status: 400 },
      );
    }

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "An application with this reference already exists." },
        { status: 409 },
      );
    }

    console.error("[dashboard new-connection][POST] Failed to save record:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to save connection application" },
      { status: 500 },
    );
  }
}
