import { NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request)
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user details
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
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

    // Get users who report directly to me
    const directReports = await prisma.user.findMany({
      where: {
        managerId: user.id
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        performanceAgreements: {
          where: {
            isAdhocContainer: false
          },
          select: {
            id: true,
            title: true,
            approvalStatus: true,
            rating: true
          }
        }
      }
    })

    // Get all users in my department (if I'm an executive)
    let departmentUsers: any[] = []
    if (currentUser?.departmentId) {
      departmentUsers = await prisma.user.findMany({
        where: {
          OR: [
            { departmentId: currentUser.departmentId },
            { 
              division: {
                departmentId: currentUser.departmentId
              }
            }
          ],
          id: { not: user.id }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          performanceAgreements: {
            where: {
              isAdhocContainer: false
            },
            select: {
              id: true,
              title: true,
              approvalStatus: true,
              rating: true
            }
          }
        }
      })
    }

    return NextResponse.json({
      currentUser,
      directReports: {
        count: directReports.length,
        users: directReports
      },
      departmentUsers: {
        count: departmentUsers.length,
        users: departmentUsers
      },
      summary: {
        isExecutive: ['EXECUTIVE', 'DSG', 'SG'].includes(currentUser?.role || ''),
        hasDepartment: !!currentUser?.departmentId,
        totalPotentialReviewees: currentUser?.departmentId 
          ? departmentUsers.length 
          : directReports.length
      }
    })
  } catch (error) {
    console.error('Error in debug route:', error)
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 })
  }
}
