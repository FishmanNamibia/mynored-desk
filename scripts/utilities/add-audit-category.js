const { PrismaClient } = require('./packages/database/node_modules/@prisma/client');

const prisma = new PrismaClient();

async function addAuditCategory() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'THC@nsa.org.na' }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    const existing = await prisma.userTaskWeight.findFirst({
      where: { userId: user.id }
    });

    if (existing) {
      const cats = existing.categories;
      if (!cats.some(c => c.id === 'audit')) {
        cats.push({ id: 'audit', name: 'Audit Tasks', weight: 10 });
        await prisma.userTaskWeight.update({
          where: { id: existing.id },
          data: { categories: cats }
        });
        console.log('✅ Added audit category to existing config');
      } else {
        console.log('✅ Audit category already exists');
      }
    } else {
      await prisma.userTaskWeight.create({
        data: {
          userId: user.id,
          categories: [
            { id: 'perf', name: 'Performance Agreement Tasks', weight: 60 },
            { id: 'adhoc', name: 'Ad-Hoc', weight: 10 },
            { id: 'risk', name: 'Risk Tasks', weight: 10 },
            { id: 'project', name: 'Project Tasks', weight: 10 },
            { id: 'audit', name: 'Audit Tasks', weight: 10 }
          ]
        }
      });
      console.log('✅ Created new weight config with audit category');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addAuditCategory();
