const { Client } = require('pg')

const client = new Client({
  connectionString: process.env.DATABASE_URL
})

async function main() {
  await client.connect()

  // Ottilie Mwazi (no-role) manages Henok Immanuel (Executive)
  // She supervises 35 agreements - these should go to the actual supervisor
  const OTTILIE_ID = '9073cceb-e98f-476e-94db-0f97e7a6ba16'
  const HENOK_AD = '63e921e8-0d3d-4d9a-b268-b1ab86795c76'

  console.log('=== Ottilie Mwazi cleanup ===')
  
  // Check what agreements she supervises
  const { rows: ottilieAgreements } = await client.query(`
    SELECT pa.id, pa."userId", u."firstName", u."lastName", u.email, pa."approvalStatus"
    FROM "PerformanceAgreement" pa
    JOIN "User" u ON u.id = pa."userId"
    WHERE pa."supervisorId" = $1
    ORDER BY u.email
  `, [OTTILIE_ID])
  
  console.log(`  Ottilie supervises ${ottilieAgreements.length} agreements:`)
  const userGroups = {}
  for (const a of ottilieAgreements) {
    if (!userGroups[a.email]) userGroups[a.email] = { name: `${a.firstName} ${a.lastName}`, count: 0, statuses: [] }
    userGroups[a.email].count++
    userGroups[a.email].statuses.push(a.approvalStatus || 'N/A')
  }
  for (const [email, data] of Object.entries(userGroups)) {
    console.log(`    ${data.name} (${email}): ${data.count} agreements [${data.statuses.join(', ')}]`)
  }

  // Ottilie is placeholder for a real person - transfer her supervisorId to Henok (the executive she manages)
  // Since Henok is the Executive IT, he should be the supervisor for those agreements
  console.log(`\n  Transferring supervisorId from Ottilie to Henok Immanuel (Executive)...`)
  const { rowCount: supTransfer } = await client.query(
    `UPDATE "PerformanceAgreement" SET "supervisorId" = $1 WHERE "supervisorId" = $2`,
    [HENOK_AD, OTTILIE_ID]
  )
  console.log(`  Updated ${supTransfer} agreement supervisorId references`)

  // Update managerId: Henok's manager should be null (or a real SG/DSG user)
  // For now, set to null since Ottilie is a placeholder
  const { rowCount: mgrTransfer } = await client.query(
    `UPDATE "User" SET "managerId" = NULL WHERE "managerId" = $1`,
    [OTTILIE_ID]
  )
  console.log(`  Cleared ${mgrTransfer} managerId references (set to NULL)`)

  // Now clean up Ottilie's remaining FK refs and delete
  const tables = ['UserRole', 'PerformanceAgreement', 'ProjectTeamMember', 'Task']
  for (const tbl of tables) {
    try {
      await client.query(`DELETE FROM "${tbl}" WHERE "userId" = $1`, [OTTILIE_ID])
    } catch (e) { /* ignore if doesn't exist */ }
  }
  
  try {
    const { rowCount } = await client.query(`DELETE FROM "User" WHERE id = $1`, [OTTILIE_ID])
    console.log(`  ✅ Deleted Ottilie Mwazi: ${rowCount} row(s)`)
  } catch (e) {
    console.error(`  ❌ Can't delete Ottilie: ${e.message}`)
    // Find remaining references
    const { rows: fkRefs } = await client.query(`
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'User' AND ccu.column_name = 'id'
    `)
    for (const ref of fkRefs) {
      try {
        const { rows: [cnt] } = await client.query(
          `SELECT COUNT(*) as cnt FROM "${ref.table_name}" WHERE "${ref.column_name}" = $1`, [OTTILIE_ID]
        )
        if (parseInt(cnt.cnt) > 0) console.log(`    ⚠️ ${ref.table_name}.${ref.column_name}: ${cnt.cnt} rows`)
      } catch(e) {}
    }
  }

  // Alex Shimuafeni (no-role) manages Test HC (Executive: Human Capital)
  const ALEX_ID = '1dbde1bc-c3c3-44d3-b650-968867c1a1b3'
  console.log('\n=== Alex Shimuafeni cleanup ===')
  
  // Clear managerId for Test HC
  const { rowCount: alexMgr } = await client.query(
    `UPDATE "User" SET "managerId" = NULL WHERE "managerId" = $1`,
    [ALEX_ID]
  )
  console.log(`  Cleared ${alexMgr} managerId references`)

  // Transfer any supervisorId refs
  // Alex doesn't supervise any agreements, so just clean up
  try {
    await client.query(`DELETE FROM "UserRole" WHERE "userId" = $1`, [ALEX_ID])
    const { rowCount } = await client.query(`DELETE FROM "User" WHERE id = $1`, [ALEX_ID])
    console.log(`  ✅ Deleted Alex Shimuafeni: ${rowCount} row(s)`)
  } catch (e) {
    console.error(`  ❌ Can't delete Alex: ${e.message}`)
    const { rows: fkRefs } = await client.query(`
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'User' AND ccu.column_name = 'id'
    `)
    for (const ref of fkRefs) {
      try {
        const { rows: [cnt] } = await client.query(
          `SELECT COUNT(*) as cnt FROM "${ref.table_name}" WHERE "${ref.column_name}" = $1`, [ALEX_ID]
        )
        if (parseInt(cnt.cnt) > 0) console.log(`    ⚠️ ${ref.table_name}.${ref.column_name}: ${cnt.cnt} rows`)
      } catch(e) {}
    }
  }

  // Final verification
  console.log('\n\n=== Final state of all users ===\n')
  const { rows: finalUsers } = await client.query(`
    SELECT u.id, u."firstName", u."lastName", u.email, u."jobTitle", 
           u."departmentName", u."managerId",
           COALESCE(string_agg(r.name, ', '), 'NO ROLE') as roles
    FROM "User" u
    LEFT JOIN "UserRole" ur ON ur."userId" = u.id
    LEFT JOIN "Role" r ON r.id = ur."roleId"
    GROUP BY u.id
    ORDER BY u.email
  `)
  
  for (const u of finalUsers) {
    let mgrName = 'NONE'
    if (u.managerId) {
      const { rows: [mgr] } = await client.query(
        `SELECT "firstName", "lastName" FROM "User" WHERE id = $1`, [u.managerId]
      )
      mgrName = mgr ? `${mgr.firstName} ${mgr.lastName}` : `UNKNOWN (${u.managerId})`
    }
    console.log(`  ${u.firstName} ${u.lastName} | ${u.email} | ${u.roles} | Dept: ${u.departmentName || 'N/A'} | Job: ${u.jobTitle || 'N/A'} | Mgr: ${mgrName}`)
  }

  // Show hierarchy
  console.log('\n=== Hierarchy ===\n')
  for (const u of finalUsers) {
    if (!u.managerId) {
      console.log(`  📌 ${u.firstName} ${u.lastName} (${u.jobTitle || 'N/A'}) [TOP LEVEL]`)
      // Find their reports
      const reports = finalUsers.filter(r => r.managerId === u.id)
      for (const r of reports) {
        console.log(`    └── ${r.firstName} ${r.lastName} (${r.jobTitle || 'N/A'})`)
        const subReports = finalUsers.filter(sr => sr.managerId === r.id)
        for (const sr of subReports) {
          console.log(`        └── ${sr.firstName} ${sr.lastName} (${sr.jobTitle || 'N/A'})`)
          const subSubReports = finalUsers.filter(ssr => ssr.managerId === sr.id)
          for (const ssr of subSubReports) {
            console.log(`            └── ${ssr.firstName} ${ssr.lastName} (${ssr.jobTitle || 'N/A'})`)
          }
        }
      }
    }
  }

  // Check agreements for AFanuel
  console.log('\n=== AFanuel agreements ===\n')
  const AFANUEL_ID = 'e71b3e62-8e02-4e6c-acf0-6101de4d3fe5'
  const { rows: afAgreements } = await client.query(`
    SELECT pa.id, pa."customAction", pa."approvalStatus", pa."supervisorId",
           sup."firstName" as "supFirst", sup."lastName" as "supLast"
    FROM "PerformanceAgreement" pa
    LEFT JOIN "User" sup ON sup.id = pa."supervisorId"
    WHERE pa."userId" = $1
  `, [AFANUEL_ID])
  for (const a of afAgreements) {
    console.log(`  Agreement ${a.id.substring(0,8)}... | Status: ${a.approvalStatus || 'N/A'} | Supervisor: ${a.supFirst || 'NONE'} ${a.supLast || ''}`)
  }

  await client.end()
}

main().catch(e => { console.error(e); process.exit(1) })
