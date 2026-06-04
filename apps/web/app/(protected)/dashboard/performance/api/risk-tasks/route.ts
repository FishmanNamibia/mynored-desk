import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

// Helper to calculate risk score based on likelihood and impact
function calculateRiskScore(likelihood: string, impactLevel: string): number {
  const likelihoodMap: { [key: string]: number } = {
    'UNLIKELY': 1,
    'POSSIBLE': 2,
    'PROBABLE': 3
  }
  
  const impactMap: { [key: string]: number } = {
    'MINOR': 1,
    'MODERATE': 2,
    'SIGNIFICANT': 3
  }
  
  const likelihoodScore = likelihoodMap[likelihood] || 2
  const impactScore = impactMap[impactLevel] || 2
  return likelihoodScore * impactScore
}

// POST - Create a new risk task
export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve actual DB user by email
    let actualUserId = user.id
    if (user.email) {
      const dbUser = await prisma.user.findFirst({ 
        where: { email: user.email }, 
        select: { id: true } 
      })
      if (dbUser) {
        actualUserId = dbUser.id
      }
    }

    const body = await req.json()
    const {
      riskCategory,
      riskDescription,
      cause,
      impact,
      likelihood,
      impactLevel,
      mitigations,
      furtherActions,
      dueDate
    } = body

    // Validate required fields
    if (!riskCategory || !riskDescription) {
      return NextResponse.json({ 
        error: 'Risk Category and Risk Description are required' 
      }, { status: 400 })
    }

    // Calculate risk score
    const riskScore = calculateRiskScore(likelihood || 'POSSIBLE', impactLevel || 'MODERATE')
    
    // Determine priority based on risk score
    let priority = 'MEDIUM'
    if (riskScore <= 2) priority = 'LOW'
    else if (riskScore >= 6) priority = 'HIGH'

    // Create the risk task
    const riskTask = await prisma.riskTask.create({
      data: {
        title: `${riskCategory}: ${riskDescription.substring(0, 50)}${riskDescription.length > 50 ? '...' : ''}`,
        description: riskDescription.length > 50 ? riskDescription : undefined,
        riskCategory,
        riskDescription,
        cause: cause || undefined,
        impact: impact || undefined,
        likelihood: likelihood || 'POSSIBLE',
        impactLevel: impactLevel || 'MODERATE',
        riskScore,
        mitigations: mitigations || undefined,
        furtherActions: furtherActions || undefined,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        assignedToId: actualUserId,
        createdById: actualUserId,
        status: 'NOT_STARTED',
        percentComplete: 0
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(riskTask, { status: 201 })

  } catch (error) {
    console.error('Error creating risk task:', error)
    return NextResponse.json({ 
      error: 'Failed to create risk task', 
      details: (error as Error).message 
    }, { status: 500 })
  }
}
