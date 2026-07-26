# Ceylon Way — Lanka Tourism Platform (MVP)

A working full-stack scaffold for the multi-surface platform described in the product vision:
a **tourist app** (discovery, AI planning, booking, safety, taxi rides), a **business portal**
(listings, availability, bookings, verification), a **driver app** (taxi rides, Uber/PickMe-style),
and an **admin/control center** (verification queue, moderation, disputes, taxi fleet, analytics)
— all backed by one API.

This is a runnable MVP, not a mockup: real auth, a real database schema, real booking logic, a
real (local) AI assistant, and a real Stripe integration for taxi payments.

## What's included

```
lanka-tourism/
├── backend/     Node.js + Express + MongoDB + Socket.io API (the single gateway all clients call)
├── frontend/    React + Vite + Tailwind web app (tourist / vendor / driver-management / admin)
└── mobile/      Flutter app for tourists (book rides) and drivers (accept rides) — taxi feature
```

### Backend
- **Auth** — JWT-based, four roles (`tourist`, `vendor`, `driver`, `admin`)
- **Data model** — Mongoose schemas for the full spec plus taxi: User, TouristProfile, Vendor,
  Listing, Location, AvailabilitySlot, Booking, Quote, Payment, Review, Message, SupportTicket,
  Alert, Itinerary, TranslationAsset, VerificationDocument, Dispute, **Driver**, **Ride**
- **Catalog/search** — text + tag + city + price + date-availability filtering
- **Booking & quote engine** — instant booking against availability slots, plus a
  request-for-quote flow for custom/negotiated bookings (e.g. multi-day guide packages)
