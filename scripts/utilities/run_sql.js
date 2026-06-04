const { Pool } = require('/home/afanuel/my_nsa_desk/node_modules/.pnpm/pg@8.17.2/node_modules/pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const sql = fs.readFileSync('/home/afanuel/my_nsa_desk/create_project_tables.sql', 'utf8');
const stmts = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

async function run() {
  const client = await pool.connect();
  for (const stmt of stmts) {
    try {
      await client.query(stmt + ';');
      console.log('OK:', stmt.substring(0, 60) + '...');
    } catch (e) {
      console.error('ERR:', e.message.substring(0, 120));
    }
  }
  client.release();
  await pool.end();
  console.log('DONE');
}

run();
