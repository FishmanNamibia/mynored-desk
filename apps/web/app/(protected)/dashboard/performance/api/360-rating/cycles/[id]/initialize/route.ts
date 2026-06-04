import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { user } = await getAuthenticatedUser(req)
    
    if (!user?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Executive: Human Capital can initialize ratings
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        department: true
      }
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isHCExecutive = dbUser.role === 'EXECUTIVE' && 
                          dbUser.department?.name?.toLowerCase().includes('human capital')
    
    const isSGorAdmin = dbUser.role === 'SG' || dbUser.role === 'ADMIN'

    if (!isHCExecutive && !isSGorAdmin) {
      return NextResponse.json({ 
        error: 'Only Executive: Human Capital can initialize ratings' 
      }, { status: 403 })
    }

    const cycleId = params.id

    // Check if cycle exists
    const cycle = await prisma.rating360Cycle.findUnique({
      where: { id: cycleId }
    })

    if (!cycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
    }

    // Get all approved users
    const users = await prisma.user.findMany({
      where: { 
        isApproved: true,
        role: {
          in: ['STAFF', 'MANAGER', 'ADMINISTRATIVE_ASSISTANT', 'EXECUTIVE', 'DEPUTY_SG', 'SG']
        }
      },
      select: {
        id: true,
        managerId: true
      }
    })

    let created = 0
    let existing = 0

    // Create Rating360 entries for users who don't have one yet
    for (const user of users) {
      const existingRating = await prisma.rating360.findUnique({
        where: {
          cycleId_userId: {
            cycleId: cycleId,
            userId: user.id
          }
        }
      })

      if (!existingRating) {
        await prisma.rating360.create({
          data: {
            cycleId: cycleId,
            userId: user.id,
            supervisorId: user.managerId,
            status: 'PENDING'
          }
        })
        created++
      } else {
        existing++
      }
    }

    return NextResponse.json({
      success: true,
      totalUsers: users.length,
      created,
      existing,
      message: `Initialized ${created} new ratings. ${existing} already existed.`
    })
  } catch (error) {
    console.error('Error initializing ratings:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
