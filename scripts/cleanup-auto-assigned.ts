import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Starting cleanup of auto-assigned performance agreements...')
  console.log('Note: Workplan structure (Goals, Objectives, Initiatives) will be preserved.\n')

  // Preview what will be deleted
  const count = await prisma.performanceAgreement.count({
    where: {
      isSystemGenerated: true,
      isAdhocContainer: false
    }
  })

  console.log(`Found ${count} auto-assigned performance agreements to delete.\n`)

  if (count > 0) {
    // Get sample of affected agreements
    const samples = await prisma.performanceAgreement.findMany({
      where: {
        isSystemGenerated: true,
        isAdhocContainer: false
      },
      take: 5,
      select: {
        id: true,
        title: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    console.log('Sample agreements to be deleted:')
    samples.forEach(s => {
      const userName = s.user ? `${s.user.firstName} ${s.user.lastName}` : 'Unknown'
      console.log(`  - "${s.title}" assigned to ${userName}`)
    })
    console.log('')

    // Delete the agreements
    const deleted = await prisma.performanceAgreement.deleteMany({
      where: {
        isSystemGenerated: true,
        isAdhocContainer: false
      }
    })

    console.log(`✅ Deleted ${deleted.count} auto-assigned performance agreements`)
  } else {
    console.log('No auto-assigned agreements found to delete.')
  }

  console.log('\n✨ Cleanup complete! Users will now only see their own agreements.')
}

main()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
