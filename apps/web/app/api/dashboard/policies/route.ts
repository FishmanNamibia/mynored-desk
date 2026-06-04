import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/pms/prisma";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { writeFile, mkdir } from "fs/promises";
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
    const policies = await prisma.policyDocument.findMany({
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

    return NextResponse.json(policies);
  } catch (error) {
    console.error("Error fetching policies:", error);
    return NextResponse.json({ error: "Failed to fetch policies" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('[Policies API] POST request received');
    const { user, setCookieHeaders } = await getAuthenticatedUser(req);
    console.log('[Policies API] User:', user);
    
    if (!user?.id) {
      console.log('[Policies API] No user - returning 401');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    console.log('[Policies API] User authenticated, checking role...');

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { jobTitle: true }
    });

    if (!dbUser?.jobTitle || !ALLOWED_ROLES.includes(dbUser.jobTitle)) {
      console.log('[Policies API] User role not authorized:', dbUser?.jobTitle);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    console.log('[Policies API] User authorized, proceeding...');

    console.log('[Policies API] Parsing form data...');
    const formData = await req.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const category = formData.get("category") as string;
    const signedDate = formData.get("signedDate") as string;
    const reviewYearsStr = formData.get("reviewYears") as string;
    const reviewYears = reviewYearsStr ? parseInt(reviewYearsStr) : 2;
    const file = formData.get("file") as File;

    console.log('[Policies API] Form data:', { title, description, category, signedDate, reviewYears, filePresent: !!file });

    if (!title || !description || !category || !signedDate || !file) {
      console.log('[Policies API] Missing required fields');
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    console.log('[Policies API] Calculating review date...');
    // Calculate review date based on reviewYears from signed date
    const signed = new Date(signedDate);
    const reviewDate = new Date(signed);
    reviewDate.setFullYear(reviewDate.getFullYear() + reviewYears);

    // Determine status based on review date
    const now = new Date();
    let status = "To Be Reviewed";
    if (reviewDate < now) {
      status = "Review Overdue";
    }
    console.log('[Policies API] Review date calculated:', reviewDate.toISOString(), 'Status:', status);

    console.log('[Policies API] Processing file upload...');
    // Save file to public/policies folder
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log('[Policies API] File buffer created, size:', buffer.length);
    
    // Create policies directory if it doesn't exist
    const policiesDir = path.join(process.cwd(), "public", "policies");
    try {
      await mkdir(policiesDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}-${sanitizedFileName}`;
    const filePath = path.join(policiesDir, fileName);
    
    await writeFile(filePath, buffer);

    // Calculate file size
    const fileSizeKB = (buffer.length / 1024).toFixed(2);
    const fileSize = buffer.length > 1024 * 1024 
      ? `${(buffer.length / (1024 * 1024)).toFixed(2)} MB`
      : `${fileSizeKB} KB`;

    console.log('[Policies API] Saving to database...');
    console.log('[Policies API] Data to save:', {
      title,
      description,
      category,
      effectiveDate: new Date(signedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      fileSize,
      pdfPath: `/policies/${fileName}`,
      createdById: user.id
    });

    // Store in database
    const policy = await prisma.policyDocument.create({
      data: {
        id: randomUUID(),
        title,
        description,
        category,
        version: "1.0",
        effectiveDate: new Date(signedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        fileSize,
        pdfPath: `/policies/${fileName}`,
        signedDate: signedDate,
        reviewDate: reviewDate.toISOString(),
        reviewYears: reviewYears,
        createdById: user.id,
        updatedAt: new Date(),
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

    const response = NextResponse.json({ 
      ...policy, 
      signedDate, 
      reviewDate: reviewDate.toISOString(), 
      status 
    }, { status: 201 });
    
    // Forward any Set-Cookie headers from auth refresh
    for (const cookie of setCookieHeaders) {
      response.headers.append('Set-Cookie', cookie);
    }
    
    return response;
  } catch (error) {
    console.error("[Policies API] Error creating policy:", error);
    console.error("[Policies API] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json({ 
      error: "Failed to create policy",
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
      return NextResponse.json({ error: "Policy ID is required" }, { status: 400 });
    }

    await prisma.policyDocument.update({
      where: { id },
      data: { isActive: false }
    });

    const response = NextResponse.json({ success: true });
    
    // Forward any Set-Cookie headers from auth refresh
    for (const cookie of setCookieHeaders) {
      response.headers.append('Set-Cookie', cookie);
    }
    
    return response;
  } catch (error) {
    console.error("Error deleting policy:", error);
    return NextResponse.json({ error: "Failed to delete policy" }, { status: 500 });
  }
}
