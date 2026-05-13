# Admin System Management Use Case Diagram

This version matches the implemented admin features more closely and fixes the UML relationships.

## Main corrections

1. `Create Service`, `Edit Service`, and `Delete Service` should not `<<extend>>` `Manage Services`.
   They are core admin actions under service management, not optional extensions in the way your diagram shows.

2. `Delete Service` should be renamed to `Archive Service`.
   The current implementation archives services instead of deleting them.

3. `View All Bookings` should not `<<include>>` `Manage Staff Accounts`.
   These are different admin tasks with no direct dependency.

4. `Manage Locations` should not point to `Assign Staff to Services`.
   They are separate management areas.

5. `Manage Staff Accounts` is too narrow for this project.
   The admin page manages customer, staff, and administrator accounts, so `Manage User Accounts` is more accurate.

6. `Send Manual Notification` should be used carefully.
   The backend supports sending notifications for a booking, but if your submitted diagram is based only on visible admin pages, you can remove this use case.

## Evidence from the project

- Admin services page: `app/admin/services/page.tsx`
- Service creation page: `app/admin/services/new/page.tsx`
- Service edit page: `app/admin/services/[serviceId]/edit/page.tsx`
- Archive service button: `app/admin/services/DeleteServiceButton.tsx`
- Staff assignment UI: `app/admin/services/ServiceStaffAssignments.tsx`
- Operating schedule UI: `app/admin/services/ServiceOperatingSchedule.tsx`
- Locations management: `app/admin/locations/page.tsx`
- User account management: `app/admin/staff/page.tsx`
- Booking management: `app/admin/bookings/page.tsx`
- Notification API: `backend/app/api/notifications.py`

## Recommended structure

Use these high-level admin use cases:

- Manage Services
- Manage Locations
- Manage User Accounts
- Manage Bookings
- Send Notification

Under `Manage Services`, show:

- Create Service
- Edit Service
- Archive Service
- Assign Staff to Service
- Manage Operating Schedules

Under `Manage Bookings`, show:

- View All Bookings
- Reschedule Booking
- Cancel Booking
- Update Booking Status

## Important note

A use case diagram is not a flowchart.

Do not connect unrelated use cases just to show sequence. Only use `<<include>>` when a larger use case always uses a smaller one, and use `<<extend>>` only for a true optional extension.

## Diagram source

PlantUML source: `docs/USE_CASE_ADMIN_SYSTEM_MANAGEMENT.puml`
