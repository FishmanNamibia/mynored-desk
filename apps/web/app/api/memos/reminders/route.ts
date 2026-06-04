import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/pms/prisma";
import { getAuthenticatedUser } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get pending memos that need reminders
    const pendingMemos = await prisma.memo.findMany({
      where: { status: "PENDING" },
      take: 20,
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ 
      success: true,
      memos: pendingMemos,
      count: pendingMemos.length 
    });
  } catch (error) {
    console.error("Error fetching memo reminders:", error);
    return NextResponse.json({ error: "Failed to fetch reminders" }, { status: 500 });
  }
}
