import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params
    
    // Security: Only allow image files with expected naming pattern
    if (!filename.match(/^[a-zA-Z0-9_-]+-\d+\.(png|jpg|jpeg|gif|webp)$/i)) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    // Try all locations in order of preference
    const persistentPath = `/home/afanuel/persistent_uploads/signatures/${filename}`
    const publicPath = path.join(process.cwd(), 'public', 'uploads', 'signatures', filename)
    const staticPath = path.join(process.cwd(), '.next', 'static', 'uploads', 'signatures', filename)

    let filePath = ''
    if (existsSync(persistentPath)) {
      filePath = persistentPath
    } else if (existsSync(publicPath)) {
      filePath = publicPath
    } else if (existsSync(staticPath)) {
      filePath = staticPath
    } else {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const fileBuffer = await readFile(filePath)
    
    // Determine content type
    const ext = filename.split('.').pop()?.toLowerCase()
    const contentTypes: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp'
    }
    const contentType = contentTypes[ext || ''] || 'application/octet-stream'

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  } catch (error) {
    console.error('Error serving signature:', error)
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 })
  }
}
