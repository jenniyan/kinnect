# Design Style
## Client-Server Pattern
The mobile application acts as the client and all backend services act as servers. Every user-facing action: loading the map, sending a message, editing a profile — originates on the client and is fulfilled by a discrete backend service. This separation ensures that business logic, data validation, and storage remain on the server, keeping the client thin and stateless. The primary benefit is that the backend can be updated, scaled, or replaced without requiring users to update their apps.
## Layered Architecture (Server Side)
The backend is divided into three explicit layers: the API Gateway layer (entry point and routing), the Business Logic Services layer (User, Location, Tag, and Chat services), and the Data Storage layer (databases and cache). Each layer depends only on the layer directly below it. The key benefit is separation of concerns — the API Gateway handles authentication and routing without knowing how data is stored, and each service handles one domain without stepping on another.
## Component-Based Architecture (Mobile App)
The mobile application is built as a collection of self-contained UI components — Map, Profile, Chat, and Video — each managing its own state and rendering logic. Components communicate through shared navigation state and a global Socket.io client. This style promotes code reuse, independent development of each screen, and isolated testing. Adding a new feature (e.g., a Stories feed) requires creating a new component rather than modifying existing ones.

# Components and Key Functionalities
## Frontend
### Map UI
 - Runs on Mobile device.
 - This component renders the live map using react-native-maps, displays nearby user pins updated in real time via WebSocket, and handles radius filtering UI and triggers navigation to user profiles or chat. It also provides UI for sending and receiving routing requests, renders turn-by-turn navigation routes, and displays real-time location updates of the destination user during active navigation sessions. Additionally, it displays location-anchored video markers on the map, shows pop-up previews when users enter video trigger zones, and provides video playback and interaction controls.
### Profile UI
 - Runs on Mobile device.
 - This component displays and edits the user's bio, tags, avatar, and privacy settings, sends profile updates to the User Service via REST, and renders other users' public profiles on tap.
### Chat UI
 - Runs on Mobile device.
 - This component sends and receives messages in real time over WebSocket, renders individual and group chat threads, and displays read receipts, timestamps, and external chat export links.
### Video UI
 - Runs on Mobile device.
 - This component records video using the device camera via expo-camera, requests a signed upload URL from the API Gateway, then uploads directly to Cloudflare R2, and plays back location-anchored videos on the map.
   

## Backend
### API Gateway
 - Runs on cloud server.
 - This component is the front door for all client traffic. It validates JWT tokens on every request, routes REST calls to the correct downstream service, and proxies WebSocket connections to the Chat and Location services. Also issues signed URLs for media upload and download.
### User service
 - Runs on cloud server.
 - This component manages user accounts: registration, login (issues JWTs), profile reads and writes, block-list management, and anonymous mode toggling, and reads and writes to the User DB. It also manages user-linked external application accounts, validates external account information, and provides secure access to external contact details during chat transfer requests.
### Location service
 - Runs on cloud server.
 - This component receives GPS coordinates from connected clients every few seconds, writes coordinates to the Redis Location Cache with a short TTL, and responds to proximity queries with a filtered list of nearby users within the requested radius.
### Tag service
 - Runs on cloud server.
 - This component manages the predefined tag library and user-defined custom tags, handles tag search queries, and associates tags with user profiles and supports filtering nearby users by shared tags.
### Chat service
 - Runs on cloud server.
 - This component maintains persistent WebSocket connections for all active users, delivers messages in real time to recipients, manages group chat rooms using Socket.io rooms, uses Redis pub/sub to fan out messages across multiple server instances, and persists all messages to the Message DB. It also handles external chat transfer requests, sends transfer notifications to recipients, and securely shares external account information only after both parties have confirmed the transfer.
### Navigation Service
 - Runs on cloud server.
 - This component manages all GPS routing functionality. It receives routing requests from clients, validates that both users have active location sharing enabled, and generates real-time navigation routes by integrating with Google Maps API and Apple Maps API. It also manages the lifecycle of navigation sessions, continuously updates routes as users move, and handles request acceptance/decline notifications.
### Video Service
 - Runs on cloud server.
 - This component manages all location-triggered video functionality. It stores and retrieves video metadata including GPS coordinates, captions, tags, visibility settings, and like counts. It subscribes to location update events from the Location Service, detects when a user enters the trigger radius of a video, and returns matching video content to clients. It also handles video interactions such as likes and initiates chat requests from video previews.

## Database
### User database
 - Runs on cloud server.
 - This component permanently stores user profiles, hashed credentials, tag associations, block lists, and privacy settings. It also contains an external_accounts table that stores encrypted user credentials and handles for supported external applications.
