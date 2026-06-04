import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve actual DB user ID by email
    let actualUserId = user.id
    if (user.email) {
      const dbUser = await prisma.user.findFirst({
        where: { email: { equals: user.email, mode: 'insensitive' } },
        orderBy: { createdAt: 'asc' },
        select: { id: true }
      })
      if (dbUser) {
        actualUserId = dbUser.id
      }
    }

    // Get active performance period
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      select: { id: true }
    })

    // Get all agreements for the user in active period (excluding containers)
    const agreements = await prisma.performanceAgreement.findMany({
      where: {
        userId: actualUserId,
        isAdhocContainer: false,
        performancePeriodId: activePeriod?.id
      },
      select: {
        id: true,
        title: true,
        approvalStatus: true,
        progressNotes: true,
        rating: true,
        supervisor: {
          select: {
            firstName: true,
            lastName: true,
            jobTitle: true
          }
        },
        updatedAt: true
      }
    })

    // Count rejected actions (look for "Supervisor Feedback" in progressNotes OR approvalStatus = 'REJECTED')
    // Exclude items the employee has already corrected: they have re-rated (rating > 0) and it's not re-rejected
    const rejectedActions = agreements.filter(a => {
      // Already corrected by employee — has a valid rating and not sitting at REJECTED status again
      if (a.rating && a.rating > 0 && a.approvalStatus !== 'REJECTED') return false
      // Check for supervisor rejection feedback in progress notes
      if (a.progressNotes && a.progressNotes.includes('--- Supervisor Feedback')) {
        return true
      }
      // Also check explicit rejection status
      return a.approvalStatus === 'REJECTED'
    })
    
    // Count altered actions (look for rating adjustments that haven't been accepted/rejected yet)
    // Also exclude items the employee has re-rated/corrected after the alteration
    const alteredActions = agreements.filter(a => {
      if (!a.progressNotes) return false
      
      // Look for supervisor rating adjustments
      const hasAlteration = a.progressNotes.includes('adjusted your rating') || 
                           a.progressNotes.includes('altered') || 
                           a.progressNotes.includes('changed your rating')
      
      if (!hasAlteration) return false
      
      // Exclude those that have already been accepted or rejected by the employee
      const hasEmployeeResponse = a.progressNotes.includes('--- Rating Accepted') || 
                                a.progressNotes.includes('--- Rating Rejected')
      if (hasEmployeeResponse) return false

      // Also exclude if employee has already re-rated (submitted a new rating > 0 after alteration)
      // and the action is no longer in REJECTED status
      if (a.rating && a.rating > 0 && a.approvalStatus !== 'REJECTED') return false

      return true
    })

    // Count accepted ratings (look for "Rating Accepted" in progressNotes OR approved status with rating)
    const acceptedRatings = agreements.filter(a => {
      // Check for explicit rating acceptance
      if (a.progressNotes && a.progressNotes.includes('--- Rating Accepted')) {
        return true
      }
      // Also check for approved status with rating
      return a.approvalStatus === 'APPROVED' && a.rating && a.rating > 0
    })

    // Get detailed info for each category
    const rejectedDetails = rejectedActions.map(a => ({
      id: a.id,
      title: a.title,
      comment: a.progressNotes || 'No comment provided',
      supervisor: a.supervisor ? `${a.supervisor.firstName} ${a.supervisor.lastName}` : 'Unknown',
      supervisorTitle: a.supervisor?.jobTitle || 'Unknown',
      date: a.updatedAt
    }))

    const alteredDetails = alteredActions.map(a => {
      // Extract the supervisor comment from progressNotes
      const lines = a.progressNotes?.split('\n') || []
      const commentLine = lines.find(line => 
        line.includes('adjusted your rating') || 
        line.includes('altered') || 
        line.includes('changed your rating')
      )
      
      return {
        id: a.id,
        title: a.title,
        comment: commentLine || a.progressNotes || 'No comment provided',
        supervisor: a.supervisor ? `${a.supervisor.firstName} ${a.supervisor.lastName}` : 'Unknown',
        supervisorTitle: a.supervisor?.jobTitle || 'Unknown',
        date: a.updatedAt,
        rating: a.rating
      }
    })

    const acceptedDetails = acceptedRatings.map(a => ({
      id: a.id,
      title: a.title,
      rating: a.rating,
      date: a.updatedAt
    }))

    return NextResponse.json({
      rejected: {
        count: rejectedActions.length,
        details: rejectedDetails
      },
      altered: {
        count: alteredActions.length,
        details: alteredDetails
      },
      accepted: {
        count: acceptedRatings.length,
        details: acceptedDetails
      }
    })

  } catch (error) {
    console.error('Error fetching my-tasks stats:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
