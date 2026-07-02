# StaffEra — Functionality Comparison

This document compares **StaffEra** with other apps and platforms in the Indian home-staffing and domestic-help space.

> **Category note:** StaffEra is a **home-staffing marketplace** (house owners, domestic helpers, verification agents). It is **not** HR software, payroll software, or corporate attendance software. Comparisons to BambooHR, Zoho People, or similar tools are out of scope.

---

## Apps Compared

| Platform | Type | Primary model |
|----------|------|---------------|
| **StaffEra** | Verified home-staffing marketplace | Three-sided: house owner + servant + agent |
| **Urban Company** | On-demand home services | Two-sided: customer + service professional |
| **BookMyBai** | Maid / domestic help booking | Two-sided: customer + helper |
| **Helper4U** | Domestic help placement | Agency-style listings + contact |
| **OLX / Quikr** | Classifieds | Open listings, no verification layer |
| **Local maid agencies** | Offline / phone-based agencies | Manual onboarding, no consumer app |

---

## At a Glance

| Capability | StaffEra | Urban Company | BookMyBai | Helper4U | OLX / Quikr | Local agencies |
|------------|:--------:|:-------------:|:---------:|:--------:|:-----------:|:--------------:|
| Agent-verified staff only | ✅ | ⚠️ Partner vetting | ⚠️ Limited | ⚠️ Varies | ❌ | ⚠️ Manual |
| Dedicated house owner app | ✅ | ✅ | ✅ | ⚠️ Web | ❌ | ❌ |
| Dedicated helper app | ✅ | ✅ | ⚠️ Limited | ❌ | ❌ | ❌ |
| Dedicated agent / agency portal | ✅ | ❌ | ❌ | ❌ | ❌ | ⚠️ Internal only |
| Aadhaar KYC (UIDAI offline XML) | ✅ | ❌ | ❌ | ❌ | ❌ | ⚠️ Manual |
| Live GPS tracking during visit | ✅ | ⚠️ Limited | ❌ | ❌ | ❌ | ❌ |
| Work-start OTP (SMS + in-app) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| On-site clock in / clock out | ✅ | ⚠️ Job start/end | ❌ | ❌ | ❌ | ❌ |
| Monthly recurring bookings | ✅ | ⚠️ Subscriptions | ✅ | ✅ | ❌ | ✅ |
| Single / multi-session bookings | ✅ | ✅ | ⚠️ Limited | ⚠️ Limited | ❌ | ✅ |
| Area broadcast (book without picking helper) | ✅ | ❌ | ❌ | ❌ | ❌ | ⚠️ Phone request |
| Post-completion reviews only | ✅ | ✅ | ⚠️ Varies | ❌ | ❌ | ❌ |
| In-app payment gateway | 🔜 Schema only | ✅ | ✅ | ❌ | ❌ | ❌ Cash/UPI |
| Hindi + Marathi + English | ✅ | ⚠️ Partial | ⚠️ Partial | ❌ | ❌ | ❌ |
| Conflict-safe double-booking prevention | ✅ | ✅ | ⚠️ Unknown | ❌ | ❌ | ⚠️ Manual |

**Legend:** ✅ Supported · ⚠️ Partial or varies · ❌ Not supported · 🔜 Planned / not yet live

---

## Detailed Feature Comparison

### 1. Marketplace model

| Feature | StaffEra | Urban Company | BookMyBai | Helper4U | OLX / Quikr |
|---------|----------|---------------|-----------|----------|-------------|
| Three-sided marketplace (owner + helper + agent) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Helpers cannot appear in search without verification | ✅ | ⚠️ UC partners are vetted internally | ⚠️ | ❌ | ❌ |
| Agent onboarding with ID proof upload | ✅ | Internal ops | ❌ | ❌ | ❌ |
| Verification pipeline (`PENDING` → `VERIFIED` / `REJECTED`) | ✅ | Internal | ⚠️ | ❌ | ❌ |
| Agent service radius + geographic zones | ✅ | City-based | ⚠️ | City-based | ❌ |
| Self-application queue for nearby agents | ✅ | N/A | N/A | N/A | ✅ (open post) |

