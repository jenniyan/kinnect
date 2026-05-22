// debug-nearby.js
// Run from kinnect/ folder: node debug-nearby.js
// Shows exactly what Redis has and what the nearby query returns.

require('dotenv').config();
const { Pool } = require('pg');
const Redis    = require('ioredis');

const db    = new Pool({ connectionString: process.env.USER_DB_URL });
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const GEO_KEY = 'geo:users';

async function run() {
  const client = await db.connect();
  try {
    // 1. Check fake users exist in DB
    console.log('\n── Fake users in DB ──────────────────────');
    const users = await client.query(
      `SELECT u.id, u.email, u.display_name, u.location_visible, u.is_anonymous,
              COUNT(ut.tag_id) AS tag_count
       FROM users u
       LEFT JOIN user_tags ut ON ut.user_id = u.id
       WHERE u.email LIKE '%@kinnect.test'
       GROUP BY u.id`
    );
    if (users.rows.length === 0) {
      console.log('  ✗ No fake users found — run fake-nearby-user.js first');
    } else {
      for (const u of users.rows) {
        console.log(`  ✓ ${u.display_name} (${u.email})`);
        console.log(`    id: ${u.id}`);
        console.log(`    location_visible: ${u.location_visible}, is_anonymous: ${u.is_anonymous}, tags: ${u.tag_count}`);
      }
    }

    // 2. Check Redis geo entries
    console.log('\n── Redis geo entries ─────────────────────');
    const geoCount = await redis.zcard(GEO_KEY);
    console.log(`  ${geoCount} total entries in ${GEO_KEY}`);

    for (const u of users.rows) {
      const pos = await redis.geopos(GEO_KEY, u.id);
      const ttl = await redis.ttl(`user:${u.id}:location`);
      if (pos[0]) {
        console.log(`  ✓ ${u.display_name}: lng=${parseFloat(pos[0][0]).toFixed(5)}, lat=${parseFloat(pos[0][1]).toFixed(5)}, TTL=${ttl}s`);
      } else {
        console.log(`  ✗ ${u.display_name}: NOT in Redis geo set`);
      }
    }

    // 3. Check your own user's location in Redis
    console.log('\n── Your account in Redis ─────────────────');
    const myUser = await client.query(
      `SELECT id, email, display_name FROM users WHERE email NOT LIKE '%@kinnect.test' LIMIT 5`
    );
    for (const u of myUser.rows) {
      const raw = await redis.get(`user:${u.id}:location`);
      const pos = await redis.geopos(GEO_KEY, u.id);
      if (raw) {
        const loc = JSON.parse(raw);
        console.log(`  ✓ ${u.email}: lat=${loc.lat?.toFixed(5)}, lng=${loc.lng?.toFixed(5)}`);
        console.log(`    In geo set: ${pos[0] ? 'yes' : 'NO — this is why nearby fails!'}`);
      } else {
        console.log(`  ✗ ${u.email}: NO location in Redis`);
        console.log(`    → The app must send a location_update before nearby works`);
      }
    }

    // 4. Try a direct geo radius query from the fake users' center
    console.log('\n── Direct geo query (2km from seed center) ──');
    const BASE_LAT = 33.64931;
    const BASE_LNG = -117.84638;
    // Plant a temp point to query from
    await redis.geoadd(GEO_KEY, BASE_LNG, BASE_LAT, '__debug__');
    const nearby = await redis.georadiusbymember(
      GEO_KEY, '__debug__', 2, 'km', 'WITHCOORD', 'WITHDIST', 'ASC', 'COUNT', 20
    );
    await redis.zrem(GEO_KEY, '__debug__');
    console.log(`  Found ${nearby.length - 1} entries within 2km of seed center:`);
    for (const entry of nearby) {
      if (entry[0] === '__debug__') continue;
      console.log(`  · ${entry[0]} — ${parseFloat(entry[1]).toFixed(3)} km`);
    }

  } finally {
    client.release();
    await db.end();
    await redis.quit();
  }
}

run().catch(console.error);