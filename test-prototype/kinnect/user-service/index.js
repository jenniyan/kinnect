// user-service/index.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { Pool } = require('pg');
const cors     = require('cors');

const app  = express();
const PORT = process.env.PORT_USER || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production';

const db = new Pool({ connectionString: process.env.USER_DB_URL });

app.use(cors());
app.use(express.json({ limit: '10mb' })); // increased for base64 avatar

// ── Health ────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true, service: 'user-service' }));

// ── Auth: Register ────────────────────────────────────────────
app.post('/auth/register', async (req, res) => {
  const { email, password, display_name, phone, bio, is_anonymous } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const dup = await db.query(
      'SELECT id FROM users WHERE email = $1 OR (phone IS NOT NULL AND phone = $2)',
      [email, phone || null]
    );
    if (dup.rows.length > 0) return res.status(409).json({ error: 'Email or phone already registered' });

    const password_hash = await bcrypt.hash(password, 12);
    const result = await db.query(
      `INSERT INTO users (email, phone, password_hash, display_name, bio, is_anonymous)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, display_name, is_anonymous, location_visible, radius_km, created_at`,
      [email, phone || null, password_hash, display_name || null, bio || null, is_anonymous || false]
    );
    const user = result.rows[0];
    const access_token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ access_token, user_id: user.id, user });
  } catch (err) {
    console.error('[register]', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── Auth: Login ───────────────────────────────────────────────
app.post('/auth/login', async (req, res) => {
  const { email, phone, password } = req.body;
  if (!password || (!email && !phone)) return res.status(400).json({ error: 'Provide (email or phone) and password' });

  try {
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1 OR phone = $2 LIMIT 1',
      [email || '', phone || '']
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid account or password' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid account or password' });

    const access_token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    const { password_hash: _, ...safeUser } = user;
    res.json({ access_token, user_id: user.id, user: safeUser });
  } catch (err) {
    console.error('[login]', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── Profile: Get own ──────────────────────────────────────────
app.get('/users/me', async (req, res) => {
  const userId = req.query.user_id;
  try {
    const result = await db.query(
      `SELECT u.id, u.email, u.phone, u.display_name, u.bio, u.avatar_url,
              u.is_anonymous, u.location_visible, u.radius_km, u.created_at, u.updated_at,
              COALESCE(
                json_agg(DISTINCT jsonb_build_object('platform', ea.platform, 'handle', ea.handle))
                FILTER (WHERE ea.id IS NOT NULL), '[]'
              ) AS external_accounts
       FROM users u
       LEFT JOIN external_accounts ea ON ea.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[get /users/me]', err.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── Profile: Update own ───────────────────────────────────────
app.patch('/users/me/profile', async (req, res) => {
  const userId = req.query.user_id;
  const { bio, display_name, is_anonymous, location_visible, radius_km, phone } = req.body;

  try {
    const result = await db.query(
      `UPDATE users SET
         bio              = COALESCE($2, bio),
         display_name     = COALESCE($3, display_name),
         is_anonymous     = COALESCE($4, is_anonymous),
         location_visible = COALESCE($5, location_visible),
         radius_km        = COALESCE($6, radius_km),
         phone            = COALESCE($7, phone),
         updated_at       = now()
       WHERE id = $1
       RETURNING id, updated_at`,
      [userId, bio, display_name, is_anonymous, location_visible, radius_km, phone]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[patch profile]', err.message);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// ── Avatar: Upload (base64) ───────────────────────────────────
// POST /users/me/avatar
// Body: { avatar_data: "data:image/jpeg;base64,..." }
app.post('/users/me/avatar', async (req, res) => {
  const userId = req.query.user_id;
  const { avatar_data } = req.body;

  if (!avatar_data) return res.status(400).json({ error: 'avatar_data required' });

  // Basic validation — must be a data URI
  if (!avatar_data.startsWith('data:image/')) {
    return res.status(400).json({ error: 'avatar_data must be a base64 image data URI' });
  }

  // Limit to ~2MB of base64 (~1.5MB actual image)
  if (avatar_data.length > 2_800_000) {
    return res.status(413).json({ error: 'Image too large. Please choose a smaller photo.' });
  }

  try {
    await db.query(
      'UPDATE users SET avatar_url = $2, updated_at = now() WHERE id = $1',
      [userId, avatar_data]
    );
    res.json({ avatar_url: avatar_data });
  } catch (err) {
    console.error('[post avatar]', err.message);
    res.status(500).json({ error: 'Avatar upload failed' });
  }
});

// ── Profile: Get by ID (public) ───────────────────────────────
app.get('/users/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.avatar_url,
         CASE WHEN u.is_anonymous THEN NULL ELSE u.display_name END AS display_name,
         CASE WHEN u.is_anonymous THEN NULL ELSE u.bio END AS bio,
         u.is_anonymous, u.location_visible, u.radius_km,
         COALESCE(
           json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'category', t.category))
           FILTER (WHERE t.id IS NOT NULL), '[]'
         ) AS tags
       FROM users u
       LEFT JOIN user_tags ut ON ut.user_id = u.id
       LEFT JOIN tags t ON t.id = ut.tag_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[get user by id]', err.message);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ── Batch profile fetch ───────────────────────────────────────
app.post('/users/batch', async (req, res) => {
  const { user_ids } = req.body;
  if (!Array.isArray(user_ids) || user_ids.length === 0) return res.json({ users: [] });
  try {
    const result = await db.query(
      `SELECT u.id, u.avatar_url,
         CASE WHEN u.is_anonymous THEN NULL ELSE u.display_name END AS display_name,
         u.is_anonymous, u.location_visible,
         COALESCE(
           json_agg(DISTINCT jsonb_build_object('name', t.name, 'category', t.category))
           FILTER (WHERE t.id IS NOT NULL), '[]'
         ) AS tags
       FROM users u
       LEFT JOIN user_tags ut ON ut.user_id = u.id
       LEFT JOIN tags t ON t.id = ut.tag_id
       WHERE u.id = ANY($1::uuid[])
       GROUP BY u.id`,
      [user_ids]
    );
    const users = result.rows.map(u => ({
      ...u,
      tags: typeof u.tags === 'string' ? JSON.parse(u.tags) : (u.tags || []),
    }));
    res.json({ users });
  } catch (err) {
    console.error('[batch users]', err.message);
    res.status(500).json({ error: 'Batch fetch failed' });
  }
});

// ── Block list ────────────────────────────────────────────────
app.post('/users/me/blocks/:targetId', async (req, res) => {
  const blockerId = req.query.user_id;
  const blockedId = req.params.targetId;
  if (blockerId === blockedId) return res.status(400).json({ error: 'Cannot block yourself' });
  try {
    await db.query(
      'INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [blockerId, blockedId]
    );
    res.json({ blocked: true });
  } catch (err) {
    console.error('[block]', err.message);
    res.status(500).json({ error: 'Block failed' });
  }
});

app.delete('/users/me/blocks/:targetId', async (req, res) => {
  const blockerId = req.query.user_id;
  try {
    await db.query('DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2', [blockerId, req.params.targetId]);
    res.json({ unblocked: true });
  } catch (err) {
    res.status(500).json({ error: 'Unblock failed' });
  }
});

app.get('/users/me/blocks', async (req, res) => {
  const userId = req.query.user_id;
  try {
    const result = await db.query('SELECT blocked_id, created_at FROM blocks WHERE blocker_id = $1', [userId]);
    res.json({ blocked_users: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch blocks' });
  }
});

app.get('/users/is-blocked', async (req, res) => {
  const { blocker_id, blocked_id } = req.query;
  try {
    const result = await db.query('SELECT 1 FROM blocks WHERE blocker_id = $1 AND blocked_id = $2', [blocker_id, blocked_id]);
    res.json({ is_blocked: result.rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: 'Check failed' });
  }
});

// ── External accounts ─────────────────────────────────────────
app.put('/users/me/external/:platform', async (req, res) => {
  const userId = req.query.user_id;
  const { platform } = req.params;
  const { handle } = req.body;
  if (!handle) return res.status(400).json({ error: 'handle is required' });
  try {
    await db.query(
      `INSERT INTO external_accounts (user_id, platform, handle)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, platform) DO UPDATE SET handle = EXCLUDED.handle`,
      [userId, platform, handle]
    );
    res.json({ platform, handle });
  } catch (err) {
    console.error('[put external]', err.message);
    res.status(500).json({ error: 'Failed to save external account' });
  }
});

app.delete('/users/me/external/:platform', async (req, res) => {
  const userId = req.query.user_id;
  try {
    await db.query('DELETE FROM external_accounts WHERE user_id = $1 AND platform = $2', [userId, req.params.platform]);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

app.get('/users/:id/external', async (req, res) => {
  try {
    const result = await db.query('SELECT platform, handle FROM external_accounts WHERE user_id = $1', [req.params.id]);
    res.json({ accounts: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch external accounts' });
  }
});

// ── Tags ──────────────────────────────────────────────────────
app.post('/users/me/tags', async (req, res) => {
  const userId = req.query.user_id;
  const { tag_ids } = req.body;
  if (!Array.isArray(tag_ids) || tag_ids.length === 0) return res.status(400).json({ error: 'tag_ids array required' });
  try {
    const values = tag_ids.map((tid, i) => `($1, $${i + 2})`).join(', ');
    await db.query(
      `INSERT INTO user_tags (user_id, tag_id) VALUES ${values} ON CONFLICT DO NOTHING`,
      [userId, ...tag_ids]
    );
    res.json({ added: tag_ids.length });
  } catch (err) {
    console.error('[add tags]', err.message);
    res.status(500).json({ error: 'Failed to add tags' });
  }
});

app.delete('/users/me/tags/:tagId', async (req, res) => {
  const userId = req.query.user_id;
  try {
    await db.query('DELETE FROM user_tags WHERE user_id = $1 AND tag_id = $2', [userId, req.params.tagId]);
    res.json({ removed: true });
  } catch (err) {
    res.status(500).json({ error: 'Remove tag failed' });
  }
});

// ── Routing requests ──────────────────────────────────────────
// ── Batch fetch subtags for multiple users ────────────────────
// POST /users/batch-subtags
// Body: { user_ids: string[] }
// Returns: { [user_id]: { [parent_tag_id]: string[] } }
app.post('/users/batch-subtags', async (req, res) => {
  const { user_ids } = req.body;
  if (!Array.isArray(user_ids) || user_ids.length === 0) return res.json({ subtags: {} });
  try {
    const result = await db.query(
      `SELECT ut.user_id, t.name, t.parent_tag_id
       FROM user_tags ut
       JOIN tags t ON t.id = ut.tag_id
       WHERE ut.user_id = ANY($1) AND t.parent_tag_id IS NOT NULL`,
      [user_ids]
    );
    const subtags = {};
    for (const row of result.rows) {
      if (!subtags[row.user_id]) subtags[row.user_id] = {};
      if (!subtags[row.user_id][row.parent_tag_id]) subtags[row.user_id][row.parent_tag_id] = [];
      subtags[row.user_id][row.parent_tag_id].push(row.name);
    }
    res.json({ subtags });
  } catch (err) {
    console.error('[batch-subtags]', err.message);
    res.status(500).json({ error: 'Failed to fetch subtags' });
  }
});

app.post('/routing-requests', async (req, res) => {
  const requesterId = req.query.user_id;
  const { target_id } = req.body;
  if (!target_id) return res.status(400).json({ error: 'target_id required' });
  try {
    const result = await db.query(
      `INSERT INTO routing_requests (requester_id, target_id) VALUES ($1, $2) RETURNING *`,
      [requesterId, target_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[create routing request]', err.message);
    res.status(500).json({ error: 'Failed to create routing request' });
  }
});

app.patch('/routing-requests/:id', async (req, res) => {
  const userId = req.query.user_id;
  const { status } = req.body;
  const valid = ['accepted', 'declined', 'cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
  try {
    const result = await db.query(
      `UPDATE routing_requests SET status = $2, resolved_at = now()
       WHERE id = $1 AND (target_id = $3 OR requester_id = $3) RETURNING *`,
      [req.params.id, status, userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Request not found or unauthorized' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

app.listen(PORT, () => console.log(`✓ user-service listening on :${PORT}`));