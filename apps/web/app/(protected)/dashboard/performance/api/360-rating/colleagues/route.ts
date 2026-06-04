import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve canonical ID (oldest = deterministic)
    const me = await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, departmentId: true, departmentName: true },
    })
    const myId = me?.id ?? user.id

    // Collect ALL DB IDs for this email so isSubordinate works even if managerId points to a ghost account
    const allMyRecords = user.email ? await prisma.user.findMany({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      select: { id: true }
    }) : []
    const allMyIds = new Set([myId, user.id, ...allMyRecords.map(r => r.id)])

    const colleagues = await prisma.user.findMany({
      where: { id: { notIn: Array.from(allMyIds) } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        departmentName: true,
        managerId: true,
      },
      orderBy: [{ departmentName: 'asc' }, { firstName: 'asc' }],
    })

    const myDept = me?.departmentName ?? ''

    return NextResponse.json(
      colleagues.map((c) => ({
        id: c.id,
        name: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email,
        email: c.email,
        jobTitle: c.jobTitle || '',
        department: c.departmentName || '',
        isSubordinate: c.managerId !== null && allMyIds.has(c.managerId),
        sameDepartment: !!myDept && c.departmentName === myDept,
      }))
    )
  } catch (error) {
    console.error('Error fetching colleagues:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