### Location cache
 - Runs on cloud server.
 - This component stores live GPS coordinates as key-value pairs with a short TTL, expired entries are automatically removed. Also serves as the pub/sub broker for Chat Service scaling.
### Message database
 - Runs on cloud server.
 - This component stores the full history of all chat messages, group membership, and message read status.
### Media storage
 - Runs on cloud server.
 - This component stores uploaded video files with GPS coordinates and visibility settings stored as object metadata, serves video playback URLs through time-limited signed tokens.
### Video Metadata Database
 - Runs on cloud server.
 - This component stores all metadata for location-triggered videos, including video ID, creator user ID, GPS coordinates, trigger radius, caption, tags, visibility settings, like count, and creation timestamp. It is indexed by geographic coordinates for fast proximity queries.

# Connectors and Data Communicated
## Mobile App → API Gateway
 - Protocol: HTTPS/REST + WebSocket
 - Communicated Data: REST: JSON payloads — login credentials, profile updates, tag queries, signed URL requests. WebSocket: bidirectional event frames — chat messages, GPS coordinates, read receipts.
## API Gateway → User Service
 - Protocol: Internal HTTP (REST)
 - Communicated Data: JSON: user registration data, login credentials, profile field updates, block/unblock commands, anonymous mode flag.
## API Gateway → Location Service
 - Protocol: Internal HTTP + WebSocket
 - Communicated Data: JSON: {user_id, latitude, longitude, timestamp} on each GPS ping; proximity query {user_id, radius_km} and response {nearby_users[]}.
## API Gateway → Tag Service
 - Protocol: Internal HTTP (REST)
 - Communicated Data: JSON: tag search query strings, tag association requests {user_id, tag_id[]}, predefined tag library responses.
## API Gateway → Chat Service
 - Protocol: WebSocket
 - Communicated Data: Event frames: {event: 'message', room_id, sender_id, content, timestamp}, {event: 'join_room', room_id}, {event: 'read_receipt', message_id}. {event: 'transfer_request', room_id, sender_id, platform}, {event: 'transfer_accepted', room_id, target_id, external_handle}, {event: 'transfer_declined', room_id, target_id}.
## Chat Service → Location Cache
 - Protocol: Redis pub/sub
 - Communicated Data: Serialized message payloads published to channel keyed by room_id; subscriber instances receive and forward to connected WebSocket clients.
## Location Service → Location Cache
 - Protocol: Redis TCP
 - Communicated Data: Key: user:{id}:location, Value: {lat, lng, timestamp}, TTL: 30s. GEORADIUSBYMEMBER queries for proximity lookups.
## User Service → User Database
 - Protocol: PostgreSQL TCP wire protocol
 - Communicated Data: SQL: INSERT/UPDATE for profile and credentials; SELECT for login lookups; INSERT/DELETE for block-list entries.
## Chat Service → Message Database
 - Protocol: PostgreSQL TCP wire protocol
 - Communicated Data: SQL: INSERT for each new message; SELECT for chat history pagination; UPDATE for read-status.
## API Gateway → Media Storage
 - Protocol: HTTPS
 - Communicated Data: Signed URL generation request with {user_id, filename, gps_coordinates, visibility}; response is a time-limited pre-signed HTTPS upload URL.
## Video UI → Media Storage
 - Protocol: HTTPS
 - Communicated Data: Multipart video upload directly to R2 using the signed URL. No backend server involvement for the binary payload.
## API Gateway → Navigation Service
 - Protocol: Internal HTTP + WebSocket
 - Communicated Data: JSON: routing requests {requester_id, target_id}, acceptance/decline responses, route cancellation commands; WebSocket: real-time route updates and navigation status events.
## Navigation Service → External Map APIs
 - Protocol: HTTPS
 - Communicated Data: Route requests with start and end coordinates; response containing polyline data, turn-by-turn instructions, and estimated arrival time.
## API Gateway → Video Service
 - Protocol: Internal HTTP
 - Communicated Data: JSON: video metadata uploads, video query requests by location, like/unlike commands, and video deletion requests.
## Video Service → Location Service
 - Protocol: Internal HTTP
 - Communicated Data: Subscription requests for user location events; notifications when users enter specific geographic areas.
## Video Service → Video Metadata Database
 - Protocol: PostgreSQL TCP wire protocol
 - Communicated Data: SQL: INSERT for new video metadata; SELECT for proximity queries and video details; UPDATE for likes and visibility changes; DELETE for removed videos.
