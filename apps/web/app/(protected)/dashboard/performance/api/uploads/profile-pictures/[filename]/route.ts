import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import { readdir } from 'fs/promises'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params
    
    // Security: Only allow image files with expected naming pattern
    // Support both new format (userId-timestamp.ext) and old format (profile_userId_timestamp.ext)
    if (!filename.match(/^(profile_)?[a-zA-Z0-9_-]+[_-]\d+\.(png|jpg|jpeg|gif|webp)$/i)) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    // Extract user ID from filename (handle both formats)
    let userId = ''
    if (filename.startsWith('profile_')) {
      // Old format: profile_userId_timestamp.ext
      const parts = filename.substring(8).split('_') // Remove 'profile_' prefix
      userId = parts.slice(0, -1).join('_') // All parts except the last (timestamp)
    } else {
      // New format: userId-timestamp.ext
      userId = filename.split('-').slice(0, -1).join('-')
    }
    
    // Try both locations with exact filename first
    const staticPath = path.join(process.cwd(), '.next', 'static', 'uploads', 'profile-pictures', filename)
    const publicPath = path.join(process.cwd(), 'public', 'uploads', 'profile-pictures', filename)
    
    let filePath = ''
    if (existsSync(staticPath)) {
      filePath = staticPath
    } else if (existsSync(publicPath)) {
      filePath = publicPath
    } else {
      // If exact file not found, try to find any file for this user ID
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'profile-pictures')
      const staticDir = path.join(process.cwd(), '.next', 'static', 'uploads', 'profile-pictures')
      
      try {
        // Check public directory first
        if (existsSync(uploadsDir)) {
          const publicFiles = await readdir(uploadsDir)
          const matchingFile = publicFiles.find(file => 
            file.includes(userId) && 
            file.match(/\.(png|jpg|jpeg|gif|webp)$/i)
          )
          
          if (matchingFile) {
            filePath = path.join(uploadsDir, matchingFile)
          }
        }
        
        // If not found in public, check static directory
        if (!filePath && existsSync(staticDir)) {
          const staticFiles = await readdir(staticDir)
          const matchingStaticFile = staticFiles.find(file => 
            file.includes(userId) && 
            file.match(/\.(png|jpg|jpeg|gif|webp)$/i)
          )
          
          if (matchingStaticFile) {
            filePath = path.join(staticDir, matchingStaticFile)
          }
        }
        
        if (!filePath) {
          return NextResponse.json({ error: 'File not found' }, { status: 404 })
        }
      } catch (dirError) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }
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
    console.error('Error serving profile picture:', error)
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 })
  }
}