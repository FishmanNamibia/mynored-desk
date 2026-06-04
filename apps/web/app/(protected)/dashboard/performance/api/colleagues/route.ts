import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '500', 10)

    // Fetch all users in the system — deduplicate by email to exclude ghost accounts
    // Note: lastLoginAt is often null for Azure/SSO users so we cannot filter by it
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { firstName: { not: null } },
          { lastName: { not: null } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        departmentName: true,
        divisionName: true,
        profilePictureUrl: true,
        createdAt: true,
        lastLoginAt: true,
        department: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Deduplicate by email (canonical = pick richest profile)
    const emailMap = new Map<string, typeof users[0]>()
    for (const u of users) {
      const key = u.email.toLowerCase()
      const existing = emailMap.get(key)
      if (!existing || (u.jobTitle && !existing.jobTitle)) {
        emailMap.set(key, u)
      }
    }
    const deduped = Array.from(emailMap.values())

    // Resolve department name
    const result = deduped.map(u => {
      const deptName =
        u.department?.name ||
        u.departmentName ||
        u.divisionName ||
        'NSA'

      const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email.split('@')[0]

      const initials = name
        .split(' ')
        .map((w: string) => w.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('')

      // New employee: first logged in within last 60 days
      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
      const isNew = u.createdAt ? new Date(u.createdAt) > sixtyDaysAgo : false

      return {
        id: u.id,
        name,
        jobTitle: u.jobTitle || 'Team Member',
        department: deptName,
        profilePicture: u.profilePictureUrl || null,
        initials,
        isNew,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
      }
    })

    // Shuffle randomly so every page load shows a different order
    const shuffled = result.sort(() => Math.random() - 0.5)

    return NextResponse.json(shuffled.slice(0, limit))
  } catch (error) {
    console.error('[colleagues] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
