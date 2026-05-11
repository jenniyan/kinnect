# Architecture Summary
## Design Style
- Client-Server Pattern
The mobile application acts as the client and all backend services act as servers. Every user-facing action — loading the map, sending a message, editing a profile — originates on the client and is fulfilled by a discrete backend service. This separation ensures that business logic, data validation, and storage remain on the server, keeping the client thin and stateless. The primary benefit is that the backend can be updated, scaled, or replaced without requiring users to update their apps.
- Layered Architecture (Server Side)
The backend is divided into three explicit layers: the API Gateway layer (entry point and routing), the Business Logic Services layer (User, Location, Tag, and Chat services), and the Data Storage layer (databases and cache). Each layer depends only on the layer directly below it. The key benefit is separation of concerns — the API Gateway handles authentication and routing without knowing how data is stored, and each service handles one domain without stepping on another.
- Component-Based Architecture (Mobile App)
The mobile application is built as a collection of self-contained UI components — Map, Profile, Chat, and Video — each managing its own state and rendering logic. Components communicate through shared navigation state and a global Socket.io client. This style promotes code reuse, independent development of each screen, and isolated testing. Adding a new feature (e.g., a Stories feed) requires creating a new component rather than modifying existing ones.


## Frontend
The Frontend should runs on a mobile clinet.
The frontend should be component-based, consist 4 components:
 - Map UI
 - Profile UI
 - Chat UI
 - Video UI

## Backend
The Backend should runs on a server.
The backend should consist 4 components:
 - User service
 - Location service
 - Tag service
 - Chat service

## Database
The database should runs on a server.
The database should consist 4 components:
 - User database
 - Location cache
 - Message database
 - Media storage
