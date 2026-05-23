// debug-chat3.js — run from kinnect/: node debug-chat3.js your@email.com
require('dotenv').config();
const { Pool } = require('pg');
const userDb = new Pool({ connectionString: process.env.USER_DB_URL });
const msgDb  = new Pool({ connectionString: process.env.MSG_DB_URL });

async function run() {
  const email = process.argv[2];
  if (!email) { console.log('Usage: node debug-chat3.js your@email.com'); process.exit(1); }

  const uRes = await userDb.query('SELECT id, display_name FROM users WHERE email = $1', [email]);
  if (!uRes.rows[0]) { console.log('User not found'); process.exit(1); }
  const { id: userId, display_name } = uRes.rows[0];
  console.log(`\nChecking for ${display_name} (${userId})\n`);

  const client = await msgDb.connect();
  try {
    // All rooms the user is in
    const rooms = await client.query(
      `SELECT r.id, r.type, r.name,
              json_agg(DISTINCT rm.user_id) AS member_ids,
              COUNT(DISTINCT m.id) AS message_count
       FROM rooms r
       INNER JOIN room_members rm ON rm.room_id = r.id
       LEFT JOIN messages m ON m.room_id = r.id
       WHERE r.id IN (SELECT room_id FROM room_members WHERE user_id = $1)
       GROUP BY r.id`,
      [userId]
    );

    console.log(`── All rooms (${rooms.rows.length}) ───────────────────────`);
    for (const r of rooms.rows) {
      console.log(`\n  ${r.type.toUpperCase()} — ${r.name || '(no name)'} [${r.id}]`);
      console.log(`  members: ${r.member_ids.join(', ')}`);
      console.log(`  messages: ${r.message_count}`);
    }

    // Check member display names
    if (rooms.rows.length > 0) {
      const allMemberIds = [...new Set(rooms.rows.flatMap(r => r.member_ids))];
      const names = await userDb.query(
        'SELECT id, display_name, email FROM users WHERE id = ANY($1::uuid[])',
        [allMemberIds]
      );
      console.log('\n── Member names ──────────────────────────');
      for (const u of names.rows) {
        console.log(`  ${u.id}: ${u.display_name || u.email}`);
      }
    }
  } finally {
    client.release();
    await msgDb.end();
    await userDb.end();
  }
}
run().catch(console.error);