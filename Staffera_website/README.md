# StaffEra Website

Marketing landing page for [StaffEra](../README.md) — India's home-staffing marketplace.

## Sections

- **Hero** — animated phone mockup, gradient CTA, trust badges
- **USP bar** — agent-verified, 6+ services, live tracking, ₹ pricing
- **Services** — cleaning, cooking, childcare, elderly care, laundry, driver
- **Features** — verification, GPS tracking, booking types, time tracking, reviews
- **How it works** — browse → book → track & review
- **App downloads** — links to House Owner, Servant, and Agent Portal
- **Trust** — privacy, three-sided marketplace, real-time notifications

## Design

Uses StaffEra Stitch tokens from the mobile apps:

- Primary `#15157d`, secondary `#7d44a4`
- Gradient CTA `#662D8C → #ED1E79`
- Glass cards, Plus Jakarta Sans typography

## Quick start

```bash
cd Staffera_website
npm install
cp .env.example .env   # set app / portal URLs
npm run dev
```

Site runs at `http://localhost:5174` (or next free Vite port).

## Configure redirects

Edit `.env` to point **Open web app** buttons at your deployed apps:

| Variable | Default | App |
|----------|---------|-----|
| `VITE_HOUSE_OWNER_APP_URL` | `http://localhost:8081` | House Owner (Expo) |
| `VITE_SERVANT_APP_URL` | `http://localhost:8082` | Servant (Expo) |
| `VITE_AGENT_PORTAL_URL` | `http://localhost:5173` | Agent onboarding web |

Set `VITE_PLAY_STORE_*` and `VITE_APP_STORE_*` when store listings are live.

## Build

```bash
npm run build
npm run preview
```