**StaffEra difference:** StaffEra is built around a **trusted agent layer**. Unlike open classifieds or two-sided gig apps, every helper in browse results has passed agent verification and optional Aadhaar KYC before being visible to house owners.

---

### 2. Authentication & roles

| Feature | StaffEra | Urban Company | BookMyBai | Helper4U | OLX / Quikr |
|---------|----------|---------------|-----------|----------|-------------|
| House owner self-registration | ✅ | ✅ | ✅ | ✅ | ✅ |
| Helper self-registration into marketplace | ❌ (agent required) | ✅ (partner signup) | ⚠️ | ✅ (listing) | ✅ |
| Helper self-application (pending review) | ✅ | N/A | N/A | N/A | N/A |
| Role-based access (4 roles: Admin, Agent, Servant, House Owner) | ✅ | Internal roles | ❌ | ❌ | ❌ |
| JWT access + refresh tokens | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| Forgot / reset password | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| Admin panel (platform oversight) | ✅ | Internal only | ❌ | ❌ | ❌ |

---

### 3. Discovery & browse

| Feature | StaffEra | Urban Company | BookMyBai | Helper4U | OLX / Quikr |
|---------|----------|---------------|-----------|----------|-------------|
| Browse verified helpers only | ✅ | ✅ (UC partners) | ⚠️ | ❌ | ❌ |
| Filter by skill | ✅ (7+ categories) | ✅ | ✅ | ✅ | ⚠️ |
| Filter by city / zone | ✅ | ✅ | ✅ | ✅ | ✅ |
| Geo-proximity search (radius) | ✅ | ✅ | ⚠️ | ⚠️ | ❌ |
| Hourly + monthly rates shown upfront | ✅ | ✅ | ⚠️ | ⚠️ | ❌ |
| Servant rating & review count | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| Aadhaar-gated browse (configurable) | ✅ | ❌ | ❌ | ❌ | ❌ |

**Service categories (StaffEra):** Cooking, Cleaning, Childcare, Driving, Laundry, Elderly care, Gardening.

---

### 4. Bookings & scheduling

| Feature | StaffEra | Urban Company | BookMyBai | Helper4U | OLX / Quikr |
|---------|----------|---------------|-----------|----------|-------------|
| Monthly recurring arrangements | ✅ | ⚠️ | ✅ | ✅ | ❌ |
| Single / multi-slot session visits | ✅ | ✅ | ⚠️ | ⚠️ | ❌ |
| Direct booking (pick a specific helper) | ✅ | ✅ | ✅ | ⚠️ | ❌ |
| Area broadcast (no helper picked; first accept wins) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Servant accept / reject requests | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| Booking conflict detection (transactional) | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| Booking lifecycle tracking | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| Cancel booking | ✅ | ✅ | ✅ | ❌ | ❌ |
| Mark booking complete | ✅ | ✅ | ⚠️ | ❌ | ❌ |

**Booking statuses (StaffEra):** `PENDING` → `CONFIRMED` → `ACTIVE` → `COMPLETED` (also `CANCELLED`, `REJECTED`, `EXPIRED`).

---

### 5. Trust, safety & verification

| Feature | StaffEra | Urban Company | BookMyBai | Helper4U | OLX / Quikr |
|---------|----------|---------------|-----------|----------|-------------|
| Agent ID proof upload | ✅ | Internal | ❌ | ⚠️ | ❌ |
| Aadhaar offline XML verification (UIDAI) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Name match check (Aadhaar vs profile) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Verified badge on profiles | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| Reviews only after completed visit | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| Background check (third-party) | ⚠️ Agent-led | ✅ | ⚠️ | ⚠️ | ❌ |

---

### 6. Live tracking & on-site accountability

