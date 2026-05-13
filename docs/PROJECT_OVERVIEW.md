# Booking Schedule System — Project Overview

A full-stack appointment booking platform for service-based businesses. Customers browse services and book appointments; staff manage their schedules; admins control everything from a single dashboard.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Architecture](#architecture)
3. [Features by Role](#features-by-role)
4. [Database Schema](#database-schema)
5. [API Routes](#api-routes)
6. [Frontend Pages](#frontend-pages)
7. [Environment Variables](#environment-variables)
8. [Running the Project](#running-the-project)
9. [Key Conventions](#key-conventions)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui |
| Backend | FastAPI (Python), SQLAlchemy 2.0, Alembic |
| Database | PostgreSQL (hosted on Supabase) |
| Auth | Custom FastAPI session tokens via httpOnly cookies |
| Payments | ABA Payway (primary), Bakong KHQR, Stripe (optional) |
| Charts | Recharts |
| Validation | Zod (frontend), Pydantic (backend) |
| Email | Supabase email infrastructure (data stays in FastAPI) |

---

## Architecture

```
Browser
  │
  ▼
Next.js Frontend (port 3000)
  │  httpOnly cookie: auth_token
  ▼
Next.js API Routes (/app/api/*)   ← proxy layer, forwards cookie
  │
  ▼
FastAPI Backend (port 8000)
  │
  ▼
PostgreSQL (Supabase)
```

**Important rule:** Supabase is used **only** for email delivery. All auth (login, sessions, registration) and all data (bookings, services, payments) go through the FastAPI backend and its own PostgreSQL tables.

### Auth Flow

1. User POSTs credentials → FastAPI `/api/auth/login`
2. FastAPI returns `auth_token` set as an httpOnly cookie
3. Every subsequent request passes the cookie to Next.js API routes
4. Next.js routes proxy the cookie to FastAPI
5. FastAPI resolves the user via `get_current_user` in `backend/app/core/auth.py`

### Roles

| Role | Access |
|---|---|
| `customer` | Book appointments, manage own bookings |
| `staff` | View schedule, manage own availability |
| `admin` | Full management except system config |
| `superadmin` | Everything including system settings |

---

## Features by Role

### Customer
- Browse and filter services by category/location
- Check real-time staff availability
- Book, reschedule, or cancel appointments
- Pay via ABA Payway QR or card
- Receive email/SMS booking confirmations
- Submit reviews and ratings

### Staff
- Personal dashboard with today's schedule
- Weekly availability management (rules + exceptions)
- Earnings and performance tracking
- Submit schedule-change requests to admin

### Admin / Superadmin
- Analytics dashboard: revenue, bookings, staff performance
- Service CRUD (with pricing, duration, category)
- Staff roster management
- Payment history and refund processing
- Booking oversight and modification
- Audit logs for all system actions
- Role and permission management
- Multi-location configuration
- System settings and monitoring

---

## Database Schema

31 tables grouped by domain:

### Auth & Identity
`users` · `user_profiles` · `roles` · `permissions` · `role_permissions` · `sessions` · `password_reset_tokens` · `email_verification_tokens` · `magic_link_tokens`

### Core Domain
`locations` · `services` · `staff_services` · `customers` · `bookings`

### Scheduling
`availability_rules` · `availability_exceptions` · `staff_weekly_schedules` · `staff_work_blocks` · `staff_break_blocks` · `staff_exceptions` · `staff_service_overrides` · `service_operating_schedules` · `service_operating_rules` · `service_operating_exceptions` · `booking_holds`

### Business Logic
`booking_changes` · `booking_logs` · `payments` · `refunds` · `notifications` · `waitlist` · `reviews` · `schedule_change_requests` · `audit_logs`

All tables have Row Level Security (RLS) enforced at the database layer.

> Full schema: `docs/DBDIAGRAM_SCHEMA.dbml`

---

## API Routes

Backend routers live in `backend/app/api/`. Routes are conditionally loaded via the `FEATURE_SET` environment variable.

| Router file | Domain | Feature set |
|---|---|---|
| `auth.py` | Login, registration, password reset, magic links | core |
| `users.py` | User profiles and account management | core |
| `services.py` | Service CRUD, search, filtering | core |
| `staff.py` | Staff profiles, performance metrics | core |
| `availability.py` | Availability rules, time slots, exceptions | core |
| `locations.py` | Multi-location management | core |
| `bookings.py` | Booking lifecycle (create, cancel, modify) | full |
| `payments.py` | ABA Payway, Stripe, Bakong KHQR, refunds | full |
| `analytics.py` | Revenue dashboards, staff stats, daily metrics | full |
| `notifications.py` | Email/SMS delivery logs | full |
| `reviews.py` | Rating and review system | full |
| `waitlist.py` | Waitlist management | full |
| `customers.py` | Customer records | full |
| `admin.py` | Admin role control and user management | full |
| `google_oauth.py` | Google OAuth flow | full |
| `avatar.py` | Profile image uploads | full |
| `telegram.py` | Telegram notification integration | full |

> Full endpoint reference: `docs/API_DOCUMENTATION.md`

**Slot rules:** 15-minute granularity · minimum booking notice 120 min · maximum horizon 90 days

---

## Frontend Pages

### Customer
| Path | Purpose |
|---|---|
| `/auth/login` | Login page |
| `/auth/signup` | Registration |
| `/auth/reset-password` | Password reset |
| `/dashboard` | Customer home |
| `/services` | Browse services |
| `/book/[serviceId]` | Date/time/staff selection |
| `/payment/[bookingId]` | Checkout |
| `/booking-confirmed/[bookingId]` | Confirmation |
| `/bookings` | My bookings |
| `/profile` | Account settings |

### Staff
| Path | Purpose |
|---|---|
| `/staff/dashboard` | Today's schedule |
| `/staff/schedule` | Weekly view |
| `/staff/availability` | Availability rules |
| `/staff/requests` | Change requests |

### Admin
| Path | Purpose |
|---|---|
| `/admin/dashboard` | Overview + KPIs |
| `/admin/services` | Service management |
| `/admin/staff` | Staff roster |
| `/admin/bookings` | All bookings |
| `/admin/payments` | Payments & refunds |
| `/admin/analytics` | Revenue charts |
| `/admin/insights` | Business intelligence |
| `/admin/locations` | Multi-location config |
| `/admin/roles` | Permissions management |
| `/admin/audit-logs` | System audit trail |
| `/admin/monitoring` | System health |

Next.js API proxy routes live at `app/api/*` and forward cookies to FastAPI.

---

## Environment Variables

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000   # FastAPI backend
NEXT_PUBLIC_SUPABASE_URL=                   # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=             # Supabase anon key
```

### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql://...               # PostgreSQL connection string
SECRET_KEY=                                 # JWT signing secret
FEATURE_SET=core                            # "core" or "full"

# Email (Supabase SMTP)
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# ABA Payway
ABA_MERCHANT_ID=
ABA_API_KEY=

# Stripe (optional)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## Running the Project

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL (or Docker)

### Frontend
```bash
npm install
npm run dev          # http://localhost:3000
```

### Backend
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head               # run migrations
uvicorn app.main:app --reload      # http://localhost:8000
# API docs → http://localhost:8000/docs
```

### Docker (backend + database)
```bash
cd backend
docker-compose up
```

### Tests
```bash
cd backend
pytest tests/                      # all tests
pytest tests/test_payments_aba_qr.py   # single file
```

---

## Key Conventions

- **Path alias:** `@/` maps to the repository root (`tsconfig.json`)
- **UI components:** `components/ui/` are shadcn/ui primitives — do not edit them directly
- **API client:** `lib/utils/api.ts` is the single frontend API client
- **Tailwind:** use Tailwind v4 shorthand; fonts are `--font-inter` (body) and `--font-serif` (display)
- **No direct Supabase data calls from frontend** — always go through the FastAPI backend
- **Migrations:** always use Alembic (`alembic revision --autogenerate -m "message"`) — never edit tables manually
- **FEATURE_SET=core** is the safe default for local dev; set to `full` to enable payments, bookings, and analytics
