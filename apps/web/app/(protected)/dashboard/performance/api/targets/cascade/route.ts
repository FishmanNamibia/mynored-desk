import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    
    if (!user?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { initiativeId, responsibleId, title, description, dueDate } = body

    if (!initiativeId || !responsibleId || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get current user (the one cascading the task)
    const currentUser = await prisma.user.findUnique({
      where: { email: user.email }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify initiative exists
    const initiative = await prisma.initiative.findUnique({
      where: { id: initiativeId }
    })

    if (!initiative) {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    }

    // Create cascaded task
    const task = await prisma.target.create({
      data: {
        title,
        description,
        dueDate: new Date(dueDate),
        status: 'NOT_STARTED',
        percentComplete: 0,
        responsibleId,
        initiativeId,
        approvalStatus: 'PENDING'
      },
      include: {
        responsible: {
          select: {
            id: true,
            firstName: true, lastName: true,
            email: true
          }
        },
        initiative: {
          include: {
            objective: {
              include: {
                goal: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Error creating cascaded task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