| Feature | StaffEra | Urban Company | BookMyBai | Helper4U | OLX / Quikr |
|---------|----------|---------------|-----------|----------|-------------|
| Live GPS location during active booking | ✅ | ⚠️ | ❌ | ❌ | ❌ |
| Google Maps tracking map for house owner | ✅ | ⚠️ | ❌ | ❌ | ❌ |
| “I arrived” flow | ✅ | ⚠️ | ❌ | ❌ | ❌ |
| 4-digit work-start OTP (SMS + in-app) | ✅ | ❌ | ❌ | ❌ | ❌ |
| OTP required before clock-in | ✅ | ❌ | ❌ | ❌ | ❌ |
| Push notification on clock-in | ✅ | ⚠️ | ❌ | ❌ | ❌ |
| On-site clock in / clock out | ✅ | ⚠️ | ❌ | ❌ | ❌ |
| Hours worked calculation | ✅ | ⚠️ | ❌ | ❌ | ❌ |
| Today / month / history time views | ✅ | ⚠️ | ❌ | ❌ | ❌ |

**StaffEra difference:** The **work-start OTP + GPS + clock-in** chain is designed for Indian household trust — owners know the helper arrived, verified identity on-site, and hours are logged per visit.

---

### 7. Payments & earnings

| Feature | StaffEra | Urban Company | BookMyBai | Helper4U | OLX / Quikr |
|---------|----------|---------------|-----------|----------|-------------|
| Transparent ₹ pricing (hourly / monthly) | ✅ | ✅ | ⚠️ | ⚠️ | ❌ |
| In-app payment gateway | 🔜 (fields exist; no gateway yet) | ✅ | ✅ | ❌ | ❌ |
| Payment status tracking (`isPaid`, `paymentId`) | ✅ (manual / future) | ✅ | ✅ | ❌ | ❌ |
| Servant earnings (today / month) | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| Agent revenue dashboard | ✅ | N/A | ❌ | ❌ | ❌ |
| Bank details + IFSC lookup | ✅ | ✅ | ⚠️ | ❌ | ❌ |

---

### 8. Notifications

| Feature | StaffEra | Urban Company | BookMyBai | Helper4U | OLX / Quikr |
|---------|----------|---------------|-----------|----------|-------------|
| In-app notification center | ✅ | ✅ | ⚠️ | ❌ | ⚠️ |
| Push notifications (FCM) | ✅ | ✅ | ⚠️ | ❌ | ⚠️ |
| Booking lifecycle alerts | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| Work-start OTP notification | ✅ | ❌ | ❌ | ❌ | ❌ |
| Nearby registration alerts for agents | ✅ | N/A | N/A | N/A | N/A |

**StaffEra notification types:** `BOOKING_CREATED`, `BOOKING_OPEN`, `BOOKING_CONFIRMED`, `BOOKING_REJECTED`, `BOOKING_COMPLETED`, `BOOKING_ACTIVE`, `HELPER_ON_WAY`, `WORK_START_OTP`, `SERVANT_REGISTRATION_NEARBY`, `SERVANT_VERIFIED`.

---

### 9. Agent & admin operations

| Feature | StaffEra | Urban Company | BookMyBai | Helper4U | OLX / Quikr |
|---------|----------|---------------|-----------|----------|-------------|
| Agent web portal | ✅ | Internal ops | ❌ | ⚠️ | ❌ |
| Onboard helper with photo + ID | ✅ | Internal | ❌ | ⚠️ | ❌ |
| Set / reset helper login password | ✅ | Internal | ❌ | ❌ | ❌ |
| Review self-applied helpers in radius | ✅ | N/A | N/A | N/A | N/A |
| Per-helper service zones | ✅ | Internal | ❌ | ❌ | ❌ |
| Platform admin panel | ✅ | Internal | ❌ | ❌ | Internal |
| Skills catalog admin (CRUD) | ✅ | Internal | ❌ | ❌ | ❌ |
| User activate / deactivate | ✅ | Internal | ❌ | ❌ | ⚠️ |
| Platform-wide stats & revenue | ✅ | Internal | ❌ | ❌ | ❌ |

---

### 10. Localization & India-specific design

| Feature | StaffEra | Urban Company | BookMyBai | Helper4U | OLX / Quikr |
|---------|----------|---------------|-----------|----------|-------------|
| English | ✅ | ✅ | ✅ | ✅ | ✅ |
| Hindi | ✅ | ⚠️ | ⚠️ | ❌ | ⚠️ |
| Marathi | ✅ | ❌ | ❌ | ❌ | ❌ |
| ₹ currency formatting | ✅ | ✅ | ✅ | ✅ | ✅ |
| MSG91 SMS (India OTP) | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| Indian household booking patterns (monthly + session) | ✅ | ⚠️ | ✅ | ✅ | ❌ |

