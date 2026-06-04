const { Pool } = require('/home/afanuel/my_nsa_desk/node_modules/.pnpm/pg@8.17.2/node_modules/pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  
  try {
    // Get user info
    const userResult = await client.query(`
      SELECT id, email, "firstName", "lastName" 
      FROM "User" 
      WHERE LOWER(email) = LOWER('AFanuel@nsa.org.na')
    `);
    
    if (userResult.rows.length === 0) {
      console.log('User not found');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('User:', user.firstName, user.lastName, '-', user.email);
    console.log('User ID:', user.id);
    
    // Count agreements
    const countResult = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE "isAdhocContainer" = false) as actual_agreements,
        COUNT(*) FILTER (WHERE "isAdhocContainer" = true) as container_agreements,
        COUNT(*) as total_records
      FROM "PerformanceAgreement" 
      WHERE "userId" = $1
    `, [user.id]);
    
    console.log('\n=== Agreement Counts ===');
    console.log('Actual agreements (non-container):', countResult.rows[0].actual_agreements);
    console.log('Container agreements:', countResult.rows[0].container_agreements);
    console.log('Total records:', countResult.rows[0].total_records);
    
    // List all non-container agreements
    const agreementsResult = await client.query(`
      SELECT 
        pa.id,
        pa.title,
        LEFT(pa."customAction", 60) as action_preview,
        pa."createdAt",
        pa."performancePeriodId",
        pp.name as period_name
      FROM "PerformanceAgreement" pa 
      LEFT JOIN "PerformancePeriod" pp ON pa."performancePeriodId" = pp.id
      WHERE pa."userId" = $1 AND pa."isAdhocContainer" = false
      ORDER BY pa."createdAt" ASC
    `, [user.id]);
    
    console.log('\n=== All Performance Agreements ===');
    agreementsResult.rows.forEach((a, i) => {
      console.log((i + 1) + '. ' + a.title + ' | ' + (a.action_preview || 'No action') + ' | Period: ' + (a.period_name || 'None'));
    });
    
    // Check performance periods
    const periodsResult = await client.query(`
      SELECT id, name, "isActive", "startDate", "endDate" 
      FROM "PerformancePeriod" 
      ORDER BY "createdAt" DESC
    `);
    
    console.log('\n=== Performance Periods ===');
    periodsResult.rows.forEach(p => {
      console.log(p.name + ' - Active: ' + p.isActive + ' - ID: ' + p.id);
    });
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
