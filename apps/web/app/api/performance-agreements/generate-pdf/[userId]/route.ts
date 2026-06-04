import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { user: sessionUser } = await getAuthenticatedUser(req)
    if (!sessionUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const { userId } = params

    console.log('=== Generating PDF for Performance Agreement ===')
    console.log('Target User ID:', userId)
    console.log('Requesting User ID:', sessionUser.id)

    // Check if the requesting user is authorized to view this user's data
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        managerId: true,
        firstName: true,
        lastName: true,
        email: true
      }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Allow if requesting user is the target user themselves
    const isOwnData = userId === sessionUser.id
    
    // Check if requesting user is the direct manager
    const isDirectManager = targetUser.managerId === sessionUser.id
    
    // Check if requesting user is a supervisor on any of the target's agreements
    const isSupervisorOnAgreement = await prisma.performanceAgreement.findFirst({
      where: {
        userId: userId,
        supervisorId: sessionUser.id
      }
    })
    
    // Check if requesting user is anywhere in the target's management chain (hierarchical)
    let isInManagementChain = false
    if (!isOwnData && !isDirectManager && !isSupervisorOnAgreement) {
      // Walk up the management chain from target user
      let currentManagerId = targetUser.managerId
      const visited = new Set<string>()
      while (currentManagerId && !visited.has(currentManagerId)) {
        if (currentManagerId === sessionUser.id) {
          isInManagementChain = true
          break
        }
        visited.add(currentManagerId)
        const manager = await prisma.user.findUnique({
          where: { id: currentManagerId },
          select: { managerId: true }
        })
        currentManagerId = manager?.managerId || null
      }
    }

    if (!isOwnData && !isDirectManager && !isSupervisorOnAgreement && !isInManagementChain) {
      return NextResponse.json({ error: 'Unauthorized to view this user\'s agreements' }, { status: 403 })
    }

    // This endpoint should generate the PDF server-side using the same logic
    // as the client-side export. For now, return a message that this needs to be implemented
    // with the full PDF generation logic from the my-tasks/performance page
    
    return NextResponse.json({ 
      error: 'PDF generation endpoint needs full implementation. Please use the export API to get data and generate PDF client-side for now.' 
    }, { status: 501 })

  } catch (error: any) {
    console.error('❌ Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF: ' + error.message },
      { status: 500 }
    )
  }
}