---

### 11. Technology & deployment

| Feature | StaffEra | Urban Company | BookMyBai | Helper4U | OLX / Quikr |
|---------|----------|---------------|-----------|----------|-------------|
| Native mobile apps (iOS + Android) | ✅ (Expo) | ✅ | ⚠️ | ❌ | ✅ |
| Separate apps per user role | ✅ (3 apps) | ⚠️ | ❌ | ❌ | ❌ |
| Marketing website | ✅ | ✅ | ✅ | ✅ | ✅ |
| Self-hosted / Docker deploy | ✅ | ❌ | ❌ | ❌ | ❌ |
| Open API (`/api/v1`) | ✅ | ❌ | ❌ | ❌ | ❌ |
| PostgreSQL + Prisma | ✅ | Unknown | Unknown | Unknown | Unknown |

**StaffEra stack:** Node.js (Express 5), Prisma 5, PostgreSQL, Redis, Expo 54 mobile apps, React 19 agent portal & website.

---

## StaffEra Strengths vs Alternatives

| vs | StaffEra advantage |
|----|--------------------|
| **OLX / Quikr** | Verified-only browse, agent onboarding, GPS tracking, OTP work-start, post-completion reviews — not an open classifieds board |
| **Urban Company** | Monthly + long-term domestic staffing focus, agent network model, Aadhaar KYC, work-start OTP, dedicated agent portal |
| **BookMyBai** | Live GPS, OTP clock-in, three-sided agent verification, area broadcast booking, multi-language (incl. Marathi) |
| **Helper4U** | Full mobile apps for all roles, real-time tracking, in-app booking lifecycle, time tracking |
| **Local agencies** | Digital booking, conflict checks, live tracking, reviews, earnings dashboards — while keeping the trusted agent relationship |

---

## StaffEra Gaps vs Mature Platforms

| Gap | Status | Notes |
|-----|--------|-------|
| In-app payment gateway (UPI, cards, wallets) | 🔜 Planned | Schema has `totalAmount`, `isPaid`, `paymentId`; Razorpay used for IFSC lookup only today |
| Insurance / damage protection | ❌ | Urban Company offers service guarantees |
| Instant on-demand (< 1 hour) dispatch | ❌ | StaffEra targets scheduled monthly/session bookings, not instant tasks |
| Wide national service coverage | ⚠️ Early | Coverage depends on agent network density |
| Background check integrations (third-party) | ⚠️ Agent-led | Aadhaar + agent ID review; no automated police verification API yet |
| Customer support chat / helpline | ⚠️ | Notifications in-app; no dedicated support module in codebase |

---

## Business Rules (StaffEra-specific)

These rules differentiate StaffEra’s behavior from open marketplaces:

1. **Servants cannot self-register into browse** — accounts are created by agents via the Agent Portal (`POST /api/v1/agent/servants`).
2. **Browse lists only `VERIFIED` servants** — pending or rejected profiles are hidden from house owners.
3. **Reviews unlock only after `COMPLETED` bookings** — prevents fake or pre-visit ratings.
4. **Booking conflict checks run in database transactions** — overlapping sessions or monthly schedules are blocked.
5. **Optional Aadhaar-gated browse** — house owners may only see helpers with `aadhaarVerified=true` when enabled.

---

## Summary

StaffEra occupies a distinct position: **a verified, three-sided home-staffing marketplace built for Indian households**, combining the trust model of local maid agencies with the convenience of mobile apps, live GPS, OTP-based work verification, and flexible monthly or session bookings.

It is **stronger than classifieds and listing sites** on trust and accountability, and **stronger than on-demand gig apps** on long-term domestic staffing and agent-led verification. Its main gap versus mature consumer platforms is **integrated in-app payments** and **nationwide instant availability**.

---

*Last updated: July 2026 · Based on StaffEra monorepo (Backend, House Owner App, Servant App, Agent Portal, marketing website)*
