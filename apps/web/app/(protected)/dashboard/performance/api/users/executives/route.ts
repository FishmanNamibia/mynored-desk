import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { isRiskComplianceOfficer } from '@/lib/pms/role-helpers'

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database with full profile
    const dbUser = await prisma.user.findFirst({
      where: { email: user.email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        departmentName: true
      }
    })

    // Check if the user is a Risk & Compliance Officer
    if (!isRiskComplianceOfficer({ ...dbUser, roles: [] })) {
      return NextResponse.json(
        { error: 'Only Risk & Compliance Officers can access executive list' },
        { status: 403 }
      )
    }

    // Find executives based on job title
    const executives = await prisma.user.findMany({
      where: {
        OR: [
          { jobTitle: { contains: 'executive', mode: 'insensitive' } },
          { jobTitle: { contains: 'director', mode: 'insensitive' } },
          { jobTitle: { contains: 'statistician general', mode: 'insensitive' } },
          { jobTitle: { contains: 'deputy', mode: 'insensitive' } },
          { jobTitle: { contains: 'head of', mode: 'insensitive' } }
        ],
        status: 'ACTIVE'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        departmentName: true,
        divisionName: true
      },
      orderBy: [
        { departmentName: 'asc' },
        { lastName: 'asc' }
      ]
    })

    return NextResponse.json(executives)
  } catch (error) {
    console.error('Error fetching executives:', error)
    return NextResponse.json(
      { error: 'Failed to fetch executives' },
      { status: 500 }
    )
  }
}
