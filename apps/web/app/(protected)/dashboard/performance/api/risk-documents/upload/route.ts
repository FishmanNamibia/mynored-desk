import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { isRiskComplianceOfficer } from '@/lib/pms/role-helpers'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { createPmsNotification } from '@/lib/pms/notification-helpers'

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database with full profile
    const dbUser = await prisma.user.findFirst({
      where: { email: user.email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        departmentName: true,
        divisionName: true
      }
    })

    // Check if the user is a Risk & Compliance Officer
    if (!isRiskComplianceOfficer({ ...dbUser, roles: [] })) {
      return NextResponse.json(
        { error: 'Only Risk & Compliance Officers can upload risk documents' },
        { status: 403 }
      )
    }

    // Parse form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string

    if (!file || !title) {
      return NextResponse.json(
        { error: 'File and title are required' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const filename = `${uuidv4()}_${file.name}`
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Define upload directory and path
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'risk-documents')
    const filePath = join(uploadsDir, filename)
    const fileUrl = `/uploads/risk-documents/${filename}`

    // Save the file
    await writeFile(filePath, buffer)

    // Create risk document in database
    const newDocument = await prisma.riskDocument.create({
      data: {
        title,
        description,
        filename: file.name,
        fileUrl,
        fileType: file.type,
        fileSize: file.size,
        uploadedById: dbUser.id,
        departmentName: dbUser.departmentName,
        divisionName: dbUser.divisionName,
        distributedToIds: []
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(newDocument)
  } catch (error) {
    console.error('Error uploading risk document:', error)
    return NextResponse.json(
      { error: 'Failed to upload risk document' },
      { status: 500 }
    )
  }
}
