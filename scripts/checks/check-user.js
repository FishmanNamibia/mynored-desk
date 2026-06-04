const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  // Check Salmon Uulenga
  const salmonUsers = await p.user.findMany({
    where: { email: { contains: 'uulenga', mode: 'insensitive' } },
    select: { id: true, email: true, jobTitle: true, departmentName: true, managerId: true }
  });
  console.log('Salmon users:', JSON.stringify(salmonUsers, null, 2));
  for (const u of salmonUsers) {
    const count = await p.performanceAgreement.count({ where: { userId: u.id } });
    const approved = await p.performanceAgreement.count({ where: { userId: u.id, approvalStatus: 'APPROVED' } });
    console.log(u.id, '-> total:', count, 'approved:', approved);
  }

  // Check Henok
  const henokUsers = await p.user.findMany({
    where: { email: { contains: 'himmanuel', mode: 'insensitive' } },
    select: { id: true, email: true, jobTitle: true, departmentName: true }
  });
  console.log('Henok users:', JSON.stringify(henokUsers, null, 2));

  // Check all IT dept users and their manager
  const itUsers = await p.user.findMany({
    where: { departmentName: { contains: 'IT', mode: 'insensitive' } },
    select: { id: true, email: true, firstName: true, lastName: true, departmentName: true, managerId: true }
  });
  console.log('IT dept users:', itUsers.length);
  for (const u of itUsers) {
    const count = await p.performanceAgreement.count({ where: { userId: u.id } });
    const approved = await p.performanceAgreement.count({ where: { userId: u.id, approvalStatus: 'APPROVED' } });
    console.log(`  ${u.firstName} ${u.lastName} (${u.email}) mgr:${u.managerId} agreements:${count} approved:${approved}`);
  }

  await p.$disconnect();
}
main();
