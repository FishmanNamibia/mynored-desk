import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

// Division model does not exist in the Prisma schema.
// Divisions are tracked via the divisionName string field on User (from Entra AD).
// GET returns unique divisionName values from the logged-in user's subordinates only.

// Recursively find all subordinate IDs under a given user
async function findAllSubordinateIds(userId: string, visited = new Set<string>()): Promise<string[]> {
  if (visited.has(userId)) return []
  visited.add(userId)

  const directReports = await prisma.user.findMany({
    where: { managerId: userId, status: 'ACTIVE' },
    select: { id: true }
  })

  const ids: string[] = []
  for (const report of directReports) {
    ids.push(report.id)
    const subIds = await findAllSubordinateIds(report.id, visited)
    ids.push(...subIds)
  }
  return ids
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve actual database user ID by email
    const dbUser = await prisma.user.findFirst({
      where: { email: user.email },
      select: { id: true }
    })
    const actualUserId = dbUser?.id || user.id

    // Get all subordinate IDs recursively
    const allSubordinateIds = await findAllSubordinateIds(actualUserId)

    if (allSubordinateIds.length === 0) {
      return NextResponse.json([])
    }

    // Get unique division names from subordinates only
    const subordinates = await prisma.user.findMany({
      where: { id: { in: allSubordinateIds }, status: 'ACTIVE' },
      select: { divisionName: true },
      distinct: ['divisionName'],
      orderBy: { divisionName: 'asc' },
    })

    // Include "No Division Assigned" if any subordinate has null divisionName
    const hasNoDivision = subordinates.some(u => !u.divisionName)
    
    const divisions = subordinates
      .filter(u => u.divisionName)
      .map(u => ({
        id: u.divisionName,
        name: u.divisionName,
        description: null,
        departmentId: null,
        department: null,
      }))

    if (hasNoDivision) {
      divisions.push({
        id: 'No Division Assigned',
        name: 'No Division Assigned',
        description: null,
        departmentId: null,
        department: null,
      })
    }

    return NextResponse.json(divisions)
  } catch (error) {
    console.error('[Divisions API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch divisions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ error: 'Division model not implemented' }, { status: 501 })
}
