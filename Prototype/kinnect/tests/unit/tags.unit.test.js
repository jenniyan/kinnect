/**
 * Unit Tests — Tag-Service Validation
 *
 * Tests category validation, name requirement, and basic query behaviour
 * for tag-service/index.js without a real Postgres connection.
 */

const express = require('express');
const request = require('supertest');

const mockQuery = jest.fn();
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({ query: mockQuery })),
}));

process.env.PORT_TAG = '0';

// ── Minimal inline replica of tag-service routes ─────────────
function buildApp() {
  const app  = express();
  const Pool = require('pg').Pool;
  const db   = new Pool();

  app.use(express.json());

  const CATEGORIES = [
    'Sports', 'Arts', 'Outdoors', 'Food', 'Social',
    'Gaming', 'Study', 'Wellness', 'Tech', 'Culture',
  ];

  // GET /tags
  app.get('/tags', async (req, res) => {
    const { q, category, limit = 30 } = req.query;
    try {
      let query = 'SELECT id, name, category, is_custom FROM tags WHERE 1=1';
      const params = [];
      if (q) { params.push(`%${q.toLowerCase()}%`); query += ` AND LOWER(name) LIKE $${params.length}`; }
      if (category) { params.push(category); query += ` AND category = $${params.length}`; }
      params.push(parseInt(limit));
      query += ` ORDER BY is_custom ASC, name ASC LIMIT $${params.length}`;
      const result = await db.query(query, params);
      res.json({ tags: result.rows });
    } catch (err) { res.status(500).json({ error: 'Tag search failed' }); }
  });

  // GET /tags/categories
  app.get('/tags/categories', async (_req, res) => {
    try {
      const result = await db.query('SELECT DISTINCT category FROM tags ORDER BY category');
      res.json({ categories: result.rows.map(r => r.category) });
    } catch (err) { res.status(500).json({ error: 'Failed to fetch categories' }); }
  });

  // POST /tags
  app.post('/tags', async (req, res) => {
    const userId = req.query.user_id;
    const { name, category, parent_tag_id } = req.body;
    if (!name || !category) return res.status(400).json({ error: 'name and category required' });
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `category must be one of: ${CATEGORIES.join(', ')}` });
    }
    try {
      const result = await db.query('INSERT', [name.trim(), category, userId || null, parent_tag_id || null]);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create tag' });
    }
  });

  return app;
}

describe('Unit: tag-service validation', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  // ── Test 1 ────────────────────────────────────────────────
  test('rejects tag creation when name is missing', async () => {
    const res = await request(app).post('/tags').send({ category: 'Sports' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name and category required/i);
  });

  // ── Test 2 ────────────────────────────────────────────────
  test('rejects tag creation when category is missing', async () => {
    const res = await request(app).post('/tags').send({ name: 'Hiking' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name and category required/i);
  });

  // ── Test 3 ────────────────────────────────────────────────
  test('rejects tag creation with an invalid category', async () => {
    const res = await request(app).post('/tags').send({ name: 'Hiking', category: 'InvalidCategory' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/category must be one of/i);
  });

  // ── Test 4 ────────────────────────────────────────────────
  test('creates a tag when name and valid category provided', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'tag-1', name: 'Hiking', category: 'Outdoors', is_custom: true, parent_tag_id: null }],
    });

    const res = await request(app).post('/tags').send({ name: 'Hiking', category: 'Outdoors' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Hiking');
    expect(res.body.category).toBe('Outdoors');
  });

  // ── Test 5 ────────────────────────────────────────────────
  test('GET /tags returns tag list from DB', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 't1', name: 'Basketball', category: 'Sports', is_custom: false },
        { id: 't2', name: 'Soccer',     category: 'Sports', is_custom: false },
      ],
    });

    const res = await request(app).get('/tags').query({ category: 'Sports' });

    expect(res.status).toBe(200);
    expect(res.body.tags).toHaveLength(2);
    expect(res.body.tags[0].name).toBe('Basketball');
  });

  // ── Test 6 ────────────────────────────────────────────────
  test('GET /tags/categories returns distinct category list', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ category: 'Arts' }, { category: 'Sports' }],
    });

    const res = await request(app).get('/tags/categories');

    expect(res.status).toBe(200);
    expect(res.body.categories).toEqual(['Arts', 'Sports']);
  });

  // ── Test 7 ────────────────────────────────────────────────
  test('all ten predefined categories are valid for tag creation', async () => {
    const CATEGORIES = ['Sports', 'Arts', 'Outdoors', 'Food', 'Social', 'Gaming', 'Study', 'Wellness', 'Tech', 'Culture'];

    for (const cat of CATEGORIES) {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'x', name: 'Test', category: cat }] });
      const res = await request(app).post('/tags').send({ name: 'Test', category: cat });
      expect(res.status).toBe(201);
    }
  });
});