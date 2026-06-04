import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { user } = await getAuthenticatedUser(req)
    
    if (!user?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Executive: Human Capital can delete questions
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        department: true
      }
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isHCExecutive = dbUser.role === 'EXECUTIVE' && 
                          dbUser.department?.name?.toLowerCase().includes('human capital')
    
    const isSGorAdmin = dbUser.role === 'SG' || dbUser.role === 'ADMIN'

    if (!isHCExecutive && !isSGorAdmin) {
      return NextResponse.json({ 
        error: 'Only Executive: Human Capital can delete assessment questions' 
      }, { status: 403 })
    }

    const questionId = params.id

    // Soft delete (mark as inactive)
    await prisma.rating360Question.update({
      where: { id: questionId },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true, message: 'Question deleted successfully' })
  } catch (error) {
    console.error('Error deleting question:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { user } = await getAuthenticatedUser(req)
    
    if (!user?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Executive: Human Capital can update questions
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        department: true
      }
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isHCExecutive = dbUser.role === 'EXECUTIVE' && 
                          dbUser.department?.name?.toLowerCase().includes('human capital')
    
    const isSGorAdmin = dbUser.role === 'SG' || dbUser.role === 'ADMIN'

    if (!isHCExecutive && !isSGorAdmin) {
      return NextResponse.json({ 
        error: 'Only Executive: Human Capital can update assessment questions' 
      }, { status: 403 })
    }

    const questionId = params.id
    const body = await req.json()
    const { question, category, order } = body

    // Update question
    const updated = await prisma.rating360Question.update({
      where: { id: questionId },
      data: {
        ...(question && { question }),
        ...(category && { category }),
        ...(order !== undefined && { order })
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

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating question:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
