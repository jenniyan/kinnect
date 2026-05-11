# Platform and Languages
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
