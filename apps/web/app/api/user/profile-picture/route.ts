import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'
import { writeFile, unlink, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export async function GET(request: NextRequest) {
  try {
    const { user: authUser } = await getAuthenticatedUser(request)
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile picture URL from database
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        profilePictureUrl: true,
        firstName: true,
        lastName: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      profilePictureUrl: user.profilePictureUrl || null,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim()
    })

  } catch (error: any) {
    console.error('Error fetching profile picture:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile picture: ' + error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user: authUser } = await getAuthenticatedUser(request)
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle file upload
    const formData = await request.formData()
    const file = formData.get('profilePicture') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    // Get file extension
    const ext = file.name.split('.').pop() || 'png'
    const fileName = `profile_${authUser.id}_${Date.now()}.${ext}`
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'profile-pictures')
    try {
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true })
        console.log('✅ Created uploads directory:', uploadsDir)
      }
    } catch (mkdirError: any) {
      console.error('Failed to create uploads directory:', mkdirError)
      return NextResponse.json(
        { error: 'Failed to create uploads directory: ' + mkdirError.message },
        { status: 500 }
      )
    }

    // Get current user's profile picture URL
    let currentUser = null
    try {
      currentUser = await prisma.user.findUnique({
        where: { id: authUser.id },
        select: { profilePictureUrl: true }
      })
    } catch (dbError: any) {
      console.error('Failed to fetch current user:', dbError)
      // Continue anyway - we can still upload the new picture
    }
    
    // Save new file to uploads folder first
    const filePath = path.join(uploadsDir, fileName)
    try {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)
      console.log('✅ Profile picture saved to:', filePath)
    } catch (writeError: any) {
      console.error('Failed to write file:', writeError)
      return NextResponse.json(
        { error: 'Failed to save file: ' + writeError.message },
        { status: 500 }
      )
    }

    // Generate public URL for the file
    const profilePictureUrl = `/uploads/profile-pictures/${fileName}`

    // Update user's profile picture URL in database
    try {
      await prisma.user.update({
        where: { id: authUser.id },
        data: { profilePictureUrl: profilePictureUrl }
      })
      console.log('✅ Profile picture URL updated in database:', profilePictureUrl)
    } catch (updateError: any) {
      console.error('Failed to update database:', updateError)
      // Try to clean up the uploaded file
      try {
        await unlink(filePath)
      } catch (cleanupError) {
        console.error('Failed to cleanup file after database error:', cleanupError)
      }
      return NextResponse.json(
        { error: 'Failed to update database: ' + updateError.message },
        { status: 500 }
      )
    }

    // Soft replace: Keep old file, just update DB URL
    // Old files remain in uploads folder for backup/history
    if (currentUser?.profilePictureUrl) {
      console.log('📝 Soft replace: Old profile picture URL kept in filesystem:', currentUser.profilePictureUrl)
    }

    return NextResponse.json({ 
      success: true,
      profilePictureUrl: profilePictureUrl 
    })

  } catch (error: any) {
    console.error('Error saving profile picture:', error)
    return NextResponse.json(
      { error: 'Failed to save profile picture: ' + error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user: authUser } = await getAuthenticatedUser(request)
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current profile picture URL for logging
    const currentUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { profilePictureUrl: true }
    })

    // Soft delete: Keep the file in uploads folder for backup/history
    // Only remove the URL from database
    if (currentUser?.profilePictureUrl) {
      console.log('📝 Soft delete: Profile picture file kept in filesystem:', currentUser.profilePictureUrl)
      console.log('   File location: public' + currentUser.profilePictureUrl)
    }

    // Remove user's profile picture URL from database
    await prisma.user.update({
      where: { id: authUser.id },
      data: { profilePictureUrl: null }
    })

    console.log('✅ Profile picture URL removed from database (file kept for backup)')

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Error removing profile picture:', error)
    return NextResponse.json(
      { error: 'Failed to remove profile picture: ' + error.message },
      { status: 500 }
    )
  }
}
