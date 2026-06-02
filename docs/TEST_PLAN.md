# Test Plan
## 1.1 Scope
What features and components are in scope and which are explicitly out of scope?
| In Scope | Why This Matters |
|---|---|
|User registration & login (POST /auth/register, POST /auth/login)|Highest user impact; touches mobile UI, API gateway, User Service, and User DB simultaneously. Auth failures block all other features.|
|Live GPS location broadcast & nearby-user query|Core value proposition of the app. Requires real-time WebSocket connection, Redis TTL correctness, and GEORADIUSBYMEMBER accuracy.|
|Interest tag selection and custom sub-tag creation|Tag data drives map filtering and user discovery. Incorrect storage or retrieval degrades core matchmaking.|
|Real-time chat messaging (1:1 and group)|Socket.io delivery, Redis pub/sub fan-out, and Message DB persistence must all work together correctly.|
|Profile read and update (bio, tags, privacy, linked accounts)|High-frequency user action; incorrect writes could expose private data or corrupt user identity.|
|Video upload via signed URL (record → request URL → PUT to R2)|Multi-step flow across three systems (backend, mobile, R2). Failure at any step is a silent data loss.|
|JWT authentication and token expiry handling|Security-critical; expired or invalid tokens must be rejected consistently across all services.|
|Map radius filter (slider changes nearby user results)|Functional correctness of the GPS radius query; incorrect filtering is a core UX failure.|



| Out of Scope | Why Excluded |
|---|---|
|Third-party OAuth providers (Instagram, Discord login)|We mock the OAuth flow; Instagram and Discord test their own auth services.|
|Cloudflare R2 internal reliability / CDN uptime|Third-party infrastructure — outside our control; we test our integration with it, not R2 itself.|
|Push notification delivery (APNs / FCM)|Requires Apple/Google sandbox credentials; delivery latency is non-deterministic in CI environments.|
|Cross-browser web testing|Kinnect is a native mobile app (React Native / Expo); browser compatibility is not applicable.|
|Video encoding / transcoding quality|Stretch feature not yet implemented; no transcoding pipeline exists in the current architecture.|
|Payment or subscription flows|No payment system is in scope for this version of the product.|

## 1.2 Quality Goals
### Functional correctness
 - Zero critical bugs in the signup, login, and JWT refresh flows across all happy paths.
 - Nearby-user query returns only users within the selected radius ± 50 metres on a known test dataset.
 - Chat messages are delivered to all room members within 500 ms on a local network under normal load.
 - Tag associations are persisted correctly to the User DB and returned accurately on subsequent profile reads.
 - Signed URL upload flow completes end-to-end with the correct GPS metadata attached to the R2 object.

### Reliability & performance
 - Backend handles 50 concurrent WebSocket connections (simulating 50 active map users) without any 500-class errors.
 - p95 response time for REST read endpoints (GET /users/nearby, GET /users/me) under 500 ms locally.
 - Redis location cache correctly expires stale GPS entries after 30 seconds; no ghost pins appear on the map.
 - Zero unhandled promise rejections or uncaught exceptions in the server logs during all happy-path integration tests.

### Security
 - All endpoints except /auth/register and /auth/login return 401 when called without a valid JWT.
 - A user cannot read messages from a chat room they are not a member of (row-level security verified by direct DB query).
 - Signed URLs expire after 15 minutes; a request with an expired URL returns 403 from R2.

## 1.3 Risks and Priorities

| Area | Why it's risky / costly | Priority (H / M / L) |
|---|---|---|
| Concurrent signups → duplicate user emails | Race condition between two INSERT operations could create duplicate accounts, corrupting auth and profile data. | H |
| JWT token expiry edge cases | Expired tokens that are not rejected allow unauthorised access to all user data — a direct security vulnerability. | H |
| Redis pub/sub fan-out across Chat Service instances | If pub/sub is misconfigured, messages are silently dropped for users on different server instances — invisible data loss. | H |
| GPS TTL expiry — ghost pins on map | Stale Redis entries could show users as nearby when they have left the area — damages core trust. | H |
| Signed URL expiry and re-upload logic | If the client retries an upload with an expired URL, the video is silently lost with no error shown to the user. | H |
| Row-level security on Message DB | A misconfigured Supabase RLS policy could expose private chat history to unauthorised users. | H |
| Tag sub-tag persistence (parent_tag_id FK) | Custom tags with invalid parent references could cause silent failures in tag search and filtering. | M |
| Socket.io reconnection after mobile background/foreground | Apps backgrounded by iOS/Android may lose the WebSocket — reconnect logic must restore chat and GPS correctly. | M |
| Empty map state (0 nearby users) | Missing empty state handling could show a blank map with no user feedback — degrades first-run experience. | M |
| Chat group export link generation | Incorrectly formatted export links to Instagram DM or Discord could fail silently with no error state. | L |
| Pagination on long chat history | Cursor-based pagination could skip or duplicate messages at page boundaries — cosmetic but recoverable. | L |

## 1.4 Strategy

Unit test:
Integration test:

| Component | Test types you'll apply | Framework | Why this fit (one sentence) |
|---|---|---|---|
| _your frontend stack_ | | | |
| _your backend stack_ | | | |
| Database | | | |
| Cross-cutting (concurrency / load — if any) | | | |

## 1.5 Environment and Assumptions

## 1.6 Team Roles

| Member | Owns which test categories / components |
|---|---|
| Zhengyu Dong | |
| Niharika Yalla | |
| Yuxuan Huang | |
| Xinlei Liang | |
| Jennifer Yan | |

# Tests Implemented and Report
## 2.1 Required Minimums

| Category | Required? | Minimum |
|---|---|---|
| **Unit tests** | Required | ≥ 5 tests |
| **Integration tests** | Required | ≥ 3 tests |

## 2.2 Tests by Category

_Last updated: __________ (commit __________)_

| Category | Count | 2+ examples |
|---|---|---|
| Unit | | |
| Integration | | |

## 2.3 Where the Tests live

```
[your tests/ folder structure]
```

Run commands (the TA will copy-paste these on a fresh clone):

```bash
[your run commands]
```

Approximate run-times:

| Category | Time | Where it runs |
|---|---|---|
| Unit | | local + CI |
| Integration | | |
| e2e (if chosen) | | |
| Concurrent (if chosen) | | local only is fine |

## 2.4 Coverage Achieved

_Last updated: __________ (commit __________)_

> Just **report the number**. **50%+ is fine** — you're not chasing 100%. The point is that you measured it (not guessed) and can talk about the gaps.

| Test type | Tool | Coverage % |
|---|---|---|
| Unit | _e.g. Jest --coverage / pytest --cov_ | |
| Integration | | |
| **Combined (overall)** | merged report | |

A few sentences on what's NOT covered and why:

```
[your notes]
```

## 2.5 Plan Versus Implementation

Where did your **Part 1 plan** call for testing that your **implementation didn't (or couldn't) cover**? This is the honest report. We'd rather you say "we planned 12 e2e flows and shipped 2" than silently omit it.

| What the plan called for | What you actually shipped | What blocked you / what you'd add next |
|---|---|---|
| | | |
| | | |

If the plan and implementation match exactly, write "N/A — implemented as planned."

# Reflection
1. What did your tests catch that you missed before? (Concrete bug, please.)
2. What was hardest to test, and why?
3. What test would you add next if you had more time?
4. Where did Claude help — and where did it get things wrong?
