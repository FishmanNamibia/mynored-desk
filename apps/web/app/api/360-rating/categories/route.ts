import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let categories: any[] = []
    try {
      categories = await prisma.rating360Category.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      })
    } catch (e: any) {
      console.error('[360 categories GET] Error querying categories:', e.message)
      return NextResponse.json([])
    }

    return NextResponse.json(categories)
  } catch (error: any) {
    console.error('[360 categories GET] Error:', error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    // Check if any questions use this category
    const category = await prisma.rating360Category.findUnique({ where: { id } })
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const questionsUsingCategory = await prisma.rating360Question.count({
      where: { category: category.name }
    })

    if (questionsUsingCategory > 0) {
      return NextResponse.json({
        error: `Cannot delete: ${questionsUsingCategory} question(s) still use this category. Delete those questions first.`
      }, { status: 400 })
    }

    await prisma.rating360Category.delete({ where: { id } })

    return NextResponse.json({ success: true, message: `Category "${category.name}" deleted` })
  } catch (error: any) {
    console.error('[360 categories DELETE] Error:', error.message)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    const category = await prisma.rating360Category.create({
      data: {
        name,
        description: description || null,
        isActive: true
      }
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error: any) {
    console.error('[360 categories POST] Error:', error.message)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
