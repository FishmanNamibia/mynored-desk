import { NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all targets/tasks with user information
    const targets = await prisma.target.findMany({
      include: {
        responsible: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            departmentId: true,
            divisionId: true,
            department: {
              select: {
                id: true,
                name: true
              }
            },
            division: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    // Calculate stats for each target
    const targetStats = targets.map(target => {
      const isCompleted = target.status === 'COMPLETED'
      const isInProgress = target.status === 'IN_PROGRESS'
      const isNotStarted = target.status === 'NOT_STARTED'
      const isOverdue = target.dueDate && new Date(target.dueDate) < new Date() && !isCompleted

      return {
        targetId: target.id,
        departmentId: target.responsible?.departmentId,
        departmentName: target.responsible?.department?.name,
        divisionId: target.responsible?.divisionId,
        divisionName: target.responsible?.division?.name,
        isCompleted,
        isInProgress,
        isNotStarted,
        isOverdue
      }
    })

    // Calculate organizational stats
    const orgStats = {
      totalTargets: targetStats.length,
      completed: targetStats.filter(t => t.isCompleted).length,
      inProgress: targetStats.filter(t => t.isInProgress).length,
      notStarted: targetStats.filter(t => t.isNotStarted).length,
      overdue: targetStats.filter(t => t.isOverdue).length,
      completionRate: targetStats.length > 0
        ? (targetStats.filter(t => t.isCompleted).length / targetStats.length) * 100
        : 0
    }

    // Calculate departmental stats
    const departments = Array.from(
      new Set(targetStats.filter(t => t.departmentId).map(t => t.departmentId))
    )
    
    console.log('Departments found:', departments.length)
    console.log('Department IDs:', departments)
    
    const departmentStats = departments.map(deptId => {
      const deptTargets = targetStats.filter(t => t.departmentId === deptId)
      const deptName = deptTargets[0]?.departmentName || 'Unknown'
      
      const completed = deptTargets.filter(t => t.isCompleted).length
      
      return {
        departmentId: deptId!,
        departmentName: deptName,
        totalTargets: deptTargets.length,
        completed,
        inProgress: deptTargets.filter(t => t.isInProgress).length,
        notStarted: deptTargets.filter(t => t.isNotStarted).length,
        overdue: deptTargets.filter(t => t.isOverdue).length,
        completionRate: deptTargets.length > 0
          ? (completed / deptTargets.length) * 100
          : 0
      }
    }).sort((a, b) => b.completionRate - a.completionRate)

    // Calculate divisional stats
    const divisions = Array.from(
      new Set(targetStats.filter(t => t.divisionId).map(t => t.divisionId))
    )
    
    console.log('Divisions found:', divisions.length)
    console.log('Division IDs:', divisions)
    
    const divisionStats = divisions.map(divId => {
      const divTargets = targetStats.filter(t => t.divisionId === divId)
      const divName = divTargets[0]?.divisionName || 'Unknown'
      
      const completed = divTargets.filter(t => t.isCompleted).length
      
      return {
        divisionId: divId!,
        divisionName: divName,
        totalTargets: divTargets.length,
        completed,
        inProgress: divTargets.filter(t => t.isInProgress).length,
        notStarted: divTargets.filter(t => t.isNotStarted).length,
        overdue: divTargets.filter(t => t.isOverdue).length,
        completionRate: divTargets.length > 0
          ? (completed / divTargets.length) * 100
          : 0
      }
    }).sort((a, b) => b.completionRate - a.completionRate)
    
    console.log('Department stats:', departmentStats)
    console.log('Division stats:', divisionStats)

    return NextResponse.json({
      organization: orgStats,
      departments: departmentStats,
      divisions: divisionStats
    })
  } catch (error) {
    console.error('Error fetching performance management stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
