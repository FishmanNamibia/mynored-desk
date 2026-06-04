import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user } = await getAuthenticatedUser(request)
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, percentComplete, progressNotes, evidenceUrl, evidenceNotes, rating } = body

    // Validate completion requirements
    if (status === 'COMPLETED') {
      if (!evidenceUrl) {
        return NextResponse.json(
          { error: 'Evidence URL is required for completed status' },
          { status: 400 }
        )
      }
      if (!rating || rating < 1 || rating > 5) {
        return NextResponse.json(
          { error: 'Rating (1-5) is required for completed status' },
          { status: 400 }
        )
      }
    }

    // Verify initiative exists and user has permission
    const initiative = await prisma.initiative.findUnique({
      where: { id }
    })

    if (!initiative) {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    }

    // Check if user is primary or secondary responsible
    if (
      initiative.primaryResponsibility !== user.id &&
      initiative.secondaryResponsibility !== user.id
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to update this initiative' },
        { status: 403 }
      )
    }

    // Update initiative status
    const updatedInitiative = await prisma.initiative.update({
      where: { id },
      data: {
        status,
        percentComplete,
        progressNotes,
        ...(status === 'COMPLETED' && {
          evidenceUrl,
          evidenceNotes,
          rating
        })
      }
    })

    return NextResponse.json(updatedInitiative)
  } catch (error) {
    console.error('Error updating initiative status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
