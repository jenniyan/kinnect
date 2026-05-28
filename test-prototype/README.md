# Kinnect

Location-based social app for finding people nearby who share your interests.

## Tech Stack

### Mobile (kinnect-app/)
- React Native 0.76.5 + Expo 52
- Expo Router (file-based navigation)
- Socket.io client (real-time chat + location)
- expo-location, expo-image-picker, expo-file-system
- react-native-maps

### Backend (kinnect/)
| Service | Port | Description |
|---|---|---|
| api-gateway | 3000 | Auth, routing, proxy |
| user-service | 3001 | Profiles, tags, blocks |
| location-service | 3002 | Redis geo, nearby queries |
| tag-service | 3003 | Tag library, custom tags |
| chat-service | 3004 | Socket.io, message history |
| video-service | 3006 | Video upload + feed |

- Node.js + Express
- PostgreSQL (two DBs: `kinnect_users`, `kinnect_messages`)
- Redis (geo index + pub/sub for chat fan-out)
- Socket.io

---

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis
- Xcode 16.x (do **not** use Xcode 26 beta — incompatible with RN 0.76.5)
- iOS 18 simulator or iPhone 15

### 1. Clone & install

```bash
git clone <repo>

# Backend
cd kinnect
npm install

# Mobile
cd ../kinnect-app
npm install
```

### 2. Environment variables

Create `kinnect/.env`:

```env
JWT_SECRET=your_secret_here

USER_DB_URL=postgres://postgres:password@localhost:5432/kinnect_users
MSG_DB_URL=postgres://postgres:password@localhost:5432/kinnect_messages
REDIS_URL=redis://localhost:6379

PORT_GATEWAY=3000
PORT_USER=3001
PORT_LOCATION=3002
PORT_TAG=3003
PORT_CHAT=3004
PORT_VIDEO=3006
```

### 3. Database setup

```bash
# Create databases
psql -U postgres -c "CREATE DATABASE kinnect_users;"
psql -U postgres -c "CREATE DATABASE kinnect_messages;"

# Run migrations
psql $USER_DB_URL -c "
  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    location_visible BOOLEAN DEFAULT true,
    radius_km FLOAT DEFAULT 0.5,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS external_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    handle VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, platform)
  );

  CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    is_custom BOOLEAN DEFAULT false,
    parent_tag_id UUID REFERENCES tags(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS user_tags (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, tag_id)
  );

  CREATE TABLE IF NOT EXISTS blocks (
    blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (blocker_id, blocked_id)
  );

  CREATE TABLE IF NOT EXISTS routing_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES users(id),
    target_id UUID REFERENCES users(id),
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
  );
"

psql $MSG_DB_URL -c "
  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('dm', 'group')),
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS room_members (
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (room_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS message_reads (
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    reader_id UUID NOT NULL,
    read_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (message_id, reader_id)
  );
"
```

### 4. Seed tags

```bash
cd kinnect
node seed-tags.js
```

### 5. Run the backend

```bash
cd kinnect
npm run dev
```

This starts all services concurrently. Verify they're up:

```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
```

### 6. Run the mobile app

```bash
cd kinnect-app
npx expo start --dev-client
```

### 7. Build & run on iPhone 15

Open the workspace in Xcode:

```bash
open kinnect-app/ios/kinnect.xcworkspace
```

- Select **iPhone 15** as the target device
- Hit **Run** (⌘R)
- Use **Xcode 16.x** — Xcode 26 beta is not compatible with RN 0.76.5

---

## Useful Debug Scripts

Run from `kinnect/`:

```bash
node fake-nearby-user.js              # Plant Sam, Mira, Wren near Irvine
node fake-nearby-user.js --remove     # Remove fake users
node plant-my-location.js email@x.com # Manually plant a user's location
node debug-nearby.js                  # Check Redis geo entries
node check-redis.js email@x.com       # Check a user's Redis location key
node debug-chat.js                    # Check chat DB + service health
node setup-videos-db.js               # Create video tables
```

---

## Known Limitations (Prototype)

- Avatar photos stored as base64 in Postgres — fine for demo, should move to S3/R2 for production
- Video playback is a placeholder — needs `expo-av` wired up
- iOS 26 / Xcode 26 beta incompatible with RN 0.76.5 — use Xcode 16.x + iOS 18 simulator