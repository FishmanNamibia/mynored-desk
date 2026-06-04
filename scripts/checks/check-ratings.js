const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const ratedAgreements = await prisma.performanceAgreement.findMany({
    where: {
      approvalStatus: 'APPROVED',
      rating: { not: null, gt: 0 }
    },
    select: {
      id: true,
      title: true,
      weight: true,
      rating: true,
      userId: true,
      user: { select: { name: true } }
    },
    take: 20
  })
  
  console.log('Rated Agreements:')
  console.log(JSON.stringify(ratedAgreements, null, 2))
  
  // Calculate weighted average for each user
  const userMap = new Map()
  for (const a of ratedAgreements) {
    if (!userMap.has(a.userId)) {
      userMap.set(a.userId, { name: a.user?.name, agreements: [] })
    }
    userMap.get(a.userId).agreements.push({ title: a.title, weight: a.weight, rating: a.rating })
  }
  
  console.log('\nPer-User Calculations:')
  for (const [userId, data] of userMap) {
    const totalWeight = data.agreements.reduce((sum, a) => sum + (a.weight || 0), 0)
    const ratingSum = data.agreements.reduce((sum, a) => sum + ((a.rating || 0) * (a.weight || 0)), 0)
    const weightedAvg = totalWeight > 0 ? ratingSum / totalWeight : 0
    const percentage = (weightedAvg / 5) * 100
    console.log(`${data.name}: ${data.agreements.length} rated, weighted avg = ${weightedAvg.toFixed(2)}/5 = ${percentage.toFixed(1)}%`)
  }
}

main().finally(() => prisma.$disconnect())
