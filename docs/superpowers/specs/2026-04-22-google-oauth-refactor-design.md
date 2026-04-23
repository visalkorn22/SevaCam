# Google OAuth 2.0 / OIDC Authorization Code Flow Refactor

**Date:** 2026-04-22
**Status:** Approved — ready for implementation planning

---

## Summary

Replace the current Google Identity Services (GSI) frontend ID-token flow with a backend-driven OAuth 2.0 / OIDC authorization code flow. FastAPI owns the entire Google auth handshake. The frontend only initiates the flow and handles the post-login redirect bridge.

> The frontend no longer performs any Google auth logic. It only starts the backend OAuth flow, handles the post-login callback bridge, fetches `/api/auth/me`, and redirects by role.

---

## Current State

| Step | Where |
|---|---|
| Load Google Identity Services script | Browser |
| `google.accounts.id.initialize()` + `.prompt()` | Browser |
| Receive ID token in `response.credential` | Browser |
| `POST /api/auth/google` with ID token | Browser → FastAPI |
| Verify token via `tokeninfo` endpoint | FastAPI |
| Find or create user, create session, set cookie | FastAPI |
| Call `/api/auth/me` and redirect by role | Browser |

**Problems with current state:**
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` exposed in frontend env
- Cookie settings hardcoded (`secure=False`) in three places
- `verify_google_token()` uses the deprecated `tokeninfo` endpoint instead of proper OIDC validation
- Session creation and cookie logic duplicated across login, magic-link, and Google handlers
- GSI `prompt()` requires the browser to receive and handle a raw credential — not the OIDC-recommended server-side code flow

---

## Target Flow

```
Browser                   Next.js                FastAPI               Google
  |                          |                      |                     |
  |-- click "Continue" ----->|                      |                     |
  |   window.location.href   |                      |                     |
  |   = {API_URL}/api/auth/  |                      |                     |
  |     google/start?mode=.. |                      |                     |
  |                          |                      |                     |
  |--------------------------------------------->  |                     |
  |                          |   GET /api/auth/     |                     |
  |                          |   google/start       |                     |
  |                          |                      |-- gen signed state  |
  |                          |                      |-- (nonce embedded)  |
  |                          |                      |-- build OAuth URL   |
  |<--------------------------------------------- 302 to Google -------> |
  |                          |                                            |
  |-- user authenticates ------------------------------------------------>|
  |<--------------------------------------------------------- 302 --------|
  |   /api/auth/google/callback?code=...&state=...                        |
  |                          |                      |                     |
  |--------------------------------------------->  |                     |
  |                          |   GET /api/auth/     |                     |
  |                          |   google/callback    |                     |
  |                          |                      |-- validate state    |
  |                          |                      |-- validate nonce    |
  |                          |                      |-- exchange code     |
  |                          |                      |-- validate id_token |
  |                          |                      |-- userinfo (name,   |
  |                          |                      |   picture)          |
  |                          |                      |-- find/create user  |
  |                          |                      |-- create session    |
  |                          |                      |-- set cookie        |
  |<--------------------------------------------- 302 to frontend -------|
  |   {FRONTEND_URL}/auth/google/callback           |                     |
  |                          |                      |                     |
  |-- GET /auth/google/callback --->|               |                     |
  |                          |-- GET /api/auth/me ->|                     |
  |                          |<-- { user, role } ---|                     |
  |<-- 302 by role -----------|                     |                     |
```

**On any backend error during callback:** redirect to `{FRONTEND_URL}/auth?mode=login&error=<code>`

---

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| State storage | Signed HMAC-SHA256 stateless token | No schema change, no migration, no cleanup |
| Nonce | Embedded in signed state, passed to Google, validated in id_token | OIDC replay protection |
| Identity validation | Validate id_token (iss, aud, exp, nonce); userinfo for profile only | OIDC-correct; email for local linking, sub available for future use |
| Account linking | By email (backward compat with existing users) | Preserve existing accounts |
| Refresh tokens | Not requested (`access_type=offline` omitted) | Not stored or used; no benefit |
| Google endpoints | Current OIDC endpoint names (not tokeninfo) | Correct per OIDC discovery document |
| Cookie config | Fully env-driven | Supports topology A/B/C without code changes |
| Deployment topology | A preferred; B/C via env config | See topology matrix |
| Frontend callback | New `/auth/google/callback` page (server + client component) | Clean isolation, unambiguous redirect URI |
| Google button visibility | Controlled by `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | Hides button in envs where Google auth is intentionally off |

