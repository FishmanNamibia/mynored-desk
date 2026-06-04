import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { isRiskComplianceOfficer } from '@/lib/pms/role-helpers'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
      }
    })

    // Check if the user is a Risk & Compliance Officer
    if (!isRiskComplianceOfficer({ ...dbUser, roles: [] })) {
      return NextResponse.json(
        { error: 'Only Risk & Compliance Officers can distribute risk documents' },
        { status: 403 }
      )
    }

    const documentId = params.id
    const { executiveIds } = await req.json()

    // Validate executive IDs
    if (!executiveIds || !Array.isArray(executiveIds) || executiveIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one executive ID must be provided' },
        { status: 400 }
      )
    }

    // Check if document exists
    const document = await prisma.riskDocument.findUnique({
      where: { id: documentId },
      include: {
        distributedTo: true
      }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Update document with new executive IDs
    const updatedDocument = await prisma.riskDocument.update({
      where: { id: documentId },
      data: {
        distributedToIds: executiveIds,
        distributedTo: {
          connect: executiveIds.map(id => ({ id }))
        }
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        distributedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
            departmentName: true
          }
        }
      }
    })

    // Create notifications for each executive
    for (const executiveId of executiveIds) {
      await prisma.pmsNotification.create({
        data: {
          type: 'RISK_DOCUMENT',
          status: 'PENDING',
          senderId: dbUser.id,
          receiverId: executiveId,
          entityType: 'RiskDocument',
          entityId: documentId,
          message: `A new risk document "${document.title}" has been distributed to you by ${dbUser.firstName || ''} ${dbUser.lastName || ''}.`,
          metadata: JSON.stringify({
            documentId,
            documentTitle: document.title,
            senderName: `${dbUser.firstName || ''} ${dbUser.lastName || ''}`,
            senderDepartment: dbUser.departmentName || 'N/A'
          })
        }
      })
    }

    return NextResponse.json(updatedDocument)
  } catch (error) {
    console.error('Error distributing risk document:', error)
    return NextResponse.json(
      { error: 'Failed to distribute risk document' },
      { status: 500 }
    )
  }
}
