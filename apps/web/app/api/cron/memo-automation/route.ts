import { NextRequest, NextResponse } from "next/server";

/**
 * Cron Job Endpoint for Memo Automation
 * 
 * Runs hourly to:
 * - Auto-assign unassigned memos
 * - Escalate overdue memos
 * - Send reminders
 * 
 * Security: Uses a secret token to prevent unauthorized access.
 * Set CRON_SECRET environment variable to secure this endpoint.
 */

export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const vercelCronAuth = request.headers.get("x-vercel-cron-auth");
      if (vercelCronAuth !== cronSecret) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : "http://localhost:3000";

    // Run all automation tasks
    const automationResponse = await fetch(`${baseUrl}/api/memos/automation?action=all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const automationResult = await automationResponse.json();

    // Run reminders
    const reminderResponse = await fetch(`${baseUrl}/api/memos/reminders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const reminderResult = await reminderResponse.json();

    console.log("[Cron Memo Automation] Completed:", {
      automation: automationResult.success ? "success" : "failed",
      reminders: reminderResult.success ? "success" : "failed",
      assigned: automationResult.assignment?.assigned || 0,
      escalated: automationResult.escalation?.escalated || 0,
      remindersSent: reminderResult.summary?.totalRemindersSent || 0,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      automation: automationResult,
      reminders: reminderResult,
    });
  } catch (error: any) {
    console.error("[Cron Memo Automation] Error:", error);
    return NextResponse.json(
      { error: error.message || "Cron job failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: "/api/cron/memo-automation",
    description: "Hourly memo automation: auto-assign, escalate, and remind",
    schedule: "Every hour (0 * * * *)",
    methods: ["POST", "GET"],
    status: "active",
    lastCheck: new Date().toISOString(),
  });
}
