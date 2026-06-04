const { Pool } = require('pg')
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}

const p = new Pool({
  connectionString: process.env.DATABASE_URL
})

async function main() {
  // Check User table columns
  const cols = await p.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'User' ORDER BY ordinal_position")
  console.log('User columns:', cols.rows.map(r => r.column_name).join(', '))

  // Find executive users by email
  const users = await p.query("SELECT id, email FROM \"User\" WHERE email ILIKE '%THC%' OR email ILIKE '%LMareka%' LIMIT 10")
  console.log('\n=== Executive Users ===')
  console.log(JSON.stringify(users.rows, null, 2))

  // For each user found, check their agreements
  for (const u of users.rows) {
    const agreements = await p.query('SELECT id, title, "approvalStatus", status, "userId" FROM "PerformanceAgreement" WHERE "userId" = $1 AND "isAdhocContainer" = false LIMIT 5', [u.id])
    console.log('\n=== Agreements for ' + u.email + ' (' + u.id + ') ===')
    console.log(JSON.stringify(agreements.rows, null, 2))
  }

  // Also check total agreements count per user
  const counts = await p.query('SELECT "userId", COUNT(*) as cnt FROM "PerformanceAgreement" WHERE "isAdhocContainer" = false GROUP BY "userId" ORDER BY cnt DESC LIMIT 10')
  console.log('\n=== Top users by agreement count ===')
  console.log(JSON.stringify(counts.rows, null, 2))

  await p.end()
}

main().catch(e => { console.error(e.message); p.end() })
