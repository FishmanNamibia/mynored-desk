const { Pool } = require('/home/afanuel/my_nsa_desk/node_modules/.pnpm/pg@8.17.2/node_modules/pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const sql = fs.readFileSync('/home/afanuel/my_nsa_desk/create_audit_task_table.sql', 'utf8');
  await pool.query(sql);
  console.log('AuditTask table created successfully');
  await pool.end();
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
