import { NextRequest, NextResponse } from "next/server";
import {
  getNewConnectionRecordByReference,
  updateNewConnectionRecord,
} from "@/lib/engineering-services/new-connection-server";
import { connectionUpdateSchema } from "@/lib/engineering-services/new-connection-schema";
import type { ConnectionRecord } from "@/lib/engineering-services/new-connection-management";
import { sendEmail } from "@/lib/email";
import { getAuthenticatedUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

const NEW_CONNECTION_BASE_URL =
  process.env.NEXT_PUBLIC_WEB_URL || "http://127.0.0.1:3080";

function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function buildProfileUpdateEmail(params: {
  record: ConnectionRecord;
  updatedByName: string;
  recipientName?: string;
}) {
  const { record, updatedByName, recipientName } = params;
  const profileUrl = `${NEW_CONNECTION_BASE_URL}/dashboard/engineering-services/new-connection-management/register/${encodeURIComponent(
    record.reference,
  )}`;

  const row = (label: string, value?: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#64748b;">${label}</td><td style="padding:4px 0;color:#0f172a;font-weight:600;">${
      value && value.trim() ? value : "—"
    }</td></tr>`;

  return `
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;">
      <h2 style="color:#b91c1c;margin:0 0 8px;">New Connection profile updated</h2>
      <p style="color:#334155;">Hello ${recipientName || "there"},</p>
      <p style="color:#334155;">The following new connection profile was updated by
        <strong>${updatedByName}</strong>.</p>
      <table style="border-collapse:collapse;margin:12px 0;">
        ${row("Reference", record.reference)}
        ${row("Project", record.customer)}
        ${row("Status", record.status)}
        ${row("Priority", record.priority)}
        ${row("Assigned to", record.assignedTo)}
        ${row("Location", [record.locality, record.constituency, record.region].filter(Boolean).join(", "))}
        ${row("Next action", record.nextAction)}
        ${row("Comment", record.comment)}
      </table>
      <p style="margin:16px 0;">
        <a href="${profileUrl}" style="background:#dc2626;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">
          Open profile
        </a>
      </p>
      <p style="color:#94a3b8;font-size:12px;">NORED Desk · New Connection Management</p>
    </div>
  `;
}

function appendSetCookieHeaders(response: NextResponse, headers: string[]) {
  for (const value of headers) {
    response.headers.append("set-cookie", value);
  }

  return response;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ reference: string }> },
) {
  try {
    const { user, setCookieHeaders } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const record = await getNewConnectionRecordByReference(decodeURIComponent(params.reference));

    if (!record) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const response = NextResponse.json({ data: record });
    return appendSetCookieHeaders(response, setCookieHeaders);
  } catch (error: any) {
    console.error("[dashboard new-connection][GET by reference] Failed to fetch record:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch connection application" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ reference: string }> },
) {
  try {
    const { user, setCookieHeaders } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const reference = decodeURIComponent(params.reference);
    const body = await request.json();
    const validated = connectionUpdateSchema.parse(body);

    if (validated.reference && validated.reference !== reference) {
      return NextResponse.json(
        { error: "Reference cannot be changed from the application profile." },
        { status: 400 },
      );
    }

    const record = await updateNewConnectionRecord(reference, validated, user);

    if (!record) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    let emailSent = false;
    const notifyEmail = (body as { notifyEmail?: unknown })?.notifyEmail;
    const notifyName = (body as { notifyName?: unknown })?.notifyName;

    if (isValidEmail(notifyEmail)) {
      try {
        await sendEmail(
          notifyEmail.trim(),
          `New connection ${record.reference} updated`,
          buildProfileUpdateEmail({
            record,
            updatedByName:
              [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
              user.email ||
              "A NORED user",
            recipientName: typeof notifyName === "string" ? notifyName : undefined,
          }),
        );
        emailSent = true;
      } catch (emailError) {
        console.error("[dashboard new-connection][PATCH] email notification failed:", emailError);
      }
    }

    const response = NextResponse.json({
      message: emailSent
        ? "Application profile updated and the assigned engineer was notified by email."
        : "Application profile updated successfully.",
      data: record,
      emailSent,
    });

    return appendSetCookieHeaders(response, setCookieHeaders);
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues ?? [] },
        { status: 400 },
      );
    }

    if (error?.name === "ConnectionValidationError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.details ?? [] },
        { status: 400 },
      );
    }

    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    console.error("[dashboard new-connection][PATCH by reference] Failed to update record:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update connection application" },
      { status: 500 },
    );
  }
}
