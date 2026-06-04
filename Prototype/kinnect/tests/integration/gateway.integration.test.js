/**
 * Integration Tests — API Gateway: JWT Enforcement
 *
 * Builds a self-contained Express app that replicates the gateway's
 * auth middleware and route registration, without importing the
 * gateway module directly (which calls server.listen at load time).
 *
 * Verifies:
 *  - Every protected route returns 401 without a valid JWT
 *  - Public routes (/auth/register, /auth/login, /health) are reachable
 *  - Expired / wrong-secret tokens are rejected
 */

const express  = require('express');
const http     = require('http');
const jwt      = require('jsonwebtoken');
const request  = require('supertest');

const JWT_SECRET = 'integration_gw_secret';

// ── Stub axios (no real upstream calls) ──────────────────────
jest.mock('axios', () =>
  Object.assign(
    jest.fn().mockResolvedValue({ status: 200, data: {} }),
    {
      post: jest.fn().mockResolvedValue({ status: 200, data: {} }),
      get:  jest.fn().mockResolvedValue({ status: 200, data: {} }),
    }
  )
);

// ── Mock ioredis ──────────────────────────────────────────────
jest.mock('ioredis', () => jest.fn().mockImplementation(() => ({
  subscribe: jest.fn(),
  on:        jest.fn(),
})));

// ── Build a minimal gateway app matching the real middleware ──
function buildGatewayApp() {
  const app   = express();
  const axios = require('axios');

  app.use(express.json());

  // requireAuth middleware (exact copy from gateway)
  function requireAuth(req, res, next) {
    const header = req.headers['authorization'];
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }
    try {
      req.user = jwt.verify(header.slice(7), JWT_SECRET);
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  // proxyReq helper (simplified)
  async function proxyReq(req, res, targetUrl, overrideBody) {
    try {
      const method = req.method.toLowerCase();
      const config = { method, url: targetUrl, headers: { 'content-type': 'application/json' }, params: req.query };
      if (['post', 'put', 'patch'].includes(method)) config.data = overrideBody || req.body;
      const upstream = await axios(config);
      return res.status(upstream.status).json(upstream.data);
    } catch (err) {
      return res.status(err.response?.status || 502).json(err.response?.data || { error: 'Upstream service error' });
    }
  }

  // Public routes
  app.get('/health', (_req, res) => res.json({ ok: true, service: 'api-gateway' }));
  app.post('/auth/register', (req, res) => proxyReq(req, res, 'http://localhost:3001/auth/register'));
  app.post('/auth/login',    async (req, res) => {
    try {
      const upstream = await axios.post('http://localhost:3001/auth/login', req.body);
      res.json(upstream.data);
    } catch (err) {
      res.status(err.response?.status || 502).json(err.response?.data || { error: 'Login failed' });
    }
  });

  // Protected routes
  app.use(requireAuth);
  app.get('/users/me',     (req, res) => proxyReq(req, res, 'http://localhost:3001/users/me'));
  app.get('/users/nearby', (req, res) => proxyReq(req, res, 'http://localhost:3002/location/nearby'));
  app.get('/tags',         (req, res) => proxyReq(req, res, 'http://localhost:3003/tags'));
  app.post('/rooms',       (req, res) => proxyReq(req, res, 'http://localhost:3004/rooms'));
  app.get('/rooms/:id/messages', (req, res) => proxyReq(req, res, `http://localhost:3004/rooms/${req.params.id}/messages`));
  app.post('/media/upload-url',  (req, res) => proxyReq(req, res, 'http://localhost:3006/media/upload-url'));

  return app;
}

function makeToken(payload = {}, secret = JWT_SECRET, opts = {}) {
  return jwt.sign({ sub: 'test-uid', email: 'test@kinnect.test', ...payload }, secret, { expiresIn: '1h', ...opts });
}

describe('Integration: API Gateway — JWT enforcement on protected routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildGatewayApp();
  });

  // ── Test 1 ────────────────────────────────────────────────
  test('GET /users/me returns 401 with no Authorization header', async () => {
    const res = await request(app).get('/users/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/missing/i);
  });

  // ── Test 2 ────────────────────────────────────────────────
  test('GET /users/nearby returns 401 with no Authorization header', async () => {
    const res = await request(app).get('/users/nearby');
    expect(res.status).toBe(401);
  });

  // ── Test 3 ────────────────────────────────────────────────
  test('GET /tags returns 401 with no Authorization header', async () => {
    const res = await request(app).get('/tags');
    expect(res.status).toBe(401);
  });

  // ── Test 4 ────────────────────────────────────────────────
  test('POST /rooms returns 401 with no Authorization header', async () => {
    const res = await request(app).post('/rooms').send({ name: 'test room' });
    expect(res.status).toBe(401);
  });

  // ── Test 5 ────────────────────────────────────────────────
  test('GET /rooms/:id/messages returns 401 without token', async () => {
    const res = await request(app).get('/rooms/abc123/messages');
    expect(res.status).toBe(401);
  });

  // ── Test 6 ────────────────────────────────────────────────
  test('POST /media/upload-url returns 401 without token', async () => {
    const res = await request(app).post('/media/upload-url').send({});
    expect(res.status).toBe(401);
  });

  // ── Test 7 ────────────────────────────────────────────────
  test('returns 401 for an expired token', async () => {
    const expired = makeToken({}, JWT_SECRET, { expiresIn: -10 });
    const res     = await request(app).get('/users/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid or expired/i);
  });

  // ── Test 8 ────────────────────────────────────────────────
  test('returns 401 for a token signed with the wrong secret', async () => {
    const badToken = makeToken({}, 'wrong_secret');
    const res      = await request(app).get('/users/me').set('Authorization', `Bearer ${badToken}`);
    expect(res.status).toBe(401);
  });

  // ── Test 9 ────────────────────────────────────────────────
  test('GET /health is accessible without a token', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  // ── Test 10 ───────────────────────────────────────────────
  test('POST /auth/register is publicly accessible', async () => {
    const axios = require('axios');
    axios.mockResolvedValueOnce({ status: 201, data: { access_token: 'tok', user_id: 'u1' } });

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'x@test.com', password: 'pass1234' });

    expect(res.status).not.toBe(401);
    expect(res.status).toBe(201);
  });

  // ── Test 11 ───────────────────────────────────────────────
  test('POST /auth/login is publicly accessible', async () => {
    const axios = require('axios');
    axios.post.mockResolvedValueOnce({ status: 200, data: { access_token: 'tok' } });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'x@test.com', password: 'pass1234' });

    expect(res.status).not.toBe(401);
  });

  // ── Test 12 ───────────────────────────────────────────────
  test('valid JWT allows GET /users/me to reach upstream proxy', async () => {
    const axios = require('axios');
    axios.mockResolvedValueOnce({ status: 200, data: { id: 'test-uid', email: 'test@kinnect.test' } });

    const token = makeToken();
    const res   = await request(app).get('/users/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 'test-uid');
  });
});