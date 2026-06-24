# Kinnect: Location-based Social Prototype

Project created for UCI IN4MATX 43 (Spring 2026). Kinnect is a location-anchored social prototype that lets nearby users discover, chat, route to, and share short videos with one another.

**Demo:** [Watch the demo video](https://www.youtube.com/watch?v=w8Q-sfP9mt8)

**Achievement:** Winner: Best Project, IN4MATX 43 (out of ~60 groups, 293 enrolled students).


**Authorship & contributions**

This prototype was designed, implemented, and demonstrated primarily by Jennifer Yan. I led the UI/UX design, implemented the entire backend as well as the mobile frontend integration, built core prototype features, coordinated and prepared the demo, and presented both demo sessions for the course.

If you want to see the full backend or mobile setup, follow the service-specific READMEs below.

**Quick links**
- Backend services and API details: [Prototype/kinnect/README.md](Prototype/kinnect/README.md)
- Mobile app (React Native + Expo): [Prototype/kinnect-app/README.md](Prototype/kinnect-app/README.md)

**Highlights & Features**
- Live nearby user discovery (Redis geo + WebSocket updates)
- Tag-based user discovery and profile tags
- End-to-end chat with read receipts (Socket.io)
- Routing requests between users (Google Maps integration)
- Location-anchored short video uploads with signed URLs (Cloudflare R2 fallback)

**Tech stack**
- Node.js (workspace of microservices)
- PostgreSQL (user + message storage)
- Redis (geo queries, pub/sub, caching)
- Socket.io (real-time messaging and presence)
- React Native + Expo (mobile prototype)

Getting started
- See the backend quickstart: [Prototype/kinnect/README.md](Prototype/kinnect/README.md)
- See the mobile app quickstart: [Prototype/kinnect-app/README.md](Prototype/kinnect-app/README.md)

Acknowledgements
- This project was built as part of UCI IN4MATX 43 (Spring 2026). Special thanks to the course staff and classmates for feedback and the project award.

License
- This repository is provided for academic purposes. See individual package.json files for any licensing notes.

Contact
- Jennifer Yan: jenniy16@uci.edu

Other project contributors
- Zhengyu Dong
- Niharika Yalla
- Yuxuan Huang
- Xinlei Liang
