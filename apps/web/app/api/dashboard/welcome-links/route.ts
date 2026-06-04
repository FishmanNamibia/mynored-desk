import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/pms/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/pms/auth";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const links = await prisma.welcomeLink.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(links);
  } catch (error) {
    console.error("Error fetching welcome links:", error);
    return NextResponse.json(
      { error: "Failed to fetch welcome links" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, url, icon, userId } = body;

    if (!title || !url) {
      return NextResponse.json(
        { error: "Title and URL are required" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Get the highest order value and add 1
    const maxOrder = await prisma.welcomeLink.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const link = await prisma.welcomeLink.create({
      data: {
        id: randomUUID(),
        title,
        description: title, // Use title as description for now
        url,
        icon: icon || null,
        order: (maxOrder?.order || 0) + 1,
        createdById: userId,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error("Error creating welcome link:", error);
    return NextResponse.json(
      { error: "Failed to create welcome link" },
      { status: 500 }
    );
  }
}
