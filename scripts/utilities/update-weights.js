const { PrismaClient } = require('./packages/database/node_modules/@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Updating active performance period weights...')
  
  const result = await prisma.performancePeriod.updateMany({
    where: { isActive: true },
    data: {
      adhocWeight: 0,
      projectsWeight: 0,
      riskManagementWeight: 0,
    }
  })
  
  console.log(`Updated ${result.count} performance period(s)`)
  
  const activePeriod = await prisma.performancePeriod.findFirst({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      adhocWeight: true,
      projectsWeight: true,
      riskManagementWeight: true,
      rating360Weight: true,
    }
  })
  
  console.log('Current active period:', activePeriod)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
