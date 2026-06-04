import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const executives = await prisma.user.findMany({
      where: { 
        role: 'EXECUTIVE',
        isApproved: true 
      },
      select: {
        id: true,
        firstName: true, lastName: true,
        email: true,
        role: true
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(executives)
  } catch (error) {
    console.error('Failed to fetch executives:', error)
    return NextResponse.json({ error: 'Failed to fetch executives' }, { status: 500 })
  }
}
