import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'

export async function GET(req: NextRequest) {
  try {
    const { user, setCookieHeaders } = await getAuthenticatedUser(req)

    console.log('=== TO-COMPLETE API CALLED ===')
    console.log('Authenticated user:', user?.id, user?.email)

    if (!user?.id) {
      console.log('ERROR: No user ID - unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user with department info
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        jobTitle: true,
        departmentId: true,
        departmentName: true,
        divisionName: true,
        roles: { select: { role: true } }
      }
    })

    console.log('Current user from DB:', currentUser?.id, currentUser?.jobTitle)

    if (!currentUser) {
      console.log('ERROR: User not found in DB')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userRoles = currentUser.roles.map(r => r.role)
    const isExecutiveLevel = userRoles.some(r =>
      ['EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE', 'DEPUTY_SG', 'SG', 'ADMIN'].includes(r)
    )
    console.log('User roles:', userRoles, 'isExecutiveLevel:', isExecutiveLevel)

    // === Strategy 1: Find subordinates via User.managerId (AD manager) ===
    let userFilter: any = {
      managerId: user.id
    }

    if (isExecutiveLevel && currentUser.departmentId) {
      userFilter = {
        OR: [
          { managerId: user.id },
          {
            departmentId: currentUser.departmentId,
            id: { not: user.id }
          }
        ]
      }
    }

    // Fetch users via managerId with their performance agreements
    const usersViaManager = await prisma.user.findMany({
      where: userFilter,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        departmentName: true,
        divisionName: true,
        department: {
          select: {
            id: true,
            name: true
          }
        },
        roles: { select: { role: true } },
        performanceAgreements: {
          where: {
            isAdhocContainer: false
          },
          include: {
            initiative: {
              include: {
                objective: {
                  include: {
                    goal: {
                      select: {
                        goalNumber: true,
                        title: true
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: {
            dueDate: 'asc'
          }
        }
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    })

    console.log('Strategy 1: Found', usersViaManager.length, 'users via managerId')
    usersViaManager.forEach(u => console.log('  -', u.firstName, u.lastName, '- agreements:', u.performanceAgreements.length))

    // === Strategy 2: Find subordinates via PerformanceAgreement.supervisorId ===
    // This catches cases where managerId isn't set on User but supervisorId is set on agreements
    const managerUserIds = new Set(usersViaManager.map(u => u.id))

    const agreementsWithSupervisor = await prisma.performanceAgreement.findMany({
      where: {
        supervisorId: user.id,
        isAdhocContainer: false,
        userId: { notIn: Array.from(managerUserIds) } // Avoid duplicates
      },
      select: {
        userId: true
      },
      distinct: ['userId']
    })

    const additionalUserIds = agreementsWithSupervisor.map(a => a.userId)
    console.log('Strategy 2: Found', agreementsWithSupervisor.length, 'additional users via supervisorId on agreements')
    console.log('Additional user IDs:', additionalUserIds)

    let usersViaSupervisorId: typeof usersViaManager = []
    if (additionalUserIds.length > 0) {
      usersViaSupervisorId = await prisma.user.findMany({
        where: {
          id: { in: additionalUserIds }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          jobTitle: true,
          departmentName: true,
          divisionName: true,
          department: {
            select: {
              id: true,
              name: true
            }
          },
          roles: { select: { role: true } },
          performanceAgreements: {
            where: {
              isAdhocContainer: false
            },
            include: {
              initiative: {
                include: {
                  objective: {
                    include: {
                      goal: {
                        select: {
                          goalNumber: true,
                          title: true
                        }
                      }
                    }
                  }
                }
              }
            },
            orderBy: {
              dueDate: 'asc'
            }
          }
        },
        orderBy: [
          { firstName: 'asc' },
          { lastName: 'asc' }
        ]
      })
    }

    // Combine both sets of users (no duplicates due to the notIn filter)
    const allUsers = [...usersViaManager, ...usersViaSupervisorId]
    console.log('Combined users count:', allUsers.length)

    // Filter out SG and DEPUTY_SG users from the review list
    const filteredUsers = allUsers.filter(u => {
      const roles = u.roles.map(r => r.role)
      return !roles.some(r => ['SG', 'DEPUTY_SG'].includes(r))
    })
    console.log('After filtering SG/DEPUTY_SG:', filteredUsers.length)

    // Map to the shape the frontend expects
    // Key logic: when a subordinate enters a rating, that agreement appears as "ready for review"
    const usersToReview = filteredUsers.map(u => {
      const agreements = u.performanceAgreements
      const displayName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email

      // An agreement is "ready for review" if:
      // 1. It has a rating (employee self-rated), OR
      // 2. It has been approved and is awaiting supervisor rating
      const readyForReview = agreements.filter(a =>
        a.rating !== null || (a.approvalStatus === 'APPROVED')
      ).length

      // Agreements the supervisor has already reviewed (approved with rating)
      const reviewedBySuper = agreements.filter(a =>
        a.approvalStatus === 'APPROVED' && a.rating !== null
      ).length

      // Agreements with a self-rating that still need supervisor review
      // (rating entered by subordinate but not yet approved by supervisor)
      const selfRatedNeedsReview = agreements.filter(a =>
        a.rating !== null && a.approvalStatus !== 'APPROVED'
      ).length

      return {
        id: u.id,
        name: displayName,
        email: u.email,
        role: u.roles[0]?.role || 'STAFF',
        department: u.department ? { id: u.department.id, name: u.department.name } : undefined,
        division: u.divisionName ? { id: '', name: u.divisionName } : undefined,
        performanceAgreements: agreements.map(a => ({
          ...a,
          user: {
            id: u.id,
            name: displayName,
            email: u.email,
            department: u.department ? { name: u.department.name } : undefined,
            division: u.divisionName ? { name: u.divisionName } : undefined
          }
        })),
        totalAgreements: agreements.length,
        ratedAgreements: reviewedBySuper,
        // Ready for rating: has a self-rating OR is approved and awaiting supervisor rating
        readyForRating: agreements.filter(a =>
          a.rating !== null ||
          (a.approvalStatus === 'APPROVED' && a.rating === null)
        ).length,
        notReady: agreements.filter(a =>
          a.rating === null && (!a.approvalStatus || a.approvalStatus === 'REJECTED')
        ).length,
        pendingApproval: agreements.filter(a =>
          a.rating === null && a.approvalStatus === 'PENDING'
        ).length,
        selfRatedNeedsReview,
        allCompleted: agreements.length > 0 && agreements.every(a =>
          a.approvalStatus === 'APPROVED' && a.rating !== null
        )
      }
    })

    // Only include users who have at least one RATED agreement (self-rated by subordinate)
    const usersWithRatedAgreements = usersToReview.filter(u => 
      u.performanceAgreements.some(a => a.rating !== null)
    )
    console.log('=== FINAL RESULT ===')
    console.log('Returning', usersWithRatedAgreements.length, 'users with rated agreements')
    usersWithRatedAgreements.forEach(u => {
      const ratedCount = u.performanceAgreements.filter(a => a.rating !== null).length
      console.log(`  - ${u.name}: ${ratedCount} rated agreements out of ${u.totalAgreements} total`)
    })

    const response = NextResponse.json(usersWithRatedAgreements)
    for (const cookie of setCookieHeaders) {
      response.headers.append('Set-Cookie', cookie)
    }
    return response
  } catch (error: any) {
    console.error('Error fetching reviews to complete:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
