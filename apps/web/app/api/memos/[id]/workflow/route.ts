import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/pms/prisma";
import { getAuthenticatedUser } from "@/lib/server-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memo = await prisma.memo.findUnique({
      where: { id: params.id },
    });

    if (!memo) {
      return NextResponse.json({ error: "Memo not found" }, { status: 404 });
    }

    return NextResponse.json({ memo, workflow: [] });
  } catch (error) {
    console.error("Error fetching memo workflow:", error);
    return NextResponse.json({ error: "Failed to fetch workflow" }, { status: 500 });
  }
}
