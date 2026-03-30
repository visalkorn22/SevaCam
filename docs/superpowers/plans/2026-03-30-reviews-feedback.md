# Reviews & Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add customer review submission (from completed bookings) and public service review display (on the service detail page).

**Architecture:** Extend the existing `reviews` table (already in DB) with two new API endpoints — `POST /api/reviews` in a new router and `GET /api/services/{service_id}/reviews` added to the services router — then wire up a submission dialog on the booking list and a read-only summary on the service detail page.

**Tech Stack:** FastAPI + SQLAlchemy (raw SQL), Pydantic v2, Next.js 16 App Router, TypeScript, shadcn/ui (Dialog, Button, Textarea, Badge).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `backend/app/models/schemas.py` | Add `BookingReviewSummary`, `Field` import; extend `BookingWithDetails`; tighten `ReviewCreate.rating` |
| Create | `backend/app/api/reviews.py` | `POST /api/reviews` route |
| Modify | `backend/app/main.py` | Register reviews router |
| Modify | `backend/app/api/services.py` | Add `GET /{service_id}/reviews` endpoint |
| Modify | `backend/app/api/bookings.py` | LEFT JOIN reviews in `get_bookings`; build nested `review` object |
| Create | `backend/tests/test_reviews.py` | Unit tests for POST /api/reviews validation |
| Create | `components/booking/ReviewDialog.tsx` | Star-rating dialog, submit to API, call onSuccess |
| Modify | `components/booking/BookingCard.tsx` | Add `review` prop, `onReviewSubmit` callback, button/badge |
| Modify | `components/booking/customer-bookings-client.tsx` | Add `review` to `BookingRow`, dialog state, `onReviewSubmitted` |
| Create | `components/booking/ServiceReviews.tsx` | Read-only rating summary + recent reviews list |
| Modify | `app/book/[serviceId]/page.tsx` | Server-fetch reviews, pass to `ServiceReviews` |

---

## Task 1: Pydantic Schema Changes

**Files:**
- Modify: `backend/app/models/schemas.py`

- [ ] **Step 1: Update the import line at the top of schemas.py**

Open `backend/app/models/schemas.py`. Line 1 currently reads:
```python
from pydantic import BaseModel, EmailStr
```
Change it to:
```python
from pydantic import BaseModel, EmailStr, Field
```

- [ ] **Step 2: Add `BookingReviewSummary` model and `review` field to `BookingWithDetails`**

Currently (around line 445):
```python
class BookingWithDetails(BookingResponse):
    service_name: Optional[str] = None
    staff_name: Optional[str] = None
    customer_name: Optional[str] = None
    service_price: Optional[Decimal] = None
```
Replace with:
```python
class BookingReviewSummary(BaseModel):
    id: str
    rating: int

class BookingWithDetails(BookingResponse):
    service_name: Optional[str] = None
    staff_name: Optional[str] = None
    customer_name: Optional[str] = None
    service_price: Optional[Decimal] = None
    review: Optional[BookingReviewSummary] = None
```

- [ ] **Step 3: Tighten `ReviewCreate.rating` validation**

Currently (around line 520):
```python
class ReviewCreate(BaseModel):
    booking_id: str
    rating: int  # 1-5
    comment: Optional[str] = None
```
Replace with:
```python
class ReviewCreate(BaseModel):
    booking_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
```

- [ ] **Step 4: Verify the module imports cleanly**

```bash
cd /c/Personal/Y4T1/Internship/Dev/booking-schedule-system/backend
python -c "from app.models.schemas import BookingReviewSummary, BookingWithDetails, ReviewCreate; print('OK')"
```
Expected output: `OK`

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/schemas.py
git commit -m "feat(reviews): add BookingReviewSummary schema and tighten ReviewCreate rating validation"
```

---

## Task 2: POST /api/reviews Endpoint

**Files:**
- Create: `backend/app/api/reviews.py`
- Create: `backend/tests/test_reviews.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_reviews.py`:

```python
"""
Unit tests for POST /api/reviews.
All DB calls are mocked — no real database needed.
"""
import os
import sys
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")

