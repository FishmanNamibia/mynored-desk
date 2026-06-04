import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser(req)
    const user = authResult.user
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const { id } = params
    const body = await req.json()

    console.log('=== Updating Performance Agreement Draft ===')
    console.log('Agreement ID:', id)
    console.log('Draft update data:', body)

    // Verify the agreement belongs to the user
    const agreement = await prisma.performanceAgreement.findUnique({
      where: { id },
      select: {
        userId: true
      }
    })

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })
    }

    if (agreement.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to update this agreement' }, { status: 403 })
    }

    // Update the agreement with draft data
    const updatedAgreement = await prisma.performanceAgreement.update({
      where: { id },
      data: {
        ...body,
        updatedAt: new Date()
      }
    })

    console.log('✅ Agreement draft updated successfully')

    return NextResponse.json(updatedAgreement)

  } catch (error: any) {
    console.error('❌ Error updating performance agreement draft:', error)
    console.error('Error name:', error?.name)
    console.error('Error message:', error?.message)
    console.error('Error code:', error?.code)
    return NextResponse.json(
      { 
        error: error?.message || 'Unknown error occurred',
        code: error?.code,
        name: error?.name
      },
      { status: 500 }
    )
  }
}
