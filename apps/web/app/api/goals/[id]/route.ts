import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: goalId } = await params
    console.log('🗑️ DELETE /api/goals/[id] called for goal:', goalId)
    
    const { user } = await getAuthenticatedUser(req)
    
    if (!user) {
      console.log('❌ Unauthorized - no user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ User authenticated:', user.email)

    // Delete the goal and all related data (cascading delete)
    // First delete related objectives, initiatives, and performance agreements
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        objectives: {
          include: {
            initiatives: {
              include: {
                performanceAgreements: true
              }
            }
          }
        }
      }
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Disconnect performance agreements from initiatives BEFORE deleting,
    // so employee records are preserved (not cascade-deleted).
    for (const objective of goal.objectives) {
      for (const initiative of objective.initiatives) {
        // Disconnect — don't delete — performance agreements
        await prisma.performanceAgreement.updateMany({
          where: { initiativeId: initiative.id },
          data: { initiativeId: null }
        })
      }
      
      // Delete initiatives (safe now — agreements disconnected)
      await prisma.initiative.deleteMany({
        where: { objectiveId: objective.id }
      })
    }

    // Delete objectives
    await prisma.objective.deleteMany({
      where: { goalId: goalId }
    })

    // Delete the goal
    await prisma.goal.delete({
      where: { id: goalId }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Goal and all related data deleted successfully'
    })

  } catch (error: any) {
    console.error('Error deleting goal:', error)
    return NextResponse.json(
      { error: 'Failed to delete goal: ' + error.message },
      { status: 500 }
    )
  }
}
