/**
 * Unit Tests — shared/lib/auth.js helpers
 *
 * Tests the extracted pure-logic functions that the services depend on.
 * These run against the actual source file so Jest --coverage reports
 * meaningful line/branch numbers.
 */

process.env.JWT_SECRET = 'coverage_test_secret';

const jwt = require('jsonwebtoken');
const {
  requireAuth,
  signToken,
  validateRegisterInput,
  validateLoginInput,
  validateTagInput,
  validateLocationInput,
  VALID_CATEGORIES,
} = require('../../shared/lib/auth');

// ── Mock req/res helpers ──────────────────────────────────────
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

// ─────────────────────────────────────────────────────────────
describe('Unit: requireAuth middleware (shared/lib/auth.js)', () => {

  test('calls next() and attaches user for a valid token', () => {
    const token = signToken('uid-1', 'a@b.com');
    const req   = { headers: { authorization: `Bearer ${token}` } };
    const res   = mockRes();
    const next  = jest.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user.sub).toBe('uid-1');
  });

  test('returns 401 when Authorization header is absent', () => {
    const req  = { headers: {} };
    const res  = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/missing/i) }));
  });

  test('returns 401 when token has wrong secret', () => {
    const bad  = jwt.sign({ sub: 'x' }, 'wrong');
    const req  = { headers: { authorization: `Bearer ${bad}` } };
    const res  = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
  });

  test('returns 401 for an expired token', () => {
    const expired = jwt.sign({ sub: 'x' }, process.env.JWT_SECRET, { expiresIn: -1 });
    const req     = { headers: { authorization: `Bearer ${expired}` } };
    const res     = mockRes();
    const next    = jest.fn();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('returns 401 when Bearer prefix is missing', () => {
    const token = signToken('uid-2', 'b@b.com');
    const req   = { headers: { authorization: token } };  // no "Bearer "
    const res   = mockRes();
    const next  = jest.fn();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Unit: signToken', () => {

  test('produces a verifiable JWT with correct sub and email', () => {
    const token   = signToken('u-99', 'x@test.com');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    expect(decoded.sub).toBe('u-99');
    expect(decoded.email).toBe('x@test.com');
  });

  test('default expiry is ~7 days', () => {
    const token   = signToken('u-100', 'y@test.com');
    const decoded = jwt.decode(token);
    const diff    = (decoded.exp * 1000) - Date.now();

    expect(diff).toBeGreaterThan(6.9 * 24 * 3600 * 1000);
    expect(diff).toBeLessThan(7.1 * 24 * 3600 * 1000);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Unit: validateRegisterInput', () => {

  test('returns null for valid email + password', () => {
    expect(validateRegisterInput({ email: 'a@b.com', password: 'secure12' })).toBeNull();
  });

  test('returns error when email is missing', () => {
    expect(validateRegisterInput({ password: 'secure12' })).toMatch(/email and password/i);
  });

  test('returns error when password is missing', () => {
    expect(validateRegisterInput({ email: 'a@b.com' })).toMatch(/email and password/i);
  });

  test('returns error when password is too short', () => {
    expect(validateRegisterInput({ email: 'a@b.com', password: 'short' })).toMatch(/8 characters/i);
  });

  test('returns null for exactly 8-character password', () => {
    expect(validateRegisterInput({ email: 'a@b.com', password: '12345678' })).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
describe('Unit: validateLoginInput', () => {

  test('returns null when email + password provided', () => {
    expect(validateLoginInput({ email: 'a@b.com', password: 'pass1234' })).toBeNull();
  });

  test('returns null when phone + password provided', () => {
    expect(validateLoginInput({ phone: '555-1234', password: 'pass1234' })).toBeNull();
  });

  test('returns error when password is missing', () => {
    expect(validateLoginInput({ email: 'a@b.com' })).toMatch(/email or phone/i);
  });

  test('returns error when neither email nor phone provided', () => {
    expect(validateLoginInput({ password: 'pass1234' })).toMatch(/email or phone/i);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Unit: validateTagInput', () => {

  test('returns null for valid name + category', () => {
    expect(validateTagInput({ name: 'Hiking', category: 'Outdoors' })).toBeNull();
  });

  test('returns error when name is missing', () => {
    expect(validateTagInput({ category: 'Sports' })).toMatch(/name and category/i);
  });

  test('returns error when category is missing', () => {
    expect(validateTagInput({ name: 'Hiking' })).toMatch(/name and category/i);
  });

  test('returns error for an invalid category', () => {
    expect(validateTagInput({ name: 'X', category: 'Bogus' })).toMatch(/category must be one of/i);
  });

  test('all 10 predefined categories pass validation', () => {
    for (const cat of VALID_CATEGORIES) {
      expect(validateTagInput({ name: 'Test', category: cat })).toBeNull();
    }
  });
});

// ─────────────────────────────────────────────────────────────
describe('Unit: validateLocationInput', () => {

  test('returns null for valid user_id, lat, lng', () => {
    expect(validateLocationInput({ user_id: 'u1', lat: 33.6, lng: -117.8 })).toBeNull();
  });

  test('returns error when user_id is missing', () => {
    expect(validateLocationInput({ lat: 33.6, lng: -117.8 })).toMatch(/user_id/i);
  });

  test('returns error when lat is missing', () => {
    expect(validateLocationInput({ user_id: 'u1', lng: -117.8 })).toMatch(/user_id/i);
  });

  test('returns error when lng is missing', () => {
    expect(validateLocationInput({ user_id: 'u1', lat: 33.6 })).toMatch(/user_id/i);
  });

  test('accepts lat/lng of 0 as valid (falsy but not null)', () => {
    expect(validateLocationInput({ user_id: 'u1', lat: 0, lng: 0 })).toBeNull();
  });
});