---

## Architecture: Approach 2 — New Module + Shared Helpers

### New files

| File | Purpose |
|---|---|
| `backend/app/core/session.py` | `create_app_session()` and `set_auth_cookie()` helpers |
| `backend/app/api/google_oauth.py` | `/api/auth/google/start` and `/api/auth/google/callback` |
| `app/auth/google/callback/page.tsx` | Server wrapper with `<Suspense>` |
| `app/auth/google/callback/callback-client.tsx` | Client component: reads params, calls `/api/auth/me`, redirects |

### Modified files

| File | Change |
|---|---|
| `backend/app/core/config.py` | Add 9 new settings (see below) |
| `backend/app/api/auth.py` | Remove old Google handler; use shared helpers; no other changes |
| `backend/app/main.py` | Register `google_oauth` router |
| `app/auth/auth-client.tsx` | Remove GSI; add redirect-to-backend button |
| `components/auth/auth-shell.tsx` | Remove `googleClientId`/`googleReady` props; add `googleEnabled` |
| `backend/.env.example` | Document new vars |
| `.env.local` | Remove `NEXT_PUBLIC_GOOGLE_CLIENT_ID`; add `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` |

### What does NOT change

- `POST /api/auth/login`, `/signup`, `/magic-link/*`, `/password-reset/*`, `/verify-email/*`, `/logout`
- `GET /api/auth/me` (FastAPI endpoint)
- `app/api/auth/me/route.ts` (Next.js proxy)
- `sessions` table schema (no migration)
- `AuthProvider`, `useAuth`, role-based redirect logic

---

## Backend Detail

### `backend/app/core/session.py`

```python
def create_app_session(user_id: str, db: Session) -> str:
    """Create a session row and return the raw token. Caller must db.commit()."""
    token = secrets.token_hex(32)
    expires_at = utc_now() + timedelta(days=settings.SESSION_DAYS)
    db.execute(
        text("INSERT INTO sessions (id, user_id, token, expires_at) VALUES (:id, :user_id, :token, :expires_at)"),
        {"id": str(uuid.uuid4()), "user_id": user_id, "token": token, "expires_at": expires_at},
    )
    return token


def set_auth_cookie(response: Response, token: str) -> None:
    """Set the auth httpOnly cookie using env-driven security settings."""
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
        domain=settings.COOKIE_DOMAIN or None,
        path=settings.COOKIE_PATH,
        max_age=settings.SESSION_DAYS * 24 * 60 * 60,
    )
```

`auth.py` currently duplicates the session INSERT in two places (login, magic-link confirm) and duplicates `set_cookie` in three places (login, magic-link confirm, change-password). All will use these helpers after refactor.

---

### `backend/app/api/google_oauth.py`

#### Signed state format

```
{base64url(JSON payload)}.{HMAC-SHA256 hex}

Payload: {"nonce": "<urlsafe_random_32>", "mode": "login|signup", "exp": <unix_ts>}
TTL: 300 seconds (5 minutes)
```

Validated with `hmac.compare_digest` (constant-time). Expiration checked against `time.time()`.

**Note:** A stateless state token cannot detect reuse after the first validation. In practice this is acceptable because the authorization code itself is single-use; a replayed state with an already-used code will fail at Google's token endpoint.

#### `GET /api/auth/google/start?mode=login|signup`

1. Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set; if not, redirect to `{FRONTEND_URL}/auth?mode=login&error=oauth_not_configured`
2. Validate `mode` param (default: `login`)
3. Generate signed state (nonce embedded)
4. Build Google authorization URL:
   - Endpoint: `https://accounts.google.com/o/oauth2/v2/auth`
   - `scope=openid email profile`
   - `response_type=code`
   - `client_id`, `redirect_uri`, `state`, `nonce`
   - `prompt=select_account`
   - **No** `access_type=offline` (no refresh tokens requested or stored)
5. Return `302` → Google

#### `GET /api/auth/google/callback?code=...&state=...`

Error handling: any exception or validation failure → `302` to `{FRONTEND_URL}/auth?mode=login&error=<code>`

Steps:
1. If `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` not set → error `oauth_not_configured`
2. Validate `state` parameter (signature, expiration) → error `state_invalid`
3. Extract `nonce` and `mode` from validated state payload
4. Exchange `code` for tokens via `POST https://oauth2.googleapis.com/token` (httpx, server-to-server)
5. Extract `id_token` from token response
6. Verify `id_token` signature and claims using Google's public JWKS keys (`https://www.googleapis.com/oauth2/v3/certs`) — either with `google-auth` (`google.oauth2.id_token.verify_oauth2_token`) or `python-jose` with JWKS fetch. This is preferred over decode-only even though the token came directly from Google's server, because it gives a clean security story and removes the assumption that server-to-server channel integrity is sufficient.
7. Validate id_token claims (the verification library handles most of these, but assert explicitly):
   - `iss` must be `https://accounts.google.com`
   - `aud` must equal `GOOGLE_CLIENT_ID`
   - `exp` must be in the future
   - `nonce` must match the nonce extracted from state
   → failure: error `google_failed`
8. Extract `sub`, `email`, `email_verified` from id_token payload
9. Call `GET https://openidconnect.googleapis.com/v1/userinfo` with access token for `name`, `picture` — userinfo failure is non-fatal; proceed with `full_name=None` / `avatar_url=None` if the call fails (identity is already established from the id_token)
10. Find or create user by email (idempotent):
    - **New user:** insert with `role=customer`, `email_verified=True`, `is_active=True`; fill `full_name`, `avatar_url` from userinfo
    - **Existing user:** check `is_active` → error `account_inactive`; mark `email_verified=True` if not already; fill `avatar_url` / `full_name` only if currently null
11. `token = create_app_session(user.id, db)`
12. `db.commit()` — must happen before setting cookie / redirecting
13. `set_auth_cookie(redirect_response, token)`
14. Return `302` → `{FRONTEND_URL}/auth/google/callback`

#### Error code reference

| Code | Trigger |
|---|---|
| `oauth_not_configured` | `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` not set |
| `state_invalid` | Missing, malformed, expired state, or HMAC mismatch |
| `google_failed` | Code exchange failure; id_token validation or signature verification failure |
| `account_inactive` | User found but `is_active=False` |

---

### `backend/app/core/config.py` additions

```python
# Google OAuth 2.0 (authorization code flow)
GOOGLE_CLIENT_SECRET: Optional[str] = None
GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"
FRONTEND_URL: str = "http://localhost:3000"

# Session lifetime
SESSION_DAYS: int = 30           # also controls cookie max_age

# Cookie security (all env-driven for A/B/C topology support)
COOKIE_NAME: str = "auth_token"
COOKIE_SECURE: bool = False      # True in production (required for SameSite=None)
COOKIE_SAMESITE: str = "lax"    # "none" for topology C (cross-domain)
COOKIE_DOMAIN: Optional[str] = None  # ".yourdomain.com" for topology B
COOKIE_PATH: str = "/"
```

`GOOGLE_CLIENT_ID` already exists — no rename.

---

### `backend/app/api/auth.py` changes

**Remove:**
- `verify_google_token()` function (lines 207–235)
- `GoogleLoginBody` Pydantic schema
- `POST /api/auth/google` endpoint (lines 526–623)

**Replace with imports from `core/session.py`:**
- `create_app_session` replaces duplicated session INSERT in `login` and `confirm_magic_link`
- `set_auth_cookie` replaces hardcoded `response.set_cookie(...)` in `login`, `confirm_magic_link`, and `change_password`
- `SESSION_DAYS` constant moves to `core/config.py` as `settings.SESSION_DAYS`; both `auth.py` and `core/session.py` read from settings

