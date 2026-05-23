// api-gateway/index.js
// Single entry point for all Kinnect client traffic.
// - Validates JWT on every request
// - Routes REST calls to the correct downstream service
// - Hosts a Socket.io server for WebSocket connections
// - Relays location_update events to the location-service
// - Broadcasts nearby_user_moved events back to clients

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt        = require('jsonwebtoken');
const axios      = require('axios');
const Redis      = require('ioredis');
const cors       = require('cors');

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT_GATEWAY || 3000;

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production';

// Service URLs
const SVC = {
  user:     `http://localhost:${process.env.PORT_USER     || 3001}`,
  location: `http://localhost:${process.env.PORT_LOCATION || 3002}`,
  tag:      `http://localhost:${process.env.PORT_TAG      || 3003}`,
  chat:     `http://localhost:${process.env.PORT_CHAT     || 3004}`,
  nav:      `http://localhost:${process.env.PORT_NAV      || 3005}`,
  video:    `http://localhost:${process.env.PORT_VIDEO    || 3006}`,
};

// Redis subscriber for location pub/sub broadcasts
const redisSub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

app.use(cors());
app.use(express.json());

// ── JWT middleware ────────────────────────────────────────────
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

// ── Helper: proxy a request to an internal service ───────────
async function proxyReq(req, res, targetUrl, overrideBody) {
  try {
    const method = req.method.toLowerCase();
    const config = {
      method,
      url:     targetUrl,
      headers: { 'content-type': 'application/json' },
      params: { ...req.query, ...(req.user ? { user_id: req.user.sub } : {}) },
    };
    if (['post', 'put', 'patch'].includes(method)) {
      config.data = overrideBody || req.body;
    }
    const upstream = await axios(config);
    return res.status(upstream.status).json(upstream.data);
  } catch (err) {
    const status = err.response?.status || 502;
    const body   = err.response?.data   || { error: 'Upstream service error' };
    return res.status(status).json(body);
  }
}

// ── Health ────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'api-gateway', services: Object.keys(SVC) });
});

// ─────────────────────────────────────────────────────────────
//  PUBLIC ROUTES (no JWT required)
// ─────────────────────────────────────────────────────────────

// POST /auth/register
app.post('/auth/register', async (req, res) => {
  proxyReq(req, res, `${SVC.user}/auth/register`);
});

// POST /auth/login
app.post('/auth/login', async (req, res) => {
  try {
    const upstream = await axios.post(`${SVC.user}/auth/login`, req.body);
    res.json(upstream.data);
  } catch (err) {
    res.status(err.response?.status || 502).json(err.response?.data || { error: 'Login failed' });
  }
});

// ─────────────────────────────────────────────────────────────
//  PROTECTED ROUTES — all require valid JWT
// ─────────────────────────────────────────────────────────────
app.use(requireAuth);

// ── User / Profile ────────────────────────────────────────────
app.get('/users/me',            (req, res) => proxyReq(req, res, `${SVC.user}/users/me`));
app.patch('/users/me/profile',  (req, res) => proxyReq(req, res, `${SVC.user}/users/me/profile`));
app.get('/users/nearby',        (req, res) => proxyReq(req, res, `${SVC.location}/location/nearby`)); // ← moved up
app.get('/users/:id',           (req, res) => proxyReq(req, res, `${SVC.user}/users/${req.params.id}`));

// ── Block list ────────────────────────────────────────────────
app.get('/users/me/blocks',                    (req, res) => proxyReq(req, res, `${SVC.user}/users/me/blocks`));
app.post('/users/me/blocks/:targetId',         (req, res) => proxyReq(req, res, `${SVC.user}/users/me/blocks/${req.params.targetId}`));
app.delete('/users/me/blocks/:targetId',       (req, res) => proxyReq(req, res, `${SVC.user}/users/me/blocks/${req.params.targetId}`));

// ── External accounts ─────────────────────────────────────────
app.get('/users/me/external',                  (req, res) => proxyReq(req, res, `${SVC.user}/users/${req.user.sub}/external`));
app.put('/users/me/external/:platform',        (req, res) => proxyReq(req, res, `${SVC.user}/users/me/external/${req.params.platform}`));
app.delete('/users/me/external/:platform',     (req, res) => proxyReq(req, res, `${SVC.user}/users/me/external/${req.params.platform}`));
app.get('/users/:id/external',                 (req, res) => proxyReq(req, res, `${SVC.user}/users/${req.params.id}/external`));

// ── Tags on profile ───────────────────────────────────────────
app.post('/users/me/tags',             (req, res) => proxyReq(req, res, `${SVC.user}/users/me/tags`));
app.delete('/users/me/tags/:tagId',    (req, res) => proxyReq(req, res, `${SVC.user}/users/me/tags/${req.params.tagId}`));

// ── Tags library ──────────────────────────────────────────────
app.get('/tags',              (req, res) => proxyReq(req, res, `${SVC.tag}/tags`));
app.get('/tags/categories',   (req, res) => proxyReq(req, res, `${SVC.tag}/tags/categories`));
app.get('/tags/user/:userId', (req, res) => proxyReq(req, res, `${SVC.tag}/tags/user/${req.params.userId}`));
app.get('/tags/:id',          (req, res) => proxyReq(req, res, `${SVC.tag}/tags/${req.params.id}`));
app.post('/tags',             (req, res) => proxyReq(req, res, `${SVC.tag}/tags`));
app.post('/tags/resolve',     (req, res) => proxyReq(req, res, `${SVC.tag}/tags/resolve`));

