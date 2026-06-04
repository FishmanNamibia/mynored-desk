import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'

export async function DELETE(req: NextRequest) {
  // Safety: require a confirmation header
  const confirm = req.headers.get('x-confirm-delete')
  if (confirm !== 'YES-DELETE-ALL-PERFORMANCE-DATA') {
    return NextResponse.json({ error: 'Missing confirmation header' }, { status: 400 })
  }

  try {
    // Delete in correct order (deepest children first)
    const results: Record<string, number> = {}

    // 360 Rating system
    results.rating360Answer = (await prisma.rating360Answer.deleteMany()).count
    results.peerRating360 = (await prisma.peerRating360.deleteMany()).count
    results.subordinateRating360 = (await prisma.subordinateRating360.deleteMany()).count
    results.rating360 = (await prisma.rating360.deleteMany()).count
    results.rating360Cycle = (await prisma.rating360Cycle.deleteMany()).count
    results.rating360Question = (await prisma.rating360Question.deleteMany()).count
    results.rating360Category = (await prisma.rating360Category.deleteMany()).count

    // Targets & status history
    results.statusHistory = (await prisma.statusHistory.deleteMany()).count
    results.target = (await prisma.target.deleteMany()).count

    // Performance agreements
    results.performanceAgreement = (await prisma.performanceAgreement.deleteMany()).count

    // Adhoc tasks
    results.adhocTask = (await prisma.adhocTask.deleteMany()).count

    // User task weights
    results.userTaskWeight = (await prisma.userTaskWeight.deleteMany()).count

    // Audit & notifications
    results.pmsAuditLog = (await prisma.pmsAuditLog.deleteMany()).count
    results.pmsNotification = (await prisma.pmsNotification.deleteMany()).count

    // Performance reviews
    results.performanceReview = (await prisma.performanceReview.deleteMany()).count

    // Goals & initiatives
    results.initiative = (await prisma.initiative.deleteMany()).count
    results.goal = (await prisma.goal.deleteMany()).count

    // Performance periods (last)
    results.performancePeriod = (await prisma.performancePeriod.deleteMany()).count

    return NextResponse.json({ success: true, deleted: results })
  } catch (error: any) {
    console.error('clear-performance-data error:', error)
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}
