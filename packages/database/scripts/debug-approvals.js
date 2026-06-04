const { Client } = require('pg')

async function debug() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  })
  
  await client.connect()
  
  console.log('=== Debug Approvals Page ===\n')
  
  // Find Salmon's account
  const salmonResult = await client.query(`
    SELECT id, email, name, role, "managerId"
    FROM "User"
    WHERE email ILIKE '%salmon%'
  `)
  
  console.log('Salmon accounts found:')
  salmonResult.rows.forEach(u => {
    console.log(`  - ${u.name} (${u.email}), ID: ${u.id}, role: ${u.role}`)
  })
  
  if (salmonResult.rows.length === 0) {
    console.log('No Salmon user found!')
    await client.end()
    return
  }
  
  // Use the first Salmon account
  const salmon = salmonResult.rows[0]
  console.log(`\nUsing Salmon ID: ${salmon.id}`)
  
  // Strategy 1: Find users where managerId = Salmon's ID
  const subordinatesViaManager = await client.query(`
    SELECT id, name, email, "managerId"
    FROM "User"
    WHERE "managerId" = $1
  `, [salmon.id])
  
  console.log(`\nSubordinates via managerId (${subordinatesViaManager.rows.length}):`)
  subordinatesViaManager.rows.forEach(u => {
    console.log(`  - ${u.name} (${u.email}), ID: ${u.id}`)
  })
  
  // Strategy 2: Find users whose agreements have Salmon as supervisorId
  const subordinatesViaAgreement = await client.query(`
    SELECT DISTINCT u.id, u.name, u.email
    FROM "User" u
    JOIN "PerformanceAgreement" pa ON pa."userId" = u.id
    WHERE pa."supervisorId" = $1
  `, [salmon.id])
  
  console.log(`\nSubordinates via agreement supervisorId (${subordinatesViaAgreement.rows.length}):`)
  subordinatesViaAgreement.rows.forEach(u => {
    console.log(`  - ${u.name} (${u.email}), ID: ${u.id}`)
  })
  
  // Get all subordinate IDs
  const allSubordinateIds = [...new Set([
    ...subordinatesViaManager.rows.map(u => u.id),
    ...subordinatesViaAgreement.rows.map(u => u.id)
  ])]
  
  console.log(`\nTotal unique subordinates: ${allSubordinateIds.length}`)
  
  if (allSubordinateIds.length > 0) {
    // Check their agreements
    const agreements = await client.query(`
      SELECT pa.id, pa.title, pa."userId", pa."approvalStatus", u.name as user_name
      FROM "PerformanceAgreement" pa
      JOIN "User" u ON pa."userId" = u.id
      WHERE pa."userId" = ANY($1)
      AND pa."isAdhocContainer" = false
      ORDER BY u.name, pa."approvalStatus"
    `, [allSubordinateIds])
    
    console.log(`\nAgreements for subordinates (${agreements.rows.length}):`)
    let currentUser = ''
    agreements.rows.forEach(a => {
      if (a.user_name !== currentUser) {
        currentUser = a.user_name
        console.log(`\n  ${currentUser}:`)
      }
      console.log(`    - ${a.title || 'Untitled'}: ${a.approvalStatus || 'NOT_SUBMITTED'}`)
    })
    
    // Count by status
    const approved = agreements.rows.filter(a => a.approvalStatus === 'APPROVED').length
    const pending = agreements.rows.filter(a => a.approvalStatus === 'PENDING').length
    const notSubmitted = agreements.rows.filter(a => !a.approvalStatus).length
    
    console.log(`\n\nSummary:`)
    console.log(`  - APPROVED: ${approved}`)
    console.log(`  - PENDING: ${pending}`)
    console.log(`  - NOT_SUBMITTED: ${notSubmitted}`)
  }
  
  await client.end()
}

debug().catch(console.error)
