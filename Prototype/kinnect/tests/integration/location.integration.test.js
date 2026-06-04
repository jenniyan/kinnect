/**
 * Integration Tests — Location Service: Nearby-User Query
 *
 * Tests the full GET /location/nearby flow:
 *   Redis geo lookup → user-service batch profile fetch →
 *   block-list filtering → response assembly.
 *
 * Redis is mocked via ioredis mock; axios mocked for user-service calls.
 */

const express = require('express');
const request = require('supertest');

// ── Mock Redis ────────────────────────────────────────────────
const mockRedis = {
  set:               jest.fn().mockResolvedValue('OK'),
  get:               jest.fn(),
  geoadd:            jest.fn().mockResolvedValue(1),
  publish:           jest.fn().mockResolvedValue(1),
  georadiusbymember: jest.fn(),
  del:               jest.fn().mockResolvedValue(1),
  zrem:              jest.fn().mockResolvedValue(1),
};
jest.mock('ioredis', () => jest.fn().mockImplementation(() => mockRedis));

// ── Mock axios ────────────────────────────────────────────────
const mockAxios = { post: jest.fn(), get: jest.fn() };
jest.mock('axios', () => mockAxios);

process.env.PORT_LOCATION = '0';
process.env.PORT_USER     = '3001';

// ── Build app matching location-service logic ─────────────────
function buildApp() {
  const app   = express();
  const Redis = require('ioredis');
  const redis = new Redis();
  const axios = require('axios');

  const LOCATION_TTL = 30;
  const GEO_KEY      = 'geo:users';
  const USER_SERVICE = `http://localhost:3001`;

  app.use(express.json());

  app.post('/location/update', async (req, res) => {
    const user_id = req.body.user_id || req.query.user_id;
    const { lat, lng } = req.body;
    if (!user_id || lat == null || lng == null)
      return res.status(400).json({ error: 'user_id, lat, lng required' });
    try {
      await redis.set(`user:${user_id}:location`, JSON.stringify({ lat, lng, ts: Date.now() }), 'EX', LOCATION_TTL);
      await redis.geoadd(GEO_KEY, lng, lat, user_id);
      await redis.publish('location:updates', JSON.stringify({ user_id, lat, lng }));
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: 'Location update failed' }); }
  });

  app.get('/location/nearby', async (req, res) => {
    const user_id   = req.query.user_id;
    const radius_km = parseFloat(req.query.radius_km || 0.5);
    const { tag }   = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    try {
      const myLocRaw = await redis.get(`user:${user_id}:location`);
      if (!myLocRaw) return res.status(404).json({ error: 'Your location is not known. Send a location_update first.' });

      const nearby = await redis.georadiusbymember(GEO_KEY, user_id, radius_km, 'km', 'WITHCOORD', 'WITHDIST', 'ASC', 'COUNT', 100);
      const candidates = nearby.filter(e => e[0] !== user_id).map(e => ({ user_id: e[0], distance_km: parseFloat(e[1]), lng_lat: e[2] }));

      if (candidates.length === 0) return res.json({ nearby_users: [] });

      const ids = candidates.map(c => c.user_id);
      const profilesRes = await axios.post(`${USER_SERVICE}/users/batch`, { user_ids: ids });
      const profileMap  = {};
      for (const u of profilesRes.data.users) profileMap[u.id] = u;

      let subtagMap = {};
      try {
        const subRes = await axios.post(`${USER_SERVICE}/users/batch-subtags`, { user_ids: ids });
        subtagMap = subRes.data.subtags || {};
      } catch {}

      const blocksRes  = await axios.get(`${USER_SERVICE}/users/me/blocks?user_id=${user_id}`);
      const blockedSet = new Set(blocksRes.data.blocked_users.map(b => b.blocked_id));

      const result = [];
      for (const c of candidates) {
        const profile = profileMap[c.user_id];
        if (!profile) continue;
        if (!profile.location_visible) continue;
        if (blockedSet.has(c.user_id)) continue;

        const userSubtags = subtagMap[c.user_id] || {};
        const tags = (profile.tags || []).map(t => ({
          id: t.id, name: t.name || t, category: t.category, subtags: (userSubtags[t.id] || []),
        }));
        if (tag && !tags.some(t => t.name === tag)) continue;

        result.push({
          user_id: c.user_id, display_name: profile.display_name,
          is_anonymous: profile.is_anonymous, distance_km: c.distance_km,
          lat: parseFloat(c.lng_lat[1]), lng: parseFloat(c.lng_lat[0]),
          avatar_url: profile.avatar_url || null, tags,
        });
      }
      res.json({ nearby_users: result });
    } catch (err) {
      res.status(500).json({ error: 'Nearby query failed' });
    }
  });

  return app;
}

// ── Helpers ───────────────────────────────────────────────────
function fakeGeoEntry(userId, distKm, lat, lng) {
  return [userId, String(distKm.toFixed(4)), [String(lng), String(lat)]];
}

