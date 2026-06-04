const { Client } = require('pg')

const client = new Client({
  connectionString: process.env.DATABASE_URL
})

// Merge plan:
// 1. Henok Immanuel:
//    KEEP:   63e921e8-0d3d-4d9a-b268-b1ab86795c76 (AD - employee, Executive:IT & Data Management)
//    DELETE: cbae0b0b-5eda-4e82-a831-4a6da04c5432 (PRE - no role, no dept)
//    Transfer: 3 agreements (userId), 2 managed users (managerId)
//
// 2. Salmon Uulenga:
//    KEEP:   1fc44f31-fd32-4feb-a6cc-e199814996e0 (AD - employee, Senior Business Systems Analyst)
//    DELETE: 6dd07997-b425-4f8a-8855-cd4f662b8656 (PRE - no role, no dept)
//    Transfer: 32 supervised agreements (supervisorId), 2 managed users (managerId)
//
// 3. After merge, fix Salmon AD's managerId to point to Henok AD (instead of Henok PRE)

const merges = [
  {
    name: 'Henok Immanuel',
    keepId: '63e921e8-0d3d-4d9a-b268-b1ab86795c76',    // AD user
    deleteId: 'cbae0b0b-5eda-4e82-a831-4a6da04c5432',  // PRE user
  },
  {
    name: 'Salmon Uulenga',
    keepId: '1fc44f31-fd32-4feb-a6cc-e199814996e0',     // AD user
    deleteId: '6dd07997-b425-4f8a-8855-cd4f662b8656',   // PRE user
  }
]

