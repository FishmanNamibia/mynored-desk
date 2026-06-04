import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { isRiskComplianceOfficer, isExecutive } from '@/lib/pms/role-helpers'

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
        departmentName: true,
        divisionName: true
      }
    })
    
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const isUserComplianceOfficer = isRiskComplianceOfficer({ ...dbUser, roles: [] })
    const isUserExecutive = isExecutive({ ...dbUser, roles: [] })
    
    // If not compliance officer or executive, return unauthorized
    if (!isUserComplianceOfficer && !isUserExecutive) {
      return NextResponse.json(
        { error: 'Only Risk & Compliance Officers or Executives can view risk documents' },
        { status: 403 }
      )
    }
    
    // Query parameters
    const searchParams = req.nextUrl.searchParams
    const departmentFilter = searchParams.get('department')
    
    let documents

    if (isUserComplianceOfficer) {
      // Compliance officers can see all documents
      documents = await prisma.riskDocument.findMany({
        where: departmentFilter ? { departmentName: departmentFilter } : {},
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          distributedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              jobTitle: true,
              departmentName: true
            }
          }
        }
      })
    } else if (isUserExecutive) {
      // Executives can see documents distributed to them or uploaded by them
      documents = await prisma.riskDocument.findMany({
        where: {
          OR: [
            { distributedTo: { some: { id: dbUser.id } } },
            { uploadedById: dbUser.id }
          ]
        },
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          distributedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              jobTitle: true,
              departmentName: true
            }
          }
        }
      })
    }
    
    return NextResponse.json(documents)
  } catch (error) {
    console.error('Error fetching risk documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch risk documents' },
      { status: 500 }
    )
  }
}
