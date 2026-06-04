import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/pms/prisma";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { randomUUID } from "crypto";

const ALLOWED_ROLES = [
  "Junior Communication Specialist",
  "Manager: Corporate Communications",
  "Senior Communications Officer",
  "Web Developer"
];

export async function GET() {
  try {
    const values = await prisma.$queryRaw`
      SELECT * FROM "CoreValue" 
      WHERE isactive = true 
      SELECT id, name, description, icon,
             displayorder AS "displayOrder",
             isactive AS "isActive",
             createdat AS "createdAt",
             updatedat AS "updatedAt"
      FROM "CoreValue"
      WHERE isactive = true
      ORDER BY displayorder ASC, createdat DESC
    `;
    return NextResponse.json(values);
  } catch (error: any) {
    if (error?.message?.includes('relation') || error?.code === '42P01') {
      return NextResponse.json([]);
    }
    console.error("Error fetching core values:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, setCookieHeaders } = await getAuthenticatedUser(req);
    
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { jobTitle: true }
    });

    if (!dbUser?.jobTitle || !ALLOWED_ROLES.includes(dbUser.jobTitle)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, icon, displayOrder } = body;

    if (!name || !description || !icon) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    await prisma.$executeRaw`
      INSERT INTO "CoreValue" (id, name, description, icon, displayorder, isactive, createdat, updatedat)
      VALUES (${randomUUID()}, ${name}, ${description}, ${icon}, ${displayOrder || 0}, true, NOW(), NOW())
    `;

    const response = NextResponse.json({ success: true }, { status: 201 });
    
    for (const cookie of setCookieHeaders) {
      response.headers.append('Set-Cookie', cookie);
    }
    
    return response;
  } catch (error) {
    console.error("Error creating core value:", error);
    return NextResponse.json({ 
      error: "Failed to create core value",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, setCookieHeaders } = await getAuthenticatedUser(req);
    
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { jobTitle: true }
    });

    if (!dbUser?.jobTitle || !ALLOWED_ROLES.includes(dbUser.jobTitle)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Core value ID is required" }, { status: 400 });
    }

    await prisma.$executeRaw`
      UPDATE "CoreValue" SET isactive = false, updatedat = NOW() WHERE id = ${id}
    `;

    const response = NextResponse.json({ success: true });
    
    for (const cookie of setCookieHeaders) {
      response.headers.append('Set-Cookie', cookie);
    }
    
    return response;
  } catch (error) {
    console.error("Error deleting core value:", error);
    return NextResponse.json({ error: "Failed to delete core value" }, { status: 500 });
  }
}
