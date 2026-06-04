// db/migrate.js
// Run: node db/migrate.js
// Creates all tables in kinnect_users and kinnect_messages databases.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Client } = require('pg');

const USER_DB_URL  = process.env.USER_DB_URL  || 'postgresql://postgres:password@localhost:5432/kinnect_users';
const MSG_DB_URL   = process.env.MSG_DB_URL    || 'postgresql://postgres:password@localhost:5432/kinnect_messages';

// ── User DB schema ────────────────────────────────────────────
const USER_DB_SQL = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email            VARCHAR(255) UNIQUE NOT NULL,
  phone            VARCHAR(30)  UNIQUE,
  password_hash    TEXT        NOT NULL,
  display_name     VARCHAR(100),
  bio              TEXT,
  is_anonymous     BOOLEAN     NOT NULL DEFAULT false,
  location_visible BOOLEAN     NOT NULL DEFAULT true,
  radius_km        INTEGER     NOT NULL DEFAULT 2,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS external_accounts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform    VARCHAR(50) NOT NULL,
  handle      VARCHAR(255) NOT NULL,
  UNIQUE(user_id, platform)
);

CREATE TABLE IF NOT EXISTS tags (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) UNIQUE NOT NULL,
  category    VARCHAR(100) NOT NULL,
  is_custom   BOOLEAN     NOT NULL DEFAULT false,
  created_by  UUID        REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS user_tags (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag_id  UUID NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (user_id, tag_id)
);

CREATE TABLE IF NOT EXISTS blocks (
  blocker_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS routing_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS videos (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  r2_key     TEXT        NOT NULL UNIQUE,
  lat        DOUBLE PRECISION NOT NULL,
  lng        DOUBLE PRECISION NOT NULL,
  trigger_radius_m INTEGER NOT NULL DEFAULT 300,
  caption    TEXT,
  visibility VARCHAR(20) NOT NULL DEFAULT 'nearby',
  like_count INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS video_tags (
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  tag_id   UUID NOT NULL REFERENCES tags(id)   ON DELETE CASCADE,
  PRIMARY KEY (video_id, tag_id)
);

CREATE TABLE IF NOT EXISTS video_likes (
  video_id   UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (video_id, user_id)
);

-- Updated_at trigger for users
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
`;

// Seed predefined tags after users schema is created
const SEED_TAGS_SQL = `
INSERT INTO tags (name, category, is_custom) VALUES
  ('Pickleball','Sports',false), ('Tennis','Sports',false), ('Volleyball','Sports',false),
  ('Running','Sports',false), ('Climbing','Sports',false), ('Yoga','Sports',false),
  ('Soccer','Sports',false), ('Basketball','Sports',false), ('Skateboarding','Sports',false),
  ('Photography','Arts',false), ('Film','Arts',false), ('Music','Arts',false),
  ('Drawing','Arts',false), ('Writing','Arts',false), ('Pottery','Arts',false),
  ('Hiking','Outdoors',false), ('Camping','Outdoors',false), ('Surfing','Outdoors',false),
  ('Biking','Outdoors',false), ('Gardening','Outdoors',false),
  ('Coffee','Food',false), ('Brunch','Food',false), ('Cooking','Food',false),
  ('Baking','Food',false), ('Wine','Food',false), ('Vegan','Food',false),
  ('Board Games','Social',false), ('Trivia','Social',false), ('Dancing','Social',false),
  ('Karaoke','Social',false), ('Reading','Social',false)
ON CONFLICT (name) DO NOTHING;
`;

// ── Message DB schema ──────────────────────────────────────────
const MSG_DB_SQL = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS rooms (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type       VARCHAR(10) NOT NULL,
  name       VARCHAR(150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_members (
  room_id    UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  sender_id  UUID        NOT NULL,
  content    TEXT        NOT NULL,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_room_sent ON messages (room_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS message_reads (
  message_id UUID        NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  reader_id  UUID        NOT NULL,
  read_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, reader_id)
);
`;

async function run(dbUrl, label, sql, extra) {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  console.log(`\n▸ Connected to ${label}`);
  try {
    await client.query(sql);
    console.log(`  ✓ Schema applied`);
    if (extra) {
      await client.query(extra);
      console.log(`  ✓ Seed data applied`);
    }
  } finally {
    await client.end();
  }
}

(async () => {
  try {
    await run(USER_DB_URL, 'User DB (kinnect_users)', USER_DB_SQL, SEED_TAGS_SQL);
    await run(MSG_DB_URL,  'Message DB (kinnect_messages)', MSG_DB_SQL);
    console.log('\n✅  Migration complete.\n');
  } catch (err) {
    console.error('\n❌  Migration failed:', err.message);
    process.exit(1);
  }
})();
