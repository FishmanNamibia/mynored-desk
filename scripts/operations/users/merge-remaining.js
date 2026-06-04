const { Client } = require('pg')

const client = new Client({
  connectionString: process.env.DATABASE_URL
})

async function main() {
  await client.connect()

  const HENOK_KEEP = '63e921e8-0d3d-4d9a-b268-b1ab86795c76'   // AD user
  const HENOK_DELETE = 'cbae0b0b-5eda-4e82-a831-4a6da04c5432'  // PRE user

  console.log('=== Fixing remaining FK references for Henok Immanuel PRE user ===\n')

  // Transfer ProjectTeamMember
  try {
    const { rowCount } = await client.query(
      `UPDATE "ProjectTeamMember" SET "userId" = $1 WHERE "userId" = $2`,
      [HENOK_KEEP, HENOK_DELETE]
    )
    console.log(`  Updated ${rowCount} ProjectTeamMember references`)
  } catch (e) {
    // If unique constraint violation, just delete the old one
    console.log(`  ProjectTeamMember update failed (possible duplicate), deleting old entries...`)
    const { rowCount } = await client.query(
      `DELETE FROM "ProjectTeamMember" WHERE "userId" = $1`,
      [HENOK_DELETE]
    )
    console.log(`  Deleted ${rowCount} ProjectTeamMember entries for PRE user`)
  }

  // Transfer ProjectTask.assignedToId
  try {
    const { rowCount } = await client.query(
      `UPDATE "ProjectTask" SET "assignedToId" = $1 WHERE "assignedToId" = $2`,
      [HENOK_KEEP, HENOK_DELETE]
    )
    console.log(`  Updated ${rowCount} ProjectTask assignedToId references`)
  } catch (e) {
    console.log(`  ProjectTask update failed, deleting...`)
    await client.query(
      `DELETE FROM "ProjectTask" WHERE "assignedToId" = $1`,
      [HENOK_DELETE]
    )
  }

  // Find and transfer ANY remaining FK references
  const { rows: fkRefs } = await client.query(`
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND ccu.table_name = 'User'
      AND ccu.column_name = 'id'
  `)

  for (const ref of fkRefs) {
    try {
      const { rows: [cnt] } = await client.query(
        `SELECT COUNT(*) as cnt FROM "${ref.table_name}" WHERE "${ref.column_name}" = $1`,
        [HENOK_DELETE]
      )
      if (parseInt(cnt.cnt) > 0) {
        console.log(`  Found ${cnt.cnt} rows in ${ref.table_name}.${ref.column_name} - transferring...`)
        try {
          await client.query(
            `UPDATE "${ref.table_name}" SET "${ref.column_name}" = $1 WHERE "${ref.column_name}" = $2`,
            [HENOK_KEEP, HENOK_DELETE]
          )
          console.log(`    ✅ Transferred`)
        } catch (e2) {
          // If can't update (unique constraint), delete
          await client.query(
            `DELETE FROM "${ref.table_name}" WHERE "${ref.column_name}" = $1`,
            [HENOK_DELETE]
          )
          console.log(`    ✅ Deleted (unique constraint)`)
        }
      }
    } catch (e) {
      console.log(`  Skipping ${ref.table_name}.${ref.column_name}: ${e.message.substring(0, 80)}`)
    }
  }

  // Now delete the PRE Henok user
  try {
    const { rowCount } = await client.query(`DELETE FROM "User" WHERE id = $1`, [HENOK_DELETE])
    console.log(`\n✅ Deleted Henok Immanuel PRE user: ${rowCount} row(s)`)
  } catch (e) {
    console.error(`\n❌ Still can't delete: ${e.message}`)
  }

  // Now handle Ottilie Mwazi (no-role, but is manager/supervisor for AD users)
  // She is managerId for Henok AD and supervisorId for 35 agreements
  const OTTILIE_ID = '9073cceb-e98f-476e-94db-0f97e7a6ba16'
  console.log('\n=== Checking Ottilie Mwazi (no-role user) ===')
  const { rows: ottilieMgd } = await client.query(
    `SELECT id, "firstName", "lastName", email FROM "User" WHERE "managerId" = $1`, [OTTILIE_ID]
  )
  console.log(`  Manages: ${ottilieMgd.map(u => `${u.firstName} ${u.lastName} (${u.email})`).join(', ')}`)
  const { rows: [ottilieSup] } = await client.query(
    `SELECT COUNT(*) as cnt FROM "PerformanceAgreement" WHERE "supervisorId" = $1`, [OTTILIE_ID]
  )
  console.log(`  Supervises ${ottilieSup.cnt} agreements`)

  // Alex Shimuafeni (no-role, is manager for someone)
  const ALEX_ID = '1dbde1bc-c3c3-44d3-b650-968867c1a1b3'
  console.log('\n=== Checking Alex Shimuafeni (no-role user) ===')
  const { rows: alexMgd } = await client.query(
    `SELECT id, "firstName", "lastName", email FROM "User" WHERE "managerId" = $1`, [ALEX_ID]
  )
  console.log(`  Manages: ${alexMgd.map(u => `${u.firstName} ${u.lastName} (${u.email})`).join(', ')}`)
  const { rows: [alexSup] } = await client.query(
    `SELECT COUNT(*) as cnt FROM "PerformanceAgreement" WHERE "supervisorId" = $1`, [ALEX_ID]
  )
  console.log(`  Supervises ${alexSup.cnt} agreements`)

  // Final state
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
    let mgrName = 'N/A'
    if (u.managerId) {
      const { rows: [mgr] } = await client.query(
        `SELECT "firstName", "lastName" FROM "User" WHERE id = $1`, [u.managerId]
      )
      mgrName = mgr ? `${mgr.firstName} ${mgr.lastName}` : `UNKNOWN (${u.managerId})`
    }
    console.log(`  ${u.firstName} ${u.lastName} | ${u.email} | ${u.roles} | Dept: ${u.departmentName || 'N/A'} | Job: ${u.jobTitle || 'N/A'} | Mgr: ${mgrName}`)
  }

  await client.end()
}

main().catch(e => { console.error(e); process.exit(1) })
