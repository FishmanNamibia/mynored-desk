import { NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isApproved: true,
        department: {
          select: {
            id: true,
            name: true
          }
        },
        division: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    const summary = {
      total: users.length,
      byRole: {
        ADMIN: users.filter(u => u.role === 'ADMIN').length,
        SG: users.filter(u => u.role === 'SG').length,
        DEPUTY_SG: users.filter(u => u.role === 'DEPUTY_SG').length,
        EXECUTIVE: users.filter(u => u.role === 'EXECUTIVE').length,
        MANAGER: users.filter(u => u.role === 'MANAGER').length,
        STAFF: users.filter(u => u.role === 'STAFF').length,
        ADMINISTRATIVE_ASSISTANT: users.filter(u => u.role === 'ADMINISTRATIVE_ASSISTANT').length,
        VIEWER: users.filter(u => u.role === 'VIEWER').length,
      },
      executives: users.filter(u => u.role === 'EXECUTIVE'),
      allUsers: users
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
