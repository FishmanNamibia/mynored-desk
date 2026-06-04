import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/pms/auth'
import { prisma } from '@/lib/pms/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('=== Resubmitting All Performance Agreements ===')
    console.log('User ID:', session.user.id)

    // Find all agreements that were rejected
    const rejectedAgreements = await prisma.performanceAgreement.findMany({
      where: {
        userId: session.user.id,
        approvalStatus: 'REJECTED'
      }
    })

    if (rejectedAgreements.length === 0) {
      return NextResponse.json({ error: 'No rejected agreements to resubmit' }, { status: 400 })
    }

    // Update all rejected agreements to pending status
    await prisma.performanceAgreement.updateMany({
      where: {
        userId: session.user.id,
        approvalStatus: 'REJECTED'
      },
      data: {
        approvalStatus: 'PENDING',
        updatedAt: new Date()
      }
    })

    console.log(`✅ Successfully resubmitted ${rejectedAgreements.length} agreements`)

    return NextResponse.json({
      success: true,
      count: rejectedAgreements.length
    })

  } catch (error: any) {
    console.error('❌ Error resubmitting performance agreements:', error)
    return NextResponse.json(
      { error: 'Failed to resubmit performance agreements: ' + error.message },
      { status: 500 }
    )
  }
}
