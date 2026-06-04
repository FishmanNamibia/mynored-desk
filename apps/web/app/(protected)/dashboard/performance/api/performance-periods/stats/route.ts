import { NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period')

    if (!period) {
      return NextResponse.json({ error: 'Period parameter required' }, { status: 400 })
    }

    // Get all performance agreements for this period
    const agreements = await prisma.performanceAgreement.findMany({
      where: {
        isAdhocContainer: false
      },
      select: {
        id: true,
        approvalStatus: true,
        rating: true,
        status: true
      }
    })

    // Calculate statistics
    const totalAgreements = agreements.length
    const completed = agreements.filter(a => a.approvalStatus === 'APPROVED').length
    const inProgress = agreements.filter(a => a.approvalStatus === 'PENDING_APPROVAL').length
    const pending = agreements.filter(a => a.approvalStatus === 'PENDING' || !a.approvalStatus).length
    
    const completionRate = totalAgreements > 0 
      ? Math.round((completed / totalAgreements) * 100) 
      : 0

    // Calculate average rating (only for rated agreements)
    const ratedAgreements = agreements.filter(a => a.rating !== null && a.rating !== undefined)
    const averageRating = ratedAgreements.length > 0
      ? ratedAgreements.reduce((sum, a) => sum + (a.rating || 0), 0) / ratedAgreements.length
      : null

    return NextResponse.json({
      period,
      totalAgreements,
      completed,
      inProgress,
      pending,
      completionRate,
      averageRating
    })
  } catch (error) {
    console.error('Error fetching period stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