**Rollback option:** Retain `POST /api/auth/google` behind `settings.LEGACY_GOOGLE_LOGIN_ENABLED: bool = False` flag for staging verification before permanent removal. Remove once the new flow is confirmed working.

---

### `backend/app/main.py`

```python
from app.api import google_oauth
app.include_router(google_oauth.router)
```

---

## Frontend Detail

### `app/auth/google/callback/page.tsx` (server component)

```tsx
import { Suspense } from "react";
import GoogleCallbackClient from "./callback-client";

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<centered loading spinner />}>
      <GoogleCallbackClient />
    </Suspense>
  );
}
```

Suspense is required because `useSearchParams()` in the client component causes Next.js to defer rendering during prerender/build.

### `app/auth/google/callback/callback-client.tsx` (client component)

**On mount:**
1. Read `?error=` from `useSearchParams()`
2. If error present: show friendly message + "Back to login" link → `/auth?mode=login`. No API call.
3. Otherwise: `fetch("/api/auth/me", { cache: "no-store" })`
4. On success: redirect by role (admin/superadmin → `/admin/dashboard`, staff → `/staff/dashboard`, else → `/#home-services`)
5. On failure: redirect to `/auth?mode=login&error=google_failed`

**Error message map:**

| Code | User-facing message |
|---|---|
| `state_invalid` | "The login attempt was invalid or expired. Please try again." |
| `account_inactive` | "Your account has been disabled. Please contact support." |
| `oauth_not_configured` | "Google login is not available right now." |
| `google_failed` / default | "Google login failed. Please try again or use email instead." |

---

### `app/auth/auth-client.tsx` changes

**Remove:**
- `googleClientId` variable (`process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID`)
- `googleInitialized` ref
- `googleReady` state
- `useEffect` that loads `https://accounts.google.com/gsi/client`
- `handleGoogleCredential` callback
- `window.google.accounts.id.initialize/prompt()` calls

**Replace `handleGoogleLogin`:**
```typescript
const handleGoogleLogin = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  setGoogleLoading(true);
  // Navigate to FastAPI; page navigates away so googleLoading never resets — intentional
  window.location.href = `${apiUrl}/api/auth/google/start?mode=${mode}`;
};
```

`NEXT_PUBLIC_API_URL` is always used explicitly (no relative paths). For topology A, this URL is the public API base even if behind a proxy; the proxy must route `/api/auth/google/*` correctly. Do not use a relative path unless Next.js rewrites are configured.

**Remove props passed to `AuthShell`:**
- `googleClientId`
- `googleReady`

**Add prop:**
- `googleEnabled={!!process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED}`

---

### `components/auth/auth-shell.tsx` changes

**Remove props:** `googleClientId?: string`, `googleReady: boolean`

**Add prop:** `googleEnabled: boolean`

**Google button render condition:** `googleEnabled` (controlled by the frontend env flag, not by whether a client ID string is present). This hides the button in environments where Google auth is intentionally disabled, rather than relying on "the backend will return a clear error."

`googleLoading` prop stays — disables the button and shows a spinner while the browser navigates to the backend.

---

## Environment Variables

### Backend `backend/.env` / `backend/.env.example` additions

```env
# Google OAuth 2.0 (authorization code flow)
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
FRONTEND_URL=http://localhost:3000

# Cookie settings (env-driven for topology support)
COOKIE_NAME=auth_token
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
COOKIE_DOMAIN=
COOKIE_PATH=/
```

### Frontend `.env.local` changes

```env
# Remove:
# NEXT_PUBLIC_GOOGLE_CLIENT_ID=

# Add:
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true
```

---

## Deployment Topology Matrix

