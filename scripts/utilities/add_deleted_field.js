const { Client } = require('pg');

// Database connection
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function addDeletedField() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Add deleted field to Refreshment table
    const query = `
      ALTER TABLE "Refreshment" 
      ADD COLUMN IF NOT EXISTS "deleted" BOOLEAN DEFAULT false
    `;
    
    await client.query(query);
    console.log('Successfully added deleted field to Refreshment table');
    
    // Create index for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS "Refreshment_deleted_idx" 
      ON "Refreshment"("deleted")
    `);
    console.log('Successfully created index for deleted field');
    
  } catch (error) {
    console.error('Error adding deleted field:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

addDeletedField();
