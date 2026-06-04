import { NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Executive: Human Capital can view questions (for management)
    const dbUser = await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      select: { id: true, jobTitle: true, departmentName: true }
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // All authenticated users can read questions (needed for self-assessment and rating)

    // Get all active questions
    const questions = await prisma.rating360Question.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { order: 'asc' }
      ],
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    return NextResponse.json(questions)
  } catch (error) {
    console.error('Error fetching questions:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Executive: Human Capital can create questions
    // Check if user is EXECUTIVE role with Human Capital department
    const dbUser = await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      select: { id: true, jobTitle: true, departmentName: true }
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userRoles = user.roles || []
    const jobTitle = (dbUser.jobTitle || user.jobTitle || '').toUpperCase()
    const deptName = (dbUser.departmentName || user.department || '').toLowerCase()
    const isHCExecutive = (jobTitle.includes('EXECUTIVE') || userRoles.includes('EXECUTIVE') || userRoles.includes('HUMAN_CAPITAL_EXECUTIVE')) &&
                          (deptName.includes('human capital') || deptName.includes('hc'))
    const isSGorAdmin = userRoles.some((r: string) => ['SG', 'DEPUTY_SG', 'ADMIN'].includes(r)) ||
                        jobTitle.includes('STATISTICIAN GENERAL')
    const canManage = isHCExecutive || isSGorAdmin ||
                      userRoles.some((r: string) => ['EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE', 'ADMIN'].includes(r)) ||
                      jobTitle.includes('EXECUTIVE')

    if (!canManage) {
      return NextResponse.json({ 
        error: 'Only Executive: Human Capital can create assessment questions' 
      }, { status: 403 })
    }

    const body = await req.json()
    const { question, category, applicableTo, order } = body

    // Validate required fields
    if (!question || !category || !applicableTo) {
      return NextResponse.json({ 
        error: 'Question, category, and applicable to are required' 
      }, { status: 400 })
    }

    // Validate applicableTo values
    const validApplicableTo = ['self', 'peer', 'supervisor', 'dept_random', 'org_random', 'subordinate', 'external']
    if (!validApplicableTo.includes(applicableTo)) {
      return NextResponse.json({ 
        error: 'Applicable to must be one of: self, peer, supervisor, dept_random, org_random, subordinate, external' 
      }, { status: 400 })
    }

    // Create new question
    const newQuestion = await prisma.rating360Question.create({
      data: {
        question,
        category,
        applicableTo,
        order: order || 0,
        isActive: true,
        createdById: user.id
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    return NextResponse.json(newQuestion, { status: 201 })
  } catch (error) {
    console.error('Error creating question:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
