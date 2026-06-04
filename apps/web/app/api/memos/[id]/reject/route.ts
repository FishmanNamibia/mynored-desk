import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/pms/prisma";
import { getAuthenticatedUser } from "@/lib/server-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { comment } = body;

    const { user } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current memo
    const memo = await prisma.memo.findUnique({ where: { id } });
    if (!memo) {
      return NextResponse.json({ error: "Memo not found" }, { status: 404 });
    }

    // Update memo status to rejected
    const updated = await prisma.memo.update({
      where: { id },
      data: {
        status: "REJECTED",
        updatedAt: new Date(),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      memo: updated,
      message: "Memo rejected successfully",
    });
  } catch (error: any) {
    console.error("Error rejecting memo:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reject memo" },
      { status: 500 }
    );
  }
}
