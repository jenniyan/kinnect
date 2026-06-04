# Communication Protocols
## HTTPS/REST
HTTPS request are used for all operations that follow a simple request-response pattern use HTTPS with JSON payloads. This includes user registration and login, profile reads and writes, tag searches, and signed URL generation for media uploads. Every request carries a JWT Authorization header (except login and registration). The API Gateway validates the token before forwarding the request to the appropriate downstream service.
| Method | Endpoint | Request body | Response |
|---|---|---|---|
| POST | `/auth/register` | `{email, password, display_name}` | `{access_token, user_id}` |
| POST | `/auth/login` | `{email, password}` | `{access_token, user_id}` |
| PATCH | `/users/me/profile` | `{bio, tags[], location_visible, is_anonymous}` | `{user_id, updated_at}` |
| GET | `/users/nearby?radius=2` | — | `[{user_id, display_name, distance_km, tags[]}]` |
| POST | `/media/upload-url` | `{filename, gps_lat, gps_lng, visibility, caption}` | `{signed_url, r2_key, expires_in}` |
| POST | `/media/confirm` | `{r2_key, lat, lng, visibility, caption, tags[]}` | `{video_id}` |
## WebSocket via Socket.io
Persistent WebSocket connections are used for all data that must flow without a client request: incoming chat messages, live GPS updates broadcast to nearby users, and read receipts. The mobile app opens a single Socket.io connection to the API Gateway on launch and keeps it open for the session. Socket.io handles reconnection automatically.
| Direction | Event | Payload |
|---|---|---|
| Client → Server | `location_update` | `{user_id, lat, lng, timestamp}` |
| Server → Client | `nearby_user_moved` | `{user_id, lat, lng}` |
| Client → Server | `send_message` | `{room_id, content, timestamp}` |
| Server → Client | `new_message` | `{room_id, sender_id, content, timestamp, message_id}` |
| Client → Server | `read_receipt` | `{message_id, reader_id, read_at}` |
| Server → Client | `read_receipt` | `{message_id, reader_id, read_at}` |
## Redis Pub/Sub
When the Chat Service runs on multiple Node.js instances (for horizontal scaling), a WebSocket message arriving at instance A must be delivered to a user whose connection is on instance B. Redis pub/sub solves this: every instance subscribes to the channels for the rooms its connected users are in. When instance A receives a message, it publishes it to the Redis channel; instance B's subscriber callback fires and delivers it over the user's WebSocket.

## Signed HTTPS URLs
To avoid routing large video files through the Node.js backend (which would be slow and consume server bandwidth), the API Gateway generates a time-limited Cloudflare R2 pre-signed URL and returns it to the mobile client. The client then performs a direct HTTPS PUT request to R2 with the video binary as the request body. The signed URL encodes permissions, expiry, and metadata, and is valid for 15 minutes.