async function main() {
  await client.connect()
  
  console.log('=== Starting duplicate user merge ===\n')

  for (const merge of merges) {
    console.log(`\n--- Merging ${merge.name} ---`)
    console.log(`  KEEP:   ${merge.keepId}`)
    console.log(`  DELETE: ${merge.deleteId}`)

    // Get all tables that reference User.id to transfer data
    // Transfer managerId references
    const { rowCount: mgrCount } = await client.query(
      `UPDATE "User" SET "managerId" = $1 WHERE "managerId" = $2`,
      [merge.keepId, merge.deleteId]
    )
    console.log(`  Updated ${mgrCount} managerId references`)

    // Transfer PerformanceAgreement.userId
    const { rowCount: agrUserCount } = await client.query(
      `UPDATE "PerformanceAgreement" SET "userId" = $1 WHERE "userId" = $2`,
      [merge.keepId, merge.deleteId]
    )
    console.log(`  Updated ${agrUserCount} agreement userId references`)

    // Transfer PerformanceAgreement.supervisorId
    const { rowCount: agrSupCount } = await client.query(
      `UPDATE "PerformanceAgreement" SET "supervisorId" = $1 WHERE "supervisorId" = $2`,
      [merge.keepId, merge.deleteId]
    )
    console.log(`  Updated ${agrSupCount} agreement supervisorId references`)

    // Transfer PerformanceAgreement.reviewerId (if column exists)
    try {
      const { rowCount: agrRevCount } = await client.query(
        `UPDATE "PerformanceAgreement" SET "reviewerId" = $1 WHERE "reviewerId" = $2`,
        [merge.keepId, merge.deleteId]
      )
      console.log(`  Updated ${agrRevCount} agreement reviewerId references`)
    } catch (e) { console.log(`  reviewerId: skipped (column may not exist)`) }

    // Transfer Notification.userId
    try {
      const { rowCount: notifCount } = await client.query(
        `UPDATE "Notification" SET "userId" = $1 WHERE "userId" = $2`,
        [merge.keepId, merge.deleteId]
      )
      console.log(`  Updated ${notifCount} notification references`)
    } catch (e) { console.log(`  Notifications: skipped (${e.message.substring(0, 50)})`) }

    // Transfer AuditLog references
    try {
      const { rowCount: auditCount } = await client.query(
        `UPDATE "AuditLog" SET "userId" = $1 WHERE "userId" = $2`,
        [merge.keepId, merge.deleteId]
      )
      console.log(`  Updated ${auditCount} audit log references`)
    } catch (e) { console.log(`  AuditLog: skipped (${e.message.substring(0, 50)})`) }

    // Transfer Task.assignedToId
    try {
      const { rowCount: taskAssignCount } = await client.query(
        `UPDATE "Task" SET "assignedToId" = $1 WHERE "assignedToId" = $2`,
        [merge.keepId, merge.deleteId]
      )
      console.log(`  Updated ${taskAssignCount} task assignedToId references`)
    } catch (e) { console.log(`  Task assignedTo: skipped (${e.message.substring(0, 50)})`) }

    // Transfer Task.createdById
    try {
      const { rowCount: taskCreateCount } = await client.query(
        `UPDATE "Task" SET "createdById" = $1 WHERE "createdById" = $2`,
        [merge.keepId, merge.deleteId]
      )
      console.log(`  Updated ${taskCreateCount} task createdById references`)
    } catch (e) { console.log(`  Task createdBy: skipped (${e.message.substring(0, 50)})`) }

    // Transfer UserRole entries (delete dupes first, then update)
    try {
      // Delete UserRole for the PRE user (they have no roles anyway)
      const { rowCount: roleDelCount } = await client.query(
        `DELETE FROM "UserRole" WHERE "userId" = $1`,
        [merge.deleteId]
      )
      console.log(`  Deleted ${roleDelCount} UserRole entries for PRE user`)
    } catch (e) { console.log(`  UserRole: skipped (${e.message.substring(0, 50)})`) }

    // Transfer Rating360 references
    try {
      const { rowCount: r1 } = await client.query(
        `UPDATE "Rating360" SET "raterId" = $1 WHERE "raterId" = $2`,
        [merge.keepId, merge.deleteId]
      )
      const { rowCount: r2 } = await client.query(
        `UPDATE "Rating360" SET "targetUserId" = $1 WHERE "targetUserId" = $2`,
        [merge.keepId, merge.deleteId]
      )
      console.log(`  Updated ${r1} Rating360 rater, ${r2} Rating360 target references`)
    } catch (e) { console.log(`  Rating360: skipped (${e.message.substring(0, 50)})`) }

    // Transfer Session references
    try {
      const { rowCount: sessCount } = await client.query(
        `DELETE FROM "Session" WHERE "userId" = $1`,
        [merge.deleteId]
      )
      console.log(`  Deleted ${sessCount} Session entries for PRE user`)
    } catch (e) { console.log(`  Session: skipped (${e.message.substring(0, 50)})`) }

    // Transfer Account references
    try {
      const { rowCount: accCount } = await client.query(
        `DELETE FROM "Account" WHERE "userId" = $1`,
        [merge.deleteId]
      )
      console.log(`  Deleted ${accCount} Account entries for PRE user`)
    } catch (e) { console.log(`  Account: skipped (${e.message.substring(0, 50)})`) }

    // Now delete the PRE user
    try {
      const { rowCount: delCount } = await client.query(
        `DELETE FROM "User" WHERE id = $1`,
        [merge.deleteId]
      )
      console.log(`  ✅ Deleted PRE user: ${delCount} row(s)`)
    } catch (e) {
      console.error(`  ❌ Failed to delete PRE user: ${e.message}`)
      // Find remaining FK references
      const { rows: fkRefs } = await client.query(`
        SELECT tc.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND ccu.table_name = 'User'
          AND ccu.column_name = 'id'
      `)
      console.log('  FK references to User.id:')
      for (const ref of fkRefs) {
        const { rows: [cnt] } = await client.query(
          `SELECT COUNT(*) as cnt FROM "${ref.table_name}" WHERE "${ref.column_name}" = $1`,
          [merge.deleteId]
        )
        if (parseInt(cnt.cnt) > 0) {
          console.log(`    ⚠️  ${ref.table_name}.${ref.column_name}: ${cnt.cnt} rows still referencing`)
        }
      }
    }
  }

  // 3. Also clean up users with no role that aren't duplicates
  console.log('\n\n=== Cleaning up remaining no-role users ===\n')
  const { rows: noRoleUsers } = await client.query(`
    SELECT u.id, u."firstName", u."lastName", u.email
    FROM "User" u
    LEFT JOIN "UserRole" ur ON ur."userId" = u.id
    WHERE ur.id IS NULL
  `)
  for (const u of noRoleUsers) {
    console.log(`  No-role user: ${u.firstName} ${u.lastName} (${u.email}) - ID: ${u.id}`)
    
    // Check if they have any data
    const { rows: [agr] } = await client.query(`SELECT COUNT(*) as cnt FROM "PerformanceAgreement" WHERE "userId" = $1`, [u.id])
    const { rows: [sup] } = await client.query(`SELECT COUNT(*) as cnt FROM "PerformanceAgreement" WHERE "supervisorId" = $1`, [u.id])
    const { rows: [mgd] } = await client.query(`SELECT COUNT(*) as cnt FROM "User" WHERE "managerId" = $1`, [u.id])
    
    if (parseInt(agr.cnt) === 0 && parseInt(sup.cnt) === 0 && parseInt(mgd.cnt) === 0) {
      // Safe to delete - clean up related tables first
      try { await client.query(`DELETE FROM "UserRole" WHERE "userId" = $1`, [u.id]) } catch(e) {}
      try { await client.query(`DELETE FROM "Session" WHERE "userId" = $1`, [u.id]) } catch(e) {}
      try { await client.query(`DELETE FROM "Account" WHERE "userId" = $1`, [u.id]) } catch(e) {}
      try { await client.query(`DELETE FROM "Notification" WHERE "userId" = $1`, [u.id]) } catch(e) {}
      try { await client.query(`DELETE FROM "AuditLog" WHERE "userId" = $1`, [u.id]) } catch(e) {}
      
      const { rowCount } = await client.query(`DELETE FROM "User" WHERE id = $1`, [u.id])
      console.log(`    ✅ Deleted (no data attached): ${rowCount} row(s)`)
    } else {
      console.log(`    ⚠️  Skipping - has data: agreements=${agr.cnt}, supervised=${sup.cnt}, managed=${mgd.cnt}`)
    }
  }

  // 4. Verify final state
  console.log('\n\n=== Final state ===\n')
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
    // Resolve manager name
    let mgrName = 'N/A'
    if (u.managerId) {
      const { rows: [mgr] } = await client.query(
        `SELECT "firstName", "lastName" FROM "User" WHERE id = $1`, [u.managerId]
      )
      mgrName = mgr ? `${mgr.firstName} ${mgr.lastName}` : `UNKNOWN (${u.managerId})`
    }
    console.log(`  ${u.firstName} ${u.lastName} | ${u.email} | ${u.roles} | Dept: ${u.departmentName || 'N/A'} | Mgr: ${mgrName}`)
  }

  await client.end()
  console.log('\n=== Merge complete ===')
}

main().catch(e => { console.error(e); process.exit(1) })
