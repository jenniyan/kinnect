# Platform
## Frontend
 - The Frontend of our application will be build with React Native with Expo. Because it allows us to write one codebase for both iOS and Android, has massive community support, and Expo dramatically simplifies setup. The trade-off is that it's slightly slower than fully native Swift/Kotlin for heavy graphics.
 - To be specific, the Map UI could use react-native-maps, since it wraps Google Maps/Apple Maps natively and handles live pins well.
 - The Video UI should use expo-camera and expo-av for recording and playback.

## Backend
 - We will use Node.js and Express for building the API Gateway, User Service, Location Service, Tag Service, and Chat Service of the Backend. Because it's excellent for I/O-heavy workloads like real-time location updates and chat. The trade-off is that it's single-threaded, so CPU-heavy tasks like video processing should be offloaded.
 - For Chat Service, we should add Socket.io on top of Express to handle WebSocket connections.

## Database
 - We will use PostgreSQL for our User Database and Message Database. Because it has excellent support for structured data like profiles and chat history, and has a strong ecosystem. Use Supabase as a managed host to avoid ops complexity.
 - We will use Redis for our Location Cache. Because it's built for fast in-memory key-value storage, perfect for GPS coordinates that update every few seconds.
 - We will use Cloudflare R2 for Media Storage, which are industry standard platform for storing video files with metadata. We could use signed URLs to attach GPS coordinates and visibility settings as object metadata.

# Language
## JavaScript/TypeScript
JavaScript (with optional TypeScript for type safety) is the sole programming language used across the entire stack — both the React Native mobile application and all five Node.js backend services.
Benefit:
 - A single language across the full stack eliminates context switching. Developers can contribute to both the app and the backend without learning a second language.
 - Data models (e.g., a User object or a ChatMessage struct) can be defined once and imported by both client and server modules, ensuring the two sides always agree on the shape of data.
 - JavaScript has the largest package ecosystem in the world (npm). Every library the project requires — routing, WebSocket management, database access, testing — has a mature JavaScript implementation.
 - TypeScript (a typed superset of JavaScript) can be introduced incrementally. Typed interfaces for API payloads catch mismatches at compile time rather than at runtime, reducing bugs.
Trade-offs:
 - JavaScript is dynamically typed by default. Without TypeScript, type errors surface only at runtime. The team should adopt TypeScript from the start to avoid this pitfall.
 - JavaScript is not the best choice for computationally heavy tasks (e.g., video encoding, image processing, machine learning inference). Any such functionality should be delegated to a purpose-built service.
 -  Callback-heavy async code can be difficult to reason about for beginners. The team must consistently use async/await patterns and avoid callback pyramids.

## SQL
PostgreSQL queries are written in standard SQL, executed via the pg driver from Node.js. The team will use parameterized queries exclusively to prevent SQL injection.
Benefit:
 - SQL is the universal language for relational data, which should be familiar with team members.
 - PostgreSQL's SQL dialect supports advanced features (window functions, JSON columns, full-text search) that will be useful as the product grows.

Trade-offs:
  - As the schema evolves, migration scripts must be maintained. Missing a migration can break the production database. The team should use a migration tool from day one.
  - Complex JOIN queries across multiple tables can become a performance bottleneck at scale. Query performance must be monitored with EXPLAIN ANALYZE and indexes added proactively.
