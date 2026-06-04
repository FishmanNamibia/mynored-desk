const fs = require('fs');
const content = `import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'

// DELETE - Delete a performance period (Human Capital only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: periodId } = await params
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Authorization - same pattern as POST/PATCH (User model has no scalar role field)
    const jobTitleLower = (user.jobTitle || '').toLowerCase()
    const isHCExecutiveByJobTitle = jobTitleLower.includes('executive') && jobTitleLower.includes('human capital')
    const isAuthorized =
      userHasAnyRole(user, ['ADMIN', 'EXECUTIVE', 'HC_EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE', 'SG', 'DEPUTY_SG']) ||
      isHCExecutiveByJobTitle

    if (!isAuthorized) {
      return NextResponse.json({
        error: 'Only Human Capital executives and administrators can delete performance periods'
      }, { status: 403 })
    }

    // Check if period has any performance agreements
    const agreementsCount = await prisma.performanceAgreement.count({
      where: { performancePeriodId: periodId }
    })

    if (agreementsCount > 0) {
      return NextResponse.json({
        error: \`Cannot delete period with \${agreementsCount} existing performance agreement\${agreementsCount > 1 ? 's' : ''}\`
      }, { status: 400 })
    }

    // Delete related UserTaskWeight records first to avoid FK constraint errors
    await prisma.userTaskWeight.deleteMany({ where: { periodId } }).catch(() => {})

    // Delete the period
    await prisma.performancePeriod.delete({
      where: { id: periodId }
    })

    return NextResponse.json({ message: 'Performance period deleted successfully' })
  } catch (error) {
    console.error('Error deleting performance period:', error)

    const prismaError = error as any
    if (prismaError?.code === 'P2025') {
      return NextResponse.json({ error: 'Performance period not found' }, { status: 404 })
    }
    if (prismaError?.code === 'P2003') {
      return NextResponse.json({
        error: 'Cannot delete: period has linked records. Remove all agreements and ratings first.'
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
`;
fs.writeFileSync(
  'apps/web/app/(protected)/dashboard/performance/api/performance-period/[id]/route.ts',
  content,
  'utf8'
);
console.log('Written OK');
