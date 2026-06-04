const { Client } = require('pg')

const client = new Client({
  connectionString: process.env.DATABASE_URL
})

async function main() {
  await client.connect()

  // 1. Get all users with their roles
  const { rows: allUsers } = await client.query(`
    SELECT u.id, u."firstName", u."lastName", u.email, u."jobTitle", 
           u."departmentName", u."departmentId", u."divisionName", 
           u."managerId", u.status,
           COALESCE(string_agg(r.name, ', '), 'NO ROLE') as roles
    FROM "User" u
    LEFT JOIN "UserRole" ur ON ur."userId" = u.id
    LEFT JOIN "Role" r ON r.id = ur."roleId"
    GROUP BY u.id
    ORDER BY u.email
  `)

  console.log(`\n=== Total users in DB: ${allUsers.length} ===\n`)

  // Group by lowercase email
  const emailGroups = {}
  for (const u of allUsers) {
    const key = u.email.toLowerCase()
    if (!emailGroups[key]) emailGroups[key] = []
    emailGroups[key].push(u)
  }

  // Find duplicates
  const duplicates = Object.entries(emailGroups).filter(([, users]) => users.length > 1)
  console.log(`=== Found ${duplicates.length} duplicate email groups ===\n`)

  for (const [email, users] of duplicates) {
    console.log(`--- Email: ${email} (${users.length} users) ---`)
    for (const u of users) {
      console.log(`  ID: ${u.id}`)
      console.log(`  Name: ${u.firstName} ${u.lastName}`)
      console.log(`  Email (exact): ${u.email}`)
      console.log(`  Roles: ${u.roles}`)
      console.log(`  Job Title: ${u.jobTitle || 'N/A'}`)
      console.log(`  Department: ${u.departmentName || 'N/A'}`)
      console.log(`  DepartmentId: ${u.departmentId || 'N/A'}`)
      console.log(`  Division: ${u.divisionName || 'N/A'}`)
      console.log(`  ManagerId: ${u.managerId || 'N/A'}`)
      console.log(`  Status: ${u.status}`)
      console.log()
    }
  }

  // 2. Check for data attached to each duplicate
  console.log(`\n=== Checking data attached to duplicate users ===\n`)
  for (const [email, users] of duplicates) {
    console.log(`--- ${email} ---`)
    for (const u of users) {
      const { rows: [agr] } = await client.query(`SELECT COUNT(*) as cnt FROM "PerformanceAgreement" WHERE "userId" = $1`, [u.id])
      const { rows: [sup] } = await client.query(`SELECT COUNT(*) as cnt FROM "PerformanceAgreement" WHERE "supervisorId" = $1`, [u.id])
      const { rows: [mgd] } = await client.query(`SELECT COUNT(*) as cnt FROM "User" WHERE "managerId" = $1`, [u.id])
      
      console.log(`  ${u.id} (${u.firstName} ${u.lastName}) [${u.roles}]`)
      console.log(`    Agreements: ${agr.cnt}`)
      console.log(`    Supervised agreements: ${sup.cnt}`)
      console.log(`    Managed users (reports to this): ${mgd.cnt}`)
      console.log()
    }
  }

  // 3. Show executive users
  console.log(`\n=== Executive users ===\n`)
  const executives = allUsers.filter(u => 
    u.jobTitle?.toLowerCase().includes('executive')
  )
  for (const e of executives) {
    console.log(`  ${e.firstName} ${e.lastName} (${e.email})`)
    console.log(`    ID: ${e.id}`)
    console.log(`    Roles: ${e.roles}`)
    console.log(`    Job Title: ${e.jobTitle}`)
    console.log(`    Department: ${e.departmentName}`)
    console.log(`    DepartmentId: ${e.departmentId}`)
    console.log(`    ManagerId: ${e.managerId}`)
    console.log()
  }

  // 4. Show AFanuel user(s)
  console.log(`\n=== AFanuel user(s) ===\n`)
  const afanuelUsers = allUsers.filter(u => u.email.toLowerCase().includes('afanuel'))
  for (const u of afanuelUsers) {
    console.log(`  ${u.firstName} ${u.lastName} (${u.email})`)
    console.log(`    ID: ${u.id}`)
    console.log(`    Roles: ${u.roles}`)
    console.log(`    Department: ${u.departmentName}`)
    console.log(`    DepartmentId: ${u.departmentId}`)
    console.log(`    ManagerId: ${u.managerId}`)
    console.log()
  }

  // 5. Show ALL users summary
  console.log(`\n=== All users summary ===\n`)
  for (const u of allUsers) {
    const hasMs = u.microsoftId ? 'AD' : 'PRE'
    console.log(`  [${hasMs}] ${u.firstName} ${u.lastName} | ${u.email} | ${u.roles} | Dept: ${u.departmentName || 'N/A'} | DeptId: ${u.departmentId || 'N/A'} | Mgr: ${u.managerId || 'N/A'}`)
  }

  await client.end()
}

main().catch(e => { console.error(e); process.exit(1) })
