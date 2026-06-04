import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/pms/prisma";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { writeFile, mkdir, unlink } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";

const ALLOWED_ROLES = [
  "Junior Communication Specialist",
  "Manager: Corporate Communications",
  "Senior Communications Officer",
  "Web Developer"
];

export async function GET() {
  try {
    const boardMembers = await prisma.$queryRaw`
      SELECT id, name, position,
             imageurl AS "imageUrl",
             displayorder AS "displayOrder",
             isactive AS "isActive",
             createdat AS "createdAt",
             updatedat AS "updatedAt"
      FROM "BoardMember"
      WHERE isactive = true
      ORDER BY displayorder ASC, createdat DESC
    `;
    return NextResponse.json(boardMembers);
  } catch (error: any) {
    if (error?.message?.includes('relation') || error?.code === '42P01') {
      console.error("Error fetching board members:", error);
      return NextResponse.json([], { status: 200 });
    }
    console.error("Error fetching board members:", error);
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

    const formData = await req.formData();
    const name = formData.get("name") as string;
    const position = formData.get("position") as string;
    const displayOrder = parseInt(formData.get("displayOrder") as string) || 0;
    const file = formData.get("file") as File;

    if (!name || !position || !file) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    // Save file to public/board-members folder
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const boardMembersDir = path.join(process.cwd(), "public", "board-members");
    try {
      await mkdir(boardMembersDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}-${sanitizedFileName}`;
    const filePath = path.join(boardMembersDir, fileName);
    
    await writeFile(filePath, buffer);

    const imageUrl = `/board-members/${fileName}`;

    // Store in database
    const boardMember = await prisma.$executeRaw`
      INSERT INTO "BoardMember" (id, name, position, imageurl, displayorder, isactive, createdat, updatedat)
      VALUES (${randomUUID()}, ${name}, ${position}, ${imageUrl}, ${displayOrder}, true, NOW(), NOW())
    `;

    const response = NextResponse.json({ 
      success: true,
      boardMember: { name, position, imageUrl, displayOrder }
    }, { status: 201 });
    
    for (const cookie of setCookieHeaders) {
      response.headers.append('Set-Cookie', cookie);
    }
    
    return response;
  } catch (error) {
    console.error("Error creating board member:", error);
    return NextResponse.json({ 
      error: "Failed to create board member",
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
      return NextResponse.json({ error: "Board member ID is required" }, { status: 400 });
    }

    const formData = await req.formData();
    const name = formData.get("name") as string;
    const position = formData.get("position") as string;
    const displayOrder = parseInt(formData.get("displayOrder") as string) || 0;
    const file = formData.get("file") as File | null;
    const existingImageUrl = formData.get("existingImageUrl") as string;

    if (!name || !position) {
      return NextResponse.json({ error: "Name and position are required" }, { status: 400 });
    }

    let imageUrl = existingImageUrl;

    // Handle image upload if provided
    if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const boardMembersDir = path.join(process.cwd(), "public", "board-members");
      try {
        await mkdir(boardMembersDir, { recursive: true });
      } catch (err) {
        // Directory might already exist
      }

      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${timestamp}-${sanitizedFileName}`;
      const filePath = path.join(boardMembersDir, fileName);
      
      await writeFile(filePath, buffer);
      imageUrl = `/board-members/${fileName}`;

      // Delete old image if exists
      if (existingImageUrl) {
        try {
          const oldImagePath = path.join(process.cwd(), "public", existingImageUrl);
          await unlink(oldImagePath);
        } catch (err) {
          console.error("Error deleting old image:", err);
        }
      }
    }

    await prisma.$executeRaw`
      UPDATE "BoardMember" 
      SET name = ${name}, position = ${position}, imageurl = ${imageUrl}, displayorder = ${displayOrder}, updatedat = NOW() 
      WHERE id = ${id}
    `;

    const response = NextResponse.json({ success: true });
    
    for (const cookie of setCookieHeaders) {
      response.headers.append('Set-Cookie', cookie);
    }
    
    return response;
  } catch (error) {
    console.error("Error updating board member:", error);
    return NextResponse.json({ 
      error: "Failed to update board member",
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
      return NextResponse.json({ error: "Board member ID is required" }, { status: 400 });
    }

    // Get the board member to delete the image file
    const boardMember: any = await prisma.$queryRaw`
      SELECT * FROM "BoardMember" WHERE id = ${id} LIMIT 1
    `;

    if (boardMember && (boardMember[0] as any)?.imageurl) {
      const imagePath = path.join(process.cwd(), "public", (boardMember[0] as any).imageurl);
      try {
        await unlink(imagePath);
      } catch (err) {
        console.error("Error deleting image file:", err);
      }
    }

    await prisma.$executeRaw`
      UPDATE "BoardMember" SET isactive = false, updatedat = NOW() WHERE id = ${id}
    `;

    const response = NextResponse.json({ success: true });
    
    for (const cookie of setCookieHeaders) {
      response.headers.append('Set-Cookie', cookie);
    }
    
    return response;
  } catch (error) {
    console.error("Error deleting board member:", error);
    return NextResponse.json({ error: "Failed to delete board member" }, { status: 500 });
  }
}
