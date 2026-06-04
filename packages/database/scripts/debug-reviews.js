require('dotenv').config()
const { Pool } = require('pg')

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  
  try {
    console.log('\n=== DEBUG: Performance Reviews Data ===\n')

    // 1. Check users with managerId set
    const managersResult = await pool.query(`
      SELECT u.id, u."firstName", u."lastName", u.email, u."managerId",
             m."firstName" as manager_first, m."lastName" as manager_last, m.email as manager_email
      FROM "User" u
      LEFT JOIN "User" m ON u."managerId" = m.id
      WHERE u."managerId" IS NOT NULL
      LIMIT 20
    `)
    console.log('=== Users with managerId set ===')
    console.log(`Found ${managersResult.rows.length} users with a manager assigned`)
    managersResult.rows.forEach(r => {
      console.log(`  - ${r.firstName} ${r.lastName} reports to: ${r.manager_first || 'NULL'} ${r.manager_last || 'NULL'}`)
    })

    // 2. Check agreements with supervisorId set
    const supervisorsResult = await pool.query(`
      SELECT pa.id, pa.title, pa."userId", pa."supervisorId", pa.rating, pa."approvalStatus",
             u."firstName" as user_first, u."lastName" as user_last,
             s."firstName" as super_first, s."lastName" as super_last
      FROM "PerformanceAgreement" pa
      LEFT JOIN "User" u ON pa."userId" = u.id
      LEFT JOIN "User" s ON pa."supervisorId" = s.id
      WHERE pa."supervisorId" IS NOT NULL
      LIMIT 20
    `)
    console.log('\n=== Agreements with supervisorId set ===')
    console.log(`Found ${supervisorsResult.rows.length} agreements with a supervisor assigned`)
    supervisorsResult.rows.forEach(r => {
      console.log(`  - "${r.title}" owned by ${r.user_first} ${r.user_last}, supervisor: ${r.super_first || 'NULL'} ${r.super_last || 'NULL'}, rating: ${r.rating}, approval: ${r.approvalStatus}`)
    })

    // 3. Check agreements with ratings
    const ratingsResult = await pool.query(`
      SELECT pa.id, pa.title, pa."userId", pa.rating, pa."approvalStatus",
             u."firstName", u."lastName", u.email
      FROM "PerformanceAgreement" pa
      LEFT JOIN "User" u ON pa."userId" = u.id
      WHERE pa.rating IS NOT NULL
      LIMIT 20
    `)
    console.log('\n=== Agreements with ratings ===')
    console.log(`Found ${ratingsResult.rows.length} agreements with ratings`)
    ratingsResult.rows.forEach(r => {
      console.log(`  - "${r.title}" by ${r.firstName} ${r.lastName}, rating: ${r.rating}, approval: ${r.approvalStatus}`)
    })

    // 4. Check all users count
    const usersCount = await pool.query(`SELECT COUNT(*) FROM "User"`)
    console.log(`\n=== Total users: ${usersCount.rows[0].count} ===`)

    // 5. Check all agreements count
    const agreementsCount = await pool.query(`SELECT COUNT(*) FROM "PerformanceAgreement" WHERE "isAdhocContainer" = false`)
    console.log(`=== Total agreements (non-adhoc): ${agreementsCount.rows[0].count} ===`)

    // 6. Check agreements without supervisorId
    const noSupervisor = await pool.query(`
      SELECT COUNT(*) FROM "PerformanceAgreement" 
      WHERE "supervisorId" IS NULL AND "isAdhocContainer" = false
    `)
    console.log(`=== Agreements WITHOUT supervisorId: ${noSupervisor.rows[0].count} ===`)

    console.log('\n=== END DEBUG ===\n')

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await pool.end()
  }
}

main()
