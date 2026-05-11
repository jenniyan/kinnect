# Architecture Summary
## Design Style
### Client-Server Pattern
The mobile application acts as the client and all backend services act as servers. Every user-facing action: loading the map, sending a message, editing a profile — originates on the client and is fulfilled by a discrete backend service. This separation ensures that business logic, data validation, and storage remain on the server, keeping the client thin and stateless. The primary benefit is that the backend can be updated, scaled, or replaced without requiring users to update their apps.
### Layered Architecture (Server Side)
The backend is divided into three explicit layers: the API Gateway layer (entry point and routing), the Business Logic Services layer (User, Location, Tag, and Chat services), and the Data Storage layer (databases and cache). Each layer depends only on the layer directly below it. The key benefit is separation of concerns — the API Gateway handles authentication and routing without knowing how data is stored, and each service handles one domain without stepping on another.
### Component-Based Architecture (Mobile App)
The mobile application is built as a collection of self-contained UI components — Map, Profile, Chat, and Video — each managing its own state and rendering logic. Components communicate through shared navigation state and a global Socket.io client. This style promotes code reuse, independent development of each screen, and isolated testing. Adding a new feature (e.g., a Stories feed) requires creating a new component rather than modifying existing ones.

## Components and Key Functionalities
## Frontend
### Map UI
 - Runs on Mobile device.
 - This component renders the live map using react-native-maps, displays nearby user pins updated in real time via WebSocket, and handles radius filtering UI and triggers navigation to user profiles or chat.
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
 - This component manages user accounts: registration, login (issues JWTs), profile reads and writes, block-list management, and anonymous mode toggling, and reads and writes to the User DB.
### Location service
 - Runs on cloud server.
 - This component receives GPS coordinates from connected clients every few seconds, writes coordinates to the Redis Location Cache with a short TTL, and responds to proximity queries with a filtered list of nearby users within the requested radius.
### Tag service
 - Runs on cloud server.
 - This component manages the predefined tag library and user-defined custom tags, handles tag search queries, and associates tags with user profiles and supports filtering nearby users by shared tags.
### Chat service
 - Runs on cloud server.
 - This component maintains persistent WebSocket connections for all active users, delivers messages in real time to recipients, manages group chat rooms using Socket.io rooms, uses Redis pub/sub to fan out messages across multiple server instances, and persists all messages to the Message DB.

## Database
### User database
 - Runs on cloud server.
 - This component permanently stores user profiles, hashed credentials, tag associations, block lists, and privacy settings.
### Location cache
 - Runs on cloud server.
 - This component stores live GPS coordinates as key-value pairs with a short TTL, expired entries are automatically removed. Also serves as the pub/sub broker for Chat Service scaling.
### Message database
 - Runs on cloud server.
 - This component stores the full history of all chat messages, group membership, and message read status.
### Media storage
 - Runs on cloud server.
 - This component stores uploaded video files with GPS coordinates and visibility settings stored as object metadata, serves video playback URLs through time-limited signed tokens.
