# Use Cases
## User Registration and Profile Setup
Steps:
  1. Profile UI → handleRegister(), use HTTPS POST to send {"email":"user@x.com","password":"hashed","display_name":"Alex"}
  2. API Gateway → routeToUserService(), use Internal HTTP POST to send {"email":"user@x.com","password":"hashed","display_name":"Alex"}
  3. User Service → createUser(), use PostgreSQL INSERT to send "INSERT INTO users (email, password_hash, display_name) VALUES (...)"
  4. User Service → issueToken(), use HTTP response to Gateway to send {"access_token":"eyJ...","user_id":"uuid-123"}
  5. API Gateway → returnToClient(), use HTTPS response to mobile to send {"access_token":"eyJ...","user_id":"uuid-123"}
  6. Profile UI → handleSaveProfile(), use HTTPS PATCH to send {"bio":"Hey!","tags":["music","hiking"],"privacy_mode":"public"}

## Discovering Nearby Users on the Map
Steps:
  1. Map UI → startLocationWatch(), use expo-location (device GPS) to send GPS fix: {lat:33.684, lng:-117.826, accuracy:5m}
  2. Map UI → emitLocationUpdate(), use WebSocket emit to send location update: {"user_id":"uuid-123","lat":33.684,"lng":-117.826,"ts":1716000000}
  3. API Gateway → forwardToLocationService(), use Internal WebSocket relay to send Same payload forwarded to Location Service
  4. Location Service → cacheLocation(), use Redis SET with TTL to send "SET user:uuid-123:location {lat,lng,ts} EX 30"
  5. Map UI → fetchNearbyUsers(), use HTTPS GET to send "Authorization: Bearer eyJ... (no body)"
  6. Location Service → queryRadius(), use Redis GEORADIUSBYMEMBER to returns user_ids within 2km radius
  7. Location Service → enrichWithProfiles(), use Internal HTTP GET to send {"user_ids":["uuid-456","uuid-789"]}
  8. Map UI → renderPins(), use HTTPS response to mobile to send [{"user_id":"uuid-456","display_name":"Sam","lat":33.685,"lng":-117.824,"tags":["music"]}]

## Sending and Receiving a Chat Message
Steps:
  1. Chat UI → sendMessage(), use WebSocket emit to send {"room_id":"room-abc","content":"Hey!","timestamp":1716000100}
  2. Chat Service → handleSendMessage(), use PostgreSQL INSERT to send "INSERT INTO messages (room_id, sender_id, content, sent_at)"
  3. Chat Service → publishToRedis(), use Redis PUBLISH to send "PUBLISH room:room-abc {serialized message JSON}"
  4. Chat Service (all instances) → onRedisMessage(), use Redis pub/sub to send each subscribed instance the message payload
  5. Chat Service → broadcastToRoom(), use WebSocket emit to send {"room_id":"room-abc","sender_id":"uuid-123","content":"Hey!","message_id":"msg-xyz","ts":1716000100}
  6. Chat UI (recipient) → onNewMessage(), use WebSocket receive to receive message and renders the new message bubble
  7. Chat UI → emitReadReceipt(), use WebSocket emit to send {"message_id":"msg-xyz","reader_id":"uuid-456","read_at":1716000105}

## Recording and Uploading a Location-Anchored Video
Steps:
  1. Video UI → startRecording(), use expo-camera (device hardware) to write local video file to device storage
  2. Video UI → requestUploadUrl(), use HTTPS POST to send {"filename":"vid_001.mp4","lat":33.684,"lng":-117.826,"visibility":"nearby"}
  3. API Gateway → generateSignedUrl(), use HTTPS to Cloudflare R2 to send S3 presign request with metadata; response: signed URL (15 min expiry)
  4. API Gateway → returnUrl(), use HTTPS to send response to mobile: {"signed_url":"https://r2.example.com/vid_001.mp4?X-Amz-Signature=..."}
  5. Video UI → uploadFile(), use HTTPS PUT directly to Cloudflare R2 to send binary video payload to signed URL
  6. Video UI → confirmUpload(), use HTTPS POST to send {"filename":"vid_001.mp4","r2_key":"user/uuid-123/vid_001.mp4"}
  7. User Service → saveVideoRecord(), use PostgreSQL INSERT to send "INSERT INTO videos (user_id, r2_key, lat, lng, visibility, created_at)"
