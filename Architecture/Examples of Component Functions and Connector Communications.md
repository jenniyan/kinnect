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
  2. Map UI → emitLocationUpdate(), use WebSocket to send location update: {"user_id":"uuid-123","lat":33.684,"lng":-117.826,"ts":1716000000}
  3. API Gateway → forwardToLocationService(), use Internal WebSocket relay to send Same payload forwarded to Location Service
  4. Location Service → cacheLocation(), use Redis SET with TTL to send "SET user:uuid-123:location {lat,lng,ts} EX 30"
  5. Map UI → fetchNearbyUsers(), use HTTPS GET to send "Authorization: Bearer eyJ... (no body)"
  6. Location Service → queryRadius(), use Redis GEORADIUSBYMEMBER to returns user_ids within 2km radius
  7. Location Service → enrichWithProfiles(), use Internal HTTP GET to send {"user_ids":["uuid-456","uuid-789"]}
  8. Map UI → renderPins(), use HTTPS response to mobile to send [{"user_id":"uuid-456","display_name":"Sam","lat":33.685,"lng":-117.824,"tags":["music"]}]

## Sending and Receiving a Chat Message
Steps:
  1. Chat UI → sendMessage(), 
  2. Chat Service → handleSendMessage(), 
  3. Chat Service → publishToRedis(), 
  4. Chat Service (all instances) → onRedisMessage(), 
  5. Chat Service → broadcastToRoom(), 
  6. Chat UI (recipient) → onNewMessage(), 
  7. Chat UI → emitReadReceipt(), 

## Recording and Uploading a Location-Anchored Video
Steps:
  1. Video UI → startRecording(), 
  2. Video UI → requestUploadUrl(), 
  3. API Gateway → generateSignedUrl(), 
  4. API Gateway → returnUrl(), 
  5. Video UI → uploadFile(), 
  6. Video UI → confirmUpload(), 
  7. User Service → saveVideoRecord(), 
