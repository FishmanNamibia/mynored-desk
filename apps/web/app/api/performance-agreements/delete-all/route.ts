import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

// DELETE - Delete all performance agreements for the current user
export async function DELETE(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Count agreements before deletion
    const count = await prisma.performanceAgreement.count({
      where: {
        userId: user.id
      }
    })

    // Delete all agreements for this user
    const result = await prisma.performanceAgreement.deleteMany({
      where: {
        userId: user.id
      }
    })

    console.log(`🗑️ Deleted ${result.count} performance agreements for user ${user.id}`)

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: `Deleted ${result.count} performance agreements`
    })

  } catch (error: any) {
    console.error('Error deleting performance agreements:', error)
    return NextResponse.json(
      { error: 'Failed to delete performance agreements', details: error.message },
      { status: 500 }
    )
  }
}
