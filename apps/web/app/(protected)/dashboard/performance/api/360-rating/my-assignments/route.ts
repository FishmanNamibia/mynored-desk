import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Resolve canonical ID (oldest record = deterministic canonical)
    const meDb = await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })
    const myId = meDb?.id ?? user.id

    // Collect ALL DB IDs for this user's email (canonical + ghost accounts)
    // Employees whose managerId points to a ghost ID would be missed otherwise
    const allMyRecords = user.email ? await prisma.user.findMany({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      select: { id: true }
    }) : []
    const allMyIds = Array.from(new Set([myId, user.id, ...allMyRecords.map(r => r.id)]))

    const assignments: any[] = []

    // 1. Direct reports — I rate them as supervisor
    // Search against ALL my IDs so employees pointing to a ghost account are included
    const directReports = await prisma.user.findMany({
      where: { managerId: { in: allMyIds } },
      select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true, departmentName: true },
    })

    const activeCycle = await prisma.rating360Cycle.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    for (const dr of directReports) {
      let hasRated = false
      let existingScores: Record<string, number> = {}
      let existingComments = ''
      let rating360Id: string | undefined
      if (activeCycle) {
        const r = await prisma.rating360.findUnique({
          where: { cycleId_userId: { cycleId: activeCycle.id, userId: dr.id } },
          select: { id: true, supervisorRating: true, supervisorComments: true },
        })
        hasRated = r?.supervisorRating != null
        rating360Id = r?.id
        if (r?.supervisorComments) {
          try {
            const parsed = JSON.parse(r.supervisorComments)
            existingScores = parsed.scores || {}
            existingComments = parsed.comments || ''
          } catch {}
        }
      }
      assignments.push({
        id: dr.id,
        name: [dr.firstName, dr.lastName].filter(Boolean).join(' ') || dr.email,
        jobTitle: dr.jobTitle || '',
        department: dr.departmentName || '',
        raterType: 'supervisor',
        hasRated,
        existingScores,
        existingComments,
        rating360Id,
      })
    }

    // 2. PeerRating360 where I'm the assigned rater (org_random / dept_random)
    const peerAssignments = await prisma.peerRating360.findMany({
      where: { raterId: myId },
      include: {
        rating360: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                jobTitle: true,
                departmentName: true,
              },
            },
          },
        },
      },
    })

    for (const pa of peerAssignments) {
      let parsed: any = {}
      try { parsed = JSON.parse(pa.comments || '{}') } catch {}
      const raterType = parsed.raterType || 'dept_random'
      const ratee = pa.rating360.user
      // avoid duplicating direct reports
      if (assignments.find((a) => a.id === ratee.id && a.raterType === raterType)) continue
      let existingScores: Record<string, number> = {}
      let existingComments = ''
      if (pa.rating != null && parsed.scores) {
        existingScores = parsed.scores || {}
        existingComments = parsed.comments || ''
      }
      assignments.push({
        id: ratee.id,
        name: [ratee.firstName, ratee.lastName].filter(Boolean).join(' ') || ratee.email,
        jobTitle: ratee.jobTitle || '',
        department: ratee.departmentName || '',
        raterType,
        hasRated: pa.rating != null,
        peerRating360Id: pa.id,
        existingScores,
        existingComments,
      })
    }

    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Error fetching assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
