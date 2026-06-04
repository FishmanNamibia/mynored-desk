import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/pms/prisma";
import { getAuthenticatedUser } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all memos with full details for admin view
    const memos = await prisma.memo.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(memos);
  } catch (error) {
    console.error("Error fetching memos for admin:", error);
    return NextResponse.json(
      { error: "Failed to fetch memos" },
      { status: 500 }
    );
  }
}
