import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'
import { writeFile, unlink, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import sharp from 'sharp'

// Function to remove white/light background from signature image
async function removeSignatureBackground(inputBuffer: Buffer): Promise<Buffer> {
  try {
    // Get image metadata
    const metadata = await sharp(inputBuffer).metadata()
    console.log('📷 Processing image:', metadata.width, 'x', metadata.height, metadata.format)

    // Convert to raw pixel data with alpha channel
    const { data, info } = await sharp(inputBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const { width, height, channels } = info

    // Process each pixel - make white/light pixels transparent
    const threshold = 220 // Pixels with RGB values above this are considered "white/light"
    
    for (let i = 0; i < data.length; i += channels) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      // Check if pixel is white/light (all RGB values are high)
      if (r > threshold && g > threshold && b > threshold) {
        // Make it transparent
        data[i + 3] = 0 // Set alpha to 0
      }
    }

    // Convert back to PNG with transparency
    const outputBuffer = await sharp(data, {
      raw: {
        width,
        height,
        channels
      }
    })
      .png()
      .toBuffer()

    console.log('✅ Background removed successfully')
    return outputBuffer
  } catch (error) {
    console.error('⚠️ Background removal failed, using original image:', error)
    // If processing fails, return original converted to PNG
    return sharp(inputBuffer).png().toBuffer()
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user: authUser } = await getAuthenticatedUser(request)
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's signature URL from database
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        signatureUrl: true,
        firstName: true,
        lastName: true,
        jobTitle: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      signatureUrl: user.signatureUrl || null,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      jobTitle: user.jobTitle || null
    })

  } catch (error: any) {
    console.error('Error fetching user signature:', error)
    return NextResponse.json(
      { error: 'Failed to fetch signature: ' + error.message },
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
    const file = formData.get('signature') as File
    
    console.log('📤 Signature upload - File received:', file?.name, 'Type:', file?.type, 'Size:', file?.size)
    
    if (!file || !(file instanceof File) || file.size === 0) {
      console.log('❌ No valid file provided')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type - check both type and extension
    const validExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'heic', 'heif']
    const fileExt = file.name.split('.').pop()?.toLowerCase() || ''
    const isValidType = file.type.startsWith('image/') || validExtensions.includes(fileExt)
    
    if (!isValidType) {
      console.log('❌ Invalid file type:', file.type, 'Extension:', fileExt)
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      console.log('❌ File too large:', file.size)
      return NextResponse.json({ error: 'File size must be less than 20MB' }, { status: 400 })
    }

    // Always save as PNG since we'll process and add transparency
    const fileName = `signature_${authUser.id}_${Date.now()}.png`
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'signatures')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Delete old signature file if exists
    const currentUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { signatureUrl: true }
    })
    
    if (currentUser?.signatureUrl && currentUser.signatureUrl.startsWith('/uploads/')) {
      const oldFilePath = path.join(process.cwd(), 'public', currentUser.signatureUrl)
      if (existsSync(oldFilePath)) {
        try {
          await unlink(oldFilePath)
        } catch (e) {
          console.log('Could not delete old signature file:', e)
        }
      }
    }

    // Process image: remove background and convert to PNG with transparency
    const bytes = await file.arrayBuffer()
    const inputBuffer = Buffer.from(bytes)
    
    console.log('🔄 Processing signature image - removing background...')
    const processedBuffer = await removeSignatureBackground(inputBuffer)
    
    // Save processed file to uploads folder
    const filePath = path.join(uploadsDir, fileName)
    await writeFile(filePath, processedBuffer)

    // Generate public URL for the file
    const signatureUrl = `/uploads/signatures/${fileName}`

    // Update user's signature URL in database
    await prisma.user.update({
      where: { id: authUser.id },
      data: { signatureUrl }
    })

    console.log('✅ Signature saved to:', filePath)
    console.log('✅ Signature URL:', signatureUrl)

    return NextResponse.json({ 
      success: true,
      signatureUrl 
    })

  } catch (error: any) {
    console.error('Error saving user signature:', error)
    return NextResponse.json(
      { error: 'Failed to save signature: ' + error.message },
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

    // Get current signature URL to delete the file
    const currentUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { signatureUrl: true }
    })

    // Delete the file from uploads folder if it exists
    if (currentUser?.signatureUrl && currentUser.signatureUrl.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), 'public', currentUser.signatureUrl)
      if (existsSync(filePath)) {
        try {
          await unlink(filePath)
          console.log('✅ Signature file deleted:', filePath)
        } catch (e) {
          console.log('Could not delete signature file:', e)
        }
      }
    }

    // Remove user's signature URL from database
    await prisma.user.update({
      where: { id: authUser.id },
      data: { signatureUrl: null }
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Error deleting user signature:', error)
    return NextResponse.json(
      { error: 'Failed to delete signature: ' + error.message },
      { status: 500 }
    )
  }
}
