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
    const events = await prisma.dashboardEvent.findMany({
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

    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
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
    const { title, date, time, location, description } = body;

    if (!title || !date || !time || !location) {
      return NextResponse.json({ error: "Title, date, time, and location are required" }, { status: 400 });
    }

    const event = await prisma.dashboardEvent.create({
      data: {
        title,
        date,
        time,
        location,
        description,
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

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
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
      return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
    }

    await prisma.dashboardEvent.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
