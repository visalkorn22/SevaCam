# Customer Map Experience — Design Spec
Date: 2026-04-20

## Goal
Add and verify customer-facing map/location display across the full booking journey:
- During booking selection (service page + booking form)
- During payment (before payment is completed)
- After booking/payment (receipt view + booking details sheet)

Reuse `LocationMapView` and existing design-system styles throughout. No admin-side changes. No new API calls.

---

## What Already Works (No Changes Needed)

| Location | Status |
|---|---|
| `booking-form.tsx` — "Appointment Location" panel (sidebar) | ✅ map + fallback |
| `booking-form.tsx` — Step 3 confirm summary text row | ✅ name + address row |
| `booking-form.tsx` — Step 3 map below confirm | ✅ map when coords exist |
| `customer-bookings-client.tsx` — booking details sheet | ✅ map + fallback |

---

## Gaps Being Fixed

### Gap 1 — Service Page (`app/book/[serviceId]/page.tsx`)

**Problem:** The existing locations section (lines 345–364) filters to `l.latitude !== null && l.longitude !== null`, so address-only or half-valid coordinate locations are silently hidden.

**Fix:** Add a second render pass below the existing map section. Condition for the fallback pass:
- `!(latitude != null && longitude != null)` — missing either coordinate
- `(name || address)` — must have at least something to display

Render each matching location as a `sevacam-rail` fallback card: `MapPin` icon + name (semibold) + address (muted).

**Scope:** Render-only change inside the existing `<section>` block. No type changes.

---

### Gap 2 — PaymentForm (`components/payment/payment-form.tsx`)

**Problem:** `PaymentBooking` type has no `location` field. Nothing is shown about location while the user is waiting to pay/scan.

**Fix — type extension:**
```ts
// Add to PaymentBooking
location?: {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
} | null;
```

**Fix — dynamic import** (top of file, same pattern as `booking-form.tsx`):
```ts
import dynamic from "next/dynamic";
const LocationMapView = dynamic(
  () => import("@/components/booking/LocationMapView"),
  { ssr: false }
);
```

**Fix — compact summary strip** (in the top booking summary `<div>`):
Add a location sub-row after the existing date/time/duration pills. Render `name` on one line, `address` on a second line when present. If `name` is absent but `address` exists, show `address` as the primary line. Guard: `booking.location && (booking.location.name || booking.location.address)`.

**Fix — expanded location block** (below the `{abaIntent && ...}` section):
Render a full location block wrapped in `print:hidden`. Inside:
- If coords exist (`latitude != null && longitude != null`): render `<LocationMapView>`
- Otherwise: render a fallback card (MapPin + name + address) using `sevacam-rail` styling

Guard: `booking.location && (booking.location.name || booking.location.address)`.

**Fix — prop threading** (`app/payment/[bookingId]/page.tsx`, needs-payment branch):
```tsx
<PaymentForm booking={booking} timeZone={displayTimeZone} />
```
`booking` already has `location` in `BookingRow` — just ensure the type aligns.

---

### Gap 3 — ConfirmedView Receipt (`app/payment/[bookingId]/page.tsx`)

**Problem:** The confirmed receipt shows map only when `booking.location?.latitude && booking.location?.longitude`. When location exists but has no coordinates, nothing is shown.

**Fix:** Keep the existing map block (already `print:hidden` on its outer wrapper). Add a sibling fallback block — NOT `print:hidden` — that renders when:
- `booking.location` exists
- `!(latitude != null && longitude != null)` OR as an unconditional text summary below the map

More precisely: render a location text card (name + address) that is always visible (including in print) when location exists. The map sits above it for screen-only display.

**Preferred approach:** Split into two independent blocks:
1. Map block (screen-only, `print:hidden`): shown when coords exist
2. Text/fallback card (always visible): shown when location exists, regardless of coords — this ensures print always has location info

Guard for both: `booking.location && (booking.location.name || booking.location.address)`.

---

## Coordinate Validity Rule

Used consistently across all three gaps:

```ts
const hasCoords = (loc: { latitude: number | null; longitude: number | null }) =>
  loc.latitude != null && loc.longitude != null;
```

A record with only one coordinate set is treated as no-coords → fallback card.

---

## Empty Location Guard

Used consistently:

```ts
const hasContent = (loc: { name?: string | null; address?: string | null } | null | undefined) =>
  Boolean(loc && (loc.name || loc.address));
```

No card is rendered for a location object with neither name nor address.

---

## Fallback Card Styling

Reuses existing design tokens. Pattern (matches current `booking-form.tsx` fallback at line 1615):
```tsx
<div className="rounded-[0.7rem] border border-(--border-subtle) bg-(--bg-elevated) p-4">
  <div className="flex items-start gap-2">
    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-(--accent-primary)" />
    <div>
      <p className="text-sm font-semibold text-(--text-primary)">{name}</p>
      <p className="mt-1 text-xs text-(--text-secondary)">{address}</p>
    </div>
  </div>
</div>
```

For ConfirmedView (receipt styling context), adapt tokens to match the `#1c2740` / `#f4efe7` receipt palette where the card sits outside the receipt article.

---

## Boundaries

- **No admin-side changes**: `LocationPickerMap`, `EnhancedLocation`, `LocationsClient` — untouched
- **No new API calls**: all location data already arrives with existing fetches
- **No new loading states**: no extra spinners
- **No new files**: all changes are edits to existing files
- **Print safety**: ConfirmedView location text card is NOT `print:hidden`; PaymentForm location block IS `print:hidden`
- **Booking form unchanged**: already handles all cases correctly

---

## Files Changed

| File | Change |
|---|---|
| `app/book/[serviceId]/page.tsx` | Add fallback location cards for no-coord locations |
| `components/payment/payment-form.tsx` | Add `location` to type, dynamic import, compact row, expanded block |
| `app/payment/[bookingId]/page.tsx` | Thread `location` into `PaymentForm`; add fallback to `ConfirmedView` |
