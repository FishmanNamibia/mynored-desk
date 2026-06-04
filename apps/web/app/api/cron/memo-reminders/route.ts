import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/pms/prisma";

export async function GET(req: NextRequest) {
  try {
    // Cron job to send memo reminders
    const pendingMemos = await prisma.memo.findMany({
      where: { status: "PENDING" },
      take: 10,
    });

    return NextResponse.json({ 
      success: true,
      processed: pendingMemos.length,
      message: "Memo reminders processed" 
    });
  } catch (error) {
    console.error("Error processing memo reminders:", error);
    return NextResponse.json({ error: "Failed to process reminders" }, { status: 500 });
  }
}
