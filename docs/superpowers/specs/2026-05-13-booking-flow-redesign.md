# Booking Flow Visual Redesign

**Date:** 2026-05-13  
**Scope:** Pure visual redesign — no logic, no routing, no API changes.  
**Files touched:**
- `components/booking/services-client.tsx` — service card markup only
- `app/book/[serviceId]/page.tsx` — hero/detail section layout
- `components/booking/booking-form.tsx` — step indicator, step 1, step 2, step 3 layouts
- `components/booking/ServiceReviews.tsx` — review card style

## Design System Constraint

All redesigned elements **must use existing system tokens and classes**. Do not introduce new border radii, new color values, or custom button styles.

| Element | Use |
|---|---|
| Primary buttons | `sevacam-primary-button` class exactly as-is |
| Secondary buttons | `sevacam-secondary-button` class exactly as-is |
| Border radius | Follow existing usage: `rounded-[0.18rem]` for buttons, `rounded-[0.45rem]` for inputs/chips, `rounded-xl` / `rounded-2xl` for cards |
| Colors | Only existing CSS variables: `--accent-primary`, `--seva-accent`, `--seva-warm`, `--text-primary`, `--text-secondary`, `--text-muted`, `--bg-elevated`, `--border-muted`, etc. |
| Typography | Existing scale and tracking values only — `text-[0.62rem] uppercase tracking-[0.18em]` for eyebrows, `sevacam-display` for display text, etc. |
| Interactive cards | `sevacam-interactive-card` for hover-lift effects |

---

## 1. Services Page — Service Cards

**File:** `components/booking/services-client.tsx`

The filter sidebar, all filter state, availability logic, and sorting remain completely unchanged. Only the `<article>` card markup inside the `serviceGroups.map` loop is redesigned.

### New card anatomy (top to bottom)

| Zone | Content |
|---|---|
| Image area | Full-width gradient placeholder (`toneClass`) or `ImageCarousel`; ~200px tall; category label badge overlaid bottom-left in white text on dark semi-transparent pill |
| Meta row | Category text (uppercase, 10px, muted) left · star icon + rating + `(count)` right |
| Name | Service display name, bold, ~1.4rem |
| Icons row | `<Clock>` + duration · `<Users>` + capacity (show only when >1) |
| Price row | Price large bold left · "Reserve service →" border-button right |
| Deposit note | `$X deposit` in muted small text below price (only when deposit > 0) |

- Card background: white/light surface (`bg-(--seva-elevated)`), subtle border, `rounded-xl`
- No description text shown on card (removed to keep cards compact)
- Tag buttons removed from card face (filter sidebar already handles tags)
- The `<Link href="/book/service.id">` wraps only the "Reserve service →" button, not the whole card

---

## 2. Service Detail — Hero Section

**File:** `app/book/[serviceId]/page.tsx`

The sticky sidebar `<BookingForm>`, inclusions, prep notes, and location map sections are untouched. The top hero section and the reviews section (`ServiceReviews`) are both redesigned.

### New hero layout (2-column)

```
[ Image (rounded, ~55% width) ] [ Category chip · Name · Description · Stats · CTA · Deposit note ]
```

**Left column:**
- Service image in a `rounded-2xl overflow-hidden` container
- Falls back to `heroArtClass` gradient div if no image

**Right column (top to bottom):**
- Category chip: small uppercase teal label (`text-(--seva-warm)` or accent)
- Service name: large heading (`text-3xl font-bold`)
- Short description paragraph (muted)
- Stats row: three labelled stats — PRICE / LENGTH / RATING — each as a small label + value pair separated by vertical dividers
- CTA button: full-width teal (`sevacam-primary-button`), text: `Reserve service · $X →`
- Deposit note below button: `$X deposit now · $Y after session` (only when deposit > 0)

**Reviews section (`ServiceReviews`):**
- Review cards: white background, border, reviewer name + relative time ("2 weeks ago") + rating stars + comment
- Star display: filled amber stars for rating, empty outlined for remainder
- Layout: 3-column grid for reviews (currently single column)

---

## 3. BookingForm — Shared: Service Header Bar + Step Indicator

**File:** `components/booking/booking-form.tsx`

These two elements replace `StepIndicator` and `SelectionSnapshot` and appear at the top of the form on all steps.

### Service header bar

A compact bar above the step indicator, separated by a bottom border:

```
[ Square color thumbnail (32×32) · Category · Service name ] [ $Price · Duration ]
```

- Thumbnail: small rounded square using the `heroArtClass` color class (seeded from service id)
- Text left: category (uppercase, 10px, muted) · name (14px, semibold)
- Text right: price (bold) + duration (muted, small)

### Step indicator

Horizontal row with three steps connected by lines:

```
  ① ————————— ② ————————— ③
Curator     Date & time   Confirm
```

