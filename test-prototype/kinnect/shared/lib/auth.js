/**
 * shared/lib/auth.js
 * Pure auth helper functions used by the API gateway and tests.
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production';

/**
 * Express middleware: validates Bearer JWT and attaches decoded payload to req.user.
 * Returns 401 if token is absent, malformed, expired, or signed with the wrong secret.
 */
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

/**
 * Signs a JWT for a user.
 * @param {string} userId
 * @param {string} email
 * @param {string} [expiresIn='7d']
 * @returns {string} signed JWT
 */
function signToken(userId, email, expiresIn = '7d') {
  return jwt.sign({ sub: userId, email }, JWT_SECRET, { expiresIn });
}

/**
 * Validates register request body.
 * Returns an error string or null if valid.
 * @param {{ email?: string, password?: string }} body
 * @returns {string|null}
 */
function validateRegisterInput({ email, password } = {}) {
  if (!email || !password) return 'email and password are required';
  if (password.length < 8)  return 'Password must be at least 8 characters';
  return null;
}

/**
 * Validates login request body.
 * Returns an error string or null if valid.
 * @param {{ email?: string, phone?: string, password?: string }} body
 * @returns {string|null}
 */
function validateLoginInput({ email, phone, password } = {}) {
  if (!password || (!email && !phone)) return 'Provide (email or phone) and password';
  return null;
}

/**
 * Validates tag creation request body.
 * Returns an error string or null if valid.
 * @param {{ name?: string, category?: string }} body
 * @returns {string|null}
 */
const VALID_CATEGORIES = [
  'Sports', 'Arts', 'Outdoors', 'Food', 'Social',
  'Gaming', 'Study', 'Wellness', 'Tech', 'Culture',
];

function validateTagInput({ name, category } = {}) {
  if (!name || !category) return 'name and category required';
  if (!VALID_CATEGORIES.includes(category)) return `category must be one of: ${VALID_CATEGORIES.join(', ')}`;
  return null;
}

/**
 * Validates location update request body.
 * Returns an error string or null if valid.
 * @param {{ user_id?: string, lat?: number, lng?: number }} body
 * @returns {string|null}
 */
function validateLocationInput({ user_id, lat, lng } = {}) {
  if (!user_id || lat == null || lng == null) return 'user_id, lat, lng required';
  return null;
}

module.exports = {
  requireAuth,
  signToken,
  validateRegisterInput,
  validateLoginInput,
  validateTagInput,
  validateLocationInput,
  VALID_CATEGORIES,
};