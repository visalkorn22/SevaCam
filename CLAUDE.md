# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (Next.js)
```bash
npm run dev        # Start dev server at http://localhost:3000
npm run build      # Production build (TypeScript errors ignored via next.config.mjs)
npm run lint       # ESLint check
```

### Backend (FastAPI)
```bash
cd backend
uvicorn app.main:app --reload   # Start API server at http://localhost:8000
# API docs available at http://localhost:8000/docs
```

### Backend Tests
```bash
cd backend
pytest tests/test_payments_aba_qr.py   # Run a single test file
pytest tests/                           # Run all tests
```

### Database Migrations (Alembic)
```bash
cd backend
alembic upgrade head                          # Apply all migrations
alembic revision --autogenerate -m "message"  # Create new migration
alembic downgrade -1                          # Roll back one step
```

## Architecture

This is a full-stack appointment booking system with a decoupled architecture:

```
Next.js Frontend  ---(httpOnly cookie: auth_token)-->  Next.js API routes (/app/api/)
                                                              |
                                                              v
                                                       FastAPI Backend (:8000)
                                                              |
                                                              v
                                                         PostgreSQL (Supabase)
```

**Key architectural rule**: Supabase is NOT used for data — only for email delivery infrastructure. All auth (login, sessions, registration) and all data (bookings, services, payments) go through the FastAPI backend with its own PostgreSQL tables.

### Authentication Flow
- User logs in → FastAPI `/api/auth/login` returns an `auth_token` set as an httpOnly cookie
- Next.js middleware and the `AuthProvider` (`components/auth/auth-provider.tsx`) call `/api/auth/me` (a Next.js route at `app/api/auth/me/route.ts`) which proxies to the FastAPI backend
- Role-based access: `customer`, `staff`, `admin`, `superadmin`
- FastAPI enforces roles via `get_current_user` dependency in `backend/app/core/auth.py`; admin routes use `ADMIN_ROLES`, staff routes use `STAFF_ROLES`

### Frontend Structure
- `app/` — Next.js App Router pages. Route groups: `/auth`, `/dashboard` (customer), `/staff`, `/admin`, `/services`, `/book`, `/payment`
- `app/api/` — Next.js API routes that proxy to the FastAPI backend (auth passthrough with cookie forwarding)
- `components/ui/` — shadcn/ui primitives (do not modify directly)
- `components/auth/`, `components/booking/`, `components/admin/`, etc. — feature components
- `lib/utils/api.ts` — frontend API client using `NEXT_PUBLIC_API_URL`
- `lib/data/` — static/demo data
- `hooks/` — custom React hooks
- Styling: Tailwind CSS v4; use canonical Tailwind v4 shorthand (not `var()` syntax); fonts are `--font-inter` (body) and `--font-serif` (display)

### Backend Structure
- `backend/app/main.py` — FastAPI app entrypoint; routers conditionally loaded based on `FEATURE_SET` env var (`core` vs `full`)
- `backend/app/api/` — one file per domain: `auth`, `users`, `services`, `staff`, `availability`, `bookings`, `payments`, `analytics`, `admin`, `notifications`, `reviews`, `waitlist`, `customers`
- `backend/app/core/` — `config.py` (settings via pydantic-settings), `auth.py` (session token resolution), `database.py` (SQLAlchemy engine + `SafeSession`)
- `backend/app/models/schemas.py` — all SQLAlchemy models in one file
- `backend/alembic/` — database migrations; migration files are in `alembic/versions/`

### Key Configuration
- `FEATURE_SET=core` (default) loads only auth/users/services/staff/availability. Set to `full` to enable bookings, payments, analytics, etc.
- `NEXT_PUBLIC_API_URL` must point to the FastAPI backend (default: `http://localhost:8000`)
- Payment providers: ABA Payway (primary, Cambodian market) and Stripe (optional); Bakong KHQR for QR payments
- Slot granularity: 15-minute intervals; min booking notice: 120 minutes; max booking horizon: 90 days

### Path Alias
`@/` maps to the repository root (configured in `tsconfig.json`).
