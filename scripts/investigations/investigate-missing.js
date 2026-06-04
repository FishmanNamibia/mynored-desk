const { Pool } = require('/home/afanuel/my_nsa_desk/node_modules/.pnpm/pg@8.17.2/node_modules/pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  
  try {
    // Check for duplicate titles in user's agreements
    console.log('=== Checking for Duplicate Titles ===');
    const dupResult = await client.query(`
      SELECT title, COUNT(*) as count
      FROM "PerformanceAgreement" pa 
      JOIN "User" u ON pa."userId" = u.id 
      WHERE LOWER(u.email) = LOWER('AFanuel@nsa.org.na')
        AND pa."isAdhocContainer" = false
      GROUP BY title
      HAVING COUNT(*) > 1
    `);
    
    if (dupResult.rows.length === 0) {
      console.log('No duplicate titles found');
    } else {
      console.log('Duplicate titles:', dupResult.rows);
    }
    
    // Check if PerformanceAgreement has a deletedAt field
    console.log('\n=== Checking for Soft Deleted Records ===');
    const schemaResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'PerformanceAgreement' 
        AND column_name IN ('deletedAt', 'deleted', 'isDeleted')
    `);
    
    if (schemaResult.rows.length > 0) {
      console.log('Found soft delete columns:', schemaResult.rows);
      const deletedColumn = schemaResult.rows[0].column_name;
      const deletedResult = await client.query(`
        SELECT COUNT(*) as deleted_count
        FROM "PerformanceAgreement" pa
        JOIN "User" u ON pa."userId" = u.id
        WHERE LOWER(u.email) = LOWER('AFanuel@nsa.org.na')
          AND pa."${deletedColumn}" IS NOT NULL
      `);
      console.log('Deleted records:', deletedResult.rows[0].deleted_count);
    } else {
      console.log('No soft delete column found');
    }
    
    // Check total agreements by ALL users (to see if records went to wrong user)
    console.log('\n=== Agreements by User (Top 10) ===');
    const byUserResult = await client.query(`
      SELECT 
        u.email, 
        u."firstName", 
        u."lastName",
        COUNT(*) FILTER (WHERE pa."isAdhocContainer" = false) as agreements
      FROM "PerformanceAgreement" pa
      JOIN "User" u ON pa."userId" = u.id
      GROUP BY u.email, u."firstName", u."lastName"
      ORDER BY agreements DESC
      LIMIT 10
    `);
    
    byUserResult.rows.forEach(r => {
      console.log(r.firstName + ' ' + r.lastName + ' (' + r.email + '): ' + r.agreements + ' agreements');
    });
    
    // Check recently created agreements
    console.log('\n=== Recently Created Agreements (Last 50) ===');
    const recentResult = await client.query(`
      SELECT 
        pa.title,
        LEFT(pa."customAction", 40) as action,
        u.email,
        pa."createdAt"
      FROM "PerformanceAgreement" pa
      JOIN "User" u ON pa."userId" = u.id
      WHERE pa."isAdhocContainer" = false
      ORDER BY pa."createdAt" DESC
      LIMIT 50
    `);
    
    recentResult.rows.forEach(r => {
      console.log(r.createdAt.toISOString().substring(0,16) + ' | ' + r.email.substring(0,20) + ' | ' + r.title.substring(0,40));
    });
    
    // Check initiatives linked to user's agreements
    console.log('\n=== Checking for Unlinked Initiatives ===');
    const unlinkedResult = await client.query(`
      SELECT COUNT(*) as total_initiatives,
             COUNT(pa.id) as linked_to_user
      FROM "Initiative" i
      LEFT JOIN "PerformanceAgreement" pa ON i.id = pa."initiativeId" 
        AND pa."userId" = (SELECT id FROM "User" WHERE LOWER(email) = LOWER('AFanuel@nsa.org.na'))
    `);
    console.log('Total initiatives:', unlinkedResult.rows[0].total_initiatives);
    console.log('Linked to user:', unlinkedResult.rows[0].linked_to_user);
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