- Circle: 28px, filled teal when active or done; done state shows `<Check>` icon instead of number
- Connecting line: teal when the step to its left is done, grey otherwise
- Label: step name below the circle, 10px uppercase
- Clicking a completed step navigates back to it (existing `onStepChange` logic kept)

**Remove:** `StepIndicator`, `SelectionSnapshot`, and the "Step 0X" instruction cards inside each step render. The guidance text is no longer needed.

---

## 4. BookingForm — Step 1: Curator

**Heading:** "Who would you like?" (`text-2xl font-bold`)  
**Subtitle:** "Availability updates based on your choice." (muted)

### Staff cards grid (2 columns)

Each card:
- White background, `rounded-2xl border`, padding `p-5`
- Circular avatar (64×64): image or colored-initials fallback
- Name (`text-sm font-semibold`)
- "Available this week" status text (muted, 11px)
- **Selected state:** teal border (`border-(--accent-primary)`) + teal ring shadow

### "Any available" card

Additional card appended after staff list:
- Spinner/loader icon (`<Loader2>` or a CSS animated ring, 32px)
- Name: "Any available"
- Subtitle: "Pick first open slot"
- Selecting it sets `selectedStaffId` to the first staff member's id (existing `handleStaffSelect` logic — no new logic needed; just pick `staff[0].id` on select, or handle as a special UI-only selection that picks any)

### Bottom action bar

Fixed inside the form scroll area (not page-level sticky):

```
[ Chosen: {staffName} ]                    [ Continue → ]
```

- Left: "Chosen: {name}" in muted text, or empty when nothing selected
- Right: teal "Continue →" button; disabled + grey when `!canGoStep2`
- Replaces the existing full-width "Continue to Date & Time" button

---

## 5. BookingForm — Step 2: Date & Time

**Heading:** "When works for you?" (`text-2xl font-bold`)  
**Subtitle:** "Green dots mean there's open availability." (muted, teal "Green dots" text)

### Layout: side by side

```
[ Calendar (~45%) ]  [ Time slots (~55%) ]
```

Both panels are top-aligned. On mobile they stack (calendar on top, slots below).

**Calendar panel:** reuses existing `<BookingCalendar>` component — only styling tweaks (white bg, clean borders, teal selected circle, green availability dots). No logic change.

**Time slots panel:**
- Header: `"{count} times on {date}"` (shown after date is selected; hidden before)
- Three sections: MORNING / AFTERNOON / EVENING (uppercase label, 10px, muted — no coloured banners or icons)
- Each section: slot buttons in a **4-column grid**
- Slot button: border pill, shows start time (e.g. "9:00 AM"); selected = teal fill + white text
- Before date selected: placeholder text "Select a date to see available times"
- Loading state: skeleton pills
- No slots: existing empty state kept, restyled

### Bottom action bar

```
[ Pick a day and time ]                    [ Continue → ]
```

- Left: "Pick a day and time" muted text, updates to selected summary once both chosen
- Right: teal "Continue →" button; disabled until `canGoStep3`

---

## 6. BookingForm — Step 3: Confirm & Pay

**Heading:** "Confirm & pay" (`text-2xl font-bold`)  
**Subtitle:** "Review the details below, then choose how to pay." (muted)

### Layout: two columns

```
[ Left: YOUR BOOKING + HOW TO PAY ]   [ Right: Price breakdown ]
```

On mobile: single column, breakdown card moves below.

**Left — YOUR BOOKING card:**
- Staff avatar (40px circle) + staff name + formatted date · time · duration (muted)
- Service name + price on a separate line below

**Left — HOW TO PAY section:**
- Three radio-style cards stacked vertically
- Each card: colored square letter icon (A=blue, B=red, S=purple) · provider name · subtitle
- Selected state: teal radio dot (right) + teal border on card
- Payment methods shown: ABA PayWay ("Scan with ABA Mobile"), Bakong KHQR ("Any Bakong-compatible app"), Card/Stripe ("Visa, Mastercard, Amex")
- State: `useState<"aba" | "bakong" | "stripe">("aba")` — UI only
- Clicking "Authorize payment" still calls existing `handleBooking()` — no change to booking creation logic

**Right — Price breakdown card:**
- Rows: service name + price · Deposit now + amount · Service fee + "$0" (green) · divider
- "Due now" label + large amount bold
- "$X after session" note below in muted text
- Values derived from existing `effectivePrice`, `effectiveDeposit`, `amountDueNow`

### Bottom action bar

```
[ Total due now: $X ]                  [ Authorize payment · $X → ]
```

- Left: "Total due now: $X" muted
- Right: teal button; disabled + loader when `isBooking`
- Calls existing `handleBooking()` on click

---

## What is NOT changed

- All fetch calls, API routes, state management, booking creation, payment redirect
- Filter sidebar logic in `ServicesClient`
- `BranchSelectionStep` component
- `LocationMapView` component
- Waitlist logic and UI
- `BookingCalendar` internal logic
- Payment page (`/payment/[bookingId]`)
- Admin, staff, dashboard pages