// ── Location ──────────────────────────────────────────────────
// HTTP fallback for GPS update (WebSocket preferred)
app.post('/location/update',  (req, res) => proxyReq(req, res, `${SVC.location}/location/update`));
app.get('/location/nearby',   (req, res) => proxyReq(req, res, `${SVC.location}/location/nearby`));
app.get('/users/nearby',      (req, res) => proxyReq(req, res, `${SVC.location}/location/nearby`));
app.delete('/location/hide',  async (req, res) => {
  proxyReq(req, res, `${SVC.location}/location/${req.user.sub}`);
});

// ── Chat rooms ────────────────────────────────────────────────
app.post('/rooms',               (req, res) => proxyReq(req, res, `${SVC.chat}/rooms`));
app.get('/rooms',                (req, res) => proxyReq(req, res, `${SVC.chat}/rooms`));
app.get('/rooms/:id',            (req, res) => proxyReq(req, res, `${SVC.chat}/rooms/${req.params.id}`));
app.post('/rooms/:id/members',   (req, res) => proxyReq(req, res, `${SVC.chat}/rooms/${req.params.id}/members`));
app.get('/rooms/:id/messages',   (req, res) => proxyReq(req, res, `${SVC.chat}/rooms/${req.params.id}/messages`));

// ── Navigation ────────────────────────────────────────────────
app.post('/navigation/route',              (req, res) => proxyReq(req, res, `${SVC.nav}/navigation/route`));
app.post('/navigation/route-between-users',(req, res) => proxyReq(req, res, `${SVC.nav}/navigation/route-between-users`));
app.get('/navigation/geocode',             (req, res) => proxyReq(req, res, `${SVC.nav}/navigation/geocode`));

// ── Routing requests (friend navigation) ──────────────────────
app.post('/routing-requests',         (req, res) => proxyReq(req, res, `${SVC.user}/routing-requests`));
app.patch('/routing-requests/:id',    (req, res) => proxyReq(req, res, `${SVC.user}/routing-requests/${req.params.id}`));

// ── Media / Videos ───────────────────────────────────────────
app.post('/media/upload-url', (req, res) => proxyReq(req, res, `${SVC.video}/media/upload-url`));
app.post('/media/confirm',    (req, res) => proxyReq(req, res, `${SVC.video}/media/confirm`));
app.get('/media/:videoId/url',(req, res) => proxyReq(req, res, `${SVC.video}/media/${req.params.videoId}/url`));

app.get('/videos/nearby',                  (req, res) => proxyReq(req, res, `${SVC.video}/videos/nearby`));
app.get('/videos/user/:userId',            (req, res) => proxyReq(req, res, `${SVC.video}/videos/user/${req.params.userId}`));
app.get('/videos/:id',                     (req, res) => proxyReq(req, res, `${SVC.video}/videos/${req.params.id}`));
app.patch('/videos/:id',                   (req, res) => proxyReq(req, res, `${SVC.video}/videos/${req.params.id}`));
app.delete('/videos/:id',                  (req, res) => proxyReq(req, res, `${SVC.video}/videos/${req.params.id}`));
app.post('/videos/:id/like',               (req, res) => proxyReq(req, res, `${SVC.video}/videos/${req.params.id}/like`));
app.delete('/videos/:id/like',             (req, res) => proxyReq(req, res, `${SVC.video}/videos/${req.params.id}/like`));

// ─────────────────────────────────────────────────────────────
//  SOCKET.IO — client-facing WebSocket server
// ─────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Map of userId → socket for targeted delivery
const connectedUsers = new Map(); // userId → socket

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.user.sub;
  connectedUsers.set(userId, socket);
  console.log(`[gateway ws] connected user=${userId}`);

  // ── location_update: client sends GPS → relay to location-service ──
  socket.on('location_update', async ({ lat, lng, timestamp }) => {
    console.log('[ws location_update] from:', userId, 'lat:', lat, 'lng:', lng);
    try {
      await axios.post(`${SVC.location}/location/update`, {
        user_id: userId, lat, lng, timestamp: timestamp || Date.now(),
      });
      // Acknowledge back to sender
      socket.emit('location_ack', { ok: true, ts: Date.now() });
    } catch (err) {
      console.error('[ws location_update]', err.message);
    }
  });

  // ── join_room: relay to chat service (for history load) ──
  // The client connects directly to chat-service for messaging,
  // but the gateway can act as a proxy if needed.
  socket.on('join_room', ({ room_id }) => {
    socket.join(room_id);
  });

  // ── routing_request_notify: push to target user ──
  socket.on('routing_request_notify', ({ target_user_id, routing_request_id }) => {
    const targetSocket = connectedUsers.get(target_user_id);
    if (targetSocket) {
      targetSocket.emit('routing_request', {
        from_user_id:       userId,
        routing_request_id,
      });
    }
  });

  socket.on('disconnect', () => {
    connectedUsers.delete(userId);
    console.log(`[gateway ws] disconnected user=${userId}`);
  });
});

// ── Subscribe to Redis location updates → broadcast nearby_user_moved ──
redisSub.subscribe('location:updates', (err) => {
  if (err) console.error('[redis location:updates subscribe]', err.message);
});

redisSub.on('message', (_channel, data) => {
  const { user_id, lat, lng, ts } = JSON.parse(data);
  // Broadcast to all connected gateway sockets
  // In production you'd only emit to users within radius of the mover.
  io.emit('nearby_user_moved', { user_id, lat, lng, ts });
});

// ─────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🚀  API Gateway listening on :${PORT}`);
  console.log(`    REST  → http://localhost:${PORT}`);
  console.log(`    WS    → ws://localhost:${PORT}`);
  console.log(`    Downstream services: user:${process.env.PORT_USER||3001} loc:${process.env.PORT_LOCATION||3002} tag:${process.env.PORT_TAG||3003} chat:${process.env.PORT_CHAT||3004} nav:${process.env.PORT_NAV||3005} vid:${process.env.PORT_VIDEO||3006}\n`);
});
