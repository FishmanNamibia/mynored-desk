require('dotenv').config()
const { Pool } = require('pg')

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  
  try {
    const wrongSalmonId = '90159727-4bc8-4956-8ff7-ddbc4c2312fa'  // lowercase email (has the data)
    const correctSalmonId = '1fc44f31-fd32-4feb-a6cc-e199814996e0' // uppercase email (user is logged in as)

    console.log('\n=== Fixing Salmon Accounts ===\n')
    console.log('Moving subordinates from lowercase to uppercase account...')

    // 1. Update users who have wrong Salmon as managerId
    const updateManagers = await pool.query(`
      UPDATE "User" SET "managerId" = $1 WHERE "managerId" = $2
    `, [correctSalmonId, wrongSalmonId])
    console.log(`Updated ${updateManagers.rowCount} user(s) managerId`)

    // 2. Update agreements that have wrong Salmon as supervisorId
    const updateAgreements = await pool.query(`
      UPDATE "PerformanceAgreement" SET "supervisorId" = $1 WHERE "supervisorId" = $2
    `, [correctSalmonId, wrongSalmonId])
    console.log(`Updated ${updateAgreements.rowCount} agreement(s) supervisorId`)

    console.log('\n=== Verification ===')
    
    // Verify the fix
    const verify = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM "User" WHERE "managerId" = $1) as subs_via_manager,
        (SELECT COUNT(DISTINCT "userId") FROM "PerformanceAgreement" 
         WHERE "supervisorId" = $1 AND "isAdhocContainer" = false) as subs_via_agreements
    `, [correctSalmonId])
    
    console.log(`Correct Salmon (uppercase) now has:`)
    console.log(`  Subordinates via managerId: ${verify.rows[0].subs_via_manager}`)
    console.log(`  Subordinates via agreements: ${verify.rows[0].subs_via_agreements}`)

    console.log('\n✅ Fix complete! Please refresh the Performance Reviews page.\n')

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await pool.end()
  }
}

main()
