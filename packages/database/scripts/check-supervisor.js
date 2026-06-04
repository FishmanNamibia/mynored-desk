require('dotenv').config()
const { Pool } = require('pg')

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  
  try {
    console.log('\n=== Who should see subordinates? ===\n')

    // Find all potential supervisors (users who have someone reporting to them)
    const supervisors = await pool.query(`
      SELECT DISTINCT m.id, m."firstName", m."lastName", m.email,
             COUNT(u.id) as direct_reports
      FROM "User" m
      INNER JOIN "User" u ON u."managerId" = m.id
      GROUP BY m.id, m."firstName", m."lastName", m.email
    `)
    console.log('=== Supervisors via User.managerId ===')
    supervisors.rows.forEach(r => {
      console.log(`  - ${r.firstName} ${r.lastName} (${r.email}) - ${r.direct_reports} direct report(s)`)
      console.log(`    User ID: ${r.id}`)
    })

    // Find supervisors via PerformanceAgreement.supervisorId
    const agreementSupervisors = await pool.query(`
      SELECT DISTINCT s.id, s."firstName", s."lastName", s.email,
             COUNT(DISTINCT pa."userId") as subordinates_with_agreements
      FROM "PerformanceAgreement" pa
      INNER JOIN "User" s ON pa."supervisorId" = s.id
      WHERE pa."isAdhocContainer" = false
      GROUP BY s.id, s."firstName", s."lastName", s.email
    `)
    console.log('\n=== Supervisors via PerformanceAgreement.supervisorId ===')
    agreementSupervisors.rows.forEach(r => {
      console.log(`  - ${r.firstName} ${r.lastName} (${r.email}) - ${r.subordinates_with_agreements} subordinate(s) with agreements`)
      console.log(`    User ID: ${r.id}`)
    })

    // Check if Salmon Uulenga has the right data
    console.log('\n=== Specific check for supervisors with rated agreements ===')
    const ratedForSupervisor = await pool.query(`
      SELECT s.id as supervisor_id, s."firstName" as super_first, s."lastName" as super_last,
             u."firstName" as user_first, u."lastName" as user_last,
             pa.title, pa.rating, pa."approvalStatus"
      FROM "PerformanceAgreement" pa
      INNER JOIN "User" u ON pa."userId" = u.id
      INNER JOIN "User" s ON pa."supervisorId" = s.id
      WHERE pa.rating IS NOT NULL
    `)
    console.log(`Found ${ratedForSupervisor.rows.length} rated agreement(s) with supervisors:`)
    ratedForSupervisor.rows.forEach(r => {
      console.log(`  - Supervisor: ${r.super_first} ${r.super_last} (ID: ${r.supervisor_id})`)
      console.log(`    Subordinate: ${r.user_first} ${r.user_last}`)
      console.log(`    Agreement: "${r.title}"`)
      console.log(`    Rating: ${r.rating}, Approval: ${r.approvalStatus}`)
    })

    console.log('\n=== END ===\n')

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await pool.end()
  }
}

main()
