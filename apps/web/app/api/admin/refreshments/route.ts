import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerBackendApiUrl } from "@/lib/server-backend-api-url";

const API_URL = getServerBackendApiUrl();

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("mynsa_access_token")?.value;
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (accessToken) {
      headers["Cookie"] = `mynsa_access_token=${accessToken}`;
    }

    const response = await fetch(`${API_URL}/api/refreshments`, {
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json([], { status: 200 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Refreshments proxy error:", error);
    return NextResponse.json([], { status: 200 });
  }
}
