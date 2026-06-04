import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/pms/prisma";
import { getAuthenticatedUser } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create test memos
    const created = [];
    for (let i = 1; i <= 5; i++) {
      const memo = await prisma.memo.create({
        data: {
          title: `Test Memo ${i}`,
          subject: `Test Subject ${i}`,
          content: `This is test memo content ${i}`,
          purpose: `Test purpose ${i}`,
          recommendation: `Test recommendation ${i}`,
          memoFrom: user.firstName || "Test User",
          memoTo: "Statistician General",
          createdById: user.id,
          status: "DRAFT",
          updatedAt: new Date(),
        },
      });
      created.push(memo);
    }

    return NextResponse.json({ created, success: true });
  } catch (error) {
    console.error("Error seeding memos:", error);
    return NextResponse.json(
      { error: "Failed to seed memos" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete test memos
    const result = await prisma.memo.deleteMany({
      where: {
        title: { startsWith: "Test Memo" },
      },
    });

    return NextResponse.json({ deleted: result.count, success: true });
  } catch (error) {
    console.error("Error deleting test memos:", error);
    return NextResponse.json(
      { error: "Failed to delete test memos" },
      { status: 500 }
    );
  }
}
