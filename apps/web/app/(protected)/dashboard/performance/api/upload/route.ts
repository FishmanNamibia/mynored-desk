import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { getAuthenticatedUser } from '@/lib/server-auth'

const PERSISTENT_EVIDENCE_DIR = '/home/afanuel/persistent_uploads/evidence'
const PERSISTENT_PROFILES_DIR = '/home/afanuel/persistent_uploads/profiles'


export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const type = formData.get('type') as string // 'profile' or 'evidence'

    // Support both single file ('file') and multiple files ('files[]')
    const rawFiles = formData.getAll('files[]') as File[]
    const singleFile = formData.get('file') as File | null
    const files = rawFiles.length > 0 ? rawFiles : singleFile ? [singleFile] : []

    if (files.length === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // For backwards compat single-file path:
    const file = files[0]

    // Define allowed types based on upload type
    let allowedTypes: string[]
    let maxSize: number
    let uploadSubDir: string

    if (type === 'evidence') {
      allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'message/rfc822',
        'application/vnd.ms-outlook',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'text/plain',
      ]
      maxSize = 1024 * 1024 * 1024 // 1GB for evidence
      uploadSubDir = 'evidence'
    } else {
      // Default to profile image
      allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      maxSize = 5 * 1024 * 1024 // 5MB for profiles
      uploadSubDir = 'profiles'
    }

    // Validate file type — also allow by extension for emails (.eml/.msg) since their MIME type
    // varies across email clients and is often reported as application/octet-stream
    const fileExt = file.name.split('.').pop()?.toLowerCase() || ''
    const allowedByExt = ['eml', 'msg', 'ppt', 'pptx'].includes(fileExt)
    if (!allowedTypes.includes(file.type) && !allowedByExt) {
      console.error(`Invalid file type: ${file.type} (.${fileExt}), allowed: ${allowedTypes.join(', ')}`)
      return NextResponse.json({ 
        error: `Invalid file type. Allowed: PDF, Word, Excel, PowerPoint, Email (.eml/.msg), JPEG, PNG` 
      }, { status: 400 })
    }

    // Validate file size
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB.` 
      }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create unique filename
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const filename = `${user.id}-${timestamp}.${extension}`
    
    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), 'public', 'uploads', uploadSubDir)
    try { await mkdir(uploadsDir, { recursive: true }) } catch {}

    // Save file
    const filepath = join(uploadsDir, filename)
    await writeFile(filepath, buffer)

    // Also save to persistent storage (survives Next.js rebuilds)
    const persistentDir = type === 'evidence' ? PERSISTENT_EVIDENCE_DIR : PERSISTENT_PROFILES_DIR
    try {
      if (!existsSync(persistentDir)) await mkdir(persistentDir, { recursive: true })
      await writeFile(join(persistentDir, filename), buffer)
    } catch {}

    // Return API-served URL so files are accessible after builds
    const publicUrl = type === 'evidence'
      ? `/dashboard/performance/api/uploads/evidence/${filename}`
      : `/dashboard/performance/api/uploads/profile-pictures/${filename}`
    
    return NextResponse.json({ url: publicUrl }, { status: 201 })
  } catch (error) {
    console.error('Failed to upload file:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
