# Customer Map Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add location map/fallback display across the full customer booking journey — service page, payment form, and post-payment receipt — with graceful fallback when coordinates are missing.

**Architecture:** Three targeted edits to existing files. No new files, no new API calls, no admin changes. All location data already arrives with existing fetches; we extend one type and add render logic in three places.

**Tech Stack:** Next.js App Router, React, TypeScript, Leaflet via `LocationMapView` (dynamically imported, SSR disabled), Tailwind CSS v4 with `sevacam-*` design tokens.

---

## File Map

| File | Change |
|---|---|
| `app/book/[serviceId]/page.tsx` | Add fallback cards for locations missing valid coordinates |
| `components/payment/payment-form.tsx` | Extend `PaymentBooking` type, add dynamic import, compact summary row, expanded map/fallback block |
| `app/payment/[bookingId]/page.tsx` | Thread `location` into `PaymentForm`; add always-visible text card + updated map guards in `ConfirmedView` |

---

## Task 1: Service Page — Fallback Location Cards

**Files:**
- Modify: `app/book/[serviceId]/page.tsx`

The existing locations section (around line 345) only renders locations where both `latitude` and `longitude` are non-null. Locations with a name/address but no usable coordinates are silently dropped.

- [ ] **Step 1: Add `MapPin` to the lucide-react import**

Find the existing lucide-react import at line 11:
```tsx
import { ChevronLeft, Clock, DollarSign, Tag, Users } from "lucide-react";
```
Replace with:
```tsx
import { ChevronLeft, Clock, DollarSign, MapPin, Tag, Users } from "lucide-react";
```

- [ ] **Step 2: Add the fallback location section below the existing map section**

The existing map section ends around line 364. Add the following block immediately after it (before the inclusions/prep section):

```tsx
{service.locations &&
  service.locations.filter(
    (l) => !(l.latitude != null && l.longitude != null) && (l.name || l.address)
  ).length > 0 && (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-(--text-disabled)">
        Location{service.locations.filter(
          (l) => !(l.latitude != null && l.longitude != null) && (l.name || l.address)
        ).length > 1 ? "s" : ""}
      </h3>
      {service.locations
        .filter(
          (l) => !(l.latitude != null && l.longitude != null) && (l.name || l.address)
        )
        .map((loc) => (
          <div
            key={loc.id}
            className="sevacam-rail p-4"
          >
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-(--accent-primary)" />
              <div>
                <p className="text-sm font-semibold text-(--text-primary)">
                  {loc.name || loc.address}
                </p>
                {loc.name && loc.address && (
                  <p className="mt-1 text-xs text-(--text-secondary)">{loc.address}</p>
                )}
              </div>
            </div>
          </div>
        ))}
    </section>
  )}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build
```
Expected: build completes with no type errors in `app/book/[serviceId]/page.tsx`. (Next.js TypeScript errors in other files are ignored via `next.config.mjs`; focus on this file only.)

- [ ] **Step 4: Visual check**

Start the dev server (`npm run dev`) and visit a service that has a location with no coordinates set. Confirm the fallback card appears showing name + address. Confirm services with full coordinates still show the interactive map as before.

---

## Task 2: PaymentForm — Location Type, Import, Summary Row, Expanded Block

**Files:**
- Modify: `components/payment/payment-form.tsx`

`PaymentBooking` currently has no `location` field. We need to: extend the type, add a dynamic import for `LocationMapView`, show location in the compact booking summary, and add an expanded map/fallback block after the QR section.

- [ ] **Step 1: Add `MapPin` to the lucide-react import**

Find the lucide-react import at the top of the file (around line 8):
```tsx
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  QrCode,
} from "lucide-react";
```
Replace with:
```tsx
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  MapPin,
  QrCode,
} from "lucide-react";
```

- [ ] **Step 2: Add the dynamic import for `LocationMapView`**

After the last `import` statement and before the type declarations, add:
```tsx
import dynamic from "next/dynamic";
const LocationMapView = dynamic(
  () => import("@/components/booking/LocationMapView"),
  { ssr: false }
);
```

- [ ] **Step 3: Extend `PaymentBooking` type with `location`**

