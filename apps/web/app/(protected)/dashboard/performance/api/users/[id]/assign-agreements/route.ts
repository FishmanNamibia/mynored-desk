import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'
import { assignPerformanceAgreementsToUser } from '@/lib/assign-performance-agreements'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params
    const { user } = await getAuthenticatedUser(req)
    
    // Only admins and SG can trigger this
    if (!user || !userHasAnyRole(user, ['ADMIN', 'SG'])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    console.log(`Assigning performance agreements to user: ${userId}`)

    const results = await assignPerformanceAgreementsToUser(userId)

    if (results.errors.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Assignment completed with errors',
        created: results.created,
        skipped: results.skipped,
        errors: results.errors
      }, { status: 207 }) // Multi-status
    }

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${results.created} performance agreements`,
      created: results.created,
      skipped: results.skipped
    })
  } catch (error: any) {
    console.error('Error assigning performance agreements:', error)
    return NextResponse.json({
      error: 'Failed to assign performance agreements',
      details: error.message
    }, { status: 500 })
  }
}
