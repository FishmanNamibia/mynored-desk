import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/pms/prisma";

const ALLOWED_ROLES = [
  "Junior Communication Specialist",
  "Manager: Corporate Communications",
  "Senior Communications Officer",
  "Web Developer"
];

export async function GET() {
  try {
    const notices = await prisma.dashboardNotice.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    return NextResponse.json(notices);
  } catch (error) {
    console.error("Error fetching notices:", error);
    return NextResponse.json({ error: "Failed to fetch notices" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { jobTitle: true }
    });

    if (!user?.jobTitle || !ALLOWED_ROLES.includes(user.jobTitle)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { title, message, type, department } = body;

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
    }

    const notice = await prisma.dashboardNotice.create({
      data: {
        title,
        message,
        type: type || "info",
        department,
        createdById: session.user.id,
      },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    return NextResponse.json(notice, { status: 201 });
  } catch (error) {
    console.error("Error creating notice:", error);
    return NextResponse.json({ error: "Failed to create notice" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { jobTitle: true }
    });

    if (!user?.jobTitle || !ALLOWED_ROLES.includes(user.jobTitle)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Notice ID is required" }, { status: 400 });
    }

    await prisma.dashboardNotice.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting notice:", error);
    return NextResponse.json({ error: "Failed to delete notice" }, { status: 500 });
  }
}
