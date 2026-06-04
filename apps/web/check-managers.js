const { prisma: p } = require('./lib/pms/prisma');

(async () => {
  try {
    // Count users with managers
    const withManagers = await p.user.count({
      where: { managerId: { not: null }, status: 'ACTIVE' }
    });
    console.log('Users with managers:', withManagers);

    // Find Salmon's ID
    const salmon = await p.user.findFirst({
      where: { email: 'SUulenga@nsa.org.na' },
      select: { id: true, email: true, firstName: true, lastName: true }
    });
    console.log('Salmon:', JSON.stringify(salmon));

    if (salmon) {
      // Find subordinates via managerId
      const subs = await p.user.findMany({
        where: { managerId: salmon.id, status: 'ACTIVE' },
        select: { email: true, firstName: true, lastName: true }
      });
      console.log('Subordinates via managerId:', subs.length);
      console.log(JSON.stringify(subs, null, 2));

      // Find subordinates via manager relation
      const subsViaRelation = await p.user.findMany({
        where: { manager: { email: 'SUulenga@nsa.org.na' }, status: 'ACTIVE' },
        select: { email: true, firstName: true, lastName: true }
      });
      console.log('Subordinates via relation:', subsViaRelation.length);

      // Check agreements where Salmon is supervisor
      const agreements = await p.performanceAgreement.count({
        where: { supervisorId: salmon.id, isAdhocContainer: false }
      });
      console.log('Agreements as supervisor:', agreements);
    }

    // Show sample managers to understand structure
    const managers = await p.user.findMany({
      where: {
        subordinates: { some: {} },
        status: 'ACTIVE'
      },
      select: { email: true, firstName: true, lastName: true, _count: { select: { subordinates: true } } },
      take: 10
    });
    console.log('Sample managers with subordinates:');
    console.log(JSON.stringify(managers, null, 2));

  } finally {
    await p.$disconnect();
  }
})();
