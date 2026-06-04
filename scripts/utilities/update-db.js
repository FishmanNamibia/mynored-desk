const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

async function main() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Update the weights
    const updateResult = await client.query(`
      UPDATE "PerformancePeriod" 
      SET "adhocWeight" = 0, "projectsWeight" = 0, "riskManagementWeight" = 0 
      WHERE "isActive" = true
    `);
    
    console.log(`Updated ${updateResult.rowCount} row(s)`);
    
    // Query the current values
    const selectResult = await client.query(`
      SELECT id, name, "adhocWeight", "projectsWeight", "riskManagementWeight", "rating360Weight" 
      FROM "PerformancePeriod" 
      WHERE "isActive" = true
    `);
    
    console.log('Current active period:');
    console.log(selectResult.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

main();
