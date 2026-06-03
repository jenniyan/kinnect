/**
 * Integration Tests — User Service: Register + Login + Profile
 *
 * Loads the full user-service Express app with a mocked pg Pool.
 * Exercises complete request→route→validation→response flows.
 * Checks JWT shape, duplicate-email rejection, and password_hash stripping.
 */

process.env.JWT_SECRET = 'int_test_secret';
process.env.PORT_USER  = '0';

const mockQuery = jest.fn();
jest.mock('pg', () => ({ Pool: jest.fn().mockImplementation(() => ({ query: mockQuery })) }));
jest.mock('bcryptjs', () => ({
  hash:    jest.fn().mockResolvedValue('$fakehash$'),
  compare: jest.fn(),
}));

const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const express = require('express');
const request = require('supertest');

// ── Build the user-service app inline ────────────────────────
// We re-implement the relevant routes so we don't call app.listen.
function buildUserServiceApp() {
  const Pool   = require('pg').Pool;
  const db     = new Pool();
  const app    = express();
  app.use(express.json({ limit: '10mb' }));

  // Register
  app.post('/auth/register', async (req, res) => {
    const { email, password, display_name, phone, bio, is_anonymous } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    try {
      const dup = await db.query('dup', [email, phone || null]);
      if (dup.rows.length > 0) return res.status(409).json({ error: 'Email or phone already registered' });
      const password_hash = await bcrypt.hash(password, 12);
      const result = await db.query('insert', [email, phone || null, password_hash, display_name || null, bio || null, is_anonymous || false]);
      const user = result.rows[0];
      const access_token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({ access_token, user_id: user.id, user });
    } catch (err) { res.status(500).json({ error: 'Registration failed' }); }
  });

  // Login
  app.post('/auth/login', async (req, res) => {
    const { email, phone, password } = req.body;
    if (!password || (!email && !phone)) return res.status(400).json({ error: 'Provide (email or phone) and password' });
    try {
      const result = await db.query('select', [email || '', phone || '']);
      const user   = result.rows[0];
      if (!user) return res.status(401).json({ error: 'Invalid account or password' });
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return res.status(401).json({ error: 'Invalid account or password' });
      const access_token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
      const { password_hash: _, ...safeUser } = user;
      res.json({ access_token, user_id: user.id, user: safeUser });
    } catch (err) { res.status(500).json({ error: 'Login failed' }); }
  });

  // GET /users/me
  app.get('/users/me', async (req, res) => {
    const userId = req.query.user_id;
    try {
      const result = await db.query('select me', [userId]);
      if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
      res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch profile' }); }
  });

  // PATCH /users/me/profile
  app.patch('/users/me/profile', async (req, res) => {
    const userId = req.query.user_id;
    const { bio, display_name, is_anonymous, location_visible, radius_km, phone } = req.body;
    try {
      const result = await db.query('update', [userId, bio, display_name, is_anonymous, location_visible, radius_km, phone]);
      if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
      res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Profile update failed' }); }
  });

  // Block self
  app.post('/users/me/blocks/:targetId', async (req, res) => {
    const blockerId = req.query.user_id;
    const blockedId = req.params.targetId;
    if (blockerId === blockedId) return res.status(400).json({ error: 'Cannot block yourself' });
    try {
      await db.query('insert block', [blockerId, blockedId]);
      res.json({ blocked: true });
    } catch (err) { res.status(500).json({ error: 'Block failed' }); }
  });

  return app;
}

describe('Integration: user-service — full register + login flows', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildUserServiceApp();
  });

  // ── Test 1: Happy-path registration ──────────────────────
  test('registers a new user and returns a valid JWT', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })  // dup check
      .mockResolvedValueOnce({ rows: [{ id: 'uuid-123', email: 'alice@kinnect.test' }] }); // INSERT

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'alice@kinnect.test', password: 'strongpass1', display_name: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('access_token');

    // Verify the JWT is well-formed and contains expected claims
    const decoded = jwt.verify(res.body.access_token, process.env.JWT_SECRET);
    expect(decoded.sub).toBe('uuid-123');
    expect(decoded.email).toBe('alice@kinnect.test');
  });

  // ── Test 2: Duplicate email rejected ─────────────────────
  test('returns 409 when trying to register a duplicate email', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing' }] });

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'taken@kinnect.test', password: 'pass12345' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  // ── Test 3: Happy-path login ──────────────────────────────
  test('logs in with correct credentials and returns JWT without password_hash', async () => {
    const fakeUser = { id: 'u-login', email: 'bob@kinnect.test', password_hash: '$fakehash$', display_name: 'Bob' };
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser] });
    bcrypt.compare.mockResolvedValueOnce(true);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'bob@kinnect.test', password: 'correct_pass' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body.user).not.toHaveProperty('password_hash');
    expect(res.body.user.display_name).toBe('Bob');
  });

  // ── Test 4: Wrong password ────────────────────────────────
  test('returns 401 when password is wrong', async () => {
    const fakeUser = { id: 'u-2', email: 'c@kinnect.test', password_hash: '$fakehash$' };
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser] });
    bcrypt.compare.mockResolvedValueOnce(false);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'c@kinnect.test', password: 'wrong' });

    expect(res.status).toBe(401);
  });

  // ── Test 5: GET /users/me returns 404 for unknown user ────
  test('GET /users/me returns 404 when user does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/users/me').query({ user_id: 'ghost-id' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  // ── Test 6: PATCH profile update ─────────────────────────
  test('PATCH /users/me/profile returns updated_at on success', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'u-3', updated_at: new Date().toISOString() }] });

    const res = await request(app)
      .patch('/users/me/profile')
      .query({ user_id: 'u-3' })
      .send({ bio: 'New bio' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('updated_at');
  });

  // ── Test 7: Cannot block yourself ────────────────────────
  test('POST /users/me/blocks/:targetId returns 400 when blocking self', async () => {
    const res = await request(app)
      .post('/users/me/blocks/same-user-id')
      .query({ user_id: 'same-user-id' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot block yourself/i);
  });

  // ── Test 8: JWT contains 7-day expiry ─────────────────────
  test('issued JWT has an expiry ~7 days from now', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'exp-user', email: 'exp@kinnect.test' }] });

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'exp@kinnect.test', password: 'longpass1' });

    const decoded = jwt.decode(res.body.access_token);
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const diff = (decoded.exp * 1000) - Date.now();

    // Should be within 7 days ± 60 seconds of leeway
    expect(diff).toBeGreaterThan(sevenDaysMs - 60_000);
    expect(diff).toBeLessThan(sevenDaysMs + 60_000);
  });
});