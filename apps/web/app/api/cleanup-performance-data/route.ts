import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'

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

    console.log('🧹 Starting cleanup of performance data...')
    
    // Delete in reverse order of dependencies
    console.log('Deleting system-generated Performance Agreements...')
    const agreements = await prisma.performanceAgreement.deleteMany({
      where: {
        isSystemGenerated: true
      }
    })
    console.log(`✅ Deleted ${agreements.count} system-generated performance agreements`)

    // Disconnect any remaining user-created performance agreements from
    // initiatives before deleting them, so employee records are preserved.
    console.log('Disconnecting user-created agreements from initiatives...')
    const disconnected = await prisma.performanceAgreement.updateMany({
      where: { initiativeId: { not: null } },
      data: { initiativeId: null }
    })
    console.log(`🔗 Disconnected ${disconnected.count} user-created agreement(s)`)
    
    console.log('Deleting Initiatives...')
    const initiatives = await prisma.initiative.deleteMany({})
    console.log(`✅ Deleted ${initiatives.count} initiatives`)
    
    console.log('Deleting Objectives...')
    const objectives = await prisma.objective.deleteMany({})
    console.log(`✅ Deleted ${objectives.count} objectives`)
    
    console.log('Deleting Goals...')
    const goals = await prisma.goal.deleteMany({})
    console.log(`✅ Deleted ${goals.count} goals`)
    
    console.log('✨ Cleanup complete!')
    
    const res = NextResponse.json({
      success: true,
      deleted: {
        agreements: agreements.count,
        initiatives: initiatives.count,
        objectives: objectives.count,
        goals: goals.count
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
