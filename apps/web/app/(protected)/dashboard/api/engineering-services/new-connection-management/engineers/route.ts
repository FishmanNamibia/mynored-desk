import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/pms/prisma";
import { getAuthenticatedUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

function appendSetCookieHeaders(response: NextResponse, headers: string[]) {
  for (const value of headers) {
    response.headers.append("set-cookie", value);
  }
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const { user, setCookieHeaders } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [{ firstName: { not: null } }, { lastName: { not: null } }],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        departmentName: true,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    const emailMap = new Map<string, (typeof users)[number]>();
    for (const candidate of users) {
      const key = candidate.email.toLowerCase();
      const existing = emailMap.get(key);
      if (!existing || (candidate.jobTitle && !existing.jobTitle)) {
        emailMap.set(key, candidate);
      }
    }

    const engineers = Array.from(emailMap.values())
      .map((candidate) => ({
        id: candidate.id,
        name:
          [candidate.firstName, candidate.lastName].filter(Boolean).join(" ").trim() ||
          candidate.email.split("@")[0],
        email: candidate.email,
        jobTitle: candidate.jobTitle || "Team member",
        department: candidate.departmentName || "",
      }))
      .sort((left, right) => left.name.localeCompare(right.name));

    const response = NextResponse.json({ data: engineers });
    return appendSetCookieHeaders(response, setCookieHeaders);
  } catch (error: any) {
    console.error("[dashboard new-connection][engineers] Failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load engineers" },
      { status: 500 },
    );
  }
}