from app.core.database import get_db
from app.core.auth import get_current_user

# ── Fake row helper ──────────────────────────────────────────────────────────

class FakeRow:
    """Minimal stand-in for a SQLAlchemy Row."""
    def __init__(self, **kwargs):
        self._mapping = kwargs
    def __bool__(self):
        return True


def make_db(*fetchone_sequence):
    """
    Returns a mock db whose successive execute().fetchone() calls yield
    each item in fetchone_sequence.
    None means the query returned no row.
    """
    mock_db = MagicMock()
    calls = iter(fetchone_sequence)

    def _execute(*args, **kwargs):
        result = MagicMock()
        result.fetchone.return_value = next(calls, None)
        return result

    mock_db.execute.side_effect = _execute
    return mock_db


# ── Test app ─────────────────────────────────────────────────────────────────

def make_test_app(mock_db, mock_user):
    from app.api.reviews import router
    app = FastAPI()
    app.include_router(router, prefix="/api/reviews")
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_user
    return app


CUSTOMER_USER = {
    "id": "user-1",
    "role": "customer",
    "email": "test@example.com",
    "is_active": True,
    "email_verified": True,
}

VALID_PAYLOAD = {"booking_id": "booking-1", "rating": 5, "comment": "Great!"}

CUSTOMER_ROW     = FakeRow(id="customer-1")
BOOKING_ROW      = FakeRow(id="booking-1", customer_id="customer-1", status="completed")
NO_REVIEW_ROW    = None   # no existing review
INSERTED_REVIEW  = FakeRow(
    id="review-1",
    booking_id="booking-1",
    rating=5,
    comment="Great!",
    is_approved=True,
    created_at="2026-03-30T10:00:00",
)


# ── Tests ────────────────────────────────────────────────────────────────────

def test_returns_403_when_no_customer_profile():
    db = make_db(None)  # customers query returns nothing
    client = TestClient(make_test_app(db, CUSTOMER_USER))
    res = client.post("/api/reviews/", json=VALID_PAYLOAD)
    assert res.status_code == 403
    assert "Customer profile not found" in res.json()["detail"]


def test_returns_404_when_booking_not_found():
    db = make_db(CUSTOMER_ROW, None)  # customer found, booking not found
    client = TestClient(make_test_app(db, CUSTOMER_USER))
    res = client.post("/api/reviews/", json=VALID_PAYLOAD)
    assert res.status_code == 404
    assert "Booking not found" in res.json()["detail"]


def test_returns_403_when_booking_belongs_to_different_customer():
    other_booking = FakeRow(id="booking-1", customer_id="other-customer", status="completed")
    db = make_db(CUSTOMER_ROW, other_booking)
    client = TestClient(make_test_app(db, CUSTOMER_USER))
    res = client.post("/api/reviews/", json=VALID_PAYLOAD)
    assert res.status_code == 403
    assert "own bookings" in res.json()["detail"]


def test_returns_400_when_booking_not_completed():
    pending_booking = FakeRow(id="booking-1", customer_id="customer-1", status="confirmed")
    db = make_db(CUSTOMER_ROW, pending_booking)
    client = TestClient(make_test_app(db, CUSTOMER_USER))
    res = client.post("/api/reviews/", json=VALID_PAYLOAD)
    assert res.status_code == 400
    assert "completed" in res.json()["detail"]


def test_returns_400_when_review_already_exists():
    existing_review = FakeRow(id="existing-review")
    db = make_db(CUSTOMER_ROW, BOOKING_ROW, existing_review)
    client = TestClient(make_test_app(db, CUSTOMER_USER))
    res = client.post("/api/reviews/", json=VALID_PAYLOAD)
    assert res.status_code == 400
    assert "already been reviewed" in res.json()["detail"]


