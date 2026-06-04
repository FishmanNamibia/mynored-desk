const { Pool } = require('pg')
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}

const p = new Pool({ connectionString: process.env.DATABASE_URL })
async function main() {
  const cols = await p.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'User' ORDER BY ordinal_position")
  console.log('User columns:', cols.rows.map(r => r.column_name).join(', '))
  await p.end()
}
main().catch(e => { console.error(e.message); p.end() })
