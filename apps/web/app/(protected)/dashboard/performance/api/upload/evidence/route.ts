import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { getAuthenticatedUser } from '@/lib/server-auth'

const PERSISTENT_DIR = '/home/afanuel/persistent_uploads/evidence'


export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const taskId = (formData.get('taskId') as string) || 'unknown'

    // Support single 'file' field or multiple 'files[]'
    const rawFiles = formData.getAll('files[]') as File[]
    const singleFile = formData.get('file') as File | null
    const files = rawFiles.length > 0 ? rawFiles : singleFile ? [singleFile] : []

    if (files.length === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const MAX_SIZE = 1024 * 1024 * 1024 // 1 GB
    for (const file of files) {
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: `File "${file.name}" exceeds the 1 GB limit` }, { status: 400 })
      }
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ]

    // Validate all file types before saving any
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: `Invalid file type for "${file.name}"` }, { status: 400 })
      }
    }

    // Ensure uploads directories exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'evidence')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }
    // Persistent storage survives Next.js rebuilds
    try { await mkdir(PERSISTENT_DIR, { recursive: true }) } catch {}

    // Save all files and collect URLs
    const urls: string[] = []
    for (const file of files) {
      const timestamp = Date.now()
      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filename = `${taskId}_${timestamp}_${sanitizedFilename}`
      const bytes = await file.arrayBuffer()
      const buf = Buffer.from(bytes)
      // Write to public/ (dev) and persistent/ (prod)
      await writeFile(join(uploadsDir, filename), buf)
      try { await writeFile(join(PERSISTENT_DIR, filename), buf) } catch {}
      urls.push(`/dashboard/performance/api/uploads/evidence/${filename}`)
    }

    // Return single url (first file) for backwards compat + urls array for multi-file
    return NextResponse.json({ url: urls[0], urls, filename: urls[0].split('/').pop() })
  } catch (error) {
    console.error('Failed to upload file:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