def test_returns_422_when_rating_out_of_range():
    db = make_db(CUSTOMER_ROW, BOOKING_ROW, NO_REVIEW_ROW, None, INSERTED_REVIEW)
    client = TestClient(make_test_app(db, CUSTOMER_USER))
    res = client.post("/api/reviews/", json={"booking_id": "booking-1", "rating": 6})
    assert res.status_code == 422


def test_creates_review_and_returns_response():
    db = make_db(CUSTOMER_ROW, BOOKING_ROW, NO_REVIEW_ROW, None, INSERTED_REVIEW)
    client = TestClient(make_test_app(db, CUSTOMER_USER))
    res = client.post("/api/reviews/", json=VALID_PAYLOAD)
    assert res.status_code == 200
    body = res.json()
    assert body["id"] == "review-1"
    assert body["rating"] == 5
    assert body["is_approved"] is True
```

- [ ] **Step 2: Run the tests — expect them to fail with import error**

```bash
cd /c/Personal/Y4T1/Internship/Dev/booking-schedule-system/backend
python -m pytest tests/test_reviews.py -v 2>&1 | head -30
```
Expected: `ImportError` or `ModuleNotFoundError` for `app.api.reviews` (doesn't exist yet).

- [ ] **Step 3: Create `backend/app/api/reviews.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.schemas import ReviewCreate, ReviewResponse
import uuid

router = APIRouter()


