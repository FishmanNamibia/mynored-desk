import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve actual DB user by email (auth token ID may differ)
    let actualUserId = user.id
    try {
      const dbUser = await prisma.user.findFirst({
        where: { email: user.email },
        select: { id: true }
      })
      actualUserId = dbUser?.id || user.id
    } catch (dbError) {
      console.error('Failed to fetch user from DB, using auth ID:', dbError)
    }

    // Count pending notifications and pending approvals with error handling
    let notificationCount = 0
    let approvalCount = 0

    try {
      notificationCount = await prisma.pmsNotification.count({
        where: {
          receiverId: actualUserId,
          status: 'PENDING',
        },
      })
    } catch (notifError) {
      console.error('Failed to count notifications:', notifError)
    }

    try {
      approvalCount = await prisma.target.count({
        where: {
          approvalStatus: 'PENDING',
          responsible: {
            managerId: actualUserId,
          },
        },
      })
    } catch (approvalError) {
      console.error('Failed to count approvals:', approvalError)
    }

    const totalCount = notificationCount + approvalCount

    return NextResponse.json({ 
      count: totalCount,
      notifications: notificationCount,
      approvals: approvalCount,
    })
  } catch (error) {
    console.error('Failed to fetch notification count:', error)
    // Return 0 count instead of error to prevent UI breaking
    return NextResponse.json({ 
      count: 0,
      notifications: 0,
      approvals: 0,
      error: 'Database unavailable'
    }, { status: 200 })
  }
}
