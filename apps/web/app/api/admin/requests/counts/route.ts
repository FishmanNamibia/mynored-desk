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

    const response = await fetch(`${API_URL}/api/admin/requests/counts`, {
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin counts proxy error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
