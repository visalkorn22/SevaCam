# Map & Location Feature — Design Spec

**Date:** 2026-04-12  
**Status:** Approved  
**Scope:** Location library management, multi-location service assignment, customer branch selection during booking, interactive Leaflet maps, Telegram Bot location sharing

---

## Overview

Add a location system to the booking platform so that:
- Admins define named physical branches in a shared location library
- Each service can be assigned to one or more branches
- Customers choose their preferred branch during booking and see an interactive map before confirming
- After booking, customers can share the location to Telegram as a native location card via a bot

**Map library:** Leaflet.js + OpenStreetMap tiles (free, no API key)  
**Geocoding:** Nominatim API (OpenStreetMap, free, debounced at 500ms)  
**Telegram:** Bot API (`sendLocation` + `sendMessage`)

---

## 1. Data Layer

### 1.1 New table: `locations`

```sql
CREATE TABLE locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,       -- e.g. "Main Branch", "Downtown Studio"
  address     TEXT NOT NULL,               -- full human-readable address
  latitude    FLOAT8 NOT NULL,
  longitude   FLOAT8 NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.2 New table: `service_locations` (junction)

```sql
CREATE TABLE service_locations (
  service_id   UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  location_id  UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id, location_id)
);
```

The existing `location_id` column on the `services` table is dropped — multi-location is handled entirely through `service_locations`.

### 1.3 New table: `telegram_connections`

```sql
CREATE TABLE telegram_connections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_id     BIGINT NOT NULL UNIQUE,      -- Telegram chat ID
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.4 Booking record — location captured

The `bookings` table gains a `location_id` column (nullable FK → `locations`) so the customer's chosen branch is persisted with the booking.

```sql
ALTER TABLE bookings ADD COLUMN location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
```

### 1.5 Alembic migration

One new migration file: `20260412_add_locations_telegram_connections.py`  
Handles: create `locations`, create `service_locations`, drop `services.location_id`, create `telegram_connections`, alter `bookings` to add `location_id`.

---

## 2. Backend API

### 2.1 New router: `backend/app/api/locations.py`

Registered at prefix `/api/locations`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | public | List all locations |
| POST | `/` | admin | Create location |
| PUT | `/{id}` | admin | Update location |
| DELETE | `/{id}` | admin | Delete location (only if no service uses it) |

Response shape:
```json
{
  "id": "uuid",
  "name": "Main Branch",
  "address": "123 Monivong Blvd, Phnom Penh",
  "latitude": 11.5564,
  "longitude": 104.9282
}
```

### 2.2 Services router updates (`backend/app/api/services.py`)

- `GET /api/services/{id}` — JOIN `service_locations` + `locations`, embed as `locations: LocationResponse[]`
- `POST /api/services` — accept `location_ids: list[str]` in body, insert rows into `service_locations`
- `PUT /api/services/{id}` — accept `location_ids: list[str]`, replace `service_locations` rows (delete old, insert new)

### 2.3 Bookings router updates (`backend/app/api/bookings.py`)

- `POST /api/bookings` — accept `location_id: str | None`, store on booking record
- `GET /api/bookings/{id}` — embed location data in response

### 2.4 New router: `backend/app/api/telegram.py`

Registered at prefix `/api/telegram`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/webhook` | none (Telegram calls this) | Receives `/start` command, stores `chat_id` against `user_id` via a signed JWT token |
| GET | `/status` | logged-in user | Returns `{ connected: bool }` — whether this user has a `telegram_connections` row |
| POST | `/send-location` | logged-in user | Sends native location card + booking summary message to user's Telegram chat |

**Webhook connect flow:**
1. Frontend calls `POST /api/telegram/send-location` for the first time
2. Backend detects no `telegram_connections` row for this user, returns `{ connected: false, bot_username: "YourBotName" }`
3. Backend generates a signed JWT (`user_id` payload, 15-min expiry, signed with existing `SECRET_KEY`) — returned in the response as `connect_token`
4. Frontend shows "Start the bot first" prompt with a deep link `https://t.me/YourBotName?start={connect_token}`
5. User opens Telegram, clicks Start → bot receives `/start {connect_token}` → webhook endpoint verifies JWT, extracts `user_id`, inserts `telegram_connections` row
6. Frontend polls `GET /api/telegram/status` every 3s until `connected: true`, then auto-sends the location

**`send-location` payload:**
```json
{
  "booking_id": "uuid"
}
```
Backend resolves the booking's `location_id` → fetches lat/lng → calls Telegram `sendLocation` then `sendMessage` with booking summary.

### 2.5 Config (`backend/app/core/config.py`)

Add to `Settings`:
```python
TELEGRAM_BOT_TOKEN: str = ""
TELEGRAM_BOT_USERNAME: str = ""   # e.g. "YourBotName" (without @)
TELEGRAM_WEBHOOK_URL: Optional[str] = None
```