| Topology | `COOKIE_SECURE` | `COOKIE_SAMESITE` | `COOKIE_DOMAIN` | Notes |
|---|---|---|---|---|
| A — same domain behind proxy | `true` | `lax` | (empty) | Proxy must route `/api/auth/google/*` to FastAPI |
| B — subdomains same registrable domain | `true` | `lax` | `.yourdomain.com` | Cookie shared across subdomains |
| C — fully separate domains | `true` | `none` | (empty or specific) | `SameSite=None` requires `Secure=true`; CORS must include frontend with `credentials: true`; verify that `/api/auth/me` proxy in Next.js can read the cookie |

**Topology C additional work not in scope of this refactor:** The Next.js `/api/auth/me/route.ts` currently reads the `auth_token` cookie from `cookies()` (Next.js server-side). For topology C, the backend sets the cookie on its own domain, so the Next.js server-side cookie store will not see it. This requires either (a) a custom cookie forwarding mechanism or (b) rearchitecting the `/api/auth/me` proxy to read from `Authorization: Bearer` instead. Topology C is documented but not implemented in this refactor.

---

## Google Cloud Console Setup

1. In **APIs & Services → Credentials**, open (or create) your OAuth 2.0 Client ID
2. Under **Authorized redirect URIs**, add your `GOOGLE_REDIRECT_URI` value:
   - Dev: `http://localhost:8000/api/auth/google/callback`
   - Prod: `https://api.yourdomain.com/api/auth/google/callback`
3. The `/start` endpoint is **not** a redirect URI — only the callback is registered
4. Remove any previously registered JavaScript origins used by the old GSI flow (optional cleanup)

---

## Testing Checklist

### Happy path
- [ ] New user: click "Continue with Google" → authenticate → land at `/#home-services` → account created in DB with `email_verified=true`
- [ ] Returning user (email match): same flow → no duplicate user created → session created
- [ ] Admin user: redirected to `/admin/dashboard`
- [ ] Staff user: redirected to `/staff/dashboard`
- [ ] Login mode and signup mode both work (mode passed through to state)

### Error paths
- [ ] Inactive user: callback redirects to `/auth?mode=login&error=account_inactive` → friendly message shown
- [ ] Invalid/expired state (tampered or >5 min old): callback redirects to `/auth?mode=login&error=state_invalid`
- [ ] `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` not set: start redirects to `/auth?mode=login&error=oauth_not_configured`
- [ ] `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` not set or false: Google button hidden

### Regression — existing flows
- [ ] Email/password login still works
- [ ] Magic link request and confirmation still work
- [ ] Email verification still works
- [ ] Password reset still works
- [ ] Logout still works
- [ ] `/api/auth/me` still returns correct user and role

### Security
- [ ] `auth_token` cookie is `HttpOnly` — not readable by JS
- [ ] `COOKIE_SECURE=true` in production — verify cookie flags in browser DevTools
- [ ] State with wrong HMAC rejected
- [ ] State with correct HMAC but expired (>5 min) rejected
- [ ] Nonce mismatch in id_token rejected

### Environment
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID` removed from all env files and code
- [ ] No Google Client Secret in any frontend file or Next.js env

---

## Rollback Notes

- **No database migration** — rollback requires no schema change
- **Backend rollback:** revert `google_oauth.py` (delete), revert `auth.py` removals, revert `main.py` router registration
- **Frontend rollback:** revert `auth-client.tsx` to GSI script loading; revert `auth-shell.tsx` props; restore `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `.env.local`
- **Optional rollback safety:** retain `POST /api/auth/google` behind `LEGACY_GOOGLE_LOGIN_ENABLED=false` flag during initial staging verification
- The `core/session.py` helpers are backwards-compatible — they can stay regardless of rollback since `auth.py` will use them either way

---

## What Remains Unchanged

- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/auth/magic-link/request` and `/confirm`
- `POST /api/auth/password-reset/request` and `/confirm`
- `POST /api/auth/verify-email/request` and `/confirm`
- `POST /api/auth/logout` and `/logout-all`
- `GET /api/auth/me` (FastAPI)
- `app/api/auth/me/route.ts` (Next.js proxy)
- `sessions` table schema
- `AuthProvider`, `useAuth` hook
- Role-based redirect logic (moved to `callback-client.tsx`, same rules)
