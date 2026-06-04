// debug-chat.js — run from kinnect/: node debug-chat.js
// Checks if the chat DB tables exist and the chat-service is reachable.
require('dotenv').config();
const { Pool } = require('pg');
const axios    = require('axios');

const db = new Pool({ connectionString: process.env.MSG_DB_URL });

async function run() {
  const client = await db.connect();
  try {
    // 1. Check tables exist
    console.log('\n── Chat DB tables ────────────────────────');
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    const names = tables.rows.map(r => r.table_name);
    console.log('  Tables found:', names.join(', ') || 'NONE');

    const needed = ['rooms', 'room_members', 'messages', 'message_reads'];
    for (const t of needed) {
      console.log(`  ${names.includes(t) ? '✓' : '✗ MISSING'} ${t}`);
    }

    // 2. Check room count
    if (names.includes('rooms')) {
      const rooms = await client.query('SELECT COUNT(*) FROM rooms');
      const msgs  = await client.query('SELECT COUNT(*) FROM messages');
      console.log(`\n  ${rooms.rows[0].count} rooms, ${msgs.rows[0].count} messages`);
    }

    // 3. Ping chat-service
    console.log('\n── Chat service health ───────────────────');
    try {
      const res = await axios.get('http://localhost:3004/health', { timeout: 2000 });
      console.log('  ✓ chat-service running:', res.data);
    } catch {
      console.log('  ✗ chat-service NOT reachable on port 3004');
    }

  } finally {
    client.release();
    await db.end();
  }
}
run().catch(console.error);