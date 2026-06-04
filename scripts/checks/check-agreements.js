const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAgreements() {
  try {
    // Get the user by email
    const user = await prisma.user.findFirst({
      where: { email: 'AFanuel@nsa.org.na' },
      select: { id: true, email: true, firstName: true, lastName: true }
    });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('User:', JSON.stringify(user));
    
    // Count all performance agreements
    const allCount = await prisma.performanceAgreement.count({
      where: { userId: user.id }
    });
    
    // Count non-container agreements
    const nonContainerCount = await prisma.performanceAgreement.count({
      where: { userId: user.id, isAdhocContainer: false }
    });
    
    // Count container agreements
    const containerCount = await prisma.performanceAgreement.count({
      where: { userId: user.id, isAdhocContainer: true }
    });
    
    console.log('Total agreements:', allCount);
    console.log('Non-container (actual) agreements:', nonContainerCount);
    console.log('Container agreements:', containerCount);
    
    // Get all non-container agreements
    const agreements = await prisma.performanceAgreement.findMany({
      where: { userId: user.id, isAdhocContainer: false },
      select: { id: true, title: true, customAction: true, createdAt: true, performancePeriodId: true },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log('\nAll non-container agreements:');
    agreements.forEach((a, i) => {
      console.log(`${i + 1}. ${a.title} | Action: ${(a.customAction || '').substring(0, 40)}... | Created: ${a.createdAt}`);
    });
    
    // Check performance periods
    const periods = await prisma.performancePeriod.findMany({
      select: { id: true, name: true, isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\nPerformance periods:', JSON.stringify(periods, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAgreements();
