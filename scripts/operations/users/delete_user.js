const { Pool } = require('/home/afanuel/my_nsa_desk/node_modules/.pnpm/pg@8.17.2/node_modules/pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    // Find the user
    const res = await client.query("SELECT id, email, \"firstName\", \"lastName\" FROM \"User\" WHERE email = 'omwazi@nsa.org.na'");
    if (res.rows.length === 0) {
      console.log('User not found');
      return;
    }
    const userId = res.rows[0].id;
    console.log('Found user:', JSON.stringify(res.rows[0]));

    // Delete related records first
    const tables = [
      { table: 'UserRole', col: 'userId' },
      { table: 'PmsNotification', col: 'receiverId' },
      { table: 'PmsNotification', col: 'senderId' },
      { table: 'PerformanceAgreement', col: 'userId' },
      { table: 'Target', col: 'responsibleId' },
      { table: 'AuditLog', col: 'userId' },
      { table: 'ProjectTeamMember', col: 'userId' },
    ];

    for (const { table, col } of tables) {
      try {
        const r = await client.query(`DELETE FROM "${table}" WHERE "${col}" = $1`, [userId]);
        if (r.rowCount > 0) console.log(`Deleted ${r.rowCount} rows from ${table}.${col}`);
      } catch (e) {
        // Table might not exist, skip
        console.log(`Skip ${table}.${col}: ${e.message.substring(0, 80)}`);
      }
    }

    // Delete the user
    await client.query('DELETE FROM "User" WHERE id = $1', [userId]);
    console.log('User deleted successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
