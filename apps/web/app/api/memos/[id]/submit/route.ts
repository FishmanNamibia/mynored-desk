import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/pms/prisma";
import { getAuthenticatedUser } from "@/lib/server-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { user } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current memo
    const memo = await prisma.memo.findUnique({ where: { id } });
    if (!memo) {
      return NextResponse.json({ error: "Memo not found" }, { status: 404 });
    }

    // Submit moves from DRAFT to SUBMITTED_TO_MANAGER
    const updated = await prisma.memo.update({
      where: { id },
      data: {
        status: "SUBMITTED_TO_MANAGER",
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
      message: "Memo submitted for approval",
    });
  } catch (error: any) {
    console.error("Error submitting memo:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit memo" },
      { status: 500 }
    );
  }
}
