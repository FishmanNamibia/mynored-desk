import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/pms/prisma";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req);
    
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const widgets = await prisma.CustomWidget.findMany({
      where: {
        createdById: user.id,
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(widgets);
  } catch (error) {
    console.error("Error fetching widgets:", error);
    return NextResponse.json({ error: "Failed to fetch widgets" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, setCookieHeaders } = await getAuthenticatedUser(req);
    
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, title, description, content, isActive } = body;

    if (!type || !title) {
      return NextResponse.json({ error: "Type and title are required" }, { status: 400 });
    }

    const widget = await prisma.CustomWidget.create({
      data: {
        id: randomUUID(),
        type,
        title,
        description: description || null,
        content: content || null,
        isActive: isActive !== undefined ? isActive : true,
        createdById: user.id,
        updatedAt: new Date(),
      },
    });

    const response = NextResponse.json(widget, { status: 201 });
    
    for (const cookie of setCookieHeaders) {
      response.headers.append('Set-Cookie', cookie);
    }
    
    return response;
  } catch (error) {
    console.error("Error creating widget:", error);
    return NextResponse.json({ 
      error: "Failed to create widget",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, setCookieHeaders } = await getAuthenticatedUser(req);
    
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, title, description, content, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "Widget ID is required" }, { status: 400 });
    }

    // Verify ownership
    const existingWidget = await prisma.CustomWidget.findUnique({
      where: { id },
    });

    if (!existingWidget) {
      return NextResponse.json({ error: "Widget not found" }, { status: 404 });
    }

    if (existingWidget.createdById !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const widget = await prisma.CustomWidget.update({
      where: { id },
      data: {
        title: title || existingWidget.title,
        description: description !== undefined ? description : existingWidget.description,
        content: content !== undefined ? content : existingWidget.content,
        isActive: isActive !== undefined ? isActive : existingWidget.isActive,
        updatedAt: new Date(),
      },
    });

    const response = NextResponse.json(widget);
    
    for (const cookie of setCookieHeaders) {
      response.headers.append('Set-Cookie', cookie);
    }
    
    return response;
  } catch (error) {
    console.error("Error updating widget:", error);
    return NextResponse.json({ 
      error: "Failed to update widget",
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Widget ID is required" }, { status: 400 });
    }

    // Verify ownership
    const existingWidget = await prisma.CustomWidget.findUnique({
      where: { id },
    });

    if (!existingWidget) {
      return NextResponse.json({ error: "Widget not found" }, { status: 404 });
    }

    if (existingWidget.createdById !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete
    await prisma.CustomWidget.update({
      where: { id },
      data: { isActive: false, updatedAt: new Date() },
    });

    const response = NextResponse.json({ success: true });
    
    for (const cookie of setCookieHeaders) {
      response.headers.append('Set-Cookie', cookie);
    }
    
    return response;
  } catch (error) {
    console.error("Error deleting widget:", error);
    return NextResponse.json({ 
      error: "Failed to delete widget",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
