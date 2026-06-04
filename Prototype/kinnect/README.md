# Kinnect — Backend

Full Node.js/Express backend for the Kinnect location-based social app.
Matches the architecture defined in `Architecture/` and all requirements in `Requirements_Specification.md`.

---

## Architecture at a glance

```
Mobile App (React Native)
        │  HTTPS/REST + WebSocket
        ▼
  ┌─────────────┐
  │ API Gateway │  :3000  ← Single entry point. JWT validation, routing, WS relay.
  └──────┬──────┘
         │ internal HTTP
   ┌─────┼─────────────────────────────────┐
   ▼     ▼         ▼        ▼      ▼       ▼
User  Location   Tag     Chat    Nav    Video
:3001  :3002    :3003   :3004  :3005   :3006
  │      │                │
  ▼      ▼                ▼
User DB  Redis         Message DB   Cloudflare R2
(PG)    (GPS cache     (PG)         (video files)
         + pub/sub)
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| PostgreSQL | ≥ 14 |
| Redis | ≥ 6 |

---

## Quick Start

### 1 — Clone & install

```bash
git clone <your-repo>
cd kinnect
npm install          # installs root + all workspace packages
```

### 2 — Create the two PostgreSQL databases

```sql
-- In psql or any PG client:
CREATE DATABASE kinnect_users;
CREATE DATABASE kinnect_messages;
```

### 3 — Configure environment

```bash
cp .env.example .env
# Open .env and fill in your values:
#   JWT_SECRET       — any long random string
#   USER_DB_URL      — postgresql://user:pass@localhost:5432/kinnect_users
#   MSG_DB_URL       — postgresql://user:pass@localhost:5432/kinnect_messages
#   REDIS_URL        — redis://localhost:6379
#   R2_*             — Cloudflare R2 credentials (see below)
#   GOOGLE_MAPS_API_KEY — optional; mock route used if absent
```

### 4 — Run migrations (creates all tables + seeds predefined tags)

```bash
npm run db:migrate
```

### 5 — Start all services

```bash
npm run dev
# Starts 7 services in parallel with colour-coded output.
# Or start them individually:
#   npm run dev -w api-gateway
#   npm run dev -w user-service
#   ... etc
```

All services are now running:

| Service | Port |
|---------|------|
| API Gateway | 3000 |
| User Service | 3001 |
| Location Service | 3002 |
| Tag Service | 3003 |
| Chat Service | 3004 |
| Navigation Service | 3005 |
| Video Service | 3006 |

---

## Cloudflare R2 Setup (Media Storage)

1. Go to Cloudflare dashboard → R2 → Create bucket `kinnect-media`
2. Create an API token with **Object Read & Write** on that bucket
3. Copy the Account ID, Access Key ID, and Secret Access Key into `.env`
4. Set `R2_PUBLIC_URL` to your bucket's public URL (enable "Public Access" in R2 settings)

> **Dev without R2:** The video service falls back to a local mock upload endpoint automatically when R2 credentials are missing. You can still test all other endpoints.

---

## API Reference

All routes (except `/auth/*`) require:
```
Authorization: Bearer <access_token>
```

### Auth

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/auth/register` | `{email, password, display_name?, phone?, bio?, is_anonymous?}` | `{access_token, user_id, user}` |
| POST | `/auth/login` | `{email or phone, password}` | `{access_token, user_id, user}` |

### Profile

| Method | Path | Body / Query | Response |
|--------|------|------|----------|
| GET | `/users/me` | — | full profile |
| PATCH | `/users/me/profile` | `{bio?, display_name?, is_anonymous?, location_visible?, radius_km?}` | `{user_id, updated_at}` |
| GET | `/users/:id` | — | public profile |

### Block List

| Method | Path | Response |
|--------|------|----------|
| GET | `/users/me/blocks` | `{blocked_users[]}` |
| POST | `/users/me/blocks/:targetId` | `{blocked: true}` |
| DELETE | `/users/me/blocks/:targetId` | `{unblocked: true}` |

### External Accounts (for Chat Transfer)

| Method | Path | Body | Response |
|--------|------|------|----------|
| PUT | `/users/me/external/:platform` | `{handle}` | `{platform, handle}` |
| DELETE | `/users/me/external/:platform` | — | `{deleted: true}` |
| GET | `/users/me/external` | — | `{accounts[]}` |
| GET | `/users/:id/external` | — | `{accounts[]}` |

Supported platforms: `instagram`, `wechat`, `discord`, `telegram`, `whatsapp`, `messages`

### Tags

| Method | Path | Query / Body | Response |
|--------|------|------|----------|
| GET | `/tags` | `?q=pick&category=Sports&limit=20` | `{tags[]}` |
| GET | `/tags/categories` | — | `{categories[]}` |
| POST | `/tags` | `{name, category}` | new tag |
| POST | `/tags/resolve` | `{names: string[]}` | `{tags[]}` (by name→id) |
| GET | `/tags/user/:userId` | — | `{tags[]}` |
| POST | `/users/me/tags` | `{tag_ids: string[]}` | `{added: N}` |
| DELETE | `/users/me/tags/:tagId` | — | `{removed: true}` |

### Location

| Method | Path | Query / Body | Response |
|--------|------|------|----------|
| POST | `/location/update` | `{user_id, lat, lng}` | `{ok: true}` |
| GET | `/users/nearby` | `?radius_km=2&tag=Pickleball` | `{nearby_users[]}` |
| DELETE | `/location/hide` | — | `{removed: true}` |

### Chat Rooms

| Method | Path | Body / Query | Response |
|--------|------|------|----------|
| POST | `/rooms` | `{type: 'dm'|'group', name?, member_ids[]}` | room object |
| GET | `/rooms` | — | `{rooms[]}` with unread counts |
| GET | `/rooms/:id` | — | room + member_ids |
| POST | `/rooms/:id/members` | `{user_id}` | `{added: true}` |
| GET | `/rooms/:id/messages` | `?before=<ISO>&limit=40` | `{messages[]}` |

### Navigation & Routing

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/navigation/route` | `{origin: {lat,lng}, destination: {lat,lng}, mode?}` | route object |
| POST | `/navigation/route-between-users` | `{requester_id, target_id, mode?}` | route object |
| GET | `/navigation/geocode` | `?address=UCI+Aldrich+Park` | `{lat, lng, formatted_address}` |
| POST | `/routing-requests` | `{target_id}` | routing_request row |
| PATCH | `/routing-requests/:id` | `{status: 'accepted'|'declined'|'cancelled'}` | updated row |

### Videos

| Method | Path | Body / Query | Response |
|--------|------|------|----------|
| POST | `/media/upload-url` | `{filename, gps_lat, gps_lng, visibility?, caption?}` | `{signed_url, r2_key, expires_in}` |
| POST | `/media/confirm` | `{r2_key, lat, lng, visibility, caption?, tag_names?, trigger_radius_m?}` | `{video_id, video}` |
| GET | `/media/:videoId/url` | — | `{url, expires_in}` |
| GET | `/videos/nearby` | `?lat=33.6&lng=-117.8&radius_m=500` | `{videos[]}` |
| GET | `/videos/user/:userId` | — | `{videos[]}` |
| GET | `/videos/:id` | — | video + tags + liked_by_me |
| PATCH | `/videos/:id` | `{caption?, visibility?}` | updated fields |
| DELETE | `/videos/:id` | — | `{deleted: true}` |
| POST | `/videos/:id/like` | — | `{liked: true}` |
| DELETE | `/videos/:id/like` | — | `{unliked: true}` |

---

## WebSocket Events (API Gateway — port 3000)

Connect with: `io('ws://localhost:3000', { auth: { token: '<JWT>' } })`

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `location_update` | `{lat, lng, timestamp?}` | Send GPS ping every few seconds |
| `join_room` | `{room_id}` | Subscribe to a room for live updates |
| `routing_request_notify` | `{target_user_id, routing_request_id}` | Push routing invite to another user |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `location_ack` | `{ok, ts}` | Confirms GPS ping received |
| `nearby_user_moved` | `{user_id, lat, lng, ts}` | Broadcast when any nearby user moves |
| `routing_request` | `{from_user_id, routing_request_id}` | Incoming routing invite |

### WebSocket Events (Chat Service — port 3004)

Connect with: `io('ws://localhost:3004', { query: { user_id: '<id>' } })`

| Direction | Event | Payload |
|-----------|-------|---------|
| C→S | `join_room` | `{room_id}` |
| C→S | `send_message` | `{room_id, content}` |
| S→C | `new_message` | `{message_id, room_id, sender_id, content, sent_at}` |
| C→S | `read_receipt` | `{message_id, room_id}` |
| S→C | `read_receipt` | `{message_id, reader_id, read_at}` |
| C→S | `transfer_request` | `{room_id, platform}` |
| C→S | `transfer_accepted` | `{room_id, platform, external_handle}` |
| C→S | `transfer_declined` | `{room_id}` |
| S→C | `transfer_request` | `{room_id, platform, from_user_id}` |
| S→C | `transfer_accepted` | `{room_id, platform, external_handle, from_user_id}` |
| S→C | `transfer_declined` | `{room_id, from_user_id}` |

---

## Typical Flows

### 1. User signs up and picks tags

```
POST /auth/register  → get access_token
POST /tags/resolve   → resolve ["Pickleball", "Coffee"] to tag IDs
POST /users/me/tags  → save tag IDs to profile
```

### 2. Live map — send location and get nearby users

```
WS emit location_update {lat, lng}        → gateway relays to location-service → Redis
GET  /users/nearby?radius_km=2            → location-service GEORADIUSBYMEMBER → filtered list
WS   nearby_user_moved                    ← gateway broadcasts when others move
```

### 3. Start a chat

```
POST /rooms  {type:'dm', member_ids:['<other_user_id>']}  → get room_id
WS (chat-service) join_room {room_id}
WS (chat-service) send_message {room_id, content}
WS (chat-service) ← new_message broadcast to all room members
```

### 4. GPS routing

```
POST /routing-requests  {target_id}               → creates pending request
WS   routing_request_notify {target_user_id, ...}  → gateway pushes to target
-- target accepts:
PATCH /routing-requests/:id  {status:'accepted'}
POST  /navigation/route-between-users  {requester_id, target_id}  → Google Maps route
```

### 5. Upload a location-anchored video

```
POST /media/upload-url  {filename, gps_lat, gps_lng, visibility:'nearby'}
  → returns signed_url (R2 pre-signed PUT) + r2_key
PUT  <signed_url>  <binary video>        → client uploads directly to R2
POST /media/confirm  {r2_key, lat, lng, visibility, caption, tag_names:[]}
  → video stored in DB, triggers proximity detection for nearby users
GET  /videos/nearby?lat=33.6&lng=-117.8&radius_m=500  → shows video to nearby users
```

---

## Project Structure

```
kinnect/
├── .env.example
├── package.json          (npm workspaces root)
├── db/
│   └── migrate.js        (creates all tables + seeds tags)
├── shared/
│   └── index.js          (JWT helpers shared across services)
├── api-gateway/          ← :3000 — entry point
│   ├── package.json
│   └── index.js
├── user-service/         ← :3001 — accounts, profiles, blocks
│   ├── package.json
│   └── index.js
├── location-service/     ← :3002 — GPS, Redis geo, nearby
│   ├── package.json
│   └── index.js
├── tag-service/          ← :3003 — tag library, search, custom tags
│   ├── package.json
│   └── index.js
├── chat-service/         ← :3004 — Socket.io, rooms, messages, Redis pub/sub
│   ├── package.json
│   └── index.js
├── navigation-service/   ← :3005 — Google Maps routing
│   ├── package.json
│   └── index.js
└── video-service/        ← :3006 — R2 signed URLs, video metadata, likes
    ├── package.json
    └── index.js
```
