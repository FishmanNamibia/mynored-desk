import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import { getAuthenticatedUser } from '@/lib/server-auth'


// GET: Retrieve user's signature
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
      select: { signatureUrl: true }
    })

    return NextResponse.json({ signatureUrl: dbUser?.signatureUrl || null })
  } catch (error) {
    console.error('Error fetching signature:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Upload signature
export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve actual DB user by email (auth token ID may differ from DB ID)
    const dbUser = await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, signatureUrl: true }
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get('signature') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const validExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'heic', 'heif']
    const fileExt = file.name.split('.').pop()?.toLowerCase() || ''
    const isValidType = file.type.startsWith('image/') || validExtensions.includes(fileExt)
    if (!isValidType) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 20MB' }, { status: 400 })
    }

    // Generate unique filename
    const fileName = `${dbUser.id}-${Date.now()}.png`

    // Save file to all locations for maximum persistence:
    // 1. persistent_uploads (outside app — survives git pull and npm run build)
    // 2. public/uploads (for direct static serving fallback)
    // 3. .next/static/uploads (for immediate serving in current process)
    const persistentDir = '/home/afanuel/persistent_uploads/signatures'
    const publicDir = path.join(process.cwd(), 'public', 'uploads', 'signatures')
    const staticDir = path.join(process.cwd(), '.next', 'static', 'uploads', 'signatures')
    
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create directories and save to all locations
    for (const dir of [persistentDir, publicDir, staticDir]) {
      try {
        if (!existsSync(dir)) {
          await mkdir(dir, { recursive: true })
        }
        await writeFile(path.join(dir, fileName), buffer)
      } catch (dirErr) {
        console.warn(`Could not write to ${dir}:`, dirErr)
      }
    }

    // Delete old signature file if exists
    if (dbUser.signatureUrl) {
      const oldFileName = dbUser.signatureUrl.split('/').pop()
      if (oldFileName) {
        for (const dir of [persistentDir, publicDir, staticDir]) {
          const oldPath = path.join(dir, oldFileName)
          if (existsSync(oldPath)) {
            try { await (await import('fs/promises')).unlink(oldPath) } catch {}
          }
        }
      }
    }

    // Update user record - use API route URL for reliable serving
    const signatureUrl = `/dashboard/performance/api/uploads/signatures/${fileName}`
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { signatureUrl }
    })

    console.log('✅ Signature uploaded for user:', dbUser.id, 'URL:', signatureUrl)

    return NextResponse.json({ 
      success: true, 
      signatureUrl 
    })
  } catch (error) {
    console.error('Error uploading signature:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Remove signature
export async function DELETE(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve actual DB user by email
    const dbUser = await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
      select: { id: true }
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await prisma.user.update({
      where: { id: dbUser.id },
      data: { signatureUrl: null }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting signature:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
