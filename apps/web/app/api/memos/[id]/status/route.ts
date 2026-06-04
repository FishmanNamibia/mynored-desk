import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/pms/prisma";

/**
 * MemoStatus enum in DB: DRAFT, PENDING, APPROVED, REJECTED, ARCHIVED
 * RETURNED is not in the enum — we use REJECTED as the DB value and store
 * the real "RETURNED" status + return comments in the memoThrough JSON.
 */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, returnComment, returnedBy, returnedByName } = body;

    if (!status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    // Fetch existing memo to merge memoThrough JSON
    const existing = await prisma.memo.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Memo not found" }, { status: 404 });
    }

    let richJson: any = (typeof existing.memoThrough === "string"
      ? JSON.parse(existing.memoThrough)
      : existing.memoThrough) || {};

    // If returning, append the return comment
    if (status === "RETURNED" && returnComment) {
      const returnEntry = {
        comment: returnComment,
        returnedBy: returnedBy || "",
        returnedByName: returnedByName || "",
        returnDate: new Date().toISOString(),
      };
      richJson.returnComments = [
        ...(richJson.returnComments || []),
        returnEntry,
      ];
      richJson.isReturned = true;
    }

    // Map RETURNED → REJECTED in DB (closest enum value), store real status in JSON
    const validStatuses = ["DRAFT", "PENDING", "APPROVED", "REJECTED", "ARCHIVED"];
    let dbStatus = status;
    if (status === "RETURNED") {
      dbStatus = "REJECTED"; // closest DB enum value
      richJson.realStatus = "RETURNED";
    } else {
      richJson.realStatus = undefined; // clear any previous override
      richJson.isReturned = false;
    }

    if (!validStatuses.includes(dbStatus)) {
      dbStatus = "DRAFT";
    }

    const row = await prisma.memo.update({
      where: { id },
      data: {
        status: dbStatus,
        memoThrough: richJson,
      },
    });

    // Unpack for response
    const rich = (typeof row.memoThrough === "string" ? JSON.parse(row.memoThrough as string) : row.memoThrough) || {};
    const realStatus = rich.realStatus || row.status;

    return NextResponse.json({
      id: row.id,
      memoTo: row.memoTo,
      memoFrom: row.memoFrom,
      subject: row.subject,
      status: realStatus,
      createdById: row.createdById,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  } catch (error: any) {
    console.error("Error updating memo status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update memo status" },
      { status: 500 }
    );
  }
}
