// check-redis.js — run from kinnect/: node check-redis.js your@email.com
require('dotenv').config();
const { Pool } = require('pg');
const Redis    = require('ioredis');

const db    = new Pool({ connectionString: process.env.USER_DB_URL });
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const GEO_KEY = 'geo:users';

async function run() {
  const email  = process.argv[2];
  const client = await db.connect();
  try {
    const res = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (!res.rows[0]) { console.log('User not found'); return; }
    const id = res.rows[0].id;
    console.log('DB user id:    ', id);

    const raw = await redis.get(`user:${id}:location`);
    console.log('Redis location key:', raw ? JSON.parse(raw) : 'MISSING');

    const pos = await redis.geopos(GEO_KEY, id);
    console.log('Redis geo entry:   ', pos[0] ? `lng=${pos[0][0]}, lat=${pos[0][1]}` : 'MISSING');

    // Also check what the location-service would receive
    console.log('\nThe gateway sends this user_id to location-service:', id);
    console.log('Does it match the geo key?', pos[0] ? 'YES ✓' : 'NO ✗ — mismatch!');
  } finally {
    client.release();
    await db.end();
    await redis.quit();
  }
}
run().catch(console.error);