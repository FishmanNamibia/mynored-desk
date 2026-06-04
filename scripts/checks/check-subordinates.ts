import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find Salmon Uulenga
  const user = await prisma.user.findFirst({
    where: { email: 'SUulenga@nsa.org.na' },
    select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true }
  })
  
  console.log('=== User ===')
  console.log(JSON.stringify(user, null, 2))
  
  if (!user) {
    console.log('User not found!')
    return
  }

  // Check subordinates via managerId
  const subordinatesViaManager = await prisma.user.findMany({
    where: { managerId: user.id, status: 'ACTIVE' },
    select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true }
  })
  
  console.log('\n=== Subordinates via managerId ===')
  console.log(`Count: ${subordinatesViaManager.length}`)
  console.log(JSON.stringify(subordinatesViaManager, null, 2))

  // Check agreements where this user is supervisor
  const agreementsAsSupervisor = await prisma.performanceAgreement.findMany({
    where: { supervisorId: user.id, isAdhocContainer: false },
    select: { id: true, userId: true, title: true },
    take: 10
  })
  
  console.log('\n=== Agreements where user is supervisorId ===')
  console.log(`Count: ${agreementsAsSupervisor.length}`)
  console.log(JSON.stringify(agreementsAsSupervisor, null, 2))

  // Check who reports to this user (via manager field)
  const usersWithThisManager = await prisma.user.findMany({
    where: { 
      manager: { email: 'SUulenga@nsa.org.na' },
      status: 'ACTIVE'
    },
    select: { id: true, firstName: true, lastName: true, email: true }
  })
  
  console.log('\n=== Users with this manager (via relation) ===')
  console.log(`Count: ${usersWithThisManager.length}`)
  console.log(JSON.stringify(usersWithThisManager, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
