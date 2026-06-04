import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true,
      message: "Admin setup endpoint" 
    });
  } catch (error) {
    console.error("Error in admin setup:", error);
    return NextResponse.json({ error: "Failed to setup admin" }, { status: 500 });
  }
}
