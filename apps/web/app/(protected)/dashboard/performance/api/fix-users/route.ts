import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all executive users
    const executives = await prisma.user.findMany({
      where: {
        role: {
          in: ['EXECUTIVE', 'SG', 'DEPUTY_SG']
        }
      },
      include: {
        department: true,
        userDepartments: {
          include: {
            department: true
          }
        }
      }
    })

    const updates = []

    for (const exec of executives) {
      const issues = []
      const fixes: any = {}

      // Check if position title is missing
      if (!exec.position || exec.position.trim() === '') {
        issues.push('Missing position title')
        // Set position title based on department
        if (exec.department) {
          fixes.position = `${exec.department.name} Executive`
        } else {
          fixes.position = 'Executive'
        }
      }

      // Check if primary department is missing
      if (!exec.departmentId) {
        issues.push('Missing primary department')
        // If they have userDepartments, use the first one as primary
        if (exec.userDepartments.length > 0) {
          fixes.departmentId = exec.userDepartments[0].departmentId
        }
      }

      // Apply fixes if any
      if (Object.keys(fixes).length > 0) {
        await prisma.user.update({
          where: { id: exec.id },
          data: fixes
        })

        updates.push({
          user: exec.name,
          email: exec.email,
          issues,
          fixes
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${updates.length} users`,
      updates
    })

  } catch (error) {
    console.error('Error fixing users:', error)
    return NextResponse.json(
      { error: 'Failed to fix users' },
      { status: 500 }
    )
  }
}
