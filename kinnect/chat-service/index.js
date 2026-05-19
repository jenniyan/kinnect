// chat-service/index.js
// Real-time chat via Socket.io with Redis pub/sub fan-out for horizontal scaling.
// Also handles: room creation, message history, read receipts, external chat transfer.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const { Pool }   = require('pg');
const Redis      = require('ioredis');
const cors       = require('cors');

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT_CHAT || 3004;

const db = new Pool({ connectionString: process.env.MSG_DB_URL });

// Two Redis clients: one for pub/sub subscribe (can't do other commands while subscribed)
const redisPub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const redisSub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

// ── Health ────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true, service: 'chat-service' }));

// ── Redis pub/sub fan-out ─────────────────────────────────────
// When we're running multiple chat-service instances, a message that arrives
// on instance A needs to reach users whose sockets are on instance B.
// Solution: publish to Redis channel, all instances subscribe and forward.
redisSub.psubscribe('room:*', (err) => {
  if (err) console.error('[redis psubscribe]', err.message);
});

redisSub.on('pmessage', (_pattern, channel, data) => {
  // channel = "room:<room_id>"
  const roomId = channel.replace('room:', '');
  const parsed = JSON.parse(data);
  // Only forward to connected sockets — if this instance published it, the
  // local socket.io emit already handled direct delivery.
  if (!parsed._published_by_me) {
    io.to(roomId).emit('new_message', parsed);
  }
});

