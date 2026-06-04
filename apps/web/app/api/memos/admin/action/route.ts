import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/pms/prisma";
import { getAuthenticatedUser } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memoId, action, comment, stage } = await req.json();

    if (!memoId || !action) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Update memo based on action
    let newStatus: "APPROVED" | "REJECTED" | "PENDING" = "PENDING";
    if (action === "approve") newStatus = "APPROVED";
    else if (action === "reject") newStatus = "REJECTED";

    const updatedMemo = await prisma.memo.update({
      where: { id: memoId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ memo: updatedMemo, success: true });
  } catch (error) {
    console.error("Error performing memo action:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}
