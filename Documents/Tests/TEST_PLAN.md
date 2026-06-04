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

Unit test: Tests a single function or module in complete isolation from the rest of the system. External dependencies (database, network, Redis) are replaced with mocks or stubs. A unit test should run in milliseconds and require no running infrastructure.
Integration test: Tests two or more real components working together — for example, the Chat Service plus a live Redis instance, or the User Service plus a real Supabase test database. Integration tests verify that the interfaces between components are correctly implemented.

| Component | Test types you'll apply | Framework | Why this fit (one sentence) |
|---|---|---|---|
| React Native mobile (Expo) | Unit · Component | Jest + React Native Testing Library | RNTL renders components with a test renderer and fires events — no simulator required, runs in CI. |
| Express API gateway + services | Unit · Integration | Jest + Supertest | Supertest drives real HTTP requests against the Express app without network overhead; Jest mocks downstream services for unit tests. |
| Socket.io Chat Service | Unit · Integration | Jest + socket.io-client (test mode) | The test client connects to a real Socket.io server in-process, verifying event delivery and room fan-out with an actual Redis pub/sub adapter. |
| PostgreSQL (User DB + Message DB) | Integration | Jest + node-postgres (pg) | Direct SQL against a Supabase test project verifies schema correctness, RLS policies, and query performance on real data. |
| Redis Location Cache | Integration | Jest + ioredis + @testcontainers/redis | A Docker Redis container spun up per test suite guarantees isolation; tests verify TTL expiry and GEORADIUSBYMEMBER accuracy. |
| Cloudflare R2 media upload | Integration | Jest + aws-sdk (S3-compatible) | Tests request a signed URL from the API and perform a real PUT to the R2 sandbox bucket, verifying metadata and expiry. |
| Cross-cutting: load & concurrency | Load test | k6 | k6 scripting language fits naturally with REST and WebSocket scenarios; provides p95/p99 latency metrics and concurrent-user simulation. |

## 1.5 Environment and Assumptions
### Runtime
 - Node.js 20 LTS for all backend services and test runners.
 - Expo SDK 51 + React Native 0.74 for mobile component tests.
 - Tests run on Ubuntu 22.04 in CI (GitHub Actions); developers run locally on macOS 14 or Windows 11 with WSL2.

### Data & state
 - Each test suite creates its own isolated data and tears it down after — no shared global state between suites.
 - Test user accounts (e.g. test_user_001@kinnect.test) are seeded via a setup script before each integration suite runs.
 - Message DB and User DB tests run against a dedicated Supabase test project — never the production database.
 - Redis tests use a Docker container (via Testcontainers) so each suite starts with a clean Redis instance.

### Mocks vs live
 - Cloudflare R2: integration tests use the real R2 sandbox bucket; unit tests for the signed URL function mock the AWS SDK.
 - Socket.io: unit tests mock the socket.emit / socket.on interface; integration tests use a live in-process Socket.io server.
 - Instagram and Discord OAuth: fully mocked in all test environments — no real OAuth tokens are used.
 - Push notifications (APNs/FCM): stubbed with a no-op function; delivery is not verified.
 - GPS coordinates: synthetic coordinate arrays are injected for all location tests — no real device GPS is required.

### CI/CD
 - Unit and integration tests run on every pull request via GitHub Actions.
 - Load tests (k6) run nightly on the staging environment — not on every PR due to execution time.
 - A failing test blocks merge; flaky tests must be quarantined within 24 hours or the suite is disabled.

## 1.6 Team Roles

| Member | Owns which test categories / components |
|---|---|
| Zhengyu Dong | API Gateway and authentication tests, including JWT enforcement and protected-route behavior |
| Niharika Yalla | TEST_PLAN.md documentation, Tests by Category section, Plan-vs-Implementation Gap, Reflection, and report cleanup |
| Yuxuan Huang | User Service tests, including registration, login, duplicate-email handling, profile updates, and blocking behavior |
| Xinlei Liang | Location Service tests, including Redis-backed location updates, nearby-user queries, blocked-user filtering, and hidden-location filtering |
| Jennifer Yan | Tag Service and shared validation tests, including tag creation, category validation, login/register input validation, and location input validation |

# Tests Implemented and Report
## 2.1 Required Minimums

| Category | Required? | Minimum |
|---|---|---|
| **Unit tests** | Required | ≥ 5 tests |
| **Integration tests** | Required | ≥ 3 tests |

## 2.2 Tests by Category

_Last updated: 2026-06-03 12:01 PM_

| Category | Count | 2+ examples |
|---|---:|---|
| Unit | At least 46 known tests across auth, shared helpers, location, and tags. Final count should include 'user.unit.test.js' once confirmed. | 'auth.unit.test.js' checks that alid JWTs pass while missing, malformed, wrong-secret, and expired tokens return 401. 'location.unit.test.js' checks invalid location updates, missing 'user_id, unknown locations, empty nearby results, and Redis deletion behavior. |
| Integration | 25 | 'gateway.integration.test.js' checks that protected API Gateway routes reject missing/invalid JWTs while public routes remain reachable. 'location.integration.test.js' checks nearby-user queries, block-list filtering, hidden-location filtering, tag filtering, and Redis location updates. 'user.integration.test.js' checks registration, duplicate email rejection, login, password stripping, profile update, blocking self, and JWT expiry. |

## 2.3 Where the Tests live
 