Find the `PaymentBooking` type (around line 25):
```tsx
type PaymentBooking = {
  id: string;
  status: string;
  payment_status?: string | null;
  start_time_utc: string;
  services: {
    name: string;
    price: number;
    deposit_amount: number;
    duration_minutes: number;
  };
  staff: { full_name?: string | null } | null;
};
```
Replace with:
```tsx
type PaymentBooking = {
  id: string;
  status: string;
  payment_status?: string | null;
  start_time_utc: string;
  services: {
    name: string;
    price: number;
    deposit_amount: number;
    duration_minutes: number;
  };
  staff: { full_name?: string | null } | null;
  location?: {
    name: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
};
```

- [ ] **Step 4: Add compact location row in the booking summary strip**

In the `PaymentForm` return JSX, find the booking summary strip (the `<div className="px-6 py-5 sm:px-8">` block, around line 530). It contains a flex row with staff name, date, time, and duration pills. After the closing `</div>` of that flex row, add the location sub-row:

Before (the sub-row with staff/date/time/duration, around lines 535–544):
```tsx
<div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-(--text-secondary)">
  <span>{staffName}</span>
  <span className="text-(--border-subtle)">·</span>
  <span>{formatDateInTimeZone(startDate, timeZone)}</span>
  <span className="text-(--border-subtle)">·</span>
  <span>{formatTimeInTimeZone(startDate, timeZone)}</span>
  <span className="text-(--border-subtle)">·</span>
  <span>{booking.services.duration_minutes} min</span>
</div>
```
After (add location row immediately after this `</div>`):
```tsx
<div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-(--text-secondary)">
  <span>{staffName}</span>
  <span className="text-(--border-subtle)">·</span>
  <span>{formatDateInTimeZone(startDate, timeZone)}</span>
  <span className="text-(--border-subtle)">·</span>
  <span>{formatTimeInTimeZone(startDate, timeZone)}</span>
  <span className="text-(--border-subtle)">·</span>
  <span>{booking.services.duration_minutes} min</span>
</div>
{booking.location && (booking.location.name || booking.location.address) && (
  <div className="mt-1.5 flex items-start gap-1.5 text-xs text-(--text-secondary)">
    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-(--accent-primary)" />
    <div>
      <span className="font-medium text-(--text-primary)">
        {booking.location.name || booking.location.address}
      </span>
      {booking.location.name && booking.location.address && (
        <p className="text-(--text-secondary)">{booking.location.address}</p>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 5: Add expanded location block after the QR/ABA intent section**

The `{abaIntent && ( ... )}` block closes around line 782. After its closing `)}`, add the expanded location block:

```tsx
{booking.location && (booking.location.name || booking.location.address) && (
  <div className="print:hidden">
    <div className="sevacam-rail overflow-hidden shadow-[0_20px_44px_rgba(0,0,0,0.16)]">
      <div className="px-6 py-5 sm:px-7 sm:py-6">
        <p className="sevacam-eyebrow">Appointment Location</p>
        <div className="mt-4">
          {booking.location.latitude != null && booking.location.longitude != null ? (
            <LocationMapView
              location={{
                name: booking.location.name,
                address: booking.location.address,
                latitude: booking.location.latitude,
                longitude: booking.location.longitude,
              }}
            />
          ) : (
            <div className="rounded-[0.7rem] border border-(--border-subtle) bg-(--bg-elevated) p-4">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-(--accent-primary)" />
                <div>
                  <p className="text-sm font-semibold text-(--text-primary)">
                    {booking.location.name || booking.location.address}
                  </p>
                  {booking.location.name && booking.location.address && (
                    <p className="mt-1 text-xs text-(--text-secondary)">
                      {booking.location.address}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npm run build
```
Expected: no type errors in `components/payment/payment-form.tsx`.

- [ ] **Step 7: Visual check — compact summary**

Navigate to `/payment/[bookingId]` for a booking that has a location. In the top booking summary card, confirm the location name appears on a new line below the date/time pills, with the address beneath it when present.

- [ ] **Step 8: Visual check — expanded block**

On the same page, after selecting a payment method and generating a QR code (or just viewing the payment form), scroll below the QR section. Confirm the "Appointment Location" card appears with the interactive map (when coords exist) or the fallback address card (when coords are missing).

---

## Task 3: Payment Page — Thread Location Prop + ConfirmedView Fallback

**Files:**
- Modify: `app/payment/[bookingId]/page.tsx`

Two changes: (1) `BookingRow` already carries `location` — `PaymentForm` now accepts it, so no prop change is needed (TypeScript structural compatibility handles it). (2) `ConfirmedView` needs a non-`print:hidden` text card for locations without coordinates.

- [ ] **Step 1: Add `MapPin` to the lucide-react import**

Add a lucide-react import (currently absent from this file):
```tsx
import { MapPin } from "lucide-react";
```
Place it after the existing `import { addMinutes } from "date-fns";` line.

- [ ] **Step 2: Update coordinate guards in `ConfirmedView` to use `!= null` checks**

In `ConfirmedView` (around lines 378–395), the existing map and Telegram button use `booking.location?.latitude && booking.location?.longitude` — which would treat `0` as falsy. Replace with strict null checks:

Find:
```tsx
{booking.location?.latitude && booking.location?.longitude && (
  <div className="mt-6">
    <LocationMapView
      location={{
        name: booking.location.name,
        address: booking.location.address,
        latitude: booking.location.latitude!,
        longitude: booking.location.longitude!,
      }}
    />
  </div>
)}
{booking.location?.latitude && (
  <div className="mt-4">
    <TelegramShareButton bookingId={booking.id} />
  </div>
)}
```
Replace with:
```tsx
{booking.location?.latitude != null && booking.location?.longitude != null && (
  <div className="mt-6">
    <LocationMapView
      location={{
        name: booking.location.name,
        address: booking.location.address,
        latitude: booking.location.latitude,
        longitude: booking.location.longitude,
      }}
    />
  </div>
)}
{booking.location?.latitude != null && (
  <div className="mt-4">
    <TelegramShareButton bookingId={booking.id} />
  </div>
)}
```

- [ ] **Step 3: Add the always-visible text location card outside `print:hidden`**

After the closing `</div>` of the `print:hidden` block (the one that wraps `PaymentReceiptActions`, the map, and the Telegram button), add:

```tsx
{booking.location && (booking.location.name || booking.location.address) && (
  <div className="mx-auto mt-6 max-w-md">
    <div className="rounded-[0.7rem] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
      <div className="flex items-start gap-2">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {booking.location.name || booking.location.address}
          </p>
          {booking.location.name && booking.location.address && (
            <p className="mt-1 text-xs text-[var(--text-disabled)]">
              {booking.location.address}
            </p>
          )}
        </div>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build
```
Expected: no type errors in `app/payment/[bookingId]/page.tsx`.

- [ ] **Step 5: Visual check — payment needs-payment state**

Navigate to `/payment/[bookingId]` for an unpaid booking with a location. Confirm the `PaymentForm` receives and displays location (compact row in summary + expanded block after QR). No console errors.

- [ ] **Step 6: Visual check — ConfirmedView with coordinates**

Navigate to `/payment/[bookingId]` for a paid booking with a location that has coordinates. Confirm:
- The interactive map appears (screen-only, hidden in print)
- The text location card appears below (visible in both screen and print)
- Telegram button still appears

- [ ] **Step 7: Visual check — ConfirmedView without coordinates**

Navigate to `/payment/[bookingId]` for a paid booking with a location that has NO coordinates. Confirm:
- No map rendered (no broken map container)
- The text location card appears with name + address
- Print preview (`Ctrl+P`) shows the text card

- [ ] **Step 8: Regression check — bookings without location**

Navigate to `/payment/[bookingId]` for a booking with `location: null`. Confirm nothing location-related is rendered and no JS errors appear.

---

## Spec Coverage Check

| Spec requirement | Covered by |
|---|---|
| Service page: fallback for no-coord locations | Task 1 |
| Coordinate guard: both lat AND lng must be non-null | Tasks 1, 2, 3 |
| Empty location guard: name or address required | Tasks 1, 2, 3 |
| PaymentForm: location in compact summary (name + address) | Task 2, Steps 4 |
| PaymentForm: expanded map/fallback below QR section | Task 2, Step 5 |
| PaymentForm: `print:hidden` on expanded block | Task 2, Step 5 |
| PaymentForm: dynamic import `ssr: false` | Task 2, Step 2 |
| PaymentBooking type extended with `location` | Task 2, Step 3 |
| ConfirmedView: text card NOT `print:hidden` | Task 3, Step 3 |
| ConfirmedView: map stays screen-only | Task 3, Step 2 |
| No admin-side changes | — (no tasks touch admin files) |
| No new API calls | — (all data from existing fetches) |
| No new files | — (all tasks modify existing files) |
