import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/pms/prisma";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

const ALLOWED_ROLES = [
  "Junior Communication Specialist",
  "Manager: Corporate Communications",
  "Senior Communications Officer",
  "Web Developer"
];

export async function GET() {
  try {
    const mission: any = await prisma.$queryRaw`
      SELECT * FROM "Mission" WHERE id = 'mission-singleton' LIMIT 1
    `;
    return NextResponse.json(mission[0] || null);
  } catch (error) {
    console.error("Error fetching mission:", error);
    return NextResponse.json({ error: "Failed to fetch mission" }, { status: 500 });
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

    const formData = await req.formData();
    const content = formData.get("content") as string;
    const file = formData.get("file") as File | null;

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    let imageUrl = formData.get("existingImageUrl") as string | null;

    // Handle image upload if provided
    if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const imagesDir = path.join(process.cwd(), "public", "images");
      try {
        await mkdir(imagesDir, { recursive: true });
      } catch (err) {
        // Directory might already exist
      }

      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `mission-${timestamp}-${sanitizedFileName}`;
      const filePath = path.join(imagesDir, fileName);
      
      await writeFile(filePath, buffer);
      imageUrl = `/images/${fileName}`;

      // Delete old image if exists
      if (formData.get("existingImageUrl")) {
        try {
          const oldImagePath = path.join(process.cwd(), "public", formData.get("existingImageUrl") as string);
          await unlink(oldImagePath);
        } catch (err) {
          console.error("Error deleting old image:", err);
        }
      }
    }

    await prisma.$executeRaw`
      UPDATE "Mission" 
      SET content = ${content}, "imageUrl" = ${imageUrl}, "updatedAt" = NOW() 
      WHERE id = 'mission-singleton'
    `;

    const response = NextResponse.json({ success: true });
    
    for (const cookie of setCookieHeaders) {
      response.headers.append('Set-Cookie', cookie);
    }
    
    return response;
  } catch (error) {
    console.error("Error updating mission:", error);
    return NextResponse.json({ 
      error: "Failed to update mission",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
