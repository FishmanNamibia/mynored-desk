import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'

const NSA_COMPETENCIES = [
  {
    name: 'Integrity',
    description: 'To maintain high ethical standards in everything we do, both in their work and their personal lives',
    questions: [
      { applicableTo: 'self',               text: 'I consistently uphold high ethical standards in both my professional duties and personal conduct.' },
      { applicableTo: 'peer',               text: 'This person consistently upholds high ethical standards in their professional duties and conduct.' },
      { applicableTo: 'supervisor',          text: 'This employee consistently maintains high ethical standards in all work-related activities.' },
      { applicableTo: 'dept_random',         text: 'Rate this colleague\'s consistency in upholding high ethical standards in their daily work and conduct.' },
    ],
  },
  {
    name: 'Excellent Performance',
    description: 'Geared towards promoting high quality work in the production of products and services',
    questions: [
      { applicableTo: 'self',               text: 'I consistently produce high-quality work and strive for excellence in all my outputs.' },
      { applicableTo: 'peer',               text: 'This person consistently produces high-quality work and promotes excellence in their field.' },
      { applicableTo: 'supervisor',          text: 'This employee is geared towards producing high-quality outputs and promoting excellence.' },
      { applicableTo: 'dept_random',         text: 'Rate this colleague\'s commitment to producing high-quality work and promoting excellence.' },
    ],
  },
  {
    name: 'Professionalism',
    description: 'Portraying a high level of professionalism in all engagements and services offered by NSA',
    questions: [
      { applicableTo: 'self',               text: 'I portray a high level of professionalism in all my engagements and service delivery.' },
      { applicableTo: 'peer',               text: 'This person portrays a high level of professionalism in all engagements.' },
      { applicableTo: 'supervisor',          text: 'This employee maintains a high standard of professionalism in all NSA engagements.' },
      { applicableTo: 'dept_random',         text: 'Rate this colleague\'s level of professionalism in all their work engagements.' },
    ],
  },
  {
    name: 'Accountability',
    description: 'Ability to take ownership and hold each other accountable in fulfilling the obligations to account for own actions',
    questions: [
      { applicableTo: 'self',               text: 'I take full ownership of my actions and actively hold myself accountable for fulfilling my obligations.' },
      { applicableTo: 'peer',               text: 'This person takes ownership of their actions and holds themselves accountable for their obligations.' },
      { applicableTo: 'supervisor',          text: 'This employee demonstrates strong accountability by taking ownership of their work outcomes.' },
      { applicableTo: 'dept_random',         text: 'Rate this colleague\'s accountability and ownership of their actions and obligations.' },
    ],
  },
  {
    name: 'Partnership',
    description: 'Ability to forge partnerships that build mutual respect and drive innovation and growth for the Agency and its partners',
    questions: [
      { applicableTo: 'self',               text: 'I actively build partnerships that promote mutual respect, innovation, and growth for NSA.' },
      { applicableTo: 'peer',               text: 'This person effectively builds collaborative partnerships with colleagues that foster mutual respect.' },
      { applicableTo: 'supervisor',          text: 'This employee actively forges partnerships that promote innovation and growth for the Agency.' },
      { applicableTo: 'dept_random',         text: 'Rate this colleague\'s ability to build collaborative partnerships that foster mutual respect within the department.' },
      { applicableTo: 'org_random',           text: 'Based on your interaction with this person, rate their ability to build partnerships that promote mutual respect and growth for NSA and its partners.' },
    ],
  },
  {
    name: 'Customer-focussed',
    description: 'Ability to put customers needs first and foster a company culture dedicated to enhancing customer satisfaction and building strong customer relationships',
    questions: [
      { applicableTo: 'self',               text: 'I consistently prioritize customer needs and contribute to building strong customer relationships.' },
      { applicableTo: 'peer',               text: 'This person consistently puts customer needs first and fosters positive customer relationships.' },
      { applicableTo: 'supervisor',          text: 'This employee demonstrates a strong customer-focused approach in their daily work.' },
      { applicableTo: 'dept_random',         text: 'Rate this colleague\'s commitment to putting customer needs first in their daily work.' },
    ],
  },
]

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const jobTitleLower = (user.jobTitle || '').toLowerCase()
    const isHCExecutive = (jobTitleLower.includes('executive') && jobTitleLower.includes('human capital')) ||
      userHasAnyRole(user, ['ADMIN', 'EXECUTIVE', 'HC_EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE', 'SG', 'DEPUTY_SG'])

    if (!isHCExecutive) {
      return NextResponse.json({ error: 'Only Executive: Human Capital can initialize competencies' }, { status: 403 })
    }

    let categoriesCreated = 0
    let questionsCreated = 0

    for (const comp of NSA_COMPETENCIES) {
      const existing = await prisma.rating360Category.findFirst({
        where: { name: { equals: comp.name, mode: 'insensitive' } }
      })

      if (!existing) {
        await prisma.rating360Category.create({
          data: { name: comp.name, description: comp.description, isActive: true }
        })
        categoriesCreated++
      } else if (!existing.isActive) {
        await prisma.rating360Category.update({
          where: { id: existing.id },
          data: { description: comp.description, isActive: true }
        })
      }

      for (let i = 0; i < comp.questions.length; i++) {
        const q = comp.questions[i]
        const existingQ = await prisma.rating360Question.findFirst({
          where: {
            category: { equals: comp.name, mode: 'insensitive' },
            applicableTo: q.applicableTo,
            isActive: true,
          }
        })
        if (!existingQ) {
          await prisma.rating360Question.create({
            data: {
              question: q.text,
              category: comp.name,
              applicableTo: q.applicableTo,
              order: i,
              isActive: true,
              createdById: user.id,
            }
          })
          questionsCreated++
        }
      }
    }

    return NextResponse.json({
      message: `NSA Behavioural Competencies initialized successfully.`,
      categoriesCreated,
      questionsCreated,
    })
  } catch (error) {
    console.error('Error seeding competencies:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
