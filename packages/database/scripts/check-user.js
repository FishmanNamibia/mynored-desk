const { Client } = require('pg')

async function check() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  })
  
  await client.connect()
  
  // Find Salmon/Uulenga
  const users = await client.query(`
    SELECT id, email, name, "managerId", "jobTitle"
    FROM "User"
    WHERE email ILIKE '%salmon%' OR email ILIKE '%uulenga%'
  `)
  
  console.log('=== Users matching salmon/uulenga ===')
  users.rows.forEach(u => {
    console.log(`  ${u.name} | ${u.email} | ID: ${u.id}`)
    console.log(`    jobTitle: ${u.jobTitle}`)
    console.log(`    managerId: ${u.managerId}`)
  })
  
  if (users.rows.length > 0) {
    const userId = users.rows[0].id
    console.log(`\n=== Checking subordinates for ${users.rows[0].email} ===`)
    
    // Check subordinates via managerId
    const subordinates = await client.query(`
      SELECT id, email, name FROM "User" WHERE "managerId" = $1
    `, [userId])
    console.log(`Subordinates via managerId: ${subordinates.rows.length}`)
    subordinates.rows.forEach(s => console.log(`  - ${s.name} (${s.email})`))
    
    // Check subordinates via supervisorId on agreements
    const agreementSubs = await client.query(`
      SELECT DISTINCT u.id, u.email, u.name 
      FROM "User" u
      JOIN "PerformanceAgreement" pa ON pa."userId" = u.id
      WHERE pa."supervisorId" = $1
    `, [userId])
    console.log(`\nSubordinates via agreement supervisorId: ${agreementSubs.rows.length}`)
    agreementSubs.rows.forEach(s => console.log(`  - ${s.name} (${s.email})`))
  }
  
  await client.end()
}

check().catch(console.error)
