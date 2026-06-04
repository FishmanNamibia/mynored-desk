import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

// POST - Seed the default 360-degree feedback questionnaire (run once)
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if default questionnaire already exists
    const existing = await prisma.questionnaireTemplate.findFirst({
      where: { isDefault: true }
    })

    if (existing) {
      return NextResponse.json({ 
        message: 'Default questionnaire already exists',
        templateId: existing.id 
      })
    }

    // Create the default questionnaire template
    const template = await prisma.questionnaireTemplate.create({
      data: {
        name: '360-Degree Feedback Questionnaire',
        description: 'Comprehensive performance feedback based on NSA institutional values',
        instructions: `Please answer honestly and constructively.
For each statement below, select a rating (1–5) and — if possible — provide an example or comment to support your rating.
At the end there are open questions for additional feedback.`,
        ratingScaleDesc: `1 = Strongly disagree / Very poor / Never
2 = Disagree / Poor / Rarely
3 = Neutral / Acceptable / Sometimes
4 = Agree / Good / Often
5 = Strongly agree / Excellent / Always`,
        isActive: true,
        isDefault: true,
        createdBy: user.id,
      }
    })

    // ========================================
    // Section 1: Core Values & Behaviour
    // ========================================
    const section1 = await prisma.questionnaireSection.create({
      data: {
        templateId: template.id,
        title: 'Core Values & Behaviour',
        description: 'Assessment based on institutional values',
        order: 1,
      }
    })

    // 1.1 Integrity & Transparency
    const sub1_1 = await prisma.questionnaireSubsection.create({
      data: {
        sectionId: section1.id,
        title: 'Integrity & Transparency',
        institutionalValue: 'Integrity',
        order: 1,
      }
    })
    await prisma.questionnaireQuestion.createMany({
      data: [
        { subsectionId: sub1_1.id, statement: 'This person makes decisions based on ethical and professional principles, even under pressure.', order: 1, requiresComment: false },
        { subsectionId: sub1_1.id, statement: 'This person handles confidential or sensitive information appropriately.', order: 2, requiresComment: false },
        { subsectionId: sub1_1.id, statement: 'This person is honest and transparent in communication (with colleagues, stakeholders, customers).', order: 3, requiresComment: false },
        { subsectionId: sub1_1.id, statement: 'This person acts with fairness and integrity towards all, regardless of seniority or status.', order: 4, requiresComment: false },
      ]
    })

    // 1.2 Excellence / Quality of Work / Performance
    const sub1_2 = await prisma.questionnaireSubsection.create({
      data: {
        sectionId: section1.id,
        title: 'Excellence / Quality of Work / Performance',
        institutionalValue: 'Excellent Performance',
        order: 2,
      }
    })
    await prisma.questionnaireQuestion.createMany({
      data: [
        { subsectionId: sub1_2.id, statement: 'The work produced by this person meets standards of relevance, accuracy, completeness and consistency.', order: 1, requiresComment: false },
        { subsectionId: sub1_2.id, statement: 'This person delivers work on time and meets deadlines.', order: 2, requiresComment: false },
        { subsectionId: sub1_2.id, statement: 'This person pays attention to detail and minimizes errors.', order: 3, requiresComment: false },
        { subsectionId: sub1_2.id, statement: 'This person demonstrates continuous improvement and strives for high quality.', order: 4, requiresComment: false },
      ]
    })

    // 1.3 Professionalism
    const sub1_3 = await prisma.questionnaireSubsection.create({
      data: {
        sectionId: section1.id,
        title: 'Professionalism',
        institutionalValue: 'Professionalism',
        order: 3,
      }
    })
    await prisma.questionnaireQuestion.createMany({
      data: [
        { subsectionId: sub1_3.id, statement: 'This person behaves respectfully and appropriately in all professional engagements.', order: 1, requiresComment: false },
        { subsectionId: sub1_3.id, statement: 'This person communicates clearly, professionally and constructively.', order: 2, requiresComment: false },
        { subsectionId: sub1_3.id, statement: 'This person is reliable, punctual, and fulfills commitments.', order: 3, requiresComment: false },
      ]
    })

    // 1.4 Accountability
    const sub1_4 = await prisma.questionnaireSubsection.create({
      data: {
        sectionId: section1.id,
        title: 'Accountability',
        institutionalValue: 'Accountability',
        order: 4,
      }
    })
    await prisma.questionnaireQuestion.createMany({
      data: [
        { subsectionId: sub1_4.id, statement: 'This person takes ownership of their tasks, roles and responsibilities.', order: 1, requiresComment: false },
        { subsectionId: sub1_4.id, statement: 'This person accepts responsibility for their decisions and outcomes.', order: 2, requiresComment: false },
        { subsectionId: sub1_4.id, statement: 'When entrusted with resources or sensitive information, this person handles them responsibly and transparently.', order: 3, requiresComment: false },
      ]
    })

    // 1.5 Partnerships & Collaboration
    const sub1_5 = await prisma.questionnaireSubsection.create({
      data: {
        sectionId: section1.id,
        title: 'Partnerships & Collaboration',
        institutionalValue: 'Partnership',
        order: 5,
      }
    })
    await prisma.questionnaireQuestion.createMany({
      data: [
        { subsectionId: sub1_5.id, statement: 'This person builds respectful and trust-based relationships with colleagues, partners, and stakeholders.', order: 1, requiresComment: false },
        { subsectionId: sub1_5.id, statement: 'This person collaborates effectively, supports teamwork and contributes positively to group goals.', order: 2, requiresComment: false },
        { subsectionId: sub1_5.id, statement: "This person anticipates stakeholders' or partners' needs and responds proactively.", order: 3, requiresComment: false },
      ]
    })

    // 1.6 Customer-Focus & Service Orientation
    const sub1_6 = await prisma.questionnaireSubsection.create({
      data: {
        sectionId: section1.id,
        title: 'Customer-Focus & Service Orientation',
        institutionalValue: 'Customer-Focussed',
        order: 6,
      }
    })
    await prisma.questionnaireQuestion.createMany({
      data: [
        { subsectionId: sub1_6.id, statement: "This person prioritises customers' (or stakeholders') needs when making decisions or delivering services.", order: 1, requiresComment: false },
        { subsectionId: sub1_6.id, statement: 'This person interacts with customers/stakeholders with empathy, respect, clarity, and professionalism.', order: 2, requiresComment: false },
        { subsectionId: sub1_6.id, statement: 'This person is responsive and timely in meeting customer/stakeholder requests or expectations.', order: 3, requiresComment: false },
      ]
    })

    // ========================================
    // Section 2: Overall Performance & Competencies
    // ========================================
    const section2 = await prisma.questionnaireSection.create({
      data: {
        templateId: template.id,
        title: 'Overall Performance & Competencies',
        description: 'General performance assessment',
        order: 2,
      }
    })

    const sub2_1 = await prisma.questionnaireSubsection.create({
      data: {
        sectionId: section2.id,
        title: 'Performance & Competencies',
        order: 1,
      }
    })
    await prisma.questionnaireQuestion.createMany({
      data: [
        { subsectionId: sub2_1.id, statement: 'This person is effective in problem-solving and making sound decisions.', order: 1, requiresComment: false },
        { subsectionId: sub2_1.id, statement: 'This person demonstrates good time-management and handles workload efficiently.', order: 2, requiresComment: false },
        { subsectionId: sub2_1.id, statement: 'This person shows initiative — identifies opportunities or issues and acts proactively.', order: 3, requiresComment: false },
        { subsectionId: sub2_1.id, statement: 'This person adapts positively to changes and handles stress or unexpected challenges well.', order: 4, requiresComment: false },
      ]
    })

    // ========================================
    // Section 3: Open-Ended Feedback
    // ========================================
    const section3 = await prisma.questionnaireSection.create({
      data: {
        templateId: template.id,
        title: 'Open-Ended Feedback',
        description: 'Qualitative feedback and suggestions',
        order: 3,
      }
    })

    await prisma.questionnaireOpenEnded.createMany({
      data: [
        { sectionId: section3.id, question: "What are this person's greatest strengths (behaviour, attitude, skills)?", order: 1, isRequired: false },
        { sectionId: section3.id, question: 'Provide at least one example where this person demonstrated one of our core values (Integrity, Excellence, Professionalism, Accountability, Partnership, Customer-focus).', order: 2, isRequired: false },
        { sectionId: section3.id, question: 'In what area(s) could this person improve (behaviour, competencies, attitude, collaboration)?', order: 3, isRequired: false },
        { sectionId: section3.id, question: 'What should this person start doing (that they currently do not)?', order: 4, isRequired: false },
        { sectionId: section3.id, question: 'What should this person stop doing (that undermines performance or values)?', order: 5, isRequired: false },
        { sectionId: section3.id, question: 'What should this person continue doing (because it adds value)?', order: 6, isRequired: false },
        { sectionId: section3.id, question: 'Any additional comments or suggestions (e.g. training needs, support, feedback for management):', order: 7, isRequired: false },
      ]
    })

    // Also seed the Rating360Category entries for the competencies
    const competencyCategories = [
      { name: 'Integrity', description: 'Integrity & Transparency' },
      { name: 'Excellent Performance', description: 'Excellence / Quality of Work / Performance' },
      { name: 'Professionalism', description: 'Professional conduct and communication' },
      { name: 'Accountability', description: 'Ownership and responsibility' },
      { name: 'Partnership', description: 'Partnerships & Collaboration' },
      { name: 'Customer-Focussed', description: 'Customer-Focus & Service Orientation' },
    ]

    for (const cat of competencyCategories) {
      await prisma.rating360Category.upsert({
        where: { name: cat.name },
        update: {},
        create: {
          name: cat.name,
          description: cat.description,
          isActive: true,
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Default 360-degree feedback questionnaire seeded successfully',
      templateId: template.id,
      stats: {
        sections: 3,
        subsections: 7,
        questions: 24,
        openEndedQuestions: 7,
        competencyCategories: competencyCategories.length,
      }
    })

  } catch (error: any) {
    console.error('[seed-questionnaire] Error:', error.message, error.stack)
    return NextResponse.json(
      { error: 'Failed to seed questionnaire', details: error.message },
      { status: 500 }
    )
  }
}