`TELEGRAM_BOT_TOKEN` is already present in `backend/.env`. Add `TELEGRAM_BOT_USERNAME` (the bot's username without `@`, e.g. `MyBookingBot`) and optionally `TELEGRAM_WEBHOOK_URL` to `backend/.env` as well.

---

## 3. Frontend — Admin UI

### 3.1 Location Library page

**Route:** `/admin/locations`  
**File:** `app/admin/locations/page.tsx` + `app/admin/locations/LocationsClient.tsx`

A CRUD table matching the existing admin table design (`compact density` style). Columns: Name, Address, Coordinates, Actions (Edit / Delete).

**Create / Edit modal** contains:
- `name` text input
- `address` text input (display only, filled by geocoder)
- Nominatim search bar (debounced 500ms, shows dropdown of results)
- Leaflet map (~320px height) with draggable marker
- Selecting a search result drops the pin; pin can be dragged to fine-tune; lat/lng update automatically

### 3.2 Service form — Location step

**Step 7** added to `EnhancedServiceForm` (after Staff Assignments).  
**File:** `app/admin/services/service-form/enhanced/EnhancedLocation.tsx`

- Multi-select checklist of all saved locations (fetched from `GET /api/locations`)
- Each row: checkbox + location name + address
- Below the checklist: a read-only mini Leaflet map (~220px) showing pins for all selected locations
- `ServiceFormData` type gains `location_ids: string[]`

### 3.3 Admin sidebar nav

Add "Locations" link under the existing admin nav group (alongside Services, Staff, etc.).

---

## 4. Frontend — Customer-Facing Maps

### 4.1 Shared component: `LocationMapView`

**File:** `components/booking/LocationMapView.tsx`

Props:
```ts
{
  location: { name: string; address: string; latitude: number; longitude: number }
  height?: number          // default 280
  compact?: boolean        // 200px, used in booking summary
}
```

Renders:
- Location name + address as text header
- Interactive Leaflet map (zoom/pan, OSM tiles, non-draggable marker)
- "Get Directions" button → `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}` (new tab)

**SSR:** Loaded via `next/dynamic` with `{ ssr: false }` — Leaflet requires `window`.  
**Lazy:** Wrapped in an `IntersectionObserver` so the map only initialises when scrolled into view.

### 4.2 Service detail page

`app/services/[serviceId]/page.tsx` — after the service description section, render `<LocationMapView>` for each location assigned to the service (or a tabbed/listed view if multiple). If no locations are assigned, this section is omitted.

### 4.3 Booking flow — Branch selection step

**New step** inserted after service selection, before date/time picking.  
**File:** `components/booking/BranchSelectionStep.tsx`

- Only shown when the service has **more than one** location
- If only one location → auto-selected, step skipped
- Each branch rendered as a selectable card: name, address, small `LocationMapView` in compact mode
- Selected `location_id` passed forward in the booking state and submitted with the booking

### 4.4 Booking summary step

Render `<LocationMapView compact>` showing the customer's chosen branch.

---

## 5. Frontend — Telegram Share (Confirmation Page)

**File:** `components/payment/TelegramShareButton.tsx`

### State machine:

```
idle → checking_connection → not_connected → awaiting_start → connected → sending → sent
```

**UI states:**
- **idle / connected:** "Share Location to Telegram" button
- **not_connected:** Inline card — "Open @BotName on Telegram and tap Start, then come back"  — with a copy-link button and a "I've started the bot" check button
- **sending:** Loading spinner
- **sent:** "Sent to your Telegram ✓" (non-interactive for 3s, then resets to idle)

**API calls:**
1. `POST /api/telegram/send-location` with `{ booking_id }`
2. If response `{ connected: false }` → switch to `not_connected` state, show bot link
3. Poll `GET /api/telegram/status` every 3s while in `awaiting_start` state
4. Once connected, auto-send the location

The button is placed on the booking confirmation/payment receipt page alongside the existing booking details.

---

## 6. New npm Dependency

```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

Leaflet CSS must be imported once globally in `app/globals.css`:
```css
@import "leaflet/dist/leaflet.css";
```

Leaflet's default marker icon references `/images/marker-icon.png` — the icon files must be copied to `public/` or the default icon must be overridden in the `LocationMapView` component using `L.icon`.

---

## 7. File Summary

### New files
| File | Purpose |
|------|---------|
| `backend/app/api/locations.py` | Locations CRUD router |
| `backend/app/api/telegram.py` | Telegram Bot webhook + send-location router |
| `backend/alembic/versions/20260412_add_locations_telegram_connections.py` | DB migration |
| `app/admin/locations/page.tsx` | Admin location library page |
| `app/admin/locations/LocationsClient.tsx` | Location CRUD table + create/edit modal |
| `app/admin/services/service-form/enhanced/EnhancedLocation.tsx` | Location multi-select step |
| `components/booking/LocationMapView.tsx` | Shared interactive Leaflet map component |
| `components/booking/BranchSelectionStep.tsx` | Customer branch picker step |
| `components/payment/TelegramShareButton.tsx` | Telegram share button with state machine |

### Modified files
| File | Change |
|------|--------|
| `backend/app/main.py` | Register `locations` and `telegram` routers |
| `backend/app/core/config.py` | Add `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_URL` |
| `backend/app/api/services.py` | Embed `locations[]` in responses; accept `location_ids` on create/update |
| `backend/app/api/bookings.py` | Accept + store `location_id`; embed location in booking response |
| `backend/app/models/schemas.py` | Add `LocationCreate`, `LocationResponse`, `TelegramConnection` schemas |
| `app/admin/services/EnhancedServiceForm.tsx` | Add Location as step 7 |
| `app/admin/services/service-form/enhanced/types.ts` | Add `location_ids: string[]` to `ServiceFormData` |
| `app/globals.css` | Import Leaflet CSS |
| `package.json` | Add `leaflet`, `react-leaflet`, `@types/leaflet` |
| `CLAUDE.md` | Note Leaflet SSR requirement (`ssr: false`) |

---

## 8. Out of Scope

- Turn-by-turn directions (handled by Google Maps / Apple Maps via the "Get Directions" link)
- Location-based search/filtering on the service browse page
- Telegram notifications for reminders (separate from this feature)
- Map clustering for services with many locations
