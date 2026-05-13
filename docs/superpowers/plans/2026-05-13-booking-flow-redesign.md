# Booking Flow Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the customer booking flow (service list cards, service detail hero, booking form steps 1–3, and reviews) to match the new design screenshots — no logic, routing, or API changes.

**Architecture:** The `/book/[serviceId]` page changes from a 2-column grid (detail left + sidebar right) to a stacked layout (2-col hero at top, full-width booking form below). This gives the booking form enough width for the side-by-side calendar+time (step 2) and 2-col confirm+pay (step 3). All fetch calls, state, and handlers in `BookingForm` are untouched. `StepIndicator` and `SelectionSnapshot` are replaced with two new presentational components. One new UI-only state is added for the "Any available" curator card and one for payment method pre-selection in step 3.

**Tech Stack:** Next.js App Router, React, Tailwind CSS v4, `date-fns`, existing `sevacam-*` CSS classes and `--*` CSS variable tokens.

---

## File Map

| File | Change |
|---|---|
| `components/booking/services-client.tsx` | Replace `<article>` card markup only |
| `app/book/[serviceId]/page.tsx` | Remove nav header; new 2-col hero; add "Who guides it"; move `BookingForm` to full-width section |
| `components/booking/ServiceReviews.tsx` | 3-col grid, white cards, relative time |
| `components/booking/booking-form.tsx` | New `ServiceHeaderBar` + `BookingStepIndicator` components; restyle `SlotPeriodSection`; rewrite `renderStep1`, `renderStep2`, `renderStep3`; add 2 UI-only states |

---

### Task 1: Restyle service listing cards

**Files:**
- Modify: `components/booking/services-client.tsx`

- [ ] **Step 1: Replace the `<article>` element inside `serviceGroups.map`**

Find the `<article key={service.id}` element (around line 771) and replace the entire `<article>…</article>` block with:

```tsx
<article
  key={service.id}
  className="flex flex-col overflow-hidden rounded-xl border border-(--seva-border-subtle) bg-(--seva-elevated)"
>
  {/* Image / gradient placeholder */}
  <div className="relative overflow-hidden">
    {images.length > 0 ? (
      <ImageCarousel
        images={images}
        alt={displayName}
        className="h-48 w-full"
        imageClassName="h-48 w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-[1.03]"
      />
    ) : (
      <div className={`h-48 w-full ${toneClass}`} />
    )}
    {service.category && (
      <span className="absolute bottom-3 left-3 rounded-full bg-black/50 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
        {service.category}
      </span>
    )}
  </div>

  {/* Card body */}
  <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
    <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-(--seva-text-muted)">
      {service.category || "Curated"}
    </p>

    <h3 className="text-[1.05rem] font-bold leading-snug text-(--seva-text) sm:text-[1.12rem]">
      {displayName}
    </h3>

    <div className="flex items-center gap-3 text-[0.72rem] text-(--seva-text-soft)">
      <span className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        {formatDuration(service.duration_minutes)}
      </span>
      {availableDate && avail === "available" && (
        <span className="text-(--seva-accent)">Available</span>
      )}
      {availableDate && avail === "loading" && (
        <span className="inline-flex items-center gap-1 text-(--seva-accent)">
          <Loader2 className="h-3 w-3 animate-spin" />
        </span>
      )}
    </div>

    {/* Price + CTA */}
    <div className="mt-auto flex items-end justify-between gap-3 pt-3">
      <div>
        <p className="text-[1.2rem] font-bold text-(--seva-text)">
          {formatPrice(service.price)}
        </p>
        {service.deposit_amount > 0 && (
          <p className="mt-0.5 text-[0.62rem] text-(--seva-text-muted)">
            {formatPrice(service.deposit_amount)} deposit
          </p>
        )}
      </div>
      <Link
        href={`/book/${service.id}`}
        className="inline-flex items-center gap-1.5 rounded-[0.45rem] border border-(--seva-border-interactive) px-3.5 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--seva-text-soft) transition-colors hover:border-(--seva-accent) hover:text-(--seva-accent)"
      >
        Reserve service
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  </div>
</article>
```

- [ ] **Step 2: Start dev server and visually verify**

```bash
npm run dev
```

Open http://localhost:3000/services. Confirm:
- Cards have gradient/image at top with category badge overlay
- Category label, service name, duration, price visible
- Deposit note shows only when deposit > 0
- "Reserve service →" has border button style (not filled teal)
- No description text or tag rows on cards
- Filter sidebar is completely unchanged

- [ ] **Step 3: Commit**

```bash
git add components/booking/services-client.tsx
git commit -m "redesign: restyle service listing cards"
```

---

### Task 2: Restyle ServiceReviews component

**Files:**
- Modify: `components/booking/ServiceReviews.tsx`

- [ ] **Step 1: Add `formatDistanceToNow` to imports and rewrite the component**

Replace the entire file content with:

```tsx
import { formatDistanceToNow } from "date-fns";
import { Star } from "lucide-react";

type ServiceReview = {
  rating: number;
  comment: string | null;
  created_at: string;
  customer_name: string;
};

export type ServiceReviewsData = {
  average_rating: number | null;
  review_count: number;
  reviews: ServiceReview[];
};

function StarDisplay({ rating, max = 5 }: { rating: number; max?: number }) {
  const filled = Math.round(rating);
  return (
    <span aria-label={`${rating} out of ${max} stars`} className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, index) => (
        <Star
          key={index}
          className={`h-3 w-3 ${index < filled ? "fill-amber-400 text-amber-400" : "text-(--border-muted)"}`}
        />
      ))}
    </span>
  );
}

export function ServiceReviews({ data }: { data: ServiceReviewsData | null }) {
  if (!data || data.review_count === 0) {
    return (
      <div>
        <h2 className="text-sm font-semibold text-(--text-primary)">Reviews</h2>
        <p className="mt-2 text-sm text-(--text-secondary)">No reviews yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <h2 className="text-base font-semibold text-(--text-primary)">Reviews</h2>
        {data.average_rating && (
          <>
            <StarDisplay rating={data.average_rating} />
            <span className="text-sm font-semibold text-(--text-primary)">
              {data.average_rating.toFixed(1)}
            </span>
          </>
        )}
        <span className="text-xs text-(--text-secondary)">
          {data.review_count} total
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {data.reviews.map((review, index) => (
          <div
            key={index}
            className="rounded-xl border border-(--border-muted) bg-(--bg-elevated) p-4"
          >
            <StarDisplay rating={review.rating} />
            {review.comment && (
              <p className="mt-2 text-sm leading-relaxed text-(--text-secondary)">
                {review.comment}
              </p>
            )}
            <p className="mt-3 text-[0.65rem] text-(--text-secondary)/70">
              {review.customer_name} ·{" "}
              {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/booking/ServiceReviews.tsx
git commit -m "redesign: restyle service reviews to 3-column grid with relative timestamps"
```

---

### Task 3: Redesign service detail page layout

**Files:**
- Modify: `app/book/[serviceId]/page.tsx`

- [ ] **Step 1: Update imports — add `Check` and `ArrowRight` to lucide imports**

Find the existing lucide-react import line and ensure `Check` and `ArrowRight` are included:

```tsx
import { ChevronLeft, Clock, Check, ArrowRight, MapPin } from "lucide-react";
```

