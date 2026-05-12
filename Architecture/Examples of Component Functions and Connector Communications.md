# Use Cases

## User Registration and Profile Setup

| Step | Actor | Method | Payload |
|---|---|---|---|
| 1 | Profile UI → API Gateway | HTTPS POST `/auth/register` | `{"email":"user@x.com","password":"hashed","display_name":"Alex"}` |
| 2 | API Gateway → User Service | Internal HTTP POST | Same payload forwarded |
| 3 | User Service → User DB | PostgreSQL INSERT | `INSERT INTO users (email, password_hash, display_name) VALUES (...)` |
| 4 | User Service → API Gateway | HTTP response | `{"access_token":"eyJ...","user_id":"uuid-123"}` |
| 5 | API Gateway → Profile UI | HTTPS response | `{"access_token":"eyJ...","user_id":"uuid-123"}` |
| 6 | Profile UI → API Gateway | HTTPS PATCH `/users/me/profile` | `{"bio":"Hey!","tags":["music","hiking"],"location_visible":true,"is_anonymous":false}` |
| 7 | User Service → User DB | PostgreSQL UPDATE + INSERT | `UPDATE users SET bio, location_visible, is_anonymous` then `INSERT INTO user_tags (user_id, tag_id)` for each tag |

> **DB note:** Step 6 uses `location_visible` (boolean) and `is_anonymous` (boolean). The `tags` array is resolved to `tag_id` UUIDs by the Tag Service before insertion into `user_tags`.

---

## Discovering Nearby Users on the Map

| Step | Actor | Method | Payload |
|---|---|---|---|
| 1 | Map UI | expo-location (device GPS) | GPS fix: `{lat:33.684, lng:-117.826, accuracy:5m}` |
| 2 | Map UI → API Gateway | WebSocket emit `location_update` | `{"user_id":"uuid-123","lat":33.684,"lng":-117.826,"ts":1716000000}` |
| 3 | API Gateway → Location Service | Internal WebSocket relay | Same payload forwarded |
| 4 | Location Service → Redis | `SET` + `GEOADD` | `SET user:uuid-123:location {lat,lng,ts} EX 30` and `GEOADD geo:users lng lat uuid-123` |
| 5 | Map UI → API Gateway | HTTPS GET `/users/nearby?radius=2` | `Authorization: Bearer eyJ...` |
| 6 | Location Service → Redis | `GEORADIUSBYMEMBER geo:users` | Returns `user_id` list within radius |
| 7 | Location Service → User Service | Internal HTTP GET | `{"user_ids":["uuid-456","uuid-789"]}` — fetches profiles and filters out blocked users |
| 8 | API Gateway → Map UI | HTTPS response | `[{"user_id":"uuid-456","display_name":"Sam","lat":33.685,"lng":-117.824,"tags":["music"]}]` |

> **DB note:** Step 4 writes to **two** Redis structures: the TTL key (`user:{id}:location`) for expiry, and the geo-sorted set (`geo:users`) for `GEORADIUSBYMEMBER` proximity queries. Step 7 also cross-checks `blocks` in the User DB to exclude blocked users from results.

---

## Sending and Receiving a Chat Message

| Step | Actor | Method | Payload |
|---|---|---|---|
| 1 | Chat UI → API Gateway | WebSocket emit `send_message` | `{"room_id":"room-abc","content":"Hey!","timestamp":1716000100}` |
| 2 | Chat Service → Message DB | PostgreSQL INSERT | `INSERT INTO messages (id, room_id, sender_id, content, sent_at) VALUES (...)` |
| 3 | Chat Service → Redis | `PUBLISH` | `PUBLISH room:room-abc {serialized message JSON}` |
| 4 | Chat Service (all instances) → Redis | pub/sub subscriber callback | Each subscribed instance receives the message payload |
| 5 | Chat Service → Chat UI (recipient) | WebSocket emit `new_message` | `{"room_id":"room-abc","sender_id":"uuid-123","content":"Hey!","message_id":"msg-xyz","ts":1716000100}` |
| 6 | Chat UI (recipient) | WebSocket receive | Renders new message bubble |
| 7 | Chat UI → API Gateway | WebSocket emit `read_receipt` | `{"message_id":"msg-xyz","reader_id":"uuid-456","read_at":1716000105}` |
| 8 | Chat Service → Message DB | PostgreSQL INSERT | `INSERT INTO message_reads (message_id, reader_id, read_at) VALUES (...)` |
| 9 | Chat Service → Chat UI (sender) | WebSocket emit `read_receipt` | `{"message_id":"msg-xyz","reader_id":"uuid-456","read_at":1716000105}` |

---

## Recording and Uploading a Location-Anchored Video

| Step | Actor | Method | Payload |
|---|---|---|---|
| 1 | Video UI | expo-camera (device hardware) | Records and writes local video file to device storage |
| 2 | Video UI → API Gateway | HTTPS POST `/media/upload-url` | `{"filename":"vid_001.mp4","lat":33.684,"lng":-117.826,"visibility":"nearby","caption":"Sunset hike"}` |
| 3 | API Gateway → Cloudflare R2 | HTTPS S3 presign request | Request includes `user_id`, `filename`, GPS coords, visibility as object metadata |
| 4 | API Gateway → Video UI | HTTPS response | `{"signed_url":"https://r2.example.com/vid_001.mp4?X-Amz-Signature=...","r2_key":"user/uuid-123/vid_001.mp4","expires_in":900}` |
| 5 | Video UI → Cloudflare R2 | HTTPS PUT (direct, no backend) | Binary video payload sent to signed URL |
| 6 | Video UI → API Gateway | HTTPS POST `/media/confirm` | `{"r2_key":"user/uuid-123/vid_001.mp4","lat":33.684,"lng":-117.826,"visibility":"nearby","caption":"Sunset hike","tags":["hiking"]}` |
| 7 | User Service → User DB | PostgreSQL INSERT × 2 | `INSERT INTO videos (user_id, r2_key, lat, lng, visibility, caption, created_at)` then `INSERT INTO video_tags (video_id, tag_id)` for each tag |
