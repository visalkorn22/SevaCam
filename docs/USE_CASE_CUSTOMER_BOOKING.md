# Customer Booking Use Case Diagram

This version matches the implemented project more closely and avoids the common UML mistakes in the current diagram.

## Why the old diagram looked wrong

1. `Guest` should not create, reschedule, or cancel bookings in this project.
   The booking page redirects unauthenticated users to login first.

2. `Reschedule Booking` is not an extension of `Cancel Booking`.
   In the code, rescheduling is a separate update flow that checks availability again.

3. `Login` should not be included by every use case.
   It is cleaner to model `Log In` as a guest use case, while customer-only actions already assume an authenticated user.

4. `Receive Confirmation Email` is better treated as a system response, not a main customer goal, in a focused customer booking diagram.

5. `Make Payment (Bakong KHQR)` is too specific.
   The project supports multiple providers, so the use case should be `Make Payment`.

## Evidence from the project

- Guests can browse services: `app/services/page.tsx`
- Booking requires login: `app/book/[serviceId]/page.tsx:165`
- Booking is created from the booking form: `components/booking/booking-form.tsx:920`
- After booking, the user is sent to payment: `components/booking/booking-form.tsx:938`
- Waitlist is available when no slot is suitable: `components/booking/booking-form.tsx:961`
- Customers can reschedule bookings: `components/booking/customer-bookings-client.tsx:344`
- Customers can cancel bookings: `components/booking/customer-bookings-client.tsx:375`
- Payment supports ABA PayWay, Bakong KHQR, and Stripe: `components/payment/payment-form.tsx:362`
- Reviews are only allowed after a completed booking: `backend/app/api/reviews.py:18`

## Recommended scope

Use this diagram only for the customer booking flow.

If your teacher wants the whole system, make separate diagrams for:

- Customer
- Staff
- Admin

That will look more natural than forcing every actor into one crowded diagram.

## Diagram source

PlantUML source: `docs/USE_CASE_CUSTOMER_BOOKING.puml`
