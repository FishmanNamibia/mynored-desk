import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking PolicyDocument table structure...\n');
    
    // Check current columns
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'PolicyDocument'
      ORDER BY ordinal_position;
    `;
    
    console.log('Current columns:');
    console.table(columns);
    
    const columnNames = columns.map(col => col.column_name);
    const hasSignedDate = columnNames.includes('signedDate');
    const hasReviewDate = columnNames.includes('reviewDate');
    const hasStatus = columnNames.includes('status');
    
    console.log('\nColumn status:');
    console.log('- signedDate:', hasSignedDate ? '✓ exists' : '✗ missing');
    console.log('- reviewDate:', hasReviewDate ? '✓ exists' : '✗ missing');
    console.log('- status:', hasStatus ? '✓ exists' : '✗ missing');
    
    let changes = false;
    
    // Add missing columns
    if (!hasSignedDate) {
      console.log('\nAdding signedDate column...');
      await prisma.$executeRaw`ALTER TABLE "PolicyDocument" ADD COLUMN "signedDate" TEXT;`;
      console.log('✓ signedDate column added');
      changes = true;
    }
    
    if (!hasReviewDate) {
      console.log('\nAdding reviewDate column...');
      await prisma.$executeRaw`ALTER TABLE "PolicyDocument" ADD COLUMN "reviewDate" TEXT;`;
      console.log('✓ reviewDate column added');
      changes = true;
    }
    
    if (!hasStatus) {
      console.log('\nAdding status column...');
      await prisma.$executeRaw`ALTER TABLE "PolicyDocument" ADD COLUMN "status" TEXT;`;
      console.log('✓ status column added');
      changes = true;
    }
    
    if (!changes) {
      console.log('\n✓ All required columns already exist!');
    } else {
      console.log('\n✓ Missing columns have been added successfully!');
      
      // Show updated structure
      const updatedColumns = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'PolicyDocument'
        ORDER BY ordinal_position;
      `;
      
      console.log('\nUpdated table structure:');
      console.table(updatedColumns);
    }
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  });
