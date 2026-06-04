import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Check if the columns exist by trying to query them
    console.log('Checking PolicyDocument table structure...');
    
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'PolicyDocument'
      ORDER BY ordinal_position;
    `;
    
    console.log('Current columns:', result);
    
    // Check if signedDate, reviewDate, and status columns exist
    const columns = result as Array<{ column_name: string; data_type: string }>;
    const hasSignedDate = columns.some(col => col.column_name === 'signedDate');
    const hasReviewDate = columns.some(col => col.column_name === 'reviewDate');
    const hasStatus = columns.some(col => col.column_name === 'status');
    
    console.log('\nColumn status:');
    console.log('- signedDate:', hasSignedDate ? '✓ exists' : '✗ missing');
    console.log('- reviewDate:', hasReviewDate ? '✓ exists' : '✗ missing');
    console.log('- status:', hasStatus ? '✓ exists' : '✗ missing');
    
    // Add missing columns
    if (!hasSignedDate) {
      console.log('\nAdding signedDate column...');
      await prisma.$executeRaw`ALTER TABLE "PolicyDocument" ADD COLUMN "signedDate" TEXT;`;
      console.log('✓ signedDate column added');
    }
    
    if (!hasReviewDate) {
      console.log('\nAdding reviewDate column...');
      await prisma.$executeRaw`ALTER TABLE "PolicyDocument" ADD COLUMN "reviewDate" TEXT;`;
      console.log('✓ reviewDate column added');
    }
    
    if (!hasStatus) {
      console.log('\nAdding status column...');
      await prisma.$executeRaw`ALTER TABLE "PolicyDocument" ADD COLUMN "status" TEXT;`;
      console.log('✓ status column added');
    }
    
    if (hasSignedDate && hasReviewDate && hasStatus) {
      console.log('\n✓ All required columns already exist!');
    } else {
      console.log('\n✓ Missing columns have been added successfully!');
    }
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('Failed to update database:', error);
    process.exit(1);
  });
