import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

/**
 * Lightweight user search endpoint for memo routing fields.
 * Returns id, name, position, department, email for all active users.
 * Supports optional ?q= search parameter to filter by name/email.
 * Accessible to any authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const { user: authUser, setCookieHeaders } = await getAuthenticatedUser(req)

    if (!authUser?.id) {
      const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      for (const sc of setCookieHeaders) res.headers.append('set-cookie', sc)
      return res
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')?.trim() || ''

    const whereClause: any = {
      status: 'ACTIVE',
    }

    if (query) {
      whereClause.OR = [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { username: { contains: query, mode: 'insensitive' } },
      ]
    }

    const dbUsers = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        departmentName: true,
        jobTitle: true,
        position: true,
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      take: 50,
    })

    const users = dbUsers.map((u) => {
      const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.username || u.email
      return {
        id: u.id,
        name,
        position: u.position || u.jobTitle || null,
        department: u.departmentName || null,
        email: u.email,
      }
    })

    const res = NextResponse.json(users)
    for (const sc of setCookieHeaders) res.headers.append('set-cookie', sc)
    return res
  } catch (error) {
    console.error('Failed to fetch memo users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
