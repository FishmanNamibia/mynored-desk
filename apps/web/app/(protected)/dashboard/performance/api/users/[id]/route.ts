import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'
import { createAuditLog } from '@/lib/audit'
import { assignPerformanceAgreementsToUser } from '@/lib/assign-performance-agreements'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const userUpdateSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'BOARD_CHAIRPERSON', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'MANAGER', 'SENIOR', 'CHIEF', 'STAFF', 'ADMINISTRATIVE_ASSISTANT', 'VIEWER']).optional(),
  position: z.string().min(1, 'Position title is required').optional(),
  profilePicture: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(), // Primary department
  departmentIds: z.array(z.string()).optional(), // Multiple departments
  divisionId: z.string().optional().nullable(),    // For Staff/Managers/Admin Assistants
  supervisorId: z.string().optional().nullable(),
})

function isAllowedUserMgmt(user: any): boolean {
  const jobTitle = (user?.jobTitle || '').toLowerCase()
  const email = (user?.email || '').toLowerCase()
  const isHCExecutive = jobTitle.includes('executive') && jobTitle.includes('human capital')
  return isHCExecutive || email === 'afanuel@nsa.org.na'
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user } = await getAuthenticatedUser(req)
    if (!user || !isAllowedUserMgmt(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        signatureUrl: true,
        profilePictureUrl: true,
        departmentId: true,
        departmentName: true,
        divisionName: true,
        jobTitle: true,
        position: true,
        department: {
          select: { id: true, name: true },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        roles: {
          select: { role: { select: { name: true } } },
        },
        createdAt: true,
      },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(dbUser)
  } catch (error) {
    console.error('Failed to fetch user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user } = await getAuthenticatedUser(req)
    if (!user || !isAllowedUserMgmt(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    console.log('=== UPDATE USER REQUEST ===')
    console.log('User ID:', id)
    console.log('Request body:', JSON.stringify(body, null, 2))
    
    const data = userUpdateSchema.parse(body)
    console.log('Parsed data:', JSON.stringify(data, null, 2))
    console.log('departmentIds:', data.departmentIds)

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        departmentId: true,
        divisionId: true,
        managerId: true,
        isApproved: true,
      },
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (data.email) updateData.email = data.email
    if (data.name) updateData.name = data.name
    if (data.role) updateData.role = data.role
    if (data.position !== undefined) updateData.position = data.position
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId
    if (data.divisionId !== undefined) updateData.divisionId = data.divisionId
    if (data.profilePicture !== undefined) updateData.profilePicture = data.profilePicture
    if (data.supervisorId !== undefined) updateData.supervisorId = data.supervisorId
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10)
    }

    // Handle multiple departments
    if (data.departmentIds !== undefined) {
      console.log('Processing departmentIds:', data.departmentIds)
      
      // Delete existing department associations
      const deleted = await prisma.userDepartment.deleteMany({
        where: { userId: id }
      })
      console.log('Deleted', deleted.count, 'existing department associations')
      
      // Create new department associations
      if (data.departmentIds.length > 0) {
        console.log('Creating', data.departmentIds.length, 'new department associations')
        updateData.userDepartments = {
          create: data.departmentIds.map(deptId => ({
            departmentId: deptId
          }))
        }
      } else {
        console.log('No departments to create (array is empty)')
      }
    } else {
      console.log('departmentIds is undefined - not updating departments')
    }

    console.log('Final update data:', JSON.stringify(updateData, null, 2))

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        departmentId: true,
        department: true,
        userDepartments: {
          select: {
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        divisionId: true,
        division: {
          include: {
            department: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Try to create audit log, but don't fail the request if it errors
    try {
      await createAuditLog({
        userId: user.id,
        resourceType: 'User',
        resourceId: updatedUser.id,
        action: 'UPDATE',
        details: { before: { ...existingUser, password: '[REDACTED]' }, after: { ...updatedUser, password: '[REDACTED]' } },
      })
    } catch (auditError) {
      console.error('Failed to create audit log (non-fatal):', auditError)
    }

    // If department or division changed, auto-assign performance agreements
    const deptChanged = data.departmentId !== undefined && existingUser.departmentId !== data.departmentId
    const divChanged = data.divisionId !== undefined && existingUser.divisionId !== data.divisionId
    
    if ((deptChanged || divChanged) && existingUser.isApproved) {
      try {
        console.log(`Department/Division changed for user ${updatedUser.email}, re-assigning performance agreements`)
        const assignmentResult = await assignPerformanceAgreementsToUser(updatedUser.id)
        console.log(`✅ Assigned ${assignmentResult.created} new agreements, skipped ${assignmentResult.skipped}`)
        
        if (assignmentResult.errors.length > 0) {
          console.warn('Assignment errors:', assignmentResult.errors)
        }
      } catch (error) {
        // Don't fail the update if assignment fails
        console.error('Failed to auto-assign performance agreements:', error)
      }
    }

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Failed to update user:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user } = await getAuthenticatedUser(req)
    if (!user || !isAllowedUserMgmt(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: { select: { role: { select: { name: true } } } },
      },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Delete related records first to avoid FK constraint errors
    await prisma.$transaction(async (tx) => {
      // Null out supervisor references (users who report to this user)
      await tx.user.updateMany({ where: { managerId: id }, data: { managerId: null } }).catch(() => {})
      // Null out Rating360 supervisorId references (no cascade defined)
      await (tx as any).rating360.updateMany({ where: { supervisorId: id }, data: { supervisorId: null } }).catch(() => {})
      // Null out performance agreement supervisorId references
      await tx.performanceAgreement.updateMany({ where: { supervisorId: id }, data: { supervisorId: null } }).catch(() => {})
      // Remove department memberships
      await (tx as any).userDepartment.deleteMany({ where: { userId: id } }).catch(() => {})
      // Remove role assignments
      await tx.userRole.deleteMany({ where: { userId: id } })
      // Remove notifications (sender and receiver)
      await tx.pmsNotification.deleteMany({ where: { OR: [{ senderId: id }, { receiverId: id }] } }).catch(() => {})
      // Remove performance agreements (as employee)
      await tx.performanceAgreement.deleteMany({ where: { userId: id } }).catch(() => {})
      // Remove performance reviews (as reviewer or reviewee)
      await tx.performanceReview.deleteMany({ where: { OR: [{ userId: id }, { reviewerId: id }] } }).catch(() => {})
      // Remove 360 rating records where this user is the ratee (cascades PeerRating360/SubordinateRating360)
      await (tx as any).rating360.deleteMany({ where: { userId: id } }).catch(() => {})
      // Remove peer/subordinate ratings where this user was the rater
      await (tx as any).peerRating360.deleteMany({ where: { raterId: id } }).catch(() => {})
      await (tx as any).subordinateRating360.deleteMany({ where: { raterId: id } }).catch(() => {})
      // Null out Rating360Cycle.createdById
      await (tx as any).rating360Cycle.updateMany({ where: { createdById: id }, data: { createdById: null } }).catch(() => {})
      // Null out Rating360Question.createdById
      await (tx as any).rating360Question.updateMany({ where: { createdById: id }, data: { createdById: null } }).catch(() => {})
      // Remove adhoc tasks created by or assigned to user
      await tx.adhocTask.deleteMany({ where: { OR: [{ assignedToId: id }, { createdById: id }] } }).catch(() => {})
      // Remove targets the user is responsible for
      await tx.target.deleteMany({ where: { responsibleId: id } }).catch(() => {})
      // Remove user task weights
      await tx.userTaskWeight.deleteMany({ where: { userId: id } }).catch(() => {})
      // Remove workflow assignments
      await tx.workflowAssignment.deleteMany({ where: { assignedTo: id } }).catch(() => {})
      // Remove workflow actions performed by this user
      await tx.workflowAction.deleteMany({ where: { performedBy: id } }).catch(() => {})
      // Remove project team memberships
      await tx.projectTeamMember.deleteMany({ where: { userId: id } }).catch(() => {})
      // Reassign project ownership to null (best-effort, skipped if not nullable)
      await (tx as any).project.updateMany({ where: { ownerId: id }, data: { ownerId: null } }).catch(() => {})
      // Remove the user
      await tx.user.delete({ where: { id } })
    }, { timeout: 30000 })

    // Try to create audit log, but don't fail the request if it errors
    try {
      await createAuditLog({
        userId: user.id,
        resourceType: 'User',
        resourceId: id,
        action: 'DELETE',
        details: { deletedUser: { ...dbUser, password: '[REDACTED]' } },
      })
    } catch (auditError) {
      console.error('Failed to create audit log (non-fatal):', auditError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
