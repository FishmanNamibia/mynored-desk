import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { isExecutive } from '@/lib/pms/role-helpers'

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user from database with full profile
    const dbUser = await prisma.user.findFirst({
      where: { email: user.email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        departmentName: true,
        divisionName: true
      }
    })
    
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Check if user is an executive
    if (!isExecutive({ ...dbUser, roles: [] })) {
      return NextResponse.json({ error: 'Only executives can delegate risk tasks' }, { status: 403 })
    }
    
    // Get request body
    const {
      documentId,
      employeeId,
      title,
      description,
      riskCategory,
      riskDescription,
      cause,
      impact,
      likelihood,
      impactLevel,
      mitigations,
      furtherActions,
      priority,
      dueDate
    } = await req.json()
    
    // Validate request
    if (!documentId || !employeeId || !title || !riskCategory) {
      return NextResponse.json({ 
        error: 'Missing required fields: documentId, employeeId, title, and riskCategory are required' 
      }, { status: 400 })
    }
    
    // Check if document exists
    const document = await prisma.riskDocument.findUnique({
      where: { id: documentId },
      include: { distributedTo: true }
    })
    
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    
    // Check if executive has access to this document
    const hasAccess = document.distributedTo.some(exec => exec.id === dbUser.id) || document.uploadedById === dbUser.id
    if (!hasAccess) {
      return NextResponse.json({ error: 'You do not have access to this document' }, { status: 403 })
    }
    
    // Check if employee is in the same department as the executive
    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
      select: { departmentName: true, id: true, firstName: true, lastName: true, email: true }
    })
    
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }
    
    if (employee.departmentName !== dbUser.departmentName) {
      return NextResponse.json(
        { error: 'You can only delegate tasks to employees in your department' },
        { status: 403 }
      )
    }
    
    // Calculate risk score based on likelihood and impact
    let riskScore: number | null = null
    
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
    
    if (likelihood && impactLevel) {
      const likelihoodScore = likelihoodMap[likelihood] || 2
      const impactScore = impactMap[impactLevel] || 2
      riskScore = likelihoodScore * impactScore
    }
    
    // Create the risk task
    const riskTask = await prisma.riskTask.create({
      data: {
        title,
        description,
        riskCategory,
        riskDescription,
        cause,
        impact,
        likelihood: likelihood || 'POSSIBLE',
        impactLevel: impactLevel || 'MODERATE',
        riskScore,
        mitigations,
        furtherActions,
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : undefined,
        assignedToId: employeeId,
        createdById: dbUser.id,
        documentId
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
            departmentName: true
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
            departmentName: true
          }
        },
        document: {
          select: {
            id: true,
            title: true,
            fileUrl: true
          }
        }
      }
    })
    
    // Create notification for the assigned employee
    await prisma.pmsNotification.create({
      data: {
        type: 'RISK_TASK_ASSIGNED',
        status: 'PENDING',
        senderId: dbUser.id,
        receiverId: employeeId,
        entityType: 'RiskTask',
        entityId: riskTask.id,
        message: `You have been assigned a new risk task: "${title}" by ${dbUser.firstName || ''} ${dbUser.lastName || ''}.`,
        metadata: JSON.stringify({
          taskId: riskTask.id,
          taskTitle: title,
          senderName: `${dbUser.firstName || ''} ${dbUser.lastName || ''}`,
          senderDepartment: dbUser.departmentName || 'N/A',
          priority: priority || 'MEDIUM',
          dueDate: dueDate ? new Date(dueDate).toISOString() : null
        })
      }
    })
    
    return NextResponse.json(riskTask)
  } catch (error) {
    console.error('Error delegating risk task:', error)
    return NextResponse.json({ error: 'Failed to delegate risk task' }, { status: 500 })
  }
}
