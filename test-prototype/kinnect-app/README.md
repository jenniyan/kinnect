# Kinnect — Frontend (React Native + Expo)

## Setup

### 1 — Install Expo CLI
```bash
npm install -g expo-cli
```

### 2 — Install dependencies
```bash
cd kinnect-app
npm install
```

### 3 — Point to your backend
Open `services/api.js` and set `BASE_URL`:
```js
// For iOS Simulator: localhost works
export const BASE_URL = 'http://localhost:3000';

// For Android Emulator:
export const BASE_URL = 'http://10.0.2.2:3000';

// For a real device on same WiFi:
export const BASE_URL = 'http://192.168.x.x:3000';  // your Mac's local IP
```

### 4 — Start the app
```bash
npx expo start
```
Then press:
- `i` to open in iOS Simulator
- `a` to open in Android Emulator
- Scan the QR code with **Expo Go** app on your phone

## Screens built
- ✅ Welcome / Login / Signup → wired to `/auth/register` + `/auth/login`
- ✅ Tag picker → wired to `/tags/resolve` + `/users/me/tags`
- ✅ Map → live GPS, nearby users, radius selector, user pins, user detail sheet
- ✅ Chat list → wired to `/rooms`
- ✅ Chat thread → real Socket.io messages, read receipts
- ✅ Videos tab → nearby videos from `/videos/nearby`
- ✅ Profile → anonymous toggle, location visibility, tags
- ✅ Settings → links to all sub-screens
- ✅ Routing → GPS route request, live status

## Make sure your backend is running first
```bash
cd kinnect          # the backend folder
npm run dev
```
