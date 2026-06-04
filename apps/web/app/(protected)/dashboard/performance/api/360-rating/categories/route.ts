import { NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


// GET all categories
export async function GET(req: Request) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const categories = await prisma.rating360Category.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST create new category
export async function POST(req: Request) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Executive: Human Capital can create categories
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
        error: 'Only Executive: Human Capital can create categories' 
      }, { status: 403 })
    }

    const body = await req.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json({ 
        error: 'Category name is required' 
      }, { status: 400 })
    }

    // Check if category already exists
    const existing = await prisma.rating360Category.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive'
        }
      }
    })

    if (existing) {
      return NextResponse.json({ 
        error: 'Category already exists' 
      }, { status: 400 })
    }

    const category = await prisma.rating360Category.create({
      data: {
        name,
        description: description || null,
        isActive: true
      }
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE category
export async function DELETE(req: Request) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Executive: Human Capital can delete categories
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
        error: 'Only Executive: Human Capital can delete categories' 
      }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('id')

    if (!categoryId) {
      return NextResponse.json({ 
        error: 'Category ID is required' 
      }, { status: 400 })
    }

    // Soft delete by setting isActive to false
    await prisma.rating360Category.update({
      where: { id: categoryId },
      data: { isActive: false }
    })

    return NextResponse.json({ message: 'Category deleted successfully' })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
