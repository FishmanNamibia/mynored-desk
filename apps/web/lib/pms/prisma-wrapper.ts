// Simple Prisma client wrapper that handles runtime generation
let prisma: any = null;

async function getPrismaClient() {
  if (!prisma) {
    try {
      // Try to import the generated client
      const { PrismaClient } = require('@prisma/client');
      prisma = new PrismaClient();
    } catch (error) {
      // If client doesn't exist, generate it first
      console.log('Prisma client not found, generating...');
      const { execSync } = require('child_process');
      execSync('npx prisma generate', { stdio: 'inherit' });
      
      // Now try to import again
      const { PrismaClient } = require('@prisma/client');
      prisma = new PrismaClient();
    }
  }
  return prisma;
}

module.exports = { getPrismaClient };
