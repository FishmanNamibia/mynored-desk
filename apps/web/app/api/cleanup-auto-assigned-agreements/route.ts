import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'

// This endpoint removes only auto-assigned performance agreements
// while preserving the workplan structure (Goals, Objectives, Initiatives)
export async function POST(request: NextRequest) {
  try {
    if (process.env.ENABLE_DESTRUCTIVE_MAINTENANCE_ENDPOINTS !== 'true') {
      return NextResponse.json(
        { error: 'Destructive maintenance endpoints are disabled.' },
        { status: 403 }
      )
    }

    const { user, setCookieHeaders } = await getAuthenticatedUser(request)
    if (!user || !userHasAnyRole(user, ['ADMIN', 'SG', 'DEPUTY_SG'])) {
      const res = NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      for (const sc of setCookieHeaders) res.headers.append('set-cookie', sc)
      return res
    }

    console.log('🧹 Starting cleanup of auto-assigned performance agreements...')
    console.log('Note: Workplan structure (Goals, Objectives, Initiatives) will be preserved.')
    
    // Only delete system-generated performance agreements that were auto-assigned
    // Keep manually created agreements and ad-hoc containers
    const deletedAgreements = await prisma.performanceAgreement.deleteMany({
      where: {
        isSystemGenerated: true,
        isAdhocContainer: false // Don't delete ad-hoc containers
      }
    })
    
    console.log(`✅ Deleted ${deletedAgreements.count} auto-assigned performance agreements`)
    console.log('✨ Cleanup complete! Workplan structure preserved.')
    
    const res = NextResponse.json({
      success: true,
      message: 'Auto-assigned agreements have been removed. Users can now create their own agreements.',
      deleted: {
        performanceAgreements: deletedAgreements.count
      }
    })
    for (const sc of setCookieHeaders) res.headers.append('set-cookie', sc)
    return res
    
  } catch (error: any) {
    console.error('❌ Cleanup failed:', error)
    return NextResponse.json(
      { error: 'Cleanup failed: ' + error.message },
      { status: 500 }
    )
  }
}

// GET endpoint to preview what will be deleted
export async function GET(request: NextRequest) {
  try {
    if (process.env.ENABLE_DESTRUCTIVE_MAINTENANCE_ENDPOINTS !== 'true') {
      return NextResponse.json(
        { error: 'Destructive maintenance endpoints are disabled.' },
        { status: 403 }
      )
    }

    const { user, setCookieHeaders } = await getAuthenticatedUser(request)
    if (!user || !userHasAnyRole(user, ['ADMIN', 'SG', 'DEPUTY_SG'])) {
      const res = NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      for (const sc of setCookieHeaders) res.headers.append('set-cookie', sc)
      return res
    }

    // Count auto-assigned agreements
    const count = await prisma.performanceAgreement.count({
      where: {
        isSystemGenerated: true,
        isAdhocContainer: false
      }
    })

    // Get sample of affected agreements
    const samples = await prisma.performanceAgreement.findMany({
      where: {
        isSystemGenerated: true,
        isAdhocContainer: false
      },
      take: 10,
      select: {
        id: true,
        title: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    const res = NextResponse.json({
      totalToDelete: count,
      samples: samples.map(s => ({
        id: s.id,
        title: s.title,
        assignedTo: s.user ? `${s.user.firstName} ${s.user.lastName} (${s.user.email})` : 'Unknown'
      }))
    })
    for (const sc of setCookieHeaders) res.headers.append('set-cookie', sc)
    return res
    
  } catch (error: any) {
    console.error('❌ Preview failed:', error)
    return NextResponse.json(
      { error: 'Preview failed: ' + error.message },
      { status: 500 }
    )
  }
}