```
kinnect/
├── shared/
│   └── lib/
│       └── auth.js                         ← extracted pure-logic helpers (testable, gets coverage)
├── tests/
│   ├── unit/
│   │   ├── auth.unit.test.js               (6 tests)  — JWT middleware edge cases
│   │   ├── user.unit.test.js               (10 tests) — register/login input validation
│   │   ├── tags.unit.test.js               (7 tests)  — tag category validation
│   │   ├── location.unit.test.js           (7 tests)  — location update/nearby input guards
│   │   └── helpers.unit.test.js            (26 tests) — shared/lib/auth.js (gets real coverage %)
│   └── integration/
│       ├── gateway.integration.test.js     (12 tests) — JWT enforcement across all protected routes
│       ├── user.integration.test.js        (8 tests)  — full register, login, profile, block flows
│       └── location.integration.test.js    (5 tests)  — nearby query pipeline: Redis → profiles → filters
└── package.json                            ← jest config + test scripts
```
 
Run commands (the TA will copy-paste these on a fresh clone):
 
```bash
# Install dependencies (only needed once)
npm install
 
# Run unit tests only
npm run test:unit
 
# Run integration tests only
npm run test:integration
 
# Run all tests
npm test
 
# Run all tests with coverage report
npm run test:coverage
```
 
Approximate run-times:
 
| Category | Time | Where it runs |
|---|---|---|
| Unit | ~1.2 s | local + CI |
| Integration | ~1.0 s | local + CI |
| e2e (if chosen) | N/A: not implemented | — |
| Concurrent (if chosen) | N/A: not implemented | — |

## 2.4 Coverage Achieved
 
_Last updated: 2026-06-03 12:16 PM_
 
| Test type | Tool | Coverage % |
|---|---|---|
| Unit | Jest --coverage | 100% stmts · 84% branch · 100% funcs · 100% lines |
| Integration | Jest --coverage | 100% stmts · 84% branch · 100% funcs · 100% lines |
| **Combined (overall)** | Jest merged report | **100% stmts · 83.87% branch · 100% funcs · 100% lines** |
 
**What is NOT covered and why:**
 
The coverage numbers above are measured against `shared/lib/auth.js`, the extracted helper module that the tests exercise directly. The raw service entry-point files (`api-gateway/index.js`, `user-service/index.js`, `location-service/index.js`, etc.) report 0% instrumented coverage because each file calls `app.listen()` or `server.listen()` at module load time. Importing them in Jest causes the process to bind a real port and emit unhandled Redis connection errors, which breaks Supertest's in-process model. To work around this, tests use inline app replicas that faithfully reproduce the route logic — so all meaningful branches are exercised, just not via the original file path.
 
The uncovered branches in `shared/lib/auth.js` (lines 7, 43, 55, 71, 83) are `||` fallback defaults such as `process.env.JWT_SECRET || 'dev_secret_change_in_production'`. These branches only fire when the env var is unset, which never happens during tests. They are not security-relevant paths.
 
Not covered at all: chat-service Socket.io fan-out, video-service signed URL generation, navigation-service, and the React Native mobile components. These require a live Postgres/Redis/R2 instance or a device simulator, and were out of scope for this iteration.

## 2.5 Plan Versus Implementation

Where did your **Part 1 plan** call for testing that your **implementation didn't (or couldn't) cover**? This is the honest report. We'd rather you say "we planned 12 e2e flows and shipped 2" than silently omit it.

| What the plan called for | What you actually shipped | What blocked you / what you'd add next |
|---|---|---|
| Unit tests for authentication, JWT behavior, and input validation | Implemented unit tests for valid/missing/expired/malformed JWTs, registration/login input validation, tag validation, and location input validation. | Add more edge cases for invalid email formats, duplicate tags, invalid coordinate ranges, and refresh-token behavior if implemented later. |
| Integration tests for API Gateway and protected backend routes | Implemented integration tests verifying protected routes return 401 without valid JWTs, expired/wrong-secret tokens are rejected, public routes are reachable, and valid JWTs can reach the upstream proxy. | Add more tests for downstream service failures and proxy error handling. |
| Integration tests for user account and profile flows | Implemented integration tests for registration, duplicate email rejection, login, wrong password, missing user profile, profile update, blocking self, and JWT 7-day expiry. | Add tests for phone-based login, stronger profile validation, and database error paths. |
| Integration tests for location discovery and Redis-backed nearby-user behavior | Implemented tests for visible nearby users, blocked-user filtering, hidden-location filtering, tag filtering, Redis location writes, empty nearby results, and location deletion. | Add real Redis/container-based tests if time allows; current tests use mocked Redis. |
| Load, full mobile UI, real GPS, Socket.io multi-device chat, and Cloudflare R2 upload testing | Not fully implemented in the current test submission. | These require more setup, external credentials, real devices, or staging infrastructure, so they remain future test targets. |

If the plan and implementation match exactly, write "N/A — implemented as planned."

# Reflection

One thing our tests helped us notice was that our authentication logic needed to handle more than just the normal valid-login case. We tested missing Authorization headers, missing Bearer prefixes, expired tokens, wrong-secret tokens, and malformed tokens. This mattered because protected parts of Kinnect, like profiles, nearby users, chat rooms, and media uploads, should only work with a valid JWT.

The hardest part to test was the real-time behavior, especially location updates and chat. These features involve multiple services working together, so our tests used mocks for things like Redis, axios, and database calls instead of running the entire app at once.

If we had more time, we would add more full-flow tests, such as registering, choosing interests, updating location, finding nearby users, starting a chat, and posting a video. We would also add more tests for the mobile UI and real Redis behavior.

Claude helped with getting started, organizing ideas, and wording parts of the assignment. However, we still had to check the actual code and test files ourselves to make sure the final report matched what we really implemented.
