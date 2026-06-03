/**
 * Unit Tests — JWT Auth Middleware
 *
 * Tests the requireAuth logic extracted from api-gateway/index.js.
 * All tests run in-process with no network, no DB, no Redis.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = 'test_secret_unit';

// ── Extract the middleware logic as a pure function (mirrors api-gateway) ──
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

// ── Helpers to build mock req / res ──────────────────────────
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

function makeToken(payload, secret = JWT_SECRET, opts = {}) {
  return jwt.sign(payload, secret, opts);
}

// ─────────────────────────────────────────────────────────────
describe('Unit: requireAuth middleware', () => {

  // ── Test 1 ────────────────────────────────────────────────
  test('passes valid JWT and attaches user to req', () => {
    const token = makeToken({ sub: 'user-abc', email: 'a@test.com' });
    const req   = { headers: { authorization: `Bearer ${token}` } };
    const res   = mockRes();
    const next  = jest.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user.sub).toBe('user-abc');
    expect(req.user.email).toBe('a@test.com');
    expect(res.status).not.toHaveBeenCalled();
  });

  // ── Test 2 ────────────────────────────────────────────────
  test('returns 401 when Authorization header is missing', () => {
    const req  = { headers: {} };
    const res  = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Missing') })
    );
  });

  // ── Test 3 ────────────────────────────────────────────────
  test('returns 401 when Authorization header lacks Bearer prefix', () => {
    const token = makeToken({ sub: 'x' });
    const req   = { headers: { authorization: token } }; // no "Bearer " prefix
    const res   = mockRes();
    const next  = jest.fn();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  // ── Test 4 ────────────────────────────────────────────────
  test('returns 401 for a token signed with the wrong secret', () => {
    const badToken = makeToken({ sub: 'hacker' }, 'wrong_secret');
    const req      = { headers: { authorization: `Bearer ${badToken}` } };
    const res      = mockRes();
    const next     = jest.fn();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid or expired token' })
    );
  });

  // ── Test 5 ────────────────────────────────────────────────
  test('returns 401 for an expired token', () => {
    // Sign a token that expired 10 seconds ago
    const expiredToken = makeToken({ sub: 'old-user' }, JWT_SECRET, { expiresIn: -10 });
    const req          = { headers: { authorization: `Bearer ${expiredToken}` } };
    const res          = mockRes();
    const next         = jest.fn();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  // ── Test 6 ────────────────────────────────────────────────
  test('returns 401 for a completely malformed (garbage) token string', () => {
    const req  = { headers: { authorization: 'Bearer not.a.jwt' } };
    const res  = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});