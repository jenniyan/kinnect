// plant-my-location.js
// Manually plants YOUR location in Redis so nearby works immediately.
// Run from kinnect/ folder: node plant-my-location.js your@email.com
//
// Example: node plant-my-location.js jenniy16@uci.edu

require('dotenv').config();
const { Pool } = require('pg');
const Redis    = require('ioredis');

const db    = new Pool({ connectionString: process.env.USER_DB_URL });
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const GEO_KEY = 'geo:users';

const BASE_LAT = 33.64931;
const BASE_LNG = -117.84638;

async function run() {
  const email = process.argv[2];
  if (!email) {
    console.log('Usage: node plant-my-location.js your@email.com');
    process.exit(1);
  }

  const client = await db.connect();
  try {
    const res = await client.query('SELECT id, email FROM users WHERE email = $1', [email]);
    if (!res.rows[0]) {
      console.log(`✗ No user found with email: ${email}`);
      process.exit(1);
    }
    const { id, email: userEmail } = res.rows[0];

    await redis.geoadd(GEO_KEY, BASE_LNG, BASE_LAT, id);
    await redis.set(
      `user:${id}:location`,
      JSON.stringify({ lat: BASE_LAT, lng: BASE_LNG, ts: Date.now() }),
      'EX', 86400
    );

    console.log(`✓ Planted location for ${userEmail}`);
    console.log(`  lat: ${BASE_LAT}, lng: ${BASE_LNG}`);
    console.log(`\nNow open the map — the fake users should appear.`);
  } finally {
    client.release();
    await db.end();
    await redis.quit();
  }
}

run().catch(console.error);