import { NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const roleCounts = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true
      },
      orderBy: {
        _count: {
          role: 'desc'
        }
      }
    })

    const result = roleCounts.map(item => ({
      role: item.role,
      count: item._count.role
    }))

    return NextResponse.json({
      totalUsers: result.reduce((sum, item) => sum + item.count, 0),
      roleBreakdown: result
    })
  } catch (error) {
    console.error('[API Stats] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
