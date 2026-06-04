import "dotenv/config"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Starting cleanup of auto-assigned performance agreements...')

  const count = await prisma.performanceAgreement.count({
    where: {
      isSystemGenerated: true,
      isAdhocContainer: false
    }
  })

  console.log(`Found ${count} auto-assigned performance agreements to delete.`)

  if (count > 0) {
    const deleted = await prisma.performanceAgreement.deleteMany({
      where: {
        isSystemGenerated: true,
        isAdhocContainer: false
      }
    })
    console.log(`✅ Deleted ${deleted.count} auto-assigned agreements`)
  } else {
    console.log('No auto-assigned agreements found.')
  }

  console.log('✨ Cleanup complete!')
}

main()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
