import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanup() {
  try {
    console.log('🧹 Starting cleanup of performance data...')
    
    // Delete in reverse order of dependencies
    console.log('Deleting Performance Agreements...')
    const agreements = await prisma.performanceAgreement.deleteMany({
      where: {
        isSystemGenerated: true
      }
    })
    console.log(`✅ Deleted ${agreements.count} performance agreements`)
    
    console.log('Deleting Initiatives...')
    const initiatives = await prisma.initiative.deleteMany({})
    console.log(`✅ Deleted ${initiatives.count} initiatives`)
    
    console.log('Deleting Objectives...')
    const objectives = await prisma.objective.deleteMany({})
    console.log(`✅ Deleted ${objectives.count} objectives`)
    
    console.log('Deleting Goals...')
    const goals = await prisma.goal.deleteMany({})
    console.log(`✅ Deleted ${goals.count} goals`)
    
    console.log('✨ Cleanup complete! You can now re-import the CSV.')
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanup()
