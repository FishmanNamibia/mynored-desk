import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/server-auth'


const logSchema = z.object({
  question: z.string().min(1),
  answer: z.string().optional(),
  category: z.string().optional(),
  wasHelpful: z.boolean().optional(),
  responseTime: z.number().optional(),
  sessionId: z.string().optional(),
  metadata: z.any().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = logSchema.parse(body)

    const log = await prisma.helpAssistantLog.create({
      data: {
        userId: user.id,
        question: data.question,
        answer: data.answer,
        category: data.category,
        wasHelpful: data.wasHelpful,
        responseTime: data.responseTime,
        sessionId: data.sessionId,
        metadata: data.metadata || {
          role: user.role,
          timestamp: new Date().toISOString(),
        },
      },
    })

    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Failed to log help assistant interaction:', error)
    return NextResponse.json(
      { error: 'Failed to log interaction' },
      { status: 500 }
    )
  }
}
