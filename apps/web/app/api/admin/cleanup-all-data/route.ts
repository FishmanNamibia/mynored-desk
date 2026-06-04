import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'

/**
 * DANGER: Complete database cleanup endpoint
 * Deletes ALL users and ALL PMS data
 * Requires ADMIN role and ENABLE_DESTRUCTIVE_MAINTENANCE_ENDPOINTS=true
 */
export async function POST(req: NextRequest) {
  try {
    if (process.env.ENABLE_DESTRUCTIVE_MAINTENANCE_ENDPOINTS !== 'true') {
      return NextResponse.json(
        { error: 'Destructive maintenance endpoints are disabled.' },
        { status: 403 }
      )
    }

    // Authenticate user
    const { user, setCookieHeaders } = await getAuthenticatedUser(req)
    if (!user?.id || !userHasAnyRole(user, ['ADMIN'])) {
      const res = NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      for (const sc of setCookieHeaders) res.headers.append('set-cookie', sc)
      return res
    }

    console.log('🚨 CLEANUP INITIATED by user:', user.email)

    // Count before deletion
    const beforeCounts = {
      users: await prisma.user.count(),
      performanceAgreements: await prisma.performanceAgreement.count(),
      adhocTasks: await prisma.adhocTask.count(),
      performanceReviews: await prisma.performanceReview.count(),
      rating360: await prisma.rating360.count(),
      sessions: await prisma.session.count(),
      notifications: await prisma.notification.count(),
    }

    console.log('Before deletion:', beforeCounts)

    // Delete in order of dependencies
    await prisma.rating360Answer.deleteMany()
    await prisma.subordinateRating360.deleteMany()
    await prisma.peerRating360.deleteMany()
    await prisma.rating360.deleteMany()
    await prisma.rating360Cycle.deleteMany()
    await prisma.rating360Question.deleteMany()
    await prisma.rating360Category.deleteMany()
    await prisma.adhocTask.deleteMany()
    await prisma.performanceAgreement.deleteMany()
    await prisma.performanceReview.deleteMany()
    await prisma.userRole.deleteMany()
    await prisma.session.deleteMany()
    await prisma.notification.deleteMany()
    await prisma.auditLog.deleteMany()
    await prisma.user.deleteMany()

    // Count after deletion
    const afterCounts = {
      users: await prisma.user.count(),
      performanceAgreements: await prisma.performanceAgreement.count(),
      adhocTasks: await prisma.adhocTask.count(),
      performanceReviews: await prisma.performanceReview.count(),
      rating360: await prisma.rating360.count(),
      sessions: await prisma.session.count(),
      notifications: await prisma.notification.count(),
    }

    console.log('After deletion:', afterCounts)

    const allZero = Object.values(afterCounts).every(count => count === 0)

    const res = NextResponse.json({
      success: true,
      message: allZero ? 'All data deleted successfully' : 'Some records may remain',
      beforeCounts,
      afterCounts,
      allZero
    })
    for (const sc of setCookieHeaders) res.headers.append('set-cookie', sc)
    return res

  } catch (error: any) {
    console.error('Cleanup error:', error)
    return NextResponse.json({
      error: 'Cleanup failed',
      details: error.message
    }, { status: 500 })
  }
}
