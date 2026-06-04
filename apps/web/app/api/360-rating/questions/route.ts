import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let questions: any[] = []
    try {
      questions = await prisma.rating360Question.findMany({
        where: { isActive: true },
        orderBy: [{ category: 'asc' }, { order: 'asc' }]
      })
    } catch (e: any) {
      console.error('[360 questions GET] Error querying questions:', e.message)
      return NextResponse.json([])
    }

    return NextResponse.json(questions)
  } catch (error: any) {
    console.error('[360 questions GET] Error:', error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { question, category, applicableTo } = body

    if (!question || !category || !applicableTo) {
      return NextResponse.json({ error: 'Question, category and applicableTo are required' }, { status: 400 })
    }

    // Get the next order number for this category
    const lastQuestion = await prisma.rating360Question.findFirst({
      where: { category },
      orderBy: { order: 'desc' }
    })

    const newQuestion = await prisma.rating360Question.create({
      data: {
        question,
        category,
        applicableTo,
        order: (lastQuestion?.order || 0) + 1,
        createdById: user.id
      }
    })

    return NextResponse.json(newQuestion, { status: 201 })
  } catch (error: any) {
    console.error('[360 questions POST] Error:', error.message)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