Remove `DollarSign`, `Tag`, `Users`, `Sparkles` from the import if present (they were used in the old layout sections we're removing). Only remove what's truly unused after the rewrite.

- [ ] **Step 2: Replace the entire `return (…)` of `BookServicePage`**

Replace from `return (` to the closing `);` with:

```tsx
  return (
    <div className="min-h-screen bg-(--bg-base) text-(--text-primary)">
      <div className="mx-auto w-full max-w-[86rem] px-6 py-8 sm:px-8 lg:px-10">

        {/* Back link */}
        <Link
          href="/services"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-(--text-secondary) transition-colors hover:text-(--text-primary)"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to services
        </Link>

        {/* ── Service hero: 2-column ── */}
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          {/* Left: image */}
          <div className="overflow-hidden rounded-2xl">
            {images.length > 0 ? (
              <ImageCarousel
                images={images}
                alt={displayName}
                className="w-full"
                imageClassName="w-full object-cover"
              />
            ) : (
              <div className={`aspect-[4/3] w-full ${heroArtClass}`} />
            )}
          </div>

          {/* Right: info + CTA */}
          <div className="space-y-5 lg:py-2">
            {service.category && (
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-(--color-accent-warm)">
                {service.category}
              </p>
            )}
            <h1 className="text-3xl font-bold leading-tight text-(--text-primary) sm:text-4xl">
              {displayName}
            </h1>
            {service.description && (
              <p className="text-sm leading-7 text-(--text-secondary)">
                {service.description}
              </p>
            )}

            {/* Stats row */}
            <div className="flex gap-8 border-y border-(--border-muted) py-5">
              <div>
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
                  Price
                </p>
                <p className="mt-1 text-xl font-bold text-(--text-primary)">
                  {formatPrice(service.price)}
                </p>
              </div>
              <div>
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
                  Length
                </p>
                <p className="mt-1 text-xl font-bold text-(--text-primary)">
                  {formatDuration(service.duration_minutes)}
                </p>
              </div>
              {reviewsData?.average_rating != null && (
                <div>
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
                    Rating
                  </p>
                  <p className="mt-1 text-xl font-bold text-(--text-primary)">
                    {reviewsData.average_rating.toFixed(1)}
                  </p>
                </div>
              )}
            </div>

            {/* CTA — scrolls to the booking form */}
            <a
              href="#booking"
              className="sevacam-primary-button flex min-h-12 w-full items-center justify-center gap-2 rounded-[0.18rem] px-6 py-3.5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#07292d]"
            >
              Reserve service · {formatPrice(service.price)}
              <ArrowRight className="h-4 w-4" />
            </a>
            {service.deposit_amount > 0 && (
              <p className="text-center text-xs text-(--text-secondary)">
                {formatPrice(service.deposit_amount)} deposit now ·{" "}
                {formatPrice(service.price - service.deposit_amount)} after session
              </p>
            )}
          </div>
        </div>

        {/* ── What's included + Who guides it ── */}
        {(inclusionItems.length > 0 || staff.length > 0) && (
          <div className="mt-14 grid gap-10 md:grid-cols-2">
            {inclusionItems.length > 0 && (
              <div>
                <p className="mb-4 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
                  What&apos;s Included
                </p>
                <ul className="space-y-3">
                  {inclusionItems.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-(--text-secondary)">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-(--accent-primary)" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {staff.length > 0 && (
              <div>
                <p className="mb-4 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
                  Who Guides It
                </p>
                <div className="space-y-3">
                  {staff.map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--border-muted) bg-(--bg-elevated)">
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={member.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-(--text-primary)/80">
                            {member.name
                              .split(" ")
                              .map((p) => p[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-(--text-primary)">
                        {member.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Prep notes ── */}
        {service.prep_notes && (
          <div className="mt-10 rounded-xl border border-(--border-muted) bg-(--bg-elevated) p-6">
            <p className="mb-3 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
              Prep Notes
            </p>
            <p className="text-sm leading-7 text-(--text-secondary)">{service.prep_notes}</p>
          </div>
        )}

        {/* ── Location maps ── */}
        {service.locations &&
          service.locations.filter((l) => l.latitude !== null && l.longitude !== null).length > 0 && (
            <div className="mt-10 space-y-4">
              {service.locations
                .filter((l) => l.latitude !== null && l.longitude !== null)
                .map((loc) => (
                  <LocationMapView
                    key={loc.id}
                    location={{
                      name: loc.name,
                      address: loc.address,
                      latitude: loc.latitude!,
                      longitude: loc.longitude!,
                    }}
                  />
                ))}
            </div>
          )}

        {/* ── Text-only locations ── */}
        {service.locations &&
          service.locations.filter(
            (l) => !(l.latitude != null && l.longitude != null) && (l.name || l.address),
          ).length > 0 && (
            <div className="mt-6 space-y-3">
              {service.locations
                .filter((l) => !(l.latitude != null && l.longitude != null) && (l.name || l.address))
                .map((loc) => (
                  <div key={loc.id} className="rounded-xl border border-(--border-muted) bg-(--bg-elevated) p-4">
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
            </div>
          )}

        {/* ── Reviews ── */}
        <div className="mt-12">
          <ServiceReviews data={reviewsData} />
        </div>

        {/* ── Booking form — full width ── */}
        <section id="booking" className="mt-16 scroll-mt-6 border-t border-(--border-muted) pt-12">
          <BookingForm
            service={service}
            staff={staff}
            customer={me}
            bookingSource={source}
            locations={service.locations}
          />
        </section>

        <footer className="mt-16 border-t border-(--border-muted) pt-8">
          <div className="flex flex-col gap-6 text-[0.58rem] uppercase tracking-[0.18em] text-(--text-secondary) sm:flex-row sm:items-center sm:justify-between">
            <p>Copyright 2026 SevaCam. All rights reserved.</p>
            <nav className="flex flex-wrap gap-x-6 gap-y-3">
              <Link href="/" className="transition-colors hover:text-(--text-primary)">Privacy</Link>
              <Link href="/" className="transition-colors hover:text-(--text-primary)">Terms</Link>
              <Link href="/services" className="transition-colors hover:text-(--text-primary)">Atelier</Link>
              <Link href="/support" className="transition-colors hover:text-(--text-primary)">Contact</Link>
            </nav>
          </div>
        </footer>

      </div>
    </div>
  );
```

- [ ] **Step 3: Remove now-unused imports from the top of the file**

Remove `DollarSign`, `Tag`, `Users`, `Sparkles` from the lucide import (they were only used in the old sidebar/hero sections). Keep `ChevronLeft`, `Clock`, `Check`, `ArrowRight`, `MapPin`.

- [ ] **Step 4: Visually verify**

Open http://localhost:3000/book/[any-service-id]. Confirm:
- Simple back link at top (no full nav bar)
- 2-column hero: image left, info right with category chip, name, description, stats, CTA button
- "What's included" with checkmarks and "Who guides it" with staff avatars
- Reviews section (3-column grid)
- Booking form below with full width

- [ ] **Step 5: Commit**

```bash
git add app/book/\[serviceId\]/page.tsx
git commit -m "redesign: new service detail hero layout and full-width booking form section"
```

---

### Task 4: Add `ServiceHeaderBar` + `BookingStepIndicator` to BookingForm

**Files:**
- Modify: `components/booking/booking-form.tsx`

- [ ] **Step 1: Add `formatDuration` helper and art-class seed helpers near the top of the file (after the existing `formatCurrency` helper)**

```tsx
const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const FORM_ART_CLASSES = [
  "sevacam-art-stones",
  "sevacam-art-sanctuary",
  "sevacam-art-dining",
  "sevacam-art-ritual",
  "sevacam-art-chamber",
  "sevacam-art-botanical",
] as const;

const getFormArtClass = (seed: string) => {
  const total = seed.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return FORM_ART_CLASSES[total % FORM_ART_CLASSES.length];
};
```

- [ ] **Step 2: Replace the `StepIndicator` component (lines ~157–277) with `BookingStepIndicator`**

Delete the entire `function StepIndicator(…) { … }` block and replace with:

```tsx
function BookingStepIndicator({
  currentStep,
  canGoStep2,
  canGoStep3,
  onStepChange,
}: {
  currentStep: number;
  canGoStep2: boolean;
  canGoStep3: boolean;
  onStepChange: (step: 1 | 2 | 3) => void;
}) {
  const steps = [
    { label: "Curator", step: 1 as const },
    { label: "Date & time", step: 2 as const },
    { label: "Confirm", step: 3 as const },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-start">
        {steps.map(({ label, step }, i) => {
          const isDone = step < currentStep;
          const isActive = step === currentStep;
          const isReachable =
            step === 1 ||
            (step === 2 && canGoStep2) ||
            (step === 3 && canGoStep3);

          return (
            <div key={step} className="flex items-start">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => isReachable && onStepChange(step)}
                  disabled={!isReachable}
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)/25",
                    isDone || isActive
                      ? "bg-(--accent-primary) text-[#07292d]"
                      : "border border-(--border-muted) bg-(--bg-elevated) text-(--text-secondary)",
                    !isReachable && "cursor-not-allowed opacity-40",
                  )}
                >
                  {isDone ? <Check className="h-3 w-3" /> : step}
                </button>
                <span
                  className={cn(
                    "mt-1.5 whitespace-nowrap text-[0.6rem] font-medium uppercase tracking-[0.12em]",
                    isActive
                      ? "text-(--text-primary)"
                      : isDone
                        ? "text-(--accent-primary)/80"
                        : "text-(--text-secondary)/60",
                  )}
                >
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-2 mt-3.5 h-px w-16 flex-1 transition-colors duration-300 sm:w-24",
                    isDone ? "bg-(--accent-primary)" : "bg-(--border-muted)",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Delete the `SelectionSnapshot` component (lines ~279–342)**

Delete the entire `function SelectionSnapshot(…) { … }` block. It is replaced by the header bar below.

- [ ] **Step 4: Add the `ServiceHeaderBar` component after `BookingStepIndicator`**

```tsx
function ServiceHeaderBar({
  service,
  effectivePrice,
  effectiveDuration,
}: {
  service: BookingService;
  effectivePrice: number;
  effectiveDuration: number;
}) {
  const artClass = getFormArtClass(service.id);
  return (
    <div className="mb-6 flex items-center justify-between gap-4 border-b border-(--border-muted) pb-5">
      <div className="flex items-center gap-3">
        <div className={`h-9 w-9 shrink-0 rounded-[0.45rem] ${artClass}`} />
        <p className="text-sm font-semibold text-(--text-primary)">{service.name}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-(--text-primary)">
          {formatCurrency(effectivePrice)}
        </p>
        <p className="text-[0.65rem] text-(--text-secondary)">
          {formatDuration(effectiveDuration)}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add two new UI-only state variables inside `BookingForm` (after existing state declarations)**

After the line `const [waitlistMessage, setWaitlistMessage] = useState<string | null>(null);`, add:

```tsx
const [paymentMethod, setPaymentMethod] = useState<"aba" | "bakong" | "stripe">("aba");
const [isAnyAvailable, setIsAnyAvailable] = useState(false);
```

- [ ] **Step 6: Update the main `return` inside `BookingForm` to use the new components**

Find the main `return (` of the `BookingForm` function (around line 1542). Inside the `{(!locations || locations.length <= 1 || selectedLocationId) && (…)}` block, replace:

```tsx
<StepIndicator
  currentStep={step}
  canGoStep2={canGoStep2}
  canGoStep3={canGoStep3}
  onStepChange={setStep}
/>

<SelectionSnapshot
  step={step}
  locationLabel={selectedLocation?.name ?? null}
  staffName={selectedStaff?.name ?? null}
  dateLabel={selectedDateLabel}
  slotLabel={selectedSlotLabel}
/>
```

with:

```tsx
<ServiceHeaderBar
  service={service}
  effectivePrice={effectivePrice}
  effectiveDuration={effectiveDuration}
/>
<BookingStepIndicator
  currentStep={step}
  canGoStep2={canGoStep2}
  canGoStep3={canGoStep3}
  onStepChange={setStep}
/>
```

- [ ] **Step 7: Visually verify the shared header bar and step indicator appear on all steps**

Open http://localhost:3000/book/[service-id]. Confirm:
- Top of form shows service thumbnail + name (left) and price + duration (right)
- Below that: numbered step circles connected by lines with labels Curator / Date & time / Confirm
- Completed steps show checkmarks; active step is teal; future steps are grey

- [ ] **Step 8: Commit**

```bash
git add components/booking/booking-form.tsx
git commit -m "redesign: add ServiceHeaderBar and BookingStepIndicator to booking form"
```

---

### Task 5: Restyle Step 1 — Curator selection

**Files:**
- Modify: `components/booking/booking-form.tsx`

- [ ] **Step 1: Replace `SlotPeriodSection` markup (keep all props/logic, only change JSX)**

Find `function SlotPeriodSection(…)` and replace only its `return (…)` with:

```tsx
  if (slots.length === 0) return null;
  const { label } = period;

  return (
    <div className="space-y-2">
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
        {label}
      </p>
      <div className="grid grid-cols-4 gap-2">
        {slots.map((slot) => {
          const isSelected = selectedSlot === slot.start_time;
          const startLabel = formatTimeInTimeZone(slot.start_time, timeZone);
          return (
            <button
              key={slot.start_time}
              type="button"
              onClick={() => onSelect(slot.start_time)}
              className={cn(
                "rounded-[0.45rem] border px-2 py-2.5 text-center text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)/25",
                isSelected
                  ? "border-transparent bg-(--accent-primary) text-[#07292d]"
                  : "border-(--border-muted) bg-(--bg-elevated) text-(--text-primary) hover:border-(--accent-primary)/50 hover:bg-(--accent-primary)/10",
              )}
              aria-pressed={isSelected}
            >
              {startLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
```

Note: remove the `const { Icon, iconColor, bgColor, borderColor, label, subLabel } = period;` destructure — only `label` is needed now.

- [ ] **Step 2: Replace the `renderStep1` function body**

Find `const renderStep1 = () => (` and replace the entire function body with:

```tsx
const renderStep1 = () => (
  <div ref={providerSectionRef} className="sevacam-section-anchor">
    <h2 className="text-2xl font-bold text-(--text-primary)">Who would you like?</h2>
    <p className="mt-1 mb-6 text-sm text-(--text-secondary)">
      Availability updates based on your choice.
    </p>

    {staff.length === 0 ? (
      <div className="rounded-xl border border-(--border-muted) bg-(--bg-elevated) px-4 py-8 text-center">
        <User className="mx-auto mb-3 h-8 w-8 text-(--text-secondary)/80" />
        <p className="text-sm font-medium text-(--text-primary)/80">No staff available</p>
        <p className="mt-1 text-xs text-(--text-secondary)/80">
          No team members are available for this service right now.
        </p>
      </div>
    ) : (
      <div className="grid grid-cols-2 gap-3">
        {staff.map((member) => {
          const isSelected = !isAnyAvailable && member.id === selectedStaffId;
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => {
                setIsAnyAvailable(false);
                handleStaffSelect(member.id);
              }}
              className={cn(
                "sevacam-interactive-card flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)/25",
                isSelected
                  ? "border-(--accent-primary) bg-(--bg-elevated) shadow-[0_0_0_2px_var(--accent-primary)]"
                  : "border-(--border-muted) bg-(--bg-elevated) hover:border-(--accent-primary)/50",
              )}
              aria-pressed={isSelected}
            >
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-(--border-muted)">
                {member.avatar_url ? (
                  <img
                    src={member.avatar_url}
                    alt={member.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span
                    className={cn(
                      "text-lg font-bold",
                      isSelected ? "text-(--accent-primary)" : "text-(--text-primary)/90",
                    )}
                  >
                    {getInitials(member.name || "?")}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-(--text-primary)">{member.name}</p>
                <p className="mt-0.5 text-[0.65rem] text-(--text-secondary)">Available this week</p>
              </div>
            </button>
          );
        })}

        {/* Any available card */}
        <button
          type="button"
          onClick={() => {
            setIsAnyAvailable(true);
            if (staff[0]) handleStaffSelect(staff[0].id);
          }}
          className={cn(
            "sevacam-interactive-card flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)/25",
            isAnyAvailable
              ? "border-(--accent-primary) bg-(--bg-elevated) shadow-[0_0_0_2px_var(--accent-primary)]"
              : "border-(--border-muted) bg-(--bg-elevated) hover:border-(--accent-primary)/50",
          )}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-(--border-muted) bg-(--bg-inset)">
            <Loader2 className="h-7 w-7 text-(--text-secondary)/60" />
          </div>
          <div>
            <p className="text-sm font-semibold text-(--text-primary)">Any available</p>
            <p className="mt-0.5 text-[0.65rem] text-(--text-secondary)">Pick first open slot</p>
          </div>
        </button>
      </div>
    )}

    {/* Bottom action bar */}
    {staff.length > 0 && (
      <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-(--border-muted) bg-(--bg-elevated) px-4 py-3">
        <p className="text-sm text-(--text-secondary)">
          {canGoStep2 ? (
            <>
              Chosen:{" "}
              <span className="font-semibold text-(--text-primary)">
                {isAnyAvailable ? "Any available" : (selectedStaff?.name ?? "")}
              </span>
            </>
          ) : (
            <span className="text-(--text-secondary)/60">No curator selected</span>
          )}
        </p>
        <button
          type="button"
          onClick={() => setStep(2)}
          disabled={!canGoStep2}
          className={cn(
            "sevacam-primary-button inline-flex items-center gap-2 rounded-[0.18rem] px-5 py-2.5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] transition-all duration-200",
            canGoStep2
              ? "text-[#07292d]"
              : "cursor-not-allowed bg-(--bg-inset) text-(--text-secondary)/80",
          )}
        >
          Continue <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    )}
  </div>
);
```

- [ ] **Step 3: Visually verify Step 1**

Navigate to the booking form, step 1. Confirm:
- "Who would you like?" heading + subtitle
- Staff cards: circular avatar, name, "Available this week"
- "Any available" card with spinner icon
- Selected state: teal border + ring
- Bottom bar: "Chosen: [name]" left, "Continue →" right; disabled until staff selected

- [ ] **Step 4: Commit**

```bash
git add components/booking/booking-form.tsx
git commit -m "redesign: restyle booking step 1 curator selection and slot period sections"
```

---

### Task 6: Restyle Step 2 — Date & Time

**Files:**
- Modify: `components/booking/booking-form.tsx`

- [ ] **Step 1: Replace the `renderStep2` function body**

Find `const renderStep2 = () => (` and replace the entire function body:

```tsx
const renderStep2 = () => (
  <div ref={calendarSectionRef} className="sevacam-section-anchor">
    <h2 className="text-2xl font-bold text-(--text-primary)">When works for you?</h2>
    <p className="mt-1 mb-6 text-sm text-(--text-secondary)">
      <span className="text-(--accent-primary)">Green dots</span> mean there&apos;s open
      availability.
    </p>

    {calendarError && (
      <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
        {calendarError}
      </div>
    )}

    {/* Side-by-side: calendar left, time slots right */}
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      {/* Calendar */}
      <BookingCalendar
        calendarMonth={calendarMonth}
        calendarDays={calendarDays}
        selectedDate={selectedDate}
        monthAvailability={monthAvailability}
        isLoadingCalendar={isLoadingCalendar}
        selectedStaffId={selectedStaffId}
        today={today}
        onPrevMonth={() => setCalendarMonth((prev) => subMonths(prev, 1))}
        onNextMonth={() => setCalendarMonth((prev) => addMonths(prev, 1))}
        onDateSelect={handleDateSelect}
      />

      {/* Time slots */}
      <div ref={timesSectionRef} className="sevacam-section-anchor space-y-4">
        {!selectedDate ? (
          <div className="flex h-full min-h-[12rem] items-center justify-center rounded-xl border border-(--border-muted) bg-(--bg-elevated) px-4 text-center">
            <p className="text-sm text-(--text-secondary)">Select a date to see available times</p>
          </div>
        ) : isLoadingSlots ? (
          <div className="space-y-3">
            <div className="h-5 w-32 animate-pulse rounded bg-(--bg-elevated)" />
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-[0.45rem] bg-(--bg-elevated)" />
              ))}
            </div>
          </div>
        ) : availableSlots.length > 0 ? (
          <>
            <p className="text-sm font-semibold text-(--text-primary)">
              {availableSlots.length} times on {format(selectedDate, "MMMM d")}
            </p>
            <div className="space-y-4">
              {TIME_PERIODS.map((period) => (
                <SlotPeriodSection
                  key={period.key}
                  period={period}
                  slots={slotsByPeriod[period.key] ?? []}
                  selectedSlot={selectedSlot}
                  durationMinutes={effectiveDuration}
                  timeZone={timezone}
                  onSelect={setSelectedSlot}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-(--border-muted) bg-(--bg-elevated) p-5 text-center">
            <p className="text-sm font-medium text-(--text-primary)/80">No slots on this date</p>
            <p className="mt-1 text-xs text-(--text-secondary)/80">Try another day or join the waitlist.</p>
            <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              {nextAvailableDate && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(nextAvailableDate);
                    setCalendarMonth(startOfMonth(nextAvailableDate));
                  }}
                  className="sevacam-primary-button inline-flex min-h-10 items-center gap-1.5 rounded-[0.18rem] px-4 py-2 text-[0.58rem] font-semibold uppercase tracking-[0.18em]"
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Next available: {format(nextAvailableDate, "MMM d")}
                </button>
              )}
              <button
                type="button"
                onClick={handleJoinWaitlist}
                disabled={isJoiningWaitlist}
                className="sevacam-secondary-button inline-flex min-h-10 items-center gap-1.5 rounded-[0.18rem] px-4 py-2 text-[0.58rem] font-semibold uppercase tracking-[0.18em] disabled:opacity-60"
              >
                {isJoiningWaitlist ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                {isJoiningWaitlist ? "Joining..." : "Join waitlist"}
              </button>
            </div>
            {waitlistMessage && (
              <p className="mt-3 text-xs text-emerald-300">{waitlistMessage}</p>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Bottom action bar */}
    <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-(--border-muted) bg-(--bg-elevated) px-4 py-3">
      <p className="text-sm text-(--text-secondary)">
        {selectedDate && selectedSlot ? (
          <span className="font-medium text-(--text-primary)">
            {format(selectedDate, "MMM d")} at{" "}
            {formatTimeInTimeZone(selectedSlot, timezone)}
          </span>
        ) : (
          <span className="text-(--text-secondary)/60">Pick a day and time</span>
        )}
      </p>
      <button
        type="button"
        onClick={() => setStep(3)}
        disabled={!canGoStep3}
        className={cn(
          "sevacam-primary-button inline-flex items-center gap-2 rounded-[0.18rem] px-5 py-2.5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] transition-all duration-200",
          canGoStep3
            ? "text-[#07292d]"
            : "cursor-not-allowed bg-(--bg-inset) text-(--text-secondary)/80",
        )}
      >
        Continue <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  </div>
);
```

- [ ] **Step 2: Visually verify Step 2**

Select a curator and advance to step 2. Confirm:
- "When works for you?" heading + "Green dots" subtitle (teal)
- Calendar on left, time slots panel on right (side by side on desktop, stacked on mobile)
- Time slot buttons: simple pill style, 4-column grid per period section
- Period headers: plain uppercase text (no colored banners)
- Selected slot: teal fill
- Bottom bar: "Pick a day and time" updates to date+time summary after selection

- [ ] **Step 3: Commit**

```bash
git add components/booking/booking-form.tsx
git commit -m "redesign: restyle booking step 2 with side-by-side calendar and time slot grid"
```

---

### Task 7: Restyle Step 3 — Confirm & Pay

**Files:**
- Modify: `components/booking/booking-form.tsx`

- [ ] **Step 1: Replace the `renderStep3` function body**

Find `const renderStep3 = () => {` and replace everything inside the function with:

```tsx
const renderStep3 = () => {
  const slotStart = selectedSlot ? new Date(selectedSlot) : null;
  const slotEnd = slotStart ? addMinutes(slotStart, effectiveDuration) : null;
  const remainingAfterSession =
    effectiveDeposit > 0 ? effectivePrice - effectiveDeposit : 0;

  const PAYMENT_METHODS = [
    {
      id: "aba" as const,
      label: "ABA PayWay",
      subtitle: "Scan with ABA Mobile",
      bg: "bg-blue-600",
      letter: "A",
    },
    {
      id: "bakong" as const,
      label: "Bakong KHQR",
      subtitle: "Any Bakong-compatible app",
      bg: "bg-red-600",
      letter: "B",
    },
    {
      id: "stripe" as const,
      label: "Card (Stripe)",
      subtitle: "Visa, Mastercard, Amex",
      bg: "bg-violet-600",
      letter: "S",
    },
  ] as const;

  return (
    <div ref={confirmSectionRef} className="sevacam-section-anchor">
      <h2 className="text-2xl font-bold text-(--text-primary)">Confirm &amp; pay</h2>
      <p className="mt-1 mb-6 text-sm text-(--text-secondary)">
        Review the details below, then choose how to pay.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        {/* Left column */}
        <div className="space-y-5">
          {/* YOUR BOOKING */}
          <div className="rounded-xl border border-(--border-muted) bg-(--bg-elevated) p-5">
            <p className="mb-4 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
              Your Booking
            </p>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--border-muted) bg-(--bg-inset)">
                {selectedStaff?.avatar_url ? (
                  <img
                    src={selectedStaff.avatar_url}
                    alt={selectedStaff.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold text-(--text-primary)/90">
                    {getInitials(selectedStaff?.name ?? "?")}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-(--text-primary)">
                  {selectedStaff?.name}
                </p>
                <p className="mt-0.5 text-xs text-(--text-secondary)">
                  {selectedDate && format(selectedDate, "MMM d, yyyy")}
                  {slotStart && ` · ${formatTimeInTimeZone(slotStart, timezone)}`}
                  {` · ${effectiveDuration} min`}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-(--border-muted) pt-4">
              <p className="text-sm text-(--text-secondary)">{service.name}</p>
              <p className="text-sm font-semibold text-(--text-primary)">
                {formatCurrency(effectivePrice)}
              </p>
            </div>
          </div>

          {/* HOW TO PAY */}
          <div>
            <p className="mb-3 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
              How to Pay
            </p>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)/25",
                    paymentMethod === method.id
                      ? "border-(--accent-primary) bg-(--bg-elevated)"
                      : "border-(--border-muted) bg-(--bg-elevated) hover:border-(--accent-primary)/40",
                  )}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.45rem] ${method.bg} text-sm font-bold text-white`}
                  >
                    {method.letter}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-(--text-primary)">{method.label}</p>
                    <p className="text-xs text-(--text-secondary)">{method.subtitle}</p>
                  </div>
                  <div
                    className={cn(
                      "h-4 w-4 shrink-0 rounded-full border-2 transition-colors",
                      paymentMethod === method.id
                        ? "border-(--accent-primary) bg-(--accent-primary)"
                        : "border-(--border-muted)",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: price breakdown */}
        <div className="rounded-xl border border-(--border-muted) bg-(--bg-elevated) p-5 lg:self-start">
          <p className="mb-4 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
            Price
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-(--text-secondary)">{service.name}</span>
              <span className="font-medium text-(--text-primary)">
                {formatCurrency(effectivePrice)}
              </span>
            </div>
            {effectiveDeposit > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-(--text-secondary)">Deposit now</span>
                <span className="font-medium text-(--text-primary)">
                  {formatCurrency(effectiveDeposit)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-(--text-secondary)">Service fee</span>
              <span className="font-medium text-emerald-400">$0</span>
            </div>
          </div>
          <div className="mt-4 border-t border-(--border-muted) pt-4">
            <div className="flex items-end justify-between">
              <span className="text-sm font-semibold text-(--text-primary)">Due now</span>
              <span className="text-2xl font-bold text-(--text-primary)">
                {formatCurrency(amountDueNow)}
              </span>
            </div>
            {effectiveDeposit > 0 && remainingAfterSession > 0 && (
              <p className="mt-1 text-right text-xs text-(--text-secondary)">
                {formatCurrency(remainingAfterSession)} after session
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Errors / messages */}
      {bookingError && (
        <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {bookingError}
        </div>
      )}
      {waitlistMessage && (
        <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {waitlistMessage}
        </div>
      )}

      {/* Bottom action bar */}
      <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-(--border-muted) bg-(--bg-elevated) px-4 py-3">
        <p className="text-sm text-(--text-secondary)">
          Total due now:{" "}
          <span className="font-semibold text-(--text-primary)">
            {formatCurrency(amountDueNow)}
          </span>
        </p>
        <button
          type="button"
          onClick={handleBooking}
          disabled={isBooking}
          className={cn(
            "sevacam-primary-button inline-flex items-center gap-2 rounded-[0.18rem] px-5 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.18em] transition-all duration-200",
            isBooking
              ? "cursor-not-allowed bg-(--bg-inset) text-(--text-secondary)"
              : "text-[#07292d]",
          )}
        >
          {isBooking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Processing...
            </>
          ) : (
            <>
              Authorize payment · {formatCurrency(amountDueNow)}{" "}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Visually verify Step 3**

Complete steps 1 and 2 and advance to step 3. Confirm:
- "Confirm & pay" heading + subtitle
- Left: "YOUR BOOKING" card with staff avatar + name + date/time/duration + service name + price
- Left: "HOW TO PAY" with three radio cards (ABA/Bakong/Stripe), teal border on selected
- Right: price breakdown (service price, deposit, $0 fee, due now, after-session note)
- Bottom bar: "Total due now: $X" + "Authorize payment · $X →" button
- Clicking "Authorize payment" still creates the booking and redirects to `/payment/[id]` (existing logic unchanged)

- [ ] **Step 3: Commit**

```bash
git add components/booking/booking-form.tsx
git commit -m "redesign: restyle booking step 3 with 2-column confirm layout and payment method selection"
```

---

## Self-Review Checklist

| Spec requirement | Task covering it |
|---|---|
| Service cards: gradient image, category badge, duration, price, deposit, CTA button | Task 1 |
| Service detail: 2-column hero, category chip, stats row, CTA, deposit note | Task 3 |
| Service detail: "Who guides it" section with staff avatars | Task 3 |
| Reviews: 3-column grid, white cards, relative time | Task 2 |
| Booking form: compact service header bar | Task 4 |
| Booking form: new step indicator (numbered, checkmarks, connectors) | Task 4 |
| Remove `StepIndicator` + `SelectionSnapshot` | Task 4 |
| Step 1: "Who would you like?" heading/subtitle, teal-border staff cards, "Any available" card, bottom action bar | Task 5 |
| Step 2: "When works for you?", side-by-side calendar + slots, 4-col slot grid, plain period labels, bottom bar | Task 6 |
| Step 3: "Confirm & pay", 2-col layout, payment method radios, price breakdown, bottom bar | Task 7 |
| All buttons use `sevacam-primary-button` / `sevacam-secondary-button` | Every task |
| No new border radii or color tokens | Every task |
| Zero logic/routing/API changes | All tasks preserve existing handlers and state |
