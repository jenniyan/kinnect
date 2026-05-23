// location-service/index.js
// Receives GPS pings, stores in Redis with TTL, answers proximity queries.
// Also filters out blocked users (calls user-service internally).

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const Redis   = require('ioredis');
const axios   = require('axios');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT_LOCATION || 3002;

const USER_SERVICE = `http://localhost:${process.env.PORT_USER || 3001}`;

// Two Redis connections: one for commands, one for pub/sub publishing
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

app.use(cors());
app.use(express.json());

// TTL for location entries (seconds). A user disappears 30s after last ping.
const LOCATION_TTL = 30;
const GEO_KEY      = 'geo:users';

// ── Health ────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true, service: 'location-service' }));

// ── Receive GPS update ────────────────────────────────────────
// POST /location/update
// Body: { user_id, lat, lng, timestamp? }
// Called internally from API Gateway when it relays a WebSocket location_update event.
app.post('/location/update', async (req, res) => {
  const user_id = req.body.user_id || req.query.user_id;  // ← read from either
  const { lat, lng } = req.body;
  if (!user_id || lat == null || lng == null) {
    return res.status(400).json({ error: 'user_id, lat, lng required' });
  }

  try {
    const ts = Date.now();
    const payload = JSON.stringify({ lat, lng, ts });

    // 1. Store point with TTL key (for expiry logic)
    await redis.set(`user:${user_id}:location`, payload, 'EX', LOCATION_TTL);

    // 2. Store in Redis GEO sorted set (for GEODIST / GEORADIUSBYMEMBER)
    await redis.geoadd(GEO_KEY, lng, lat, user_id);

    // 3. Publish to pub/sub so all gateway instances can broadcast to nearby clients
    await redis.publish('location:updates', JSON.stringify({ user_id, lat, lng, ts }));

    res.json({ ok: true });
  } catch (err) {
    console.error('[location update]', err.message);
    res.status(500).json({ error: 'Location update failed' });
  }
});


// ── Nearby users query ────────────────────────────────────────
// GET /location/nearby?user_id=X&radius_km=2&tag=Pickleball
// Returns users within radius, filtered for blocks and location_visible.
app.get('/location/nearby', async (req, res) => {
  const user_id = req.query.user_id || req.body.user_id;
  const { radius_km = 2, tag } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  try {
    // 1. Find user's current location
    const myLocRaw = await redis.get(`user:${user_id}:location`);
    if (!myLocRaw) {
      return res.status(404).json({
        error: 'Your location is not known. Send a location_update first.',
      });
    }
    const { lat, lng } = JSON.parse(myLocRaw);

    // 2. GEORADIUSBYMEMBER to find nearby user IDs
    // Redis returns: [ [userId, dist], ... ] with WITHCOORD WITHDIST
    const nearby = await redis.georadiusbymember(
      GEO_KEY,
      user_id,
      parseFloat(radius_km),
      'km',
      'WITHCOORD',
      'WITHDIST',
      'ASC',
      'COUNT',
      100
    );

    // Filter out self
    const candidates = nearby
      .filter(entry => entry[0] !== user_id)
      .map(entry => ({
        user_id:     entry[0],
        distance_km: parseFloat(entry[1]),
        lng_lat:     entry[2], // [lng, lat]
      }));

    if (candidates.length === 0) return res.json({ nearby_users: [] });

    // 3. Fetch profiles from user-service and apply block filter
    const ids = candidates.map(c => c.user_id);
    const profilesRes = await axios.post(`${USER_SERVICE}/users/batch`, { user_ids: ids });
    const profileMap  = {};
    for (const u of profilesRes.data.users) profileMap[u.id] = u;

    // 4. Fetch my block list
    const blocksRes  = await axios.get(`${USER_SERVICE}/users/me/blocks?user_id=${user_id}`);
    const blockedSet = new Set(blocksRes.data.blocked_users.map(b => b.blocked_id));

    // 5. Build response, filtering invisible and blocked users
    const result = [];
    for (const c of candidates) {
      const profile = profileMap[c.user_id];
      if (!profile) continue;
      if (!profile.location_visible) continue;
      if (blockedSet.has(c.user_id)) continue;

      // If tag filter applied, only include users with that tag
      if (tag) {
        const hasTag = (profile.tags || []).some(t => t.name === tag);
        if (!hasTag) continue;
      }

      result.push({
        user_id:      c.user_id,
        display_name: profile.display_name,
        is_anonymous: profile.is_anonymous,
        distance_km:  c.distance_km,
        lat:          parseFloat(c.lng_lat[1]),
        lng:          parseFloat(c.lng_lat[0]),
        tags:         profile.tags || [],
      });
    }

    res.json({ nearby_users: result });
  } catch (err) {
    console.error('[nearby]', err.message);
    res.status(500).json({ error: 'Nearby query failed' });
  }
});

// ── Get a single user's last known location ───────────────────
// GET /location/:userId
app.get('/location/:userId', async (req, res) => {
  try {
    const raw = await redis.get(`user:${req.params.userId}:location`);
    if (!raw) return res.status(404).json({ error: 'Location not available' });
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: 'Failed to get location' });
  }
});


// ── Remove user from location index (logout / hide) ───────────
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

app.listen(PORT, () => {
  console.log(`✓ location-service listening on :${PORT}`);
});
