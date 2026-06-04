import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/pms/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title, url, icon } = body;

    if (!title || !url) {
      return NextResponse.json(
        { error: "Title and URL are required" },
        { status: 400 }
      );
    }

    const link = await prisma.welcomeLink.update({
      where: { id: params.id },
      data: {
        title,
        description: title, // Update description to match title
        url,
        icon: icon || null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(link);
  } catch (error) {
    console.error("Error updating welcome link:", error);
    return NextResponse.json(
      { error: "Failed to update welcome link" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.welcomeLink.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting welcome link:", error);
    return NextResponse.json(
      { error: "Failed to delete welcome link" },
      { status: 500 }
    );
  }
}
