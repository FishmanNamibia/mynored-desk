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
    const news = await prisma.dashboardNews.findMany({
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

    return NextResponse.json(news);
  } catch (error) {
    console.error("Error fetching news:", error);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
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
    const { title, excerpt, category, date, icon } = body;

    if (!title || !excerpt || !category || !date) {
      return NextResponse.json({ error: "Title, excerpt, category, and date are required" }, { status: 400 });
    }

    const newsItem = await prisma.dashboardNews.create({
      data: {
        title,
        excerpt,
        category,
        date,
        icon: icon || "TrendingUp",
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

    return NextResponse.json(newsItem, { status: 201 });
  } catch (error) {
    console.error("Error creating news:", error);
    return NextResponse.json({ error: "Failed to create news" }, { status: 500 });
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
      return NextResponse.json({ error: "News ID is required" }, { status: 400 });
    }

    await prisma.dashboardNews.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting news:", error);
    return NextResponse.json({ error: "Failed to delete news" }, { status: 500 });
  }
}
