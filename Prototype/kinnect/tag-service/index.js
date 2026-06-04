// tag-service/index.js
// Manages predefined + custom tags, search, and tag↔user associations.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express  = require('express');
const { Pool } = require('pg');
const cors     = require('cors');

const app  = express();
const PORT = process.env.PORT_TAG || 3003;
const db   = new Pool({ connectionString: process.env.USER_DB_URL });

app.use(cors());
app.use(express.json());

// ── Health ────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true, service: 'tag-service' }));

// ── List / search tags ────────────────────────────────────────
// GET /tags?q=pick&category=Sports&limit=20
app.get('/tags', async (req, res) => {
  const { q, category, limit = 30 } = req.query;
  try {
    let query = 'SELECT id, name, category, is_custom FROM tags WHERE 1=1';
    const params = [];

    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      query += ` AND LOWER(name) LIKE $${params.length}`;
    }
    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    params.push(parseInt(limit));
    query += ` ORDER BY is_custom ASC, name ASC LIMIT $${params.length}`;

    const result = await db.query(query, params);
    res.json({ tags: result.rows });
  } catch (err) {
    console.error('[get tags]', err.message);
    res.status(500).json({ error: 'Tag search failed' });
  }
});

// ── List all categories ───────────────────────────────────────
// GET /tags/categories
app.get('/tags/categories', async (_req, res) => {
  try {
    const result = await db.query(
      'SELECT DISTINCT category FROM tags ORDER BY category'
    );
    res.json({ categories: result.rows.map(r => r.category) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ── Get a single tag ──────────────────────────────────────────
// GET /tags/:id
app.get('/tags/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, category, is_custom FROM tags WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Tag not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tag' });
  }
});

// ── Create custom tag ─────────────────────────────────────────
// POST /tags
// Body: { name, category, parent_tag_id }
app.post('/tags', async (req, res) => {
  const userId = req.query.user_id;
  const { name, category, parent_tag_id } = req.body;
  if (!name || !category) return res.status(400).json({ error: 'name and category required' });

  const CATEGORIES = [
    'Sports', 'Arts', 'Outdoors', 'Food', 'Social',
    'Gaming', 'Study', 'Wellness', 'Tech', 'Culture',   // ← added
  ];
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `category must be one of: ${CATEGORIES.join(', ')}` });
  }

  try {
    const result = await db.query(
      `INSERT INTO tags (name, category, is_custom, created_by, parent_tag_id)
       VALUES ($1, $2, true, $3, $4)
       ON CONFLICT (name) DO UPDATE
         SET parent_tag_id = COALESCE(EXCLUDED.parent_tag_id, tags.parent_tag_id)
       RETURNING id, name, category, is_custom, parent_tag_id`,
      [name.trim(), category, userId || null, parent_tag_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[create tag]', err.message);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// ── Resolve tag names to IDs (used by gateway when tags[] are strings) ──
// POST /tags/resolve
// Body: { names: string[] }
app.post('/tags/resolve', async (req, res) => {
  const { names } = req.body;
  if (!Array.isArray(names) || names.length === 0) {
    return res.json({ tags: [] });
  }
  try {
    const result = await db.query(
      'SELECT id, name, category FROM tags WHERE name = ANY($1)',
      [names]
    );
    res.json({ tags: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Resolve failed' });
  }
});

// ── Get all tags for a user ───────────────────────────────────
// GET /tags/user/:userId
app.get('/tags/user/:userId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT t.id, t.name, t.category, t.is_custom, t.parent_tag_id,
              COALESCE(
                json_agg(
                  json_build_object('id', s.id, 'name', s.name)
                ) FILTER (WHERE s.id IS NOT NULL), '[]'
              ) AS subtags
       FROM tags t
       INNER JOIN user_tags ut ON ut.tag_id = t.id
       LEFT JOIN tags s ON s.parent_tag_id = t.id
         AND EXISTS (SELECT 1 FROM user_tags ut2 WHERE ut2.tag_id = s.id AND ut2.user_id = $1)
       WHERE ut.user_id = $1 AND t.parent_tag_id IS NULL
       GROUP BY t.id
       ORDER BY t.category, t.name`,
      [req.params.userId]
    );
    res.json({ tags: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user tags' });
  }
});

app.listen(PORT, () => {
  console.log(`✓ tag-service listening on :${PORT}`);
});
