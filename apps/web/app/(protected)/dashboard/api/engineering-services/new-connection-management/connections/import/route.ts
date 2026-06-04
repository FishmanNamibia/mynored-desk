import { NextRequest, NextResponse } from "next/server";
import { createNewConnectionRecord } from "@/lib/engineering-services/new-connection-server";
import { connectionSchema } from "@/lib/engineering-services/new-connection-schema";
import { getAuthenticatedUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

interface ImportRowError {
  index: number;
  reference?: string;
  message: string;
}

function appendSetCookieHeaders(response: NextResponse, headers: string[]) {
  for (const value of headers) {
    response.headers.append("set-cookie", value);
  }
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const { user, setCookieHeaders } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const rows: unknown[] = Array.isArray(body?.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No rows were provided for import." },
        { status: 400 },
      );
    }

    if (rows.length > 1000) {
      return NextResponse.json(
        { error: "Import is limited to 1000 rows per upload." },
        { status: 400 },
      );
    }

    let created = 0;
    let skipped = 0;
    const errors: ImportRowError[] = [];

    for (let index = 0; index < rows.length; index += 1) {
      const rawRow = rows[index];
      const reference =
        typeof rawRow === "object" && rawRow !== null
          ? String((rawRow as Record<string, unknown>).reference ?? "")
          : "";

      try {
        const validated = connectionSchema.parse(rawRow);
        await createNewConnectionRecord(validated, user);
        created += 1;
      } catch (rowError: any) {
        if (rowError?.code === "P2002") {
          skipped += 1;
          continue;
        }

        if (rowError?.name === "ZodError") {
          const detail = rowError.issues
            ?.map((issue: any) => `${issue.path?.join(".") || "field"}: ${issue.message}`)
            .join("; ");
          errors.push({ index, reference, message: detail || "Validation failed" });
          continue;
        }

        if (rowError?.name === "ConnectionValidationError") {
          const detail = rowError.details
            ?.map((issue: any) => `${issue.path?.join(".") || "field"}: ${issue.message}`)
            .join("; ");
          errors.push({ index, reference, message: detail || "Workflow validation failed" });
          continue;
        }

        errors.push({
          index,
          reference,
          message: rowError?.message || "Failed to import row",
        });
      }
    }

    const response = NextResponse.json({
      message: `Imported ${created} record(s). Skipped ${skipped} duplicate(s). ${errors.length} row(s) failed.`,
      summary: {
        total: rows.length,
        created,
        skipped,
        failed: errors.length,
      },
      errors,
    });

    return appendSetCookieHeaders(response, setCookieHeaders);
  } catch (error: any) {
    console.error("[dashboard new-connection][import] Failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to import connection records" },
      { status: 500 },
    );
  }
}
