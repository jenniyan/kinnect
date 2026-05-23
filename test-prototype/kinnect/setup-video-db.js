// setup-videos-db.js — run from kinnect/: node setup-videos-db.js
// Creates the videos, video_tags, and video_likes tables in USER_DB.
require('dotenv').config();
const { Pool } = require('pg');
const db = new Pool({ connectionString: process.env.USER_DB_URL });

async function run() {
  const client = await db.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        r2_key           TEXT NOT NULL,
        lat              DOUBLE PRECISION NOT NULL,
        lng              DOUBLE PRECISION NOT NULL,
        trigger_radius_m INTEGER NOT NULL DEFAULT 300,
        caption          TEXT NOT NULL DEFAULT '',
        visibility       TEXT NOT NULL DEFAULT 'nearby' CHECK (visibility IN ('public','nearby','friends')),
        like_count       INTEGER NOT NULL DEFAULT 0,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at       TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
      );
    `);
    console.log('✓ videos table');

    await client.query(`
      CREATE TABLE IF NOT EXISTS video_tags (
        video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        tag_id   UUID NOT NULL REFERENCES tags(id)   ON DELETE CASCADE,
        PRIMARY KEY (video_id, tag_id)
      );
    `);
    console.log('✓ video_tags table');

    await client.query(`
      CREATE TABLE IF NOT EXISTS video_likes (
        video_id   UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        user_id    UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (video_id, user_id)
      );
    `);
    console.log('✓ video_likes table');

    // Index for nearby query
    await client.query(`
      CREATE INDEX IF NOT EXISTS videos_lat_lng_idx ON videos(lat, lng);
      CREATE INDEX IF NOT EXISTS videos_expires_idx ON videos(expires_at);
    `);
    console.log('✓ indexes');
    console.log('\nDone. Start the video-service and try recording!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await db.end();
  }
}
run();