- **Trust & safety** — vendor/driver KYC document submission → admin review → verification;
  fraud score field on vendors; auto-flagging of reviews containing suspicious patterns;
  public safety/scam alerts endpoint (no auth required, since it's safety-critical);
  emergency support tickets
- **Payments** — a provider-agnostic ledger (`Payment`) for bookings, plus a dedicated
  **Stripe** integration for taxi rides (see "Stripe setup" below)
- **Taxi rides** (Uber/PickMe-style) — OpenStreetMap-based routing (OSRM) and fare estimation,
  geo-matching of nearby verified/online drivers, a full ride lifecycle (search, accept, arriving,
  in progress, completed/cancelled), live location tracking over Socket.io, and cash or Stripe
  card payment
- **AI assistant service** — `/api/ai/plan-trip` and `/api/ai/chat`, powered by a **local** LLM
  (via `node-llama-cpp`) — no API key, no cloud calls. See `backend/models/README.md` for how to
  get a model file. Falls back to a deterministic rules-based planner if no model is loaded.
- **Admin/reporting** — verification queue (vendors + drivers), dispute resolution, review
  moderation queue, taxi fleet management, platform-wide analytics overview

### Frontend (web)
One React app with role-aware routing:
- **Tourist**: home, discover/search, listing detail + booking, AI trip planner (form + chat),
  my trips, support & safety
- **Vendor (business portal)**: dashboard with stats, listing view/create/edit/publish, booking
  confirm/decline, KYC document submission
- **Admin (control center)**: analytics overview, verification queue, dispute resolution, review
  moderation, and a **Taxi Fleet** tab (live OSM map of online drivers, driver list + suspend,
  driver document verification, ride monitoring) — this is the "manage all" surface for taxis.

Booking rides themselves (as a tourist or driver) happens in the **mobile app**, below — the web
app is for vendors managing their own listings and admins managing the whole platform.

### Mobile (Flutter) — `mobile/`
A single Flutter app used by both tourists and drivers:
- One login screen for both account types — the backend's returned role decides which home
  screen you land on. Sign-up has separate Tourist/Driver forms (drivers register vehicle +
  license details) but it's the same app and the same "Log in" button either way.
- **Tourist**: OpenStreetMap map, destination search (OSM Nominatim) or long-press to drop a pin,
  vehicle type + cash/card selection, request a ride, live map tracking of the assigned driver,
  cancel, pay by card (Stripe payment sheet) or pay cash.
- **Driver**: online/offline toggle (gated on admin verification), live location broadcast while
  online, incoming ride request popups with accept/ignore, trip status progression, confirm cash
  collected, submit KYC documents (license/vehicle docs) for admin review.

See `mobile/README.md` for how to set up and run it — Flutter projects need a `flutter create`
scaffold step that can't be done from this environment, so that's a one-time manual step.

## Running it locally

### 1. Backend

```bash
cd backend
cp .env.example .env      # edit MONGO_URI / JWT_SECRET / STRIPE_* as needed
npm install
npx --no node-llama-cpp pull --url "hf:bartowski/Llama-3.2-3B-Instruct-GGUF:Q4_K_M" --dir "./models"
```

You need a MongoDB instance. Easiest options:
- Local: `docker run -d -p 27017:27017 mongo:7`
- Hosted: MongoDB Atlas free tier — paste the connection string into `MONGO_URI` in `.env`

Then seed demo data and start the API (this now also boots the Socket.io realtime layer used
for live ride tracking):

```bash
npm run seed     # creates demo admin/tourist/vendor accounts + sample Sri Lanka listings
npm run dev      # http://localhost:4000
```

Demo accounts created by the seed script:
| Role    | Email                       | Password     |
|---------|------------------------------|---------------|
| Admin   | admin@lankatourism.lk       | Admin123!     |
| Tourist | tourist@example.com         | Tourist123!   |
| Vendor  | vendor@example.com          | Vendor123!    |

To enable live AI trip planning/chat, download a local GGUF model — see
`backend/models/README.md`. No API key is needed for this.

### 2. Frontend

```bash
cd frontend
cp .env.example .env      # VITE_API_URL should point at the backend, default http://localhost:4000/api
npm install
npm run dev                # http://localhost:5173
```

Open `http://localhost:5173`, log in with one of the demo accounts above, and you'll land on
the right surface for that role. Log in as `admin@lankatourism.lk` and open **Admin Center →
Taxi Fleet** to see the live driver map (it'll be empty until a driver signs up via the mobile
app and goes online).

### 3. Mobile app

See `mobile/README.md` — short version:

```bash
cd mobile
flutter create --org com.ceylonway --project-name ceylon_way_taxi .   # one-time scaffold step
flutter pub get
flutter run \
  --dart-define=API_BASE_URL=http://10.0.2.2:4000/api \
  --dart-define=SOCKET_URL=http://10.0.2.2:4000 \
  --dart-define=STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

## Stripe setup (taxi card payments)

Card payments for taxi rides use Stripe with **manual capture**: the card is authorized when
the tourist requests a card-paying ride, and the actual charge is captured once the ride is
marked `completed` (so the final fare — which can differ slightly from the estimate — is what
gets charged, the same way Uber/PickMe do it).

1. **Create a Stripe account** at https://dashboard.stripe.com/register (use test mode — no
   real business details needed to start building).
2. **Get your API keys**: Developers → API keys. You'll need:
   - **Secret key** (`sk_test_...`) → goes in `backend/.env` as `STRIPE_SECRET_KEY`
   - **Publishable key** (`pk_test_...`) → goes to the mobile app via
     `--dart-define=STRIPE_PUBLISHABLE_KEY=pk_test_...` (never put the secret key in the app)
3. **Set up the webhook** (used as a safety net for failed authorizations/disputes — the normal
   successful-payment path doesn't depend on it):
   - Install the Stripe CLI (https://docs.stripe.com/stripe-cli) for local dev, then run:
     ```bash
     stripe listen --forward-to localhost:4000/api/payments/stripe/webhook
     ```
     This prints a webhook signing secret (`whsec_...`) — put that in `backend/.env` as
     `STRIPE_WEBHOOK_SECRET`.
   - In production, instead create a webhook endpoint in the Stripe dashboard (Developers →
     Webhooks) pointing at `https://your-domain.com/api/payments/stripe/webhook`, subscribed to
     at least `payment_intent.payment_failed` and `charge.dispute.created`, and use the signing
     secret it gives you.
4. **Test it**: request a ride with "Card" selected as payment mode in the mobile app, and use
   Stripe's test card `4242 4242 4242 4242` (any future expiry, any CVC) in the payment sheet.
5. **Go live**: activate your Stripe account (business details, bank account), then swap the
   `sk_test_...` / `pk_test_...` keys for their live (`sk_live_...` / `pk_live_...`) counterparts.
   Nothing else in the code needs to change.

Cash rides need none of this — the driver just confirms "cash collected" in the app.

## OpenStreetMap / OSRM (routing) note

Ride distance/duration/route-geometry comes from OSRM (`backend/src/utils/routing.js`), which by
default points at the public demo server (`router.project-osrm.org`). That's fine for
development, but it's rate-limited and not intended for production traffic. Before going live,
either self-host OSRM (`docker run -p 5000:5000 osrm/osrm-backend`, with a pre-processed
`.osm.pbf` extract of Sri Lanka) or use a hosted OSRM/routing provider, and point
`OSRM_BASE_URL` in `backend/.env` at it. The same applies to the Nominatim search calls the
mobile app makes directly for destination search — see their usage policy
(https://operations.osmfoundation.org/policies/nominatim/) before scaling up.

## Architecture notes / where to take this next

- The Express app in `backend/src/server.js` is the single API gateway referenced in the
  architecture — web, mobile, and future partner integrations all hit the same `/api/*`
  endpoints. It also now hosts the Socket.io realtime layer (`src/realtime/socket.js`) used for
  live ride/location tracking; as traffic grows this (and the other route groups) can be pulled
  out into standalone services behind the same gateway.
- The AI layer (`src/routes/ai.js` + `src/llm/localLlm.js`) is deliberately isolated so it can
  move to its own service without touching the rest of the API.
- The taxi feature is similarly isolated: `Driver`/`Ride` models, `src/routes/drivers.js` +
  `src/routes/rides.js`, `src/utils/fare.js` + `src/utils/routing.js`, and the socket layer are
  the only taxi-specific pieces — everything else (auth, admin, payments ledger) is shared.
- Not yet implemented (flagged for the v1 roadmap): dynamic/surge pricing, driver ratings UI on
  the tourist side (the field exists on `Ride`, just not wired to a UI yet), itinerary sharing
  links, offline mode, loyalty offers, partner APIs, and file upload for verification documents
  (currently takes a URL — wire up S3/GCS object storage next).
- Security hardening still to do before production: rate limiting, refresh tokens / token
  revocation, input validation middleware (e.g. zod), audit logging for admin actions, real
  file-upload virus scanning for KYC documents, and self-hosting OSRM/Nominatim instead of the
  public demo servers.
