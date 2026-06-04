import { NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request)
    
    if (!user?.id) {
      console.log('[API ME] No user ID found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        position: true,
        jobTitle: true,
        profilePicture: true,
        profilePictureUrl: true,
        departmentId: true,
        divisionId: true,
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
      }
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(dbUser)
  } catch (error) {
    console.error('[API ME] Error fetching current user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
