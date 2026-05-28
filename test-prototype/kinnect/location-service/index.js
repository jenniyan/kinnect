// location-service/index.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const Redis   = require('ioredis');
const axios   = require('axios');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT_LOCATION || 3002;

const USER_SERVICE = `http://localhost:${process.env.PORT_USER || 3001}`;

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

app.use(cors());
app.use(express.json());

const LOCATION_TTL = 30;
const GEO_KEY      = 'geo:users';

// ── Health ────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true, service: 'location-service' }));

// ── Receive GPS update ────────────────────────────────────────
app.post('/location/update', async (req, res) => {
  const user_id = req.body.user_id || req.query.user_id;
  const { lat, lng } = req.body;
  if (!user_id || lat == null || lng == null) {
    return res.status(400).json({ error: 'user_id, lat, lng required' });
  }

  try {
    const ts = Date.now();
    const payload = JSON.stringify({ lat, lng, ts });
    await redis.set(`user:${user_id}:location`, payload, 'EX', LOCATION_TTL);
    await redis.geoadd(GEO_KEY, lng, lat, user_id);
    await redis.publish('location:updates', JSON.stringify({ user_id, lat, lng, ts }));
    res.json({ ok: true });
  } catch (err) {
    console.error('[location update]', err.message);
    res.status(500).json({ error: 'Location update failed' });
  }
});

// ── Nearby users query ────────────────────────────────────────
app.get('/location/nearby', async (req, res) => {
  const user_id = req.query.user_id || req.body.user_id;
  const { radius_km = 0.5, tag } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  try {
    const myLocRaw = await redis.get(`user:${user_id}:location`);
    if (!myLocRaw) {
      return res.status(404).json({
        error: 'Your location is not known. Send a location_update first.',
      });
    }
    const { lat, lng } = JSON.parse(myLocRaw);

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

    const candidates = nearby
      .filter(entry => entry[0] !== user_id)
      .map(entry => ({
        user_id:     entry[0],
        distance_km: parseFloat(entry[1]),
        lng_lat:     entry[2],
      }));

    if (candidates.length === 0) return res.json({ nearby_users: [] });

    const ids = candidates.map(c => c.user_id);

    // Fetch profiles
    const profilesRes = await axios.post(`${USER_SERVICE}/users/batch`, { user_ids: ids });
    const profileMap  = {};
    for (const u of profilesRes.data.users) profileMap[u.id] = u;

    // Fetch subtags for all nearby users in one shot
    let subtagMap = {};
    try {
      const subRes = await axios.post(`${USER_SERVICE}/users/batch-subtags`, { user_ids: ids });
      subtagMap = subRes.data.subtags || {};
    } catch (err) {
      console.warn('[nearby] subtag fetch failed (non-fatal):', err.message);
    }

    // Fetch block list
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
        id:      t.id,
        name:    t.name || t,
        category: t.category,
        subtags: (userSubtags[t.id] || []),  // array of subtag name strings
      }));

      if (tag && !tags.some(t => t.name === tag)) continue;

      result.push({
        user_id:      c.user_id,
        display_name: profile.display_name,
        is_anonymous: profile.is_anonymous,
        distance_km:  c.distance_km,
        lat:          parseFloat(c.lng_lat[1]),
        lng:          parseFloat(c.lng_lat[0]),
        avatar_url:   profile.avatar_url || null,
        tags,
      });
    }

    res.json({ nearby_users: result });
  } catch (err) {
    console.error('[nearby]', err.message);
    res.status(500).json({ error: 'Nearby query failed' });
  }
});

// ── Get a single user's last known location ───────────────────
app.get('/location/:userId', async (req, res) => {
  try {
    const raw = await redis.get(`user:${req.params.userId}:location`);
    if (!raw) return res.status(404).json({ error: 'Location not available' });
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: 'Failed to get location' });
  }
});

// ── Remove user from location index ──────────────────────────
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