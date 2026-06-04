import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('=== Fetching Subordinates ===')
    console.log('Supervisor ID:', user.id, 'Email:', user.email)

    // Get the current user's database record to find actual ID — orderBy asc = oldest (canonical) account first
    const dbUser = await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, jobTitle: true, divisionName: true, departmentName: true }
    })
    const actualUserId = dbUser?.id || user.id

    const subordinateSelect = {
      id: true, firstName: true, lastName: true, email: true,
      jobTitle: true, departmentName: true, divisionName: true
    }

    // Recursively find ALL subordinates down the hierarchy
    const foundIds = new Set<string>()
    const allSubordinates: Array<{ id: string; firstName: string | null; lastName: string | null; email: string; jobTitle: string | null; departmentName: string | null; divisionName: string | null }> = []

    async function findSubordinatesRecursive(managerIds: string[]) {
      if (managerIds.length === 0) return

      const directReports = await prisma.user.findMany({
        where: { managerId: { in: managerIds }, status: 'ACTIVE', id: { notIn: Array.from(foundIds) } },
        select: subordinateSelect
      })

      const agreementSubs = await prisma.performanceAgreement.findMany({
        where: { supervisorId: { in: managerIds }, isAdhocContainer: false, userId: { notIn: Array.from(foundIds) } },
        select: { userId: true },
        distinct: ['userId']
      })
      const extraIds = agreementSubs.map(a => a.userId).filter(id => !foundIds.has(id) && !directReports.some(d => d.id === id))
      const extraSubs = extraIds.length > 0 ? await prisma.user.findMany({
        where: { id: { in: extraIds }, status: 'ACTIVE' },
        select: subordinateSelect
      }) : []

      const newSubs = [...directReports, ...extraSubs]
      const newIds: string[] = []
      for (const sub of newSubs) {
        if (!foundIds.has(sub.id)) {
          foundIds.add(sub.id)
          allSubordinates.push(sub)
          newIds.push(sub.id)
        }
      }

      if (newIds.length > 0 && foundIds.size < 200) {
        await findSubordinatesRecursive(newIds)
      }
    }

    await findSubordinatesRecursive([actualUserId])
    console.log(`Total subordinates (recursive): ${allSubordinates.length}`)

    // Format the response
    const formattedSubordinates = allSubordinates.map(sub => ({
      id: sub.id,
      name: `${sub.firstName || ''} ${sub.lastName || ''}`.trim() || sub.email,
      email: sub.email,
      jobTitle: sub.jobTitle,
      department: sub.departmentName,
      division: sub.divisionName
    }))

    return NextResponse.json(formattedSubordinates)

  } catch (error: any) {
    console.error('❌ Error fetching subordinates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subordinates: ' + error.message },
      { status: 500 }
    )
  }
}
