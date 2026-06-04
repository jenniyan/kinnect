/**
 * Unit Tests — Location-Service Input Validation
 *
 * Tests the request-validation guards in location-service/index.js.
 * Redis and Axios calls are mocked so no real infrastructure is needed.
 */

const express = require('express');
const request = require('supertest');

// ── Mock ioredis ──────────────────────────────────────────────
const mockRedis = {
  set:                  jest.fn().mockResolvedValue('OK'),
  get:                  jest.fn(),
  geoadd:               jest.fn().mockResolvedValue(1),
  publish:              jest.fn().mockResolvedValue(1),
  georadiusbymember:    jest.fn(),
  del:                  jest.fn().mockResolvedValue(1),
  zrem:                 jest.fn().mockResolvedValue(1),
};
jest.mock('ioredis', () => jest.fn().mockImplementation(() => mockRedis));

// ── Mock axios ────────────────────────────────────────────────
const mockAxios = {
  post: jest.fn(),
  get:  jest.fn(),
};
jest.mock('axios', () => mockAxios);

process.env.PORT_LOCATION = '0';

// ── Inline replica of location-service routes ─────────────────
function buildApp() {
  const app   = express();
  const Redis = require('ioredis');
  const redis = new Redis();
  const axios = require('axios');

  const LOCATION_TTL = 30;
  const GEO_KEY      = 'geo:users';

  app.use(express.json());

  // POST /location/update
  app.post('/location/update', async (req, res) => {
    const user_id = req.body.user_id || req.query.user_id;
    const { lat, lng } = req.body;
    if (!user_id || lat == null || lng == null) {
      return res.status(400).json({ error: 'user_id, lat, lng required' });
    }
    try {
      const ts      = Date.now();
      const payload = JSON.stringify({ lat, lng, ts });
      await redis.set(`user:${user_id}:location`, payload, 'EX', LOCATION_TTL);
      await redis.geoadd(GEO_KEY, lng, lat, user_id);
      await redis.publish('location:updates', JSON.stringify({ user_id, lat, lng, ts }));
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Location update failed' });
    }
  });

  // GET /location/nearby
  app.get('/location/nearby', async (req, res) => {
    const user_id = req.query.user_id;
    const { radius_km = 0.5 } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    try {
      const myLocRaw = await redis.get(`user:${user_id}:location`);
      if (!myLocRaw) {
        return res.status(404).json({ error: 'Your location is not known. Send a location_update first.' });
      }
      const { lat, lng } = JSON.parse(myLocRaw);

      const nearby = await redis.georadiusbymember(GEO_KEY, user_id, parseFloat(radius_km), 'km', 'WITHCOORD', 'WITHDIST', 'ASC', 'COUNT', 100);
      const candidates = nearby.filter(e => e[0] !== user_id).map(e => ({ user_id: e[0], distance_km: parseFloat(e[1]), lng_lat: e[2] }));

      if (candidates.length === 0) return res.json({ nearby_users: [] });

      const ids = candidates.map(c => c.user_id);
      const profilesRes = await axios.post(`http://localhost:3001/users/batch`, { user_ids: ids });
      const profileMap  = {};
      for (const u of profilesRes.data.users) profileMap[u.id] = u;

      const blocksRes  = await axios.get(`http://localhost:3001/users/me/blocks?user_id=${user_id}`);
      const blockedSet = new Set(blocksRes.data.blocked_users.map(b => b.blocked_id));

      const result = [];
      for (const c of candidates) {
        const profile = profileMap[c.user_id];
        if (!profile || !profile.location_visible || blockedSet.has(c.user_id)) continue;
        result.push({ user_id: c.user_id, display_name: profile.display_name, distance_km: c.distance_km });
      }
      res.json({ nearby_users: result });
    } catch (err) {
      res.status(500).json({ error: 'Nearby query failed' });
    }
  });

  // DELETE /location/:userId
  app.delete('/location/:userId', async (req, res) => {
    try {
      await redis.del(`user:${req.params.userId}:location`);
      await redis.zrem(GEO_KEY, req.params.userId);
      res.json({ removed: true });
    } catch (err) {
      res.status(500).json({ error: 'Remove failed' });
    }
  });

  return app;
}

describe('Unit: location-service validation', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  // ── Test 1 ────────────────────────────────────────────────
  test('POST /location/update returns 400 when user_id is missing', async () => {
    const res = await request(app).post('/location/update').send({ lat: 33.6, lng: -117.8 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/user_id/i);
  });

  // ── Test 2 ────────────────────────────────────────────────
  test('POST /location/update returns 400 when lat is missing', async () => {
    const res = await request(app).post('/location/update').send({ user_id: 'u1', lng: -117.8 });
    expect(res.status).toBe(400);
  });

  // ── Test 3 ────────────────────────────────────────────────
  test('POST /location/update writes to Redis and responds ok', async () => {
    const res = await request(app).post('/location/update').send({ user_id: 'u1', lat: 33.6, lng: -117.8 });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(mockRedis.set).toHaveBeenCalledWith(
      'user:u1:location',
      expect.any(String),
      'EX',
      30
    );
    expect(mockRedis.geoadd).toHaveBeenCalledWith('geo:users', -117.8, 33.6, 'u1');
    expect(mockRedis.publish).toHaveBeenCalled();
  });

  // ── Test 4 ────────────────────────────────────────────────
  test('GET /location/nearby returns 400 when user_id query param is missing', async () => {
    const res = await request(app).get('/location/nearby');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/user_id required/i);
  });

  // ── Test 5 ────────────────────────────────────────────────
  test('GET /location/nearby returns 404 when user has no known location', async () => {
    mockRedis.get.mockResolvedValueOnce(null); // no location in Redis

    const res = await request(app).get('/location/nearby').query({ user_id: 'u1' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/location is not known/i);
  });

  // ── Test 6 ────────────────────────────────────────────────
  test('GET /location/nearby returns empty array when no one else is nearby', async () => {
    mockRedis.get.mockResolvedValueOnce(JSON.stringify({ lat: 33.6, lng: -117.8 }));
    mockRedis.georadiusbymember.mockResolvedValueOnce([
      ['u1', '0.000', ['-117.8', '33.6']], // only the requesting user
    ]);

    const res = await request(app).get('/location/nearby').query({ user_id: 'u1' });
    expect(res.status).toBe(200);
    expect(res.body.nearby_users).toEqual([]);
  });

  // ── Test 7 ────────────────────────────────────────────────
  test('DELETE /location/:userId calls Redis del and zrem', async () => {
    const res = await request(app).delete('/location/u1');
    expect(res.status).toBe(200);
    expect(res.body.removed).toBe(true);
    expect(mockRedis.del).toHaveBeenCalledWith('user:u1:location');
    expect(mockRedis.zrem).toHaveBeenCalledWith('geo:users', 'u1');
  });
});