import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import { getAuthenticatedUser } from '@/lib/server-auth'

// GET: Retrieve user's profile picture
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findFirst({
      where: { email: user.email },
      select: { profilePictureUrl: true }
    })

    return NextResponse.json({ profilePictureUrl: dbUser?.profilePictureUrl || null })
  } catch (error) {
    console.error('Error fetching profile picture:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Upload profile picture
export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve actual DB user by email (auth token ID may differ from DB ID)
    const dbUser = await prisma.user.findFirst({
      where: { email: user.email },
      select: { id: true, profilePictureUrl: true }
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get('profilePicture') as File

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

    // Validate file size (max 10MB for profile pictures)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 })
    }

    // Generate unique filename
    const fileName = `${dbUser.id}-${Date.now()}.png`

    // Save file to both locations:
    // 1. public/uploads for persistence across rebuilds
    // 2. .next/static/uploads for immediate serving
    const publicDir = path.join(process.cwd(), 'public', 'uploads', 'profile-pictures')
    const staticDir = path.join(process.cwd(), '.next', 'static', 'uploads', 'profile-pictures')
    
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create directories and save to both locations
    for (const dir of [publicDir, staticDir]) {
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true })
      }
      await writeFile(path.join(dir, fileName), buffer)
    }

    // Delete old profile picture file if exists
    if (dbUser.profilePictureUrl) {
      const oldFileName = dbUser.profilePictureUrl.split('/').pop()
      if (oldFileName) {
        for (const dir of [publicDir, staticDir]) {
          const oldPath = path.join(dir, oldFileName)
          if (existsSync(oldPath)) {
            try { await (await import('fs/promises')).unlink(oldPath) } catch {}
          }
        }
      }
    }

    // Update user record - use API route URL for reliable serving
    const profilePictureUrl = `/dashboard/performance/api/uploads/profile-pictures/${fileName}`
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { profilePictureUrl }
    })

    console.log('✅ Profile picture uploaded for user:', dbUser.id, 'URL:', profilePictureUrl)

    return NextResponse.json({ 
      success: true, 
      profilePictureUrl 
    })
  } catch (error) {
    console.error('Error uploading profile picture:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Remove profile picture
export async function DELETE(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve actual DB user by email
    const dbUser = await prisma.user.findFirst({
      where: { email: user.email },
      select: { id: true, profilePictureUrl: true }
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Delete the physical file if it exists
    if (dbUser.profilePictureUrl) {
      const oldFileName = dbUser.profilePictureUrl.split('/').pop()
      if (oldFileName) {
        const publicDir = path.join(process.cwd(), 'public', 'uploads', 'profile-pictures')
        const staticDir = path.join(process.cwd(), '.next', 'static', 'uploads', 'profile-pictures')
        
        for (const dir of [publicDir, staticDir]) {
          const oldPath = path.join(dir, oldFileName)
          if (existsSync(oldPath)) {
            try { await (await import('fs/promises')).unlink(oldPath) } catch {}
          }
        }
      }
    }

    await prisma.user.update({
      where: { id: dbUser.id },
      data: { profilePictureUrl: null }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting profile picture:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}