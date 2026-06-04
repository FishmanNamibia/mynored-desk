import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const { id } = params
    const body = await req.json()

    console.log('=== Updating Performance Agreement ===')
    console.log('Agreement ID:', id)
    console.log('User ID:', user.id)
    console.log('Update data:', body)

    // Verify the agreement belongs to the user or they are the supervisor
    const agreement = await prisma.performanceAgreement.findUnique({
      where: { id },
      select: {
        userId: true,
        supervisorId: true
      }
    })

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })
    }

    const isOwner = agreement.userId === user.id
    const isSupervisor = agreement.supervisorId === user.id

    if (!isOwner && !isSupervisor) {
      return NextResponse.json({ error: 'Unauthorized to update this agreement' }, { status: 403 })
    }

    // Update the agreement
    const updatedAgreement = await prisma.performanceAgreement.update({
      where: { id },
      data: body,
      include: {
        initiative: {
          include: {
            objective: {
              include: {
                goal: {
                  select: {
                    goalNumber: true,
                    title: true
                  }
                }
              }
            }
          }
        },
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    console.log('✅ Agreement updated successfully')

    return NextResponse.json(updatedAgreement)

  } catch (error: any) {
    console.error('❌ Error updating performance agreement:', error)
    return NextResponse.json(
      { error: 'Failed to update performance agreement: ' + error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const { id } = params

    console.log('=== Deleting Performance Agreement ===')
    console.log('Agreement ID:', id)
    console.log('User ID:', user.id)

    // Verify the agreement belongs to the user
    const agreement = await prisma.performanceAgreement.findUnique({
      where: { id },
      select: {
        userId: true
      }
    })

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })
    }

    if (agreement.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to delete this agreement' }, { status: 403 })
    }

    // Delete the agreement
    await prisma.performanceAgreement.delete({
      where: { id }
    })

    console.log('✅ Agreement deleted successfully')

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('❌ Error deleting performance agreement:', error)
    return NextResponse.json(
      { error: 'Failed to delete performance agreement: ' + error.message },
      { status: 500 }
    )
  }
}
