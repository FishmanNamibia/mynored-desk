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

    // Resolve ALL DB user IDs for this email (handles merged/duplicate accounts).
    // Use the same orderBy as the import API (createdAt asc) so both operations
    // consistently target the same primary userId.
    const allDbRecords = user.email
      ? await prisma.user.findMany({
          where: { email: { equals: user.email, mode: 'insensitive' } },
          select: { id: true },
          orderBy: { createdAt: 'asc' }
        })
      : []

    // Collect all IDs (session ID + all DB IDs) without duplicates
    const userIdsToDelete = Array.from(new Set([
      user.id,
      ...allDbRecords.map((u: { id: string }) => u.id)
    ]))

    // Delete in a single query scoped strictly to this user's IDs
    const result = await prisma.performanceAgreement.deleteMany({
      where: { userId: { in: userIdsToDelete } }
    })
    const totalDeleted = result.count

    console.log(`🗑️ Deleted ${totalDeleted} performance agreements for ${user.email} (IDs: ${userIdsToDelete.join(', ')})`)

    return NextResponse.json({
      success: true,
      deletedCount: totalDeleted,
      message: `Deleted ${totalDeleted} performance agreements`
    })

  } catch (error: any) {
    console.error('Error deleting performance agreements:', error)
    return NextResponse.json(
      { error: 'Failed to delete performance agreements', details: error.message },
      { status: 500 }
    )
  }
}
