require('dotenv').config()
const { Pool } = require('pg')

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  
  try {
    console.log('\n=== Checking Salmon Uulenga ===\n')

    // Find Salmon Uulenga
    const salmon = await pool.query(`
      SELECT id, email, "firstName", "lastName" FROM "User" 
      WHERE email ILIKE '%uulenga%' OR "lastName" ILIKE '%Uulenga%'
    `)
    console.log('Salmon Uulenga user records:')
    salmon.rows.forEach(r => {
      console.log(`  ID: ${r.id}`)
      console.log(`  Email: ${r.email}`)
      console.log(`  Name: ${r.firstName} ${r.lastName}`)
    })

    if (salmon.rows.length > 0) {
      const salmonId = salmon.rows[0].id

      // Check who has Salmon as managerId
      const subordinatesManager = await pool.query(`
        SELECT id, email, "firstName", "lastName" FROM "User" 
        WHERE "managerId" = $1
      `, [salmonId])
      console.log('\n=== Users with managerId = Salmon ===')
      console.log(`Found ${subordinatesManager.rows.length} user(s)`)
      subordinatesManager.rows.forEach(r => {
        console.log(`  - ${r.firstName} ${r.lastName} (${r.email})`)
        console.log(`    ID: ${r.id}`)
      })

      // Check agreements with Salmon as supervisorId
      const agreementsSupervisor = await pool.query(`
        SELECT pa.id, pa.title, pa."userId", pa.rating, pa."approvalStatus",
               u."firstName", u."lastName"
        FROM "PerformanceAgreement" pa
        JOIN "User" u ON pa."userId" = u.id
        WHERE pa."supervisorId" = $1 AND pa."isAdhocContainer" = false
      `, [salmonId])
      console.log('\n=== Agreements with supervisorId = Salmon ===')
      console.log(`Found ${agreementsSupervisor.rows.length} agreement(s)`)
      agreementsSupervisor.rows.forEach(r => {
        console.log(`  - "${r.title}" by ${r.firstName} ${r.lastName}`)
        console.log(`    Rating: ${r.rating}, Approval: ${r.approvalStatus}`)
      })
    }

    console.log('\n=== END ===\n')

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await pool.end()
  }
}

main()
