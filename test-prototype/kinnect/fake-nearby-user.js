// fake-nearby-user.js
// Plants a fake user in the DB and their location in Redis
// so they show up on your map during solo testing.
//
// Usage:
//   node fake-nearby-user.js
//
// To remove them afterward:
//   node fake-nearby-user.js --remove
//
// Run from the kinnect/ folder (same level as .env)

require('dotenv').config();
const { Pool }  = require('pg');
const Redis     = require('ioredis');
const bcrypt    = require('bcryptjs');

const db    = new Pool({ connectionString: process.env.USER_DB_URL });
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const GEO_KEY = 'geo:users';

// ── Config ────────────────────────────────────────────────────
// Offset in degrees from Irvine city center (~0.002° ≈ 200m)
// Adjust BASE_LAT/LNG to match wherever your simulator thinks you are.
const BASE_LAT  = 33.64931;  // Irvine, CA — change to your location
const BASE_LNG  = -117.84638;

const FAKE_USERS = [
  {
    email:        'sam@kinnect.test',
    password:     'password123',
    display_name: 'Sam Okafor',
    bio:          'Down for a pickleball pickup any evening.',
    tags:         ['Pickleball', 'Coffee'],
    // 200m north-east
    lat: BASE_LAT + 0.0018,
    lng: BASE_LNG + 0.0020,
  },
  {
    email:        'mira@kinnect.test',
    password:     'password123',
    display_name: 'Mira Patel',
    bio:          'Sunset chaser. Always carrying a film camera.',
    tags:         ['Photography', 'Hiking'],
    // 400m south
    lat: BASE_LAT - 0.0035,
    lng: BASE_LNG + 0.0005,
  },
  {
    email:        'wren@kinnect.test',
    password:     'password123',
    display_name: 'Wren Ito',
    bio:          'Booking the next board game night. DM for invite.',
    tags:         ['Board Games', 'Music'],
    // 600m west
    lat: BASE_LAT + 0.0005,
    lng: BASE_LNG - 0.0060,
  },
];

async function plant() {
  const client = await db.connect();
  try {
    for (const u of FAKE_USERS) {
      // Upsert user
      const hash = await bcrypt.hash(u.password, 10);
      const res  = await client.query(
        `INSERT INTO users (email, password_hash, display_name, bio, location_visible, is_anonymous)
         VALUES ($1, $2, $3, $4, true, false)
         ON CONFLICT (email) DO UPDATE
           SET display_name = EXCLUDED.display_name,
               bio          = EXCLUDED.bio,
               location_visible = true
         RETURNING id`,
        [u.email, hash, u.display_name, u.bio]
      );
      const userId = res.rows[0].id;

      // Assign tags
      for (const tagName of u.tags) {
        const tagRes = await client.query(
          'SELECT id FROM tags WHERE name = $1', [tagName]
        );
        if (tagRes.rows[0]) {
          await client.query(
            `INSERT INTO user_tags (user_id, tag_id)
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [userId, tagRes.rows[0].id]
          );
        }
      }

      // Plant location in Redis
      await redis.geoadd(GEO_KEY, u.lng, u.lat, userId);
      await redis.set(
        `user:${userId}:location`,
        JSON.stringify({ lat: u.lat, lng: u.lng, ts: Date.now() }),
        'EX', 86400  // 24h TTL so they stay for testing
      );

      console.log(`✓ ${u.display_name} planted at (${u.lat.toFixed(4)}, ${u.lng.toFixed(4)}) — id: ${userId}`);
    }
    console.log('\nDone. Open the map and they should appear within your radius.');
    console.log('If they don\'t appear, check that your simulator GPS matches BASE_LAT/LNG above.');
  } finally {
    client.release();
    await db.end();
    await redis.quit();
  }
}

async function remove() {
  const client = await db.connect();
  try {
    for (const u of FAKE_USERS) {
      const res = await client.query(
        'SELECT id FROM users WHERE email = $1', [u.email]
      );
      if (!res.rows[0]) { console.log(`· ${u.email} not found`); continue; }
      const userId = res.rows[0].id;

      await client.query('DELETE FROM user_tags WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
      await redis.zrem(GEO_KEY, userId);
      await redis.del(`user:${userId}:location`);
      console.log(`✓ Removed ${u.display_name}`);
    }
  } finally {
    client.release();
    await db.end();
    await redis.quit();
  }
}

if (process.argv.includes('--remove')) {
  remove().catch(console.error);
} else {
  plant().catch(console.error);
}