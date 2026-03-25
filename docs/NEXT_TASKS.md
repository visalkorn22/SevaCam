# Next Tasks Roadmap

This roadmap is now **backend-first**. Frontend changes start only after backend is complete and verified.

## Backend-First Execution Order

1. B0 - Payment sandbox integration (replace mock)
2. B0 - Scheduling logic redesign and endpoint unification
3. B1 - Advanced filtering APIs (including availability and distance-ready schema)
4. B1 - Realistic seed data and media fields
5. B1 - API docs consistency and cleanup
6. B2 - Backend automated tests and release checklist
7. F0 - Frontend integration and UI polish (only after B0-B2 done)

## Backend Definition Of Done (Gate Before Frontend)

All items below must be true before frontend work:

- Payment flow uses real ABA Payway sandbox API (no mock URL generator).
- Scheduling uses one canonical slot engine (`/api/availability/slots-v2`) across backend flows.
- Advanced filter APIs are implemented and documented.
- Seed data is realistic enough for demo (`services`, categories, tags, images).
- Backend tests exist for payments, slots, and filters.
- API docs match actual endpoint behavior and request/response fields.

## B0 Tasks (Do First)

### 1) ABA Payway Sandbox Integration

Goal: Replace mock payment flow with real sandbox flow.

Tasks:

- Replace mock payment URL generation in `backend/app/api/payments.py` with real Payway sandbox request creation.
- Add callback/webhook endpoint for payment status updates.
- Verify callback signatures and enforce idempotency for repeated callbacks.
- Update booking/payment statuses only from verified provider responses.
- Add environment variables and setup notes for sandbox credentials.

Acceptance Criteria:

- Customer can create payment intent and be redirected to sandbox checkout.
- Successful payment updates `payments.status=completed` and booking to paid/confirmed.
- Failed payment updates statuses correctly without false positives.
- Duplicate callbacks do not duplicate updates.

Demo Evidence:

- Screen recording: create booking -> pay in sandbox -> status changes in UI/admin.
- API logs showing verified callback processing.

### 2) Scheduling Logic Redesign + Unification

Goal: Use one source of truth for slot generation and avoid inconsistent results.

Tasks:

- Standardize all backend/internal booking and reschedule flows to one slot engine (`/api/availability/slots-v2`).
- Deprecate old `/api/availability/slots` endpoint usage path.
- Document explicit business rules:
  - timezone handling
  - granularity
  - buffer application
  - min notice and max booking window
  - capacity and overlap behavior
- Validate edge cases (cross-timezone, full capacity, blocked periods).

Acceptance Criteria:

- Booking creation and reschedule backend paths resolve slots from the same engine.
- Given same input, slot results are consistent for all API consumers.
- Rule behavior is documented in `docs/` and matches implementation.

Demo Evidence:

- Side-by-side proof that booking and reschedule return consistent slots.
- Test data showing blocked and available intervals are respected.

## B1 Tasks (Next)

### 3) Advanced Service Filters

Goal: Support teacher-requested filtering depth.

Tasks:

- Extend backend service/availability query model for:
  - service type/category
  - min/max price
  - available date
  - available time window
  - staff/bookable only
- Add distance-ready support:
  - add latitude/longitude to locations
  - compute distance from user coordinates (or external map API)
- Keep API contract ready for frontend consumption (query params and response fields).

Acceptance Criteria:

- Users can combine multiple filters in one query.
- Availability filters return only services with matching slots.
- Distance filter works once location coordinates are seeded.

### 4) Realistic Service Seed Data and Photos

Goal: Make landing/demo data look production-like.

Tasks:

- Expand `scripts/004_seed_data.sql` with 15-20 realistic services.
- Add meaningful categories and tags (not only generic names).
- Populate `image_url`/`image_urls` for service cards and carousel.
- Ensure pricing and durations look realistic for local market context.

Acceptance Criteria:

- Service payloads include diverse categories, tags, price ranges, and image URLs.
- Data quality is sufficient for filters and demo scenarios.

### 5) API Integration Consistency Cleanup

Goal: Ensure documentation/comments match real implementation state.

Tasks:

- Remove outdated comments that imply endpoints are missing.
- Align README/backend docs with actual implemented endpoints.
- Confirm frontend pages use backend APIs consistently (no stale placeholders).

Acceptance Criteria:

- No contradictory docs about implemented APIs.
- Core user flows run through real backend endpoints.

## B2 Tasks (Quality and Stability)

### 6) Add Automated Tests for Critical Paths

Goal: Prevent regressions while shipping P0/P1 changes.

Tasks:

- Add backend tests for:
  - payment callback verification and idempotency
  - slot generation edge cases
  - advanced filter query behavior
- Add at least one integration-style flow test for booking + payment state transitions.

Acceptance Criteria:

- Test suite includes payment, scheduling, and filter coverage.
- CI/local run catches regression scenarios before demo.

## Suggested Backend-First 2-Week Plan

Week 1 (Backend Core):

- Day 1-2: Payway sandbox integration
- Day 3-4: Scheduling unification and rule docs
- Day 5: P0 validation and demo script

Week 2 (Backend Completeness):

- Day 1-2: Advanced filters backend and schema updates
- Day 3: Seed realistic services/photos
- Day 4: Docs/API consistency cleanup
- Day 5: Backend tests + backend signoff

Frontend starts after this point.

## Progress Tracker (Backend First)

- [ ] B0.1 Payway sandbox flow implemented
- [ ] B0.2 Callback verification + idempotency implemented
- [ ] B0.3 Scheduling unified to slots-v2
- [ ] B1.1 Advanced filters API shipped
- [ ] B1.2 Distance-ready location model shipped
- [ ] B1.3 Realistic service/photo seed completed
- [ ] B1.4 API docs and comments aligned
- [ ] B2.1 Critical backend tests added
- [ ] B2.2 Backend Definition Of Done passed
- [ ] F0.1 Frontend work started

## Notes for Next Progress Demo (Backend Milestone)

Show these 4 things in order:

1. End-to-end payment in sandbox.
2. Correct slot behavior under schedule constraints.
3. Advanced filtering (including availability and price).
4. Realistic backend seed payloads with diverse services/photos.
