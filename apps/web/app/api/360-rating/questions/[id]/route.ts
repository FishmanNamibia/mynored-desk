import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    await prisma.rating360Question.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Question deleted' })
  } catch (error: any) {
    console.error('[360 questions DELETE] Error:', error.message)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
