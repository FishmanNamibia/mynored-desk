const { Pool } = require('/home/afanuel/my_nsa_desk/node_modules/.pnpm/pg@8.17.2/node_modules/pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  
  try {
    // Check for duplicate title+action combinations
    console.log('=== Checking for Duplicate Title+Action Combinations ===');
    const dupResult = await client.query(`
      SELECT title, "customAction", COUNT(*) as count
      FROM "PerformanceAgreement" pa 
      JOIN "User" u ON pa."userId" = u.id 
      WHERE LOWER(u.email) = LOWER('AFanuel@nsa.org.na')
        AND pa."isAdhocContainer" = false
      GROUP BY title, "customAction"
      HAVING COUNT(*) > 1
    `);
    
    if (dupResult.rows.length === 0) {
      console.log('No duplicate title+action combinations found - all 26 are unique');
    } else {
      console.log('Duplicate title+action combinations:');
      dupResult.rows.forEach(r => {
        console.log('  Title: ' + r.title.substring(0, 60) + '...');
        console.log('  Action: ' + (r.customAction || 'NULL').substring(0, 60) + '...');
        console.log('  Count: ' + r.count);
        console.log('');
      });
    }
    
    // Show all unique title+action combinations
    console.log('\n=== All 26 Agreements with Title and Action ===');
    const allResult = await client.query(`
      SELECT 
        ROW_NUMBER() OVER (ORDER BY pa."createdAt") as num,
        pa.title,
        LEFT(pa."customAction", 80) as action
      FROM "PerformanceAgreement" pa 
      JOIN "User" u ON pa."userId" = u.id 
      WHERE LOWER(u.email) = LOWER('AFanuel@nsa.org.na')
        AND pa."isAdhocContainer" = false
      ORDER BY pa."createdAt"
    `);
    
    allResult.rows.forEach(r => {
      console.log(r.num + '. ' + r.title.substring(0, 50) + ' | ' + (r.action || 'No action'));
    });
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