describe('Integration: location-service — nearby user query', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  // ── Test 1: Full happy-path nearby query ──────────────────
  test('returns visible nearby users excluding the requester', async () => {
    mockRedis.get.mockResolvedValueOnce(JSON.stringify({ lat: 33.6846, lng: -117.8265 }));
    mockRedis.georadiusbymember.mockResolvedValueOnce([
      fakeGeoEntry('user-me',  0.0000, 33.6846, -117.8265),
      fakeGeoEntry('user-bob', 0.2400, 33.6860, -117.8270),
    ]);

    mockAxios.post
      .mockResolvedValueOnce({ data: { users: [{ id: 'user-bob', display_name: 'Bob', location_visible: true, tags: [], avatar_url: null }] } }) // batch profiles
      .mockResolvedValueOnce({ data: { subtags: {} } }); // batch-subtags

    mockAxios.get.mockResolvedValueOnce({ data: { blocked_users: [] } }); // blocks

    const res = await request(app).get('/location/nearby').query({ user_id: 'user-me', radius_km: 1 });

    expect(res.status).toBe(200);
    expect(res.body.nearby_users).toHaveLength(1);
    expect(res.body.nearby_users[0].user_id).toBe('user-bob');
    expect(res.body.nearby_users[0].distance_km).toBeCloseTo(0.24, 2);
  });

  // ── Test 2: Blocked users are excluded ───────────────────
  test('filters out blocked users from nearby results', async () => {
    mockRedis.get.mockResolvedValueOnce(JSON.stringify({ lat: 33.6, lng: -117.8 }));
    mockRedis.georadiusbymember.mockResolvedValueOnce([
      fakeGeoEntry('user-me',     0,    33.6, -117.8),
      fakeGeoEntry('user-evil',   0.1,  33.601, -117.801),
    ]);

    mockAxios.post
      .mockResolvedValueOnce({ data: { users: [{ id: 'user-evil', display_name: 'Evil', location_visible: true, tags: [] }] } })
      .mockResolvedValueOnce({ data: { subtags: {} } });

    mockAxios.get.mockResolvedValueOnce({ data: { blocked_users: [{ blocked_id: 'user-evil' }] } });

    const res = await request(app).get('/location/nearby').query({ user_id: 'user-me', radius_km: 1 });

    expect(res.status).toBe(200);
    expect(res.body.nearby_users).toHaveLength(0);
  });

  // ── Test 3: location_visible = false is excluded ──────────
  test('filters out users who have location_visible = false', async () => {
    mockRedis.get.mockResolvedValueOnce(JSON.stringify({ lat: 33.6, lng: -117.8 }));
    mockRedis.georadiusbymember.mockResolvedValueOnce([
      fakeGeoEntry('user-me',      0,   33.6,   -117.8),
      fakeGeoEntry('user-hidden',  0.3, 33.603, -117.803),
    ]);

    mockAxios.post
      .mockResolvedValueOnce({ data: { users: [{ id: 'user-hidden', display_name: 'Ghost', location_visible: false, tags: [] }] } })
      .mockResolvedValueOnce({ data: { subtags: {} } });

    mockAxios.get.mockResolvedValueOnce({ data: { blocked_users: [] } });

    const res = await request(app).get('/location/nearby').query({ user_id: 'user-me', radius_km: 1 });

    expect(res.status).toBe(200);
    expect(res.body.nearby_users).toHaveLength(0);
  });

  // ── Test 4: Tag filter on nearby results ─────────────────
  test('filters nearby results by tag name when tag query param is set', async () => {
    mockRedis.get.mockResolvedValueOnce(JSON.stringify({ lat: 33.6, lng: -117.8 }));
    mockRedis.georadiusbymember.mockResolvedValueOnce([
      fakeGeoEntry('user-me',     0,   33.6,   -117.8),
      fakeGeoEntry('user-soccer', 0.2, 33.602, -117.802),
      fakeGeoEntry('user-chess',  0.3, 33.603, -117.803),
    ]);

    mockAxios.post
      .mockResolvedValueOnce({
        data: {
          users: [
            { id: 'user-soccer', display_name: 'Soccer Fan', location_visible: true, tags: [{ id: 't1', name: 'Soccer', category: 'Sports' }] },
            { id: 'user-chess',  display_name: 'Chess Fan',  location_visible: true, tags: [{ id: 't2', name: 'Chess',  category: 'Gaming' }] },
          ],
        },
      })
      .mockResolvedValueOnce({ data: { subtags: {} } });

    mockAxios.get.mockResolvedValueOnce({ data: { blocked_users: [] } });

    const res = await request(app).get('/location/nearby').query({ user_id: 'user-me', radius_km: 1, tag: 'Soccer' });

    expect(res.status).toBe(200);
    expect(res.body.nearby_users).toHaveLength(1);
    expect(res.body.nearby_users[0].user_id).toBe('user-soccer');
  });

  // ── Test 5: POST /location/update persists to Redis ──────
  test('POST /location/update writes location key with 30s TTL and publishes', async () => {
    const res = await request(app)
      .post('/location/update')
      .send({ user_id: 'u1', lat: 33.6846, lng: -117.8265 });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    expect(mockRedis.set).toHaveBeenCalledWith(
      'user:u1:location',
      expect.stringContaining('"lat":33.6846'),
      'EX',
      30
    );
    expect(mockRedis.geoadd).toHaveBeenCalledWith('geo:users', -117.8265, 33.6846, 'u1');
    expect(mockRedis.publish).toHaveBeenCalledWith(
      'location:updates',
      expect.stringContaining('"user_id":"u1"')
    );
  });
});