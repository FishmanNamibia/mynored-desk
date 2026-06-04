import { NextRequest, NextResponse } from "next/server";
import { getServerBackendApiUrl } from "@/lib/server-backend-api-url";

const API_URL = getServerBackendApiUrl();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const response = await fetch(`${API_URL}/api/memos/${id}/export`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error exporting memo:", error);
    return NextResponse.json(
      { error: error.message || "Failed to export memo" },
      { status: 500 }
    );
  }
}
