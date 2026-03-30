# Reviews & Feedback Feature — Design Spec
Date: 2026-03-30

## Overview

Add a minimal customer-facing reviews feature to the existing booking system. Customers can leave a star rating (1–5) and optional comment on completed bookings. Reviews are displayed in a summary section on the service detail page.

The database table (`reviews`), Pydantic schemas (`ReviewCreate`, `ReviewResponse`), and the admin list endpoint (`GET /api/admin/reviews`) already exist. This feature wires up the customer-facing submission and public display only.

---

## Scope

**In scope:**
- Customer submits a review from their completed booking (inline dialog on `/bookings`)
- Public service review summary on `/book/[serviceId]` (avg rating, count, recent reviews list)
- Backend: `POST /api/reviews` and `GET /api/services/{service_id}/reviews`
- Extending booking list response to include `review: { id, rating } | null`

**Out of scope:**
- Edit / delete reviews
- Moderation UI (approve/reject)
- Replies or threaded feedback
- Media uploads
- Admin-visible toggle (exists in admin UI but backend endpoint deferred)
- DB unique constraint on `booking_id` (noted as a future hardening step)

---

## Backend

### `POST /api/reviews`

- **Auth:** customer session token required
- **Body:** `{ booking_id: str, rating: int, comment: str | null }`
- **Validations (in order):**
  1. Booking exists → 404 if not
  2. Booking belongs to authenticated customer → 403 if not
  3. Booking status is `"completed"` → 400 with message "Only completed bookings can be reviewed"
  4. No review already exists for this booking → 400 with message "This booking has already been reviewed"
- **On success:**
  - Insert review with `is_approved = true` (auto-approved; no moderation flow yet)
  - Return `ReviewResponse`
- **Rating validation:** must be integer 1–5. Requires updating `ReviewCreate` in `backend/app/models/schemas.py` — change `rating: int` to `rating: int = Field(..., ge=1, le=5)`. No DB migration needed; this is a schema-only change.
- **Comment:** optional, no length limit enforced at API level

### `GET /api/services/{service_id}/reviews`

- **Auth:** none (public)
- **Response:**
  ```json
  {
    "average_rating": 4.3 | null,
    "review_count": 12,
    "reviews": [
      {
        "rating": 5,
        "comment": "Great service!",
        "created_at": "2026-03-15T10:00:00Z",
        "customer_name": "Jane D."
      }
    ]
  }
  ```
- **Logic:**
  - Filter `reviews` joined to `bookings` where `bookings.service_id = {service_id}` and `reviews.is_approved = true`
  - `average_rating`: computed from approved reviews only; returns `null` (not `0`) when `review_count = 0`
  - `review_count`: count of approved reviews
  - `reviews`: last 10 approved reviews, ordered by `created_at DESC`
  - `customer_name`: first name + last initial (e.g. "Jane D.") from customer record

### Extend `GET /api/bookings` (customer list)

- Add `review: { id: str, rating: int } | null` to each booking object in the list response
- Left-join `reviews` on `booking_id` when fetching the customer's booking list
- Used by the frontend to determine badge vs. button state without a separate fetch
- **Schema change required:** Add a `BookingReviewSummary` Pydantic model and a `review` field to `BookingWithDetails` in `backend/app/models/schemas.py`:
  ```python
  class BookingReviewSummary(BaseModel):
      id: str
      rating: int

  class BookingWithDetails(BookingResponse):
      ...existing fields...
      review: Optional[BookingReviewSummary] = None
  ```
  Without this, FastAPI will not serialize the `review` field in the response.

### New reviews router

- `POST /api/reviews` will live in a new file `backend/app/api/reviews.py`
- The router must be registered in the FastAPI app startup (e.g., `main.py` or wherever existing routers are included)

---

## Frontend

### `/bookings` — Review Submission

**Files:**
- `components/booking/customer-bookings-client.tsx` — owns local booking state; passes `review` data and callback down to cards
- `components/booking/BookingCard.tsx` — renders the per-booking actions; owns the "Leave a Review" button and "Reviewed" badge display

**Responsibility split:**
- `customer-bookings-client.tsx` manages the booking list state array and the `onReviewSubmitted(bookingId, review)` callback that updates it
- `BookingCard.tsx` receives `booking.review` as a prop and renders the button or badge accordingly; opens `ReviewDialog` on button click

- For each booking card where `status === "completed"`:
  - If `booking.review === null`: render a **"Leave a Review"** button
  - If `booking.review !== null`: render a read-only **"Reviewed"** badge showing `booking.review.rating` stars
- Clicking "Leave a Review" opens `ReviewDialog` for that booking

**New component:** `components/booking/ReviewDialog.tsx`

- shadcn `Dialog`
- **Star rating input:** 5 interactive stars (click to select, hover to preview). Required — submit disabled until a star is selected.
- **Comment textarea:** optional, labeled "Add a comment (optional)"
- **Submit button:** shows loading state during request
- **On success:**
  - Close dialog
  - Update local booking state: set `booking.review = { id, rating }` from the returned `ReviewResponse`
  - The booking card re-renders to show the badge immediately (no refetch)
- **On error:** show inline error message below the form (do not close dialog)

### `/book/[serviceId]` — Service Reviews Display

**File:** `app/book/[serviceId]/page.tsx`

- Fetch `GET /api/services/{service_id}/reviews` server-side in the page component (alongside existing service data fetches)
- Pass the result as a prop to `ServiceReviews`

**New component:** `components/booking/ServiceReviews.tsx`

- Read-only, no interactivity
- **If `review_count === 0`:** subtle "No reviews yet" message
- **If reviews exist:**
  - Summary row: numeric average (1 decimal) + star display + count (e.g. "4.3 ★★★★☆ · 12 reviews")
  - List of up to 10 recent reviews: star rating, comment (if any), date (formatted as "Mar 15, 2026")
- Styled consistently with existing shadcn card/text patterns

---

## Data Flow

```
Customer completes booking
  → /bookings shows "Leave a Review" button
  → Opens ReviewDialog
  → POST /api/reviews (validates: owner, completed, no duplicate)
  → is_approved = true on insert
  → Returns ReviewResponse
  → Local state updated: badge shows review.rating stars

Service detail page load (/book/[serviceId])
  → Server fetches GET /api/services/{service_id}/reviews
  → ServiceReviews renders summary + list
```

---

## Constraints & Limitations

- No DB-level unique constraint on `booking_id` in `reviews` (app-level check only for now)
- Auto-approval (`is_approved = true`) — no moderation required for now; admin can view all reviews at `/admin/reviews`
- `average_rating` is `null` when there are no approved reviews (not `0`)
- No pagination on service reviews — returns last 10 only
- Review editing and deletion not supported
- The admin visibility toggle in `/admin/reviews` is UI-only; the backend endpoint for it is not part of this feature