// ── Socket.io ─────────────────────────────────────────────────
// Client must connect with auth: { token: '<JWT>' }
// We validate user_id from the handshake query (gateway has already verified JWT).
io.on('connection', (socket) => {
  const userId = socket.handshake.query.user_id;
  if (!userId) { socket.disconnect(true); return; }

  console.log(`[chat] connected user=${userId} socket=${socket.id}`);

  // ── join_room ─────────────────────────────────────────────
  // Payload: { room_id }
  socket.on('join_room', async ({ room_id }) => {
    if (!room_id) return;
    // Verify user is a member
    try {
      const result = await db.query(
        'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2',
        [room_id, userId]
      );
      if (!result.rows.length) {
        socket.emit('error', { message: 'You are not a member of this room' });
        return;
      }
      socket.join(room_id);
      socket.emit('joined_room', { room_id });
    } catch (err) {
      console.error('[join_room]', err.message);
    }
  });

  // ── send_message ──────────────────────────────────────────
  // Payload: { room_id, content, timestamp? }
  socket.on('send_message', async ({ room_id, content }) => {
    if (!room_id || !content?.trim()) {
      socket.emit('error', { message: 'room_id and content required' });
      return;
    }

    try {
      // Persist to DB
      const result = await db.query(
        `INSERT INTO messages (room_id, sender_id, content)
         VALUES ($1, $2, $3)
         RETURNING id, room_id, sender_id, content, sent_at`,
        [room_id, userId, content.trim()]
      );
      const msg = result.rows[0];
      const payload = {
        message_id: msg.id,
        room_id:    msg.room_id,
        sender_id:  msg.sender_id,
        content:    msg.content,
        sent_at:    msg.sent_at,
      };

      // Deliver to all sockets in room on THIS instance
      io.to(room_id).emit('new_message', { ...payload, _published_by_me: true });

      // Fan out to other instances via Redis pub/sub
      await redisPub.publish(`room:${room_id}`, JSON.stringify(payload));
    } catch (err) {
      console.error('[send_message]', err.message);
      socket.emit('error', { message: 'Message delivery failed' });
    }
  });

  // ── read_receipt ──────────────────────────────────────────
  // Payload: { message_id, room_id }
  socket.on('read_receipt', async ({ message_id, room_id }) => {
    if (!message_id) return;
    try {
      await db.query(
        `INSERT INTO message_reads (message_id, reader_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [message_id, userId]
      );
      // Broadcast receipt back to the room so senders see "read"
      io.to(room_id).emit('read_receipt', {
        message_id, reader_id: userId, read_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[read_receipt]', err.message);
    }
  });

  // ── transfer_request (external chat) ─────────────────────
  // Payload: { room_id, platform }
  socket.on('transfer_request', ({ room_id, platform }) => {
    socket.to(room_id).emit('transfer_request', {
      room_id, platform, from_user_id: userId,
    });
  });

  // ── transfer_accepted ─────────────────────────────────────
  // Payload: { room_id, platform, external_handle }
  socket.on('transfer_accepted', ({ room_id, platform, external_handle }) => {
    io.to(room_id).emit('transfer_accepted', {
      room_id, platform, external_handle, from_user_id: userId,
    });
  });

  // ── transfer_declined ─────────────────────────────────────
  // Payload: { room_id }
  socket.on('transfer_declined', ({ room_id }) => {
    socket.to(room_id).emit('transfer_declined', { room_id, from_user_id: userId });
  });

  // ── routing_request (nav notifications via chat) ──────────
  // Payload: { target_user_id, routing_request_id }
  socket.on('routing_request', ({ target_user_id, routing_request_id }) => {
    // We find sockets for the target user and emit directly
    io.emit('routing_request', { from_user_id: userId, routing_request_id });
  });

  socket.on('disconnect', () => {
    console.log(`[chat] disconnected user=${userId}`);
  });
});

// ── REST: Create room ─────────────────────────────────────────
// POST /rooms
// Body: { type: 'dm'|'group', name?, member_ids: string[] }
app.post('/rooms', async (req, res) => {
  const userId = req.query.user_id;
  const { type, name, member_ids = [] } = req.body;
  if (!['dm', 'group'].includes(type)) {
    return res.status(400).json({ error: 'type must be dm or group' });
  }

  // For DMs, check if a room already exists for these two users
  if (type === 'dm' && member_ids.length === 1) {
    const existing = await db.query(
      `SELECT r.id FROM rooms r
       INNER JOIN room_members rm1 ON rm1.room_id = r.id AND rm1.user_id = $1
       INNER JOIN room_members rm2 ON rm2.room_id = r.id AND rm2.user_id = $2
       WHERE r.type = 'dm'
       LIMIT 1`,
      [userId, member_ids[0]]
    );
    if (existing.rows[0]) return res.json(existing.rows[0]);
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const roomRes = await client.query(
      'INSERT INTO rooms (type, name) VALUES ($1, $2) RETURNING *',
      [type, name || null]
    );
    const room = roomRes.rows[0];

    // Add creator + all member_ids
    const allMembers = [...new Set([userId, ...member_ids])];
    for (const mid of allMembers) {
      await client.query(
        'INSERT INTO room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [room.id, mid]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(room);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[create room]', err.message);
    res.status(500).json({ error: 'Room creation failed' });
  } finally {
    client.release();
  }
});

// ── REST: List user's rooms ───────────────────────────────────
// GET /rooms
app.get('/rooms', async (req, res) => {
  const userId = req.query.user_id;
  try {
    const result = await db.query(
      `SELECT r.id, r.type, r.name, r.created_at,
         (SELECT content FROM messages WHERE room_id = r.id ORDER BY sent_at DESC LIMIT 1) AS last_message,
         (SELECT sent_at FROM messages WHERE room_id = r.id ORDER BY sent_at DESC LIMIT 1) AS last_message_at,
         (SELECT COUNT(*) FROM messages m
          WHERE m.room_id = r.id
          AND NOT EXISTS (SELECT 1 FROM message_reads mr WHERE mr.message_id = m.id AND mr.reader_id = $1)
          AND m.sender_id != $1) AS unread_count,
         json_agg(DISTINCT rm.user_id) AS member_ids
       FROM rooms r
       INNER JOIN room_members rm ON rm.room_id = r.id
       WHERE r.id IN (SELECT room_id FROM room_members WHERE user_id = $1)
       GROUP BY r.id
       ORDER BY last_message_at DESC NULLS LAST`,
      [userId]
    );
    res.json({ rooms: result.rows });
  } catch (err) {
    console.error('[list rooms]', err.message);
    res.status(500).json({ error: 'Failed to list rooms' });
  }
});

// ── REST: Get room by ID ──────────────────────────────────────
// GET /rooms/:id
app.get('/rooms/:id', async (req, res) => {
  const userId = req.query.user_id;
  try {
    // Verify membership
    const member = await db.query(
      'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2',
      [req.params.id, userId]
    );
    if (!member.rows.length) return res.status(403).json({ error: 'Not a member' });

    const result = await db.query(
      `SELECT r.*, json_agg(DISTINCT rm.user_id) AS member_ids
       FROM rooms r
       INNER JOIN room_members rm ON rm.room_id = r.id
       WHERE r.id = $1
       GROUP BY r.id`,
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get room' });
  }
});

// ── REST: Add member to room ──────────────────────────────────
// POST /rooms/:id/members
// Body: { user_id: string }
app.post('/rooms/:id/members', async (req, res) => {
  const { user_id: newMemberId } = req.body;
  try {
    await db.query(
      'INSERT INTO room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, newMemberId]
    );
    res.json({ added: true });
  } catch (err) {
    res.status(500).json({ error: 'Add member failed' });
  }
});

// ── REST: Message history ─────────────────────────────────────
// GET /rooms/:id/messages?before=<ISO>&limit=40
app.get('/rooms/:id/messages', async (req, res) => {
  const userId = req.query.user_id;
  const { before, limit = 40 } = req.query;

  try {
    const member = await db.query(
      'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2',
      [req.params.id, userId]
    );
    if (!member.rows.length) return res.status(403).json({ error: 'Not a member' });

    const params = [req.params.id, parseInt(limit)];
    let dateFilter = '';
    if (before) {
      params.push(before);
      dateFilter = `AND sent_at < $${params.length}`;
    }

    const result = await db.query(
      `SELECT m.id, m.room_id, m.sender_id, m.content, m.sent_at,
         COALESCE(
           json_agg(jsonb_build_object('reader_id', mr.reader_id, 'read_at', mr.read_at))
           FILTER (WHERE mr.reader_id IS NOT NULL), '[]'
         ) AS read_by
       FROM messages m
       LEFT JOIN message_reads mr ON mr.message_id = m.id
       WHERE m.room_id = $1 ${dateFilter}
       GROUP BY m.id
       ORDER BY m.sent_at DESC
       LIMIT $2`,
      params
    );
    res.json({ messages: result.rows.reverse() }); // oldest first
  } catch (err) {
    console.error('[messages]', err.message);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

server.listen(PORT, () => {
  console.log(`✓ chat-service listening on :${PORT} (HTTP + Socket.io)`);
});
