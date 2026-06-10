# StaffEra

Home-staffing marketplace: house owners book verified servants onboarded by agents.

## Monorepo

| App | Path | Stack |
|-----|------|-------|
| Backend | `Backend/` | Node.js, Express 5, Prisma 5, PostgreSQL |
| House Owner | `House Owner App/house-owner-app/` | Expo 54, expo-router |
| Servant | `Servant/servant-app/` | Expo 54, expo-router |
| Agent Portal | `Agent/onboarding-agent-web/` | React 19, Vite 8, React Router 7 |

## Quick start

### Backend

```bash
cd Backend
cp .env.example .env   # set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
npm install
npx prisma db push
npx prisma generate
node prisma/seed.js
npm start
```

API: `http://localhost:5000/api/v1`

### Agent web

```bash
cd Agent/onboarding-agent-web
npm install
npm run dev
```

Login: `agent@staffera.com` / `StaffEra@123` (after seed)

### Mobile apps

```bash
cd "House Owner App/house-owner-app"   # or Servant/servant-app
npm install
npx expo install
npm start
```

Set `EXPO_PUBLIC_API_BASE_URL` in each app `.env`.

**Google Maps (location picker + live tracking):** use the same API key on the backend and both mobile apps, plus your **Map ID** from Map Management:

```bash
# Backend/.env
GOOGLE_MAPS_API_KEY=your_key
GOOGLE_MAP_ID=your_map_id

# House Owner + Servant app/.env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key
EXPO_PUBLIC_GOOGLE_MAP_ID=your_map_id
```

In [Google Cloud Console](https://console.cloud.google.com/), enable **Places API**, **Geocoding API**, **Maps SDK for Android**, and **Maps SDK for iOS** for the same key (restrict by API in production). After changing `.env`, restart the backend and run `npx expo start -c` for the apps.

**Physical phone:** do not use `localhost` — use your PC's LAN IP, e.g. `http://192.168.0.243:5000/api/v1` (find yours with `ipconfig`). Restart Expo with `npx expo start -c` after changing `.env`.

**Servant login:** account must be created in the Agent portal first. Default onboarding password in the form is `Servant@123` unless the agent changed it.

**Agent uploads (ID proof & profile photo):** files are saved under `Backend/uploads/` (or `UPLOAD_DIR`). The database stores paths like `/uploads/<filename>` on the `Servant` record. Agent web loads images via the API origin — set `VITE_API_BASE_URL` in `Agent/onboarding-agent-web/.env` (see `.env.example`).

## Production deploy (Docker + host nginx)

StaffEra runs as five containers: PostgreSQL, Redis, API, marketing site, and agent portal. Containers bind to **localhost only** so your existing VPS nginx can reverse-proxy alongside your other apps.

### 1. On the VPS

```bash
git clone <repo-url> staffera && cd staffera
cp .env.production.example .env
# Edit .env: domains, JWT secrets, POSTGRES_PASSWORD, Google Maps, SMS, etc.
bash deploy/scripts/deploy.sh
```

Optional first-time seed:

```bash
docker compose --env-file .env exec api node prisma/seed.js
```

### 2. Host nginx

Copy `deploy/nginx/staffera.conf` to `/etc/nginx/sites-available/`, replace `staffera.example.com` with your domains, adjust upstream ports if you changed `STAFFERA_*_PORT` in `.env`, then enable and reload nginx.

Default upstream ports (localhost):

| Service | Port |
|---------|------|
| API | 15000 |
| Website | 15001 |
| Agent portal | 15002 |

### 3. DNS

Point these records to your VPS:

- `staffera.example.com` → marketing site
- `agent.staffera.example.com` → agent portal
- `api.staffera.example.com` → backend API + `/uploads`

### 4. Mobile apps

Set `EXPO_PUBLIC_API_BASE_URL=https://api.staffera.example.com/api/v1` in both Expo apps before building release binaries.

## Business rules

- Servants cannot self-register (agent-only via `POST /api/v1/agent/servants`)
- Browse lists only `VERIFIED` servants
- Booking conflict checks run in Prisma transactions
- Reviews only after `COMPLETED` bookings

## UI reference

Design reference: `stitch_staffera_premium_service_app/` (see `premium_service_logic/DESIGN.md`)

**UI tokens:** Deep indigo primary `#15157d`, purple secondary `#7d44a4`, gradient CTA `#662D8C → #ED1E79`, warm tertiary for trust/urgency. Glass cards, ₹ pricing, verified badges — tuned for Indian household trust and clarity.
