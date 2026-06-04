require('dotenv').config()
const { Pool } = require('pg')

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  
  try {
    // Get both Salmon accounts
    const salmons = await pool.query(`
      SELECT u.id, u.email, u."firstName", u."lastName",
             (SELECT COUNT(*) FROM "User" WHERE "managerId" = u.id) as subs_via_manager,
             (SELECT COUNT(DISTINCT "userId") FROM "PerformanceAgreement" 
              WHERE "supervisorId" = u.id AND "isAdhocContainer" = false) as subs_via_agreements
      FROM "User" u 
      WHERE u.email ILIKE '%uulenga%'
    `)
    
    console.log('\n=== Both Salmon Accounts ===\n')
    salmons.rows.forEach(r => {
      console.log(`Account: ${r.email}`)
      console.log(`  ID: ${r.id}`)
      console.log(`  Subordinates via managerId: ${r.subs_via_manager}`)
      console.log(`  Subordinates via agreement supervisorId: ${r.subs_via_agreements}`)
      console.log('')
    })

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await pool.end()
  }
}

main()