@router.post("/", response_model=ReviewResponse)
async def create_review(
    review: ReviewCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit a review for a completed booking. Customers only; one review per booking."""
    if current_user.get("role") != "customer":
        raise HTTPException(status_code=403, detail="Only customers can submit reviews")

    # Resolve the customer record from the authenticated user
    customer_row = db.execute(
        text("SELECT id FROM customers WHERE user_id = :uid"),
        {"uid": current_user["id"]},
    ).fetchone()
    if not customer_row:
        raise HTTPException(status_code=403, detail="Customer profile not found")
    customer_id = str(dict(customer_row._mapping)["id"])

    # Fetch the booking
    booking_row = db.execute(
        text("SELECT id, customer_id, status FROM bookings WHERE id = :id"),
        {"id": review.booking_id},
    ).fetchone()
    if not booking_row:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking = dict(booking_row._mapping)

    # Ownership check
    if str(booking["customer_id"]) != customer_id:
        raise HTTPException(status_code=403, detail="You can only review your own bookings")

    # Status check
    if booking["status"] != "completed":
        raise HTTPException(status_code=400, detail="Only completed bookings can be reviewed")

    # Duplicate check
    existing = db.execute(
        text("SELECT id FROM reviews WHERE booking_id = :bid"),
        {"bid": review.booking_id},
    ).fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="This booking has already been reviewed")

    # Insert — auto-approved (no moderation flow yet)
    review_id = str(uuid.uuid4())
    db.execute(
        text(
            """
            INSERT INTO reviews (id, booking_id, rating, comment, is_approved, created_at)
            VALUES (:id, :booking_id, :rating, :comment, true, NOW())
            """
        ),
        {
            "id": review_id,
            "booking_id": review.booking_id,
            "rating": review.rating,
            "comment": review.comment,
        },
    )
    db.commit()

    # Fetch and return the created review
    row = db.execute(
        text(
            "SELECT id, booking_id, rating, comment, is_approved, created_at "
            "FROM reviews WHERE id = :id"
        ),
        {"id": review_id},
    ).fetchone()
    return dict(row._mapping)
```

- [ ] **Step 4: Run the tests — all should pass**

```bash
cd /c/Personal/Y4T1/Internship/Dev/booking-schedule-system/backend
python -m pytest tests/test_reviews.py -v
```
Expected: 7 tests pass, 0 failures.

- [ ] **Step 5: Register the reviews router in `main.py`**

Open `backend/app/main.py`. In the `if settings.FEATURE_SET == "full":` block (around line 29), add `reviews` to the import and register its router:

```python
if settings.FEATURE_SET == "full":
    from app.api import bookings, payments, notifications, analytics, customers, waitlist, reviews

    app.include_router(bookings.router, prefix="/api/bookings")
    app.include_router(payments.router, prefix="/api/payments")
    app.include_router(notifications.router, prefix="/api/notifications")
    app.include_router(analytics.router, prefix="/api/analytics")
    app.include_router(customers.router)
    app.include_router(waitlist.router, prefix="/api/waitlist")
    app.include_router(reviews.router, prefix="/api/reviews")
```

- [ ] **Step 6: Verify the app starts**

```bash
cd /c/Personal/Y4T1/Internship/Dev/booking-schedule-system/backend
python -c "from app.main import app; print('startup OK')"
```
Expected: `startup OK`

- [ ] **Step 7: Commit**

```bash
git add backend/app/api/reviews.py backend/tests/test_reviews.py backend/app/main.py
git commit -m "feat(reviews): add POST /api/reviews endpoint with validation and tests"
```

---

## Task 3: GET /api/services/{service_id}/reviews Endpoint

**Files:**
- Modify: `backend/app/api/services.py`

- [ ] **Step 1: Add the endpoint to `services.py`**

Open `backend/app/api/services.py`. Add this helper and endpoint at the bottom of the file (before the last line if there is one, or just append):

```python
def _format_customer_name(full_name: str | None) -> str:
    """Return 'First L.' format for privacy, e.g. 'Jane D.'"""
    if not full_name:
        return "Customer"
    parts = full_name.strip().split()
    if len(parts) == 1:
        return parts[0]
    return f"{parts[0]} {parts[-1][0]}."


@router.get("/{service_id}/reviews")
async def get_service_reviews(service_id: str, db: Session = Depends(get_db)):
    """Public endpoint: approved review summary for a service."""
    agg_row = db.execute(
        text(
            """
            SELECT COUNT(*) AS review_count, AVG(r.rating) AS average_rating
            FROM reviews r
            JOIN bookings b ON r.booking_id = b.id
            WHERE b.service_id = :service_id AND r.is_approved = true
            """
        ),
        {"service_id": service_id},
    ).fetchone()

    review_count = int(agg_row[0]) if agg_row else 0
    raw_avg = agg_row[1] if agg_row else None
    average_rating = round(float(raw_avg), 1) if raw_avg is not None else None

    rows = db.execute(
        text(
            """
            SELECT r.rating, r.comment, r.created_at, c.full_name
            FROM reviews r
            JOIN bookings b ON r.booking_id = b.id
            JOIN customers c ON b.customer_id = c.id
            WHERE b.service_id = :service_id AND r.is_approved = true
            ORDER BY r.created_at DESC
            LIMIT 10
            """
        ),
        {"service_id": service_id},
    ).fetchall()

    reviews = [
        {
            "rating": row[0],
            "comment": row[1],
            "created_at": row[2].isoformat() if hasattr(row[2], "isoformat") else str(row[2]),
            "customer_name": _format_customer_name(row[3]),
        }
        for row in rows
    ]

    return {
        "average_rating": average_rating,
        "review_count": review_count,
        "reviews": reviews,
    }
```

Also add `text` to the existing sqlalchemy import at the top of `services.py`. The current import is:
```python
from sqlalchemy import text
```
(Already present — no change needed.)

- [ ] **Step 2: Verify the module imports cleanly**

```bash
cd /c/Personal/Y4T1/Internship/Dev/booking-schedule-system/backend
python -c "from app.api.services import router; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/services.py
git commit -m "feat(reviews): add GET /api/services/{id}/reviews public endpoint"
```

---

## Task 4: Extend GET /api/bookings with Review Data

**Files:**
- Modify: `backend/app/api/bookings.py`

- [ ] **Step 1: Update the SQL query in `get_bookings`**

Open `backend/app/api/bookings.py`. Find `get_bookings` (around line 963). The query currently is:

```python
    query = """
        SELECT b.*, s.name as service_name, s.price as service_price,
               u.full_name as staff_name, c.full_name as customer_name
        FROM bookings b
        LEFT JOIN services s ON b.service_id = s.id
        LEFT JOIN users u ON b.staff_id = u.id
        LEFT JOIN customers c ON b.customer_id = c.id
        WHERE 1=1
    """
```

Replace with:

```python
    query = """
        SELECT b.*, s.name as service_name, s.price as service_price,
               u.full_name as staff_name, c.full_name as customer_name,
               r.id as review_id, r.rating as review_rating
        FROM bookings b
        LEFT JOIN services s ON b.service_id = s.id
        LEFT JOIN users u ON b.staff_id = u.id
        LEFT JOIN customers c ON b.customer_id = c.id
        LEFT JOIN reviews r ON r.booking_id = b.id
        WHERE 1=1
    """
```

- [ ] **Step 2: Update the return statement to build the nested `review` object**

Currently at the bottom of `get_bookings` (around line 1021):

```python
    result = db.execute(query, params)
    bookings = result.fetchall()
    return [dict(row._mapping) for row in bookings]
```

Replace with:

```python
    result = db.execute(query, params)
    bookings = result.fetchall()
    rows = []
    for row in bookings:
        d = dict(row._mapping)
        review_id = d.pop("review_id", None)
        review_rating = d.pop("review_rating", None)
        d["review"] = (
            {"id": str(review_id), "rating": int(review_rating)}
            if review_id is not None
            else None
        )
        rows.append(d)
    return rows
```

- [ ] **Step 3: Verify the module imports cleanly**

```bash
cd /c/Personal/Y4T1/Internship/Dev/booking-schedule-system/backend
python -c "from app.api.bookings import router; print('OK')"
```
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/bookings.py
git commit -m "feat(reviews): include review summary in GET /api/bookings response"
```

---

## Task 5: ReviewDialog Component

**Files:**
- Create: `components/booking/ReviewDialog.tsx`

- [ ] **Step 1: Create the component**

Create `components/booking/ReviewDialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  serviceName: string;
  onSuccess: (review: { id: string; rating: number }) => void;
}

export function ReviewDialog({
  open,
  onOpenChange,
  bookingId,
  serviceName,
  onSuccess,
}: ReviewDialogProps) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const [rating, setRating] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = (nextOpen: boolean) => {
    if (!loading) onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (!rating) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/reviews/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          rating,
          comment: comment.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(data.detail ?? "Failed to submit review");
      }
      const data = (await res.json()) as { id: string; rating: number };
      onSuccess({ id: data.id, rating: data.rating });
      onOpenChange(false);
      // Reset for potential re-open
      setRating(null);
      setComment("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  const displayRating = hovered ?? rating ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Leave a Review</DialogTitle>
          <p className="text-sm text-muted-foreground">{serviceName}</p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Star rating */}
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              Rating{" "}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </p>
            <div className="flex gap-0.5" role="group" aria-label="Star rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  aria-label={`${star} star${star !== 1 ? "s" : ""}`}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setRating(star)}
                  className={cn(
                    "text-3xl leading-none transition-colors duration-100",
                    displayRating >= star
                      ? "text-amber-400"
                      : "text-muted-foreground/25",
                  )}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label
              htmlFor="review-comment"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Comment{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <Textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How was your experience?"
              className="resize-none"
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!rating || loading}>
            {loading ? "Submitting…" : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/booking/ReviewDialog.tsx
git commit -m "feat(reviews): add ReviewDialog component with star rating input"
```

---

## Task 6: Update BookingCard and customer-bookings-client

**Files:**
- Modify: `components/booking/BookingCard.tsx`
- Modify: `components/booking/customer-bookings-client.tsx`

- [ ] **Step 1: Add `review` prop and `onReviewSubmit` to `BookingCard`**

Open `components/booking/BookingCard.tsx`.

**6.1a** — Add to `BookingCardProps` interface (after `onViewDetails`):

The current interface ends with:
```tsx
  onBook?: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
  onViewDetails?: () => void;
}
```
Replace with:
```tsx
  onBook?: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
  onViewDetails?: () => void;
  review?: { id: string; rating: number } | null;
  onReviewSubmit?: () => void;
}
```

**6.1b** — Destructure the new props in the function signature. The current destructuring ends with:
```tsx
  onBook,
  onEdit,
  onCancel,
  onViewDetails,
}: BookingCardProps) {
```
Replace with:
```tsx
  onBook,
  onEdit,
  onCancel,
  onViewDetails,
  review,
  onReviewSubmit,
}: BookingCardProps) {
```

**6.1c** — Add the review button/badge to the action buttons section. Currently the action buttons `div` (around line 187) ends with:
```tsx
            {(status === "completed" ||
              status === "cancelled" ||
              status === "no-show") &&
              onBook && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBook}
                  className="rounded-full border-border/60 px-5 text-[11px] font-semibold uppercase tracking-[0.15em] hover:bg-muted/50"
                >
                  Book Again
                </Button>
              )}
          </div>
```
Replace with:
```tsx
            {(status === "completed" ||
              status === "cancelled" ||
              status === "no-show") &&
              onBook && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBook}
                  className="rounded-full border-border/60 px-5 text-[11px] font-semibold uppercase tracking-[0.15em] hover:bg-muted/50"
                >
                  Book Again
                </Button>
              )}
            {status === "completed" && !review && onReviewSubmit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReviewSubmit}
                className="rounded-full border-border/60 px-5 text-[11px] font-semibold uppercase tracking-[0.15em] hover:bg-muted/50"
              >
                Leave a Review
              </Button>
            )}
            {status === "completed" && review && (
              <span className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)} Reviewed
              </span>
            )}
          </div>
```

- [ ] **Step 2: Update `customer-bookings-client.tsx`**

Open `components/booking/customer-bookings-client.tsx`.

**6.2a** — Add `review` to the `BookingRow` type. Currently:
```tsx
type BookingRow = {
  id: string;
  service_id: string;
  staff_id: string;
  customer_id: string;
  start_time_utc: string;
  end_time_utc: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no-show";
  payment_status: string;
  booking_source: string;
  customer_timezone: string;
  created_at: string;
  service_name?: string | null;
  staff_name?: string | null;
  customer_name?: string | null;
  service_price?: number | string | null;
};
```
Replace with:
```tsx
type BookingReviewSummary = {
  id: string;
  rating: number;
};

type BookingRow = {
  id: string;
  service_id: string;
  staff_id: string;
  customer_id: string;
  start_time_utc: string;
  end_time_utc: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no-show";
  payment_status: string;
  booking_source: string;
  customer_timezone: string;
  created_at: string;
  service_name?: string | null;
  staff_name?: string | null;
  customer_name?: string | null;
  service_price?: number | string | null;
  review?: BookingReviewSummary | null;
};
```

**6.2b** — Add imports for `ReviewDialog` and dialog state. At the top of the file, after the existing imports:
```tsx
import { ReviewDialog } from "@/components/booking/ReviewDialog";
```

**6.2c** — Add `reviewBooking` state. After the existing state declarations (after the `rebookLoadingId` state, around line 137):
```tsx
  const [reviewBooking, setReviewBooking] = useState<BookingRow | null>(null);
```

**6.2d** — Add the `onReviewSubmitted` handler. After the existing `loadBookings` function, add:
```tsx
  const onReviewSubmitted = (
    bookingId: string,
    review: BookingReviewSummary,
  ) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, review } : b)),
    );
    setReviewBooking(null);
  };
```

**6.2e** — Pass `review` and `onReviewSubmit` to `BookingCard`. Find the `<BookingCard` render (around line 407) and add the two new props:

Current `<BookingCard` call:
```tsx
            <BookingCard
              key={booking.id}
              id={booking.id}
              serviceName={booking.service_name || "Service"}
              date={formatDate(booking.start_time_utc)}
              time={formatTime(booking.start_time_utc)}
              price={Number(booking.service_price || 0)}
              status={booking.status}
              providerName={booking.staff_name || "Staff"}
              onViewDetails={() => openDetails(booking)}
              onEdit={canEdit ? () => openReschedule(booking) : undefined}
              onCancel={canEdit ? () => setCancelBooking(booking) : undefined}
              onBook={canBookAgain ? () => handleRebook(booking) : undefined}
            />
```
Replace with:
```tsx
            <BookingCard
              key={booking.id}
              id={booking.id}
              serviceName={booking.service_name || "Service"}
              date={formatDate(booking.start_time_utc)}
              time={formatTime(booking.start_time_utc)}
              price={Number(booking.service_price || 0)}
              status={booking.status}
              providerName={booking.staff_name || "Staff"}
              onViewDetails={() => openDetails(booking)}
              onEdit={canEdit ? () => openReschedule(booking) : undefined}
              onCancel={canEdit ? () => setCancelBooking(booking) : undefined}
              onBook={canBookAgain ? () => handleRebook(booking) : undefined}
              review={booking.review ?? null}
              onReviewSubmit={
                booking.status === "completed" && !booking.review
                  ? () => setReviewBooking(booking)
                  : undefined
              }
            />
```

**6.2f** — Add `<ReviewDialog>` to the JSX. Find the `return (` of `CustomerBookingsClient`. At the very end of the returned JSX, just before the final closing `</div>`, add the dialog:

The current end of the return (around line 478+) has a `</div>` closing the outer wrapper. Add the `ReviewDialog` just before the last `</div>`:

```tsx
      {reviewBooking && (
        <ReviewDialog
          open={reviewBooking !== null}
          onOpenChange={(open) => { if (!open) setReviewBooking(null); }}
          bookingId={reviewBooking.id}
          serviceName={reviewBooking.service_name || "Service"}
          onSuccess={(review) => onReviewSubmitted(reviewBooking.id, review)}
        />
      )}
```

- [ ] **Step 3: Commit**

```bash
git add components/booking/BookingCard.tsx components/booking/customer-bookings-client.tsx
git commit -m "feat(reviews): wire up review button/badge on BookingCard and ReviewDialog in booking list"
```

---

## Task 7: ServiceReviews Component and Book Page

**Files:**
- Create: `components/booking/ServiceReviews.tsx`
- Modify: `app/book/[serviceId]/page.tsx`

- [ ] **Step 1: Create `ServiceReviews.tsx`**

Create `components/booking/ServiceReviews.tsx`:

```tsx
import { format } from "date-fns";

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
    <span aria-label={`${rating} out of ${max} stars`} className="text-amber-400">
      {"★".repeat(filled)}
      {"☆".repeat(max - filled)}
    </span>
  );
}

export function ServiceReviews({ data }: { data: ServiceReviewsData | null }) {
  if (!data || data.review_count === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
        <h2 className="text-sm font-semibold text-foreground">Reviews</h2>
        <p className="mt-2 text-sm text-muted-foreground">No reviews yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
      <h2 className="text-sm font-semibold text-foreground">Reviews</h2>

      {/* Summary row */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-2xl font-semibold text-foreground">
          {data.average_rating?.toFixed(1)}
        </span>
        <StarDisplay rating={data.average_rating ?? 0} />
        <span className="text-xs text-muted-foreground">
          · {data.review_count} review{data.review_count !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Reviews list */}
      <div className="mt-4 space-y-3">
        {data.reviews.map((review, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/40 bg-background/60 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <StarDisplay rating={review.rating} />
              <span className="text-xs text-muted-foreground">
                {review.customer_name} ·{" "}
                {format(new Date(review.created_at), "MMM d, yyyy")}
              </span>
            </div>
            {review.comment && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {review.comment}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add server-side reviews fetch to `app/book/[serviceId]/page.tsx`**

Open `app/book/[serviceId]/page.tsx`.

**7.2a** — Add the import for `ServiceReviews` and its type at the top, after the existing imports:
```tsx
import { ServiceReviews, type ServiceReviewsData } from "@/components/booking/ServiceReviews";
```

**7.2b** — Add the `getServiceReviews` async function after `getServiceStaff` (around line 103):
```tsx
async function getServiceReviews(serviceId: string): Promise<ServiceReviewsData | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  try {
    const res = await fetch(`${apiUrl}/api/services/${serviceId}/reviews`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as ServiceReviewsData;
  } catch {
    return null;
  }
}
```

**7.2c** — Call `getServiceReviews` in `BookServicePage`. In the function body, after `const staff = await getServiceStaff(serviceId);` (around line 142), add:
```tsx
  const reviewsData = await getServiceReviews(serviceId);
```

**7.2d** — Render `<ServiceReviews>` in the left column. In the JSX, the left column has a `<div className="space-y-8 ...">` containing the hero image, title, meta pills, and the inclusions/prep-notes grid. Add `<ServiceReviews>` after the inclusions/prep-notes grid's closing `</div>`. The grid currently ends with (around line 250):
```tsx
            </div>
          </div>
```
The first `</div>` closes the `grid gap-4 md:grid-cols-2` and the second closes the left column. Add the `ServiceReviews` between them:
```tsx
            </div>

            <ServiceReviews data={reviewsData} />
          </div>
```

- [ ] **Step 3: Commit**

```bash
git add components/booking/ServiceReviews.tsx app/book/[serviceId]/page.tsx
git commit -m "feat(reviews): add ServiceReviews component and server-side fetch on service detail page"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ `POST /api/reviews` — Task 2
- ✅ `ReviewCreate` rating `ge=1, le=5` — Task 1
- ✅ `BookingReviewSummary` + `BookingWithDetails.review` — Task 1
- ✅ Booking ownership check — Task 2, step 3
- ✅ Completed status check — Task 2, step 3
- ✅ Duplicate review check — Task 2, step 3
- ✅ `is_approved = true` on insert — Task 2, step 3
- ✅ `GET /api/services/{id}/reviews` — Task 3
- ✅ `average_rating: null` when no reviews — Task 3 (`raw_avg is not None` guard)
- ✅ Last 10 approved reviews — Task 3
- ✅ `customer_name` formatted as "First L." — Task 3 (`_format_customer_name`)
- ✅ Extend `GET /api/bookings` with `review` field — Task 4
- ✅ Router registered in `main.py` under `FEATURE_SET == "full"` — Task 2
- ✅ `ReviewDialog` — Task 5
- ✅ "Leave a Review" button on completed bookings with no review — Task 6
- ✅ Read-only "Reviewed ★★★★★" badge after submit — Task 6
- ✅ Local state update on success (no refetch) — Task 6
- ✅ `ServiceReviews` component — Task 7
- ✅ Server-side fetch on `app/book/[serviceId]/page.tsx` — Task 7

**Type consistency:**
- `BookingReviewSummary` defined in `schemas.py` (Task 1) and mirrored as a local type `BookingReviewSummary` in `customer-bookings-client.tsx` (Task 6) — both have `{ id: string; rating: number }` shape ✅
- `ServiceReviewsData` exported from `ServiceReviews.tsx` and imported in `page.tsx` ✅
- `ReviewDialog.onSuccess` signature is `(review: { id: string; rating: number }) => void` and `onReviewSubmitted` accepts `BookingReviewSummary` which has same shape ✅
