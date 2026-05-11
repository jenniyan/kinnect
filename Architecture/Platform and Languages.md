## Frontend
The frontend of our application will be build with React Native with Expo. Because it allows us to write one codebase for both iOS and Android, has massive community support, and Expo dramatically simplifies setup. The trade-off is that it's slightly slower than fully native Swift/Kotlin for heavy graphics.
To be specific, the Map UI could use react-native-maps, since it wraps Google Maps/Apple Maps natively and handles live pins well.
The Video UI should use expo-camera and expo-av for recording and playback.

## Backend
Our backend framework will be Node.js and Express.

## Database
For our database, we will use PostgreSQL.
