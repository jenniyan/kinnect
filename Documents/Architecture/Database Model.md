# Kinnect: Database Model

## Overview

Kinnect uses two PostgreSQL databases: the **User DB** (accounts, profiles, tags, blocking, videos) and the **Message DB** (chat rooms, messages, read receipts). A Redis instance serves as the **Location Cache** and pub/sub broker for the Chat Service.

---

## User DB

### `users`

Primary table for all registered accounts.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `email` | `varchar(255)` | UNIQUE, NOT NULL | |
| `phone` | `varchar(30)` | UNIQUE | Optional: login by phone or email |
| `password_hash` | `text` | NOT NULL | bcrypt hash |
| `display_name` | `varchar(100)` | | Null when anonymous |
| `bio` | `text` | | Optional profile bio |
| `is_anonymous` | `boolean` | NOT NULL, default `false` | Hides display name on map |
| `location_visible` | `boolean` | NOT NULL, default `true` | If false, hidden from map and cannot view others |
| `radius_km` | `integer` | NOT NULL, default `2` | Visibility radius for nearby user queries |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | |

---

### `external_accounts`

Stores linked external platform handles for chat transfer (Instagram, WeChat, etc.).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | NOT NULL, FK → `users.id` ON DELETE CASCADE | |
| `platform` | `varchar(50)` | NOT NULL | e.g. `'instagram'`, `'wechat'`, `'discord'` |
| `handle` | `varchar(255)` | NOT NULL | Username or contact link on that platform |

**Unique constraint:** `(user_id, platform)`: one handle per platform per user

---

### `tags`

Library of interest tags (both system-defined and user-created custom tags).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `name` | `varchar(100)` | UNIQUE, NOT NULL | e.g. `'pickleball'`, `'photography'` |
| `category` | `varchar(100)` | NOT NULL | e.g. `'Sports'`, `'Arts'` |
| `is_custom` | `boolean` | NOT NULL, default `false` | `true` for user-created tags |
| `created_by` | `uuid` | FK → `users.id` ON DELETE SET NULL | Null for system-defined tags |

---

### `user_tags`

Join table: associates interest tags with user profiles.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `user_id` | `uuid` | NOT NULL, FK → `users.id` ON DELETE CASCADE | |
| `tag_id` | `uuid` | NOT NULL, FK → `tags.id` ON DELETE CASCADE | |

**Primary key:** `(user_id, tag_id)`

---

### `blocks`

Self-referencing join on `users` to track block relationships.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `blocker_id` | `uuid` | NOT NULL, FK → `users.id` ON DELETE CASCADE | The user who initiated the block |
| `blocked_id` | `uuid` | NOT NULL, FK → `users.id` ON DELETE CASCADE | The user who was blocked |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

**Primary key:** `(blocker_id, blocked_id)`

**Effect:** Blocked users cannot view, locate, or message the blocker.

---

### `routing_requests`

Tracks GPS routing requests between pairs of users.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `requester_id` | `uuid` | NOT NULL, FK → `users.id` ON DELETE CASCADE | User who initiated navigation |
| `target_id` | `uuid` | NOT NULL, FK → `users.id` ON DELETE CASCADE | User being navigated to |
| `status` | `varchar(20)` | NOT NULL, default `'pending'` | `'pending'`, `'accepted'`, `'declined'`, `'cancelled'` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| `resolved_at` | `timestamptz` | | Set when status changes from pending |

---

### `videos`

Location-anchored video posts uploaded to Cloudflare R2.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | NOT NULL, FK → `users.id` ON DELETE CASCADE | |
| `r2_key` | `text` | NOT NULL, UNIQUE | Object key in Cloudflare R2, e.g. `user/uuid-123/vid_001.mp4` |
| `lat` | `double precision` | NOT NULL | GPS latitude of recording location |
| `lng` | `double precision` | NOT NULL | GPS longitude of recording location |
| `caption` | `text` | | Optional caption |
| `visibility` | `varchar(20)` | NOT NULL, default `'nearby'` | `'public'`, `'nearby'`, `'friends'` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

> The full playback URL is not stored — it is generated on demand as a time-limited signed URL from the R2 `r2_key`.

---

### `video_tags`

Join table: associates interest tags with video posts.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `video_id` | `uuid` | NOT NULL, FK → `videos.id` ON DELETE CASCADE | |
| `tag_id` | `uuid` | NOT NULL, FK → `tags.id` ON DELETE CASCADE | |

**Primary key:** `(video_id, tag_id)`

---

## Message DB

### `rooms`

Represents both direct message conversations and group chats.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Used as Socket.io room name |
| `type` | `varchar(10)` | NOT NULL | `'dm'` or `'group'` |
| `name` | `varchar(150)` | | Display name for group chats; null for DMs |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

---

### `room_members`

Join table: tracks which users belong to which rooms.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `room_id` | `uuid` | NOT NULL, FK → `rooms.id` ON DELETE CASCADE | |
| `user_id` | `uuid` | NOT NULL | User ID from the User DB (no cross-DB FK) |
| `joined_at` | `timestamptz` | NOT NULL, default `now()` | |

**Primary key:** `(room_id, user_id)`

---

### `messages`

Persisted chat messages for all rooms.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Also used as `message_id` in WebSocket events |
| `room_id` | `uuid` | NOT NULL, FK → `rooms.id` ON DELETE CASCADE | |
| `sender_id` | `uuid` | NOT NULL | User ID from the User DB |
| `content` | `text` | NOT NULL | Message body |
| `sent_at` | `timestamptz` | NOT NULL, default `now()` | |

**Indexes:** `(room_id, sent_at DESC)` — for paginated chat history queries

---

### `message_reads`

Per-user read receipts. A separate table (not a column on `messages`) to support group chat where multiple readers must be tracked independently.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `message_id` | `uuid` | NOT NULL, FK → `messages.id` ON DELETE CASCADE | |
| `reader_id` | `uuid` | NOT NULL | User ID from the User DB |
| `read_at` | `timestamptz` | NOT NULL, default `now()` | |

**Primary key:** `(message_id, reader_id)`

---

## Location Cache (Redis)

Redis is not a relational database. There is no schema in the traditional sense. The following documents the key conventions used by the Location Service and Chat Service.

### GPS coordinates

| Key pattern | Value | TTL |
|---|---|---|
| `user:{user_id}:location` | `{"lat": 33.684, "lng": -117.826, "ts": 1716000000}` | 30 seconds |

Entries expire automatically. A user who stops sending GPS pings disappears from the map within 30 seconds.

**Proximity queries** use Redis `GEORADIUSBYMEMBER` against a geo-sorted set:

| Key | Members |
|---|---|
| `geo:users` | All active user IDs, stored with lat/lng coordinates |

### Pub/sub channels (Chat Service)

| Channel pattern | Publisher | Subscribers |
|---|---|---|
| `room:{room_id}` | Chat Service instance that received the message | All other Chat Service instances serving members of that room |

This fan-out pattern allows horizontal scaling of the Chat Service without sticky sessions.

---

## Entity Relationships Summary

```
users ──< external_accounts
users ──< user_tags >── tags
users ──< blocks (self-join)
users ──< routing_requests (as requester or target)
users ──< videos ──< video_tags >── tags
tags ──< video_tags

rooms ──< room_members
rooms ──< messages ──< message_reads
```
