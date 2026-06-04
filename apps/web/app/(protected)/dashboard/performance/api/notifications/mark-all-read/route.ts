import { NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve actual DB user by email (auth token ID may differ)
    const dbUser = await prisma.user.findFirst({
      where: { email: user.email },
      select: { id: true }
    })
    const actualUserId = dbUser?.id || user.id

    const result = await prisma.pmsNotification.updateMany({
      where: {
        receiverId: actualUserId,
        status: { in: ['PENDING', 'SENT'] },
      },
      data: {
        status: 'READ',
      },
    })

    return NextResponse.json({
      success: true,
      updated: result.count,
    })
  } catch (error) {
    console.error('[mark-all-read] Error:', error)
    return NextResponse.json({ error: 'Failed to mark all as read' }, { status: 500 })
  }
}
