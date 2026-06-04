import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerBackendApiUrl } from "@/lib/server-backend-api-url";

const API_URL = getServerBackendApiUrl();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const cookieStore = await cookies();
    const accessToken = cookieStore.get("mynsa_access_token")?.value;
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (accessToken) {
      headers["Cookie"] = `mynsa_access_token=${accessToken}`;
    }

    const response = await fetch(`${API_URL}/api/admin/requests/${id}/approve`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `Backend error: ${response.status}`, details: errText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin approve proxy error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
