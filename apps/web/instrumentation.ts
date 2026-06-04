export async function register() {
  // Only run on the Node.js server (not Edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { prisma } = await import('@/lib/pms/prisma')

      // Find the active performance period
      const activePeriod = await prisma.performancePeriod.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true }
      })

      if (!activePeriod) {
        console.log('[STARTUP] No active performance period found — skipping backfill')
        return
      }

      console.log(`[STARTUP] Active period: ${activePeriod.name} (${activePeriod.id})`)

      // Backfill all agreements that have no performancePeriodId or a stale one
      const result = await prisma.performanceAgreement.updateMany({
        where: {
          performancePeriodId: { not: activePeriod.id }
        },
        data: { performancePeriodId: activePeriod.id }
      })

      if (result.count > 0) {
        console.log(`[STARTUP] Backfilled performancePeriodId for ${result.count} agreements → ${activePeriod.name}`)
      } else {
        console.log('[STARTUP] All agreements already linked to active period — no backfill needed')
      }
    } catch (err) {
      // Non-fatal: log and continue — the per-request backfill in the GET handler is the safety net
      console.error('[STARTUP] Agreement backfill error (non-fatal):', err)
    }
  }
}
