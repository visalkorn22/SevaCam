# Google OAuth 2.0 / OIDC Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the frontend GSI ID-token flow with a backend-driven OAuth 2.0 / OIDC authorization code flow where FastAPI owns the entire Google handshake.

**Architecture:** New `google_oauth.py` router handles `/api/auth/google/start` and `/api/auth/google/callback`. Shared `core/session.py` helpers centralize the repeated session-creation and cookie-setting logic that is currently duplicated in `auth.py`. A new Next.js page at `/auth/google/callback` acts as a thin redirect bridge after the FastAPI callback sets the session cookie and redirects the browser.

**Tech Stack:** FastAPI, SQLAlchemy (raw SQL), python-jose[cryptography] (already installed — used for RS256 JWT verification), httpx (already installed), Next.js App Router, TypeScript.

**Spec:** `docs/superpowers/specs/2026-04-22-google-oauth-refactor-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `backend/app/core/session.py` | **Create** | `create_app_session()`, `set_auth_cookie()`, `utc_now()` |
| `backend/tests/test_session.py` | **Create** | Tests for session helpers |
| `backend/app/api/google_oauth.py` | **Create** | `start` + `callback` endpoints, state + JWT helpers |
| `backend/tests/test_google_oauth.py` | **Create** | Tests for state helpers, start, callback |
| `backend/app/core/config.py` | **Modify** | Add 10 new settings |
| `backend/app/api/auth.py` | **Modify** | Remove old Google code; use shared helpers |
| `backend/app/main.py` | **Modify** | Register `google_oauth` router |
| `app/auth/google/callback/page.tsx` | **Create** | Server component wrapper with `<Suspense>` |
| `app/auth/google/callback/callback-client.tsx` | **Create** | Client component: reads error param, calls `/api/auth/me`, redirects by role |
| `app/auth/auth-client.tsx` | **Modify** | Remove GSI script/prompt; add redirect-to-backend button |
| `components/auth/auth-shell.tsx` | **Modify** | Swap `googleClientId`/`googleReady` for `googleEnabled` |
| `backend/.env.example` | **Modify** | Document new env vars |
| `.env.local` | **Modify** | Remove `NEXT_PUBLIC_GOOGLE_CLIENT_ID`; add `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` |

---

## Task 1: Add new config settings

**Files:**
- Modify: `backend/app/core/config.py`
- Modify: `backend/.env.example`
- Modify: `.env.local`

- [ ] **Step 1: Add settings to `config.py`**

Open `backend/app/core/config.py`. Inside the `Settings` class, replace the existing `# Google OAuth` block (currently only `GOOGLE_CLIENT_ID`) with:

```python
    # =========================
    # Google OAuth 2.0
    # =========================
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"
    FRONTEND_URL: str = "http://localhost:3000"

    # =========================
    # Session lifetime
    # =========================
    SESSION_DAYS: int = 30

    # =========================
    # Cookie security (env-driven per deployment topology)
    # =========================
    COOKIE_NAME: str = "auth_token"
    COOKIE_SECURE: bool = False       # Set True in production
    COOKIE_SAMESITE: str = "lax"      # "none" for cross-domain topology
    COOKIE_DOMAIN: Optional[str] = None  # ".yourdomain.com" for subdomain topology
    COOKIE_PATH: str = "/"
```

- [ ] **Step 2: Update `backend/.env.example`**

Add these lines after the existing `GOOGLE_CLIENT_ID=` line:

```env
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
FRONTEND_URL=http://localhost:3000

# Session lifetime (days)
SESSION_DAYS=30

# Cookie security — adjust per deployment topology:
#   Topology A (same domain, reverse proxy): SECURE=true, SAMESITE=lax, DOMAIN=
#   Topology B (subdomains): SECURE=true, SAMESITE=lax, DOMAIN=.yourdomain.com
#   Topology C (cross-domain): SECURE=true, SAMESITE=none, DOMAIN=
COOKIE_NAME=auth_token
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
COOKIE_DOMAIN=
COOKIE_PATH=/
```

- [ ] **Step 3: Update `.env.local`**

In `.env.local` (repo root):
- Remove the line `NEXT_PUBLIC_GOOGLE_CLIENT_ID=`
- Add: `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`

Final `.env.local` should be:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true
```

- [ ] **Step 4: Verify settings load**

```bash
cd backend
python -c "from app.core.config import settings; print(settings.SESSION_DAYS, settings.COOKIE_NAME, settings.FRONTEND_URL)"
```

Expected: `30 auth_token http://localhost:3000`

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/config.py backend/.env.example .env.local
git commit -m "config: add Google OAuth 2.0, session lifetime, and cookie settings"
```

---

## Task 2: Create `core/session.py` with shared helpers

**Files:**
- Create: `backend/app/core/session.py`
- Create: `backend/tests/test_session.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_session.py`:

```python
import os
import sys
from unittest.mock import MagicMock, call

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")
os.environ.setdefault("SESSION_DAYS", "30")
os.environ.setdefault("COOKIE_NAME", "auth_token")
os.environ.setdefault("COOKIE_SECURE", "false")
os.environ.setdefault("COOKIE_SAMESITE", "lax")
os.environ.setdefault("COOKIE_PATH", "/")

from app.core.session import create_app_session, set_auth_cookie
from fastapi.responses import JSONResponse


def make_db():
    db = MagicMock()
    db.execute.return_value = MagicMock()
    return db


def test_create_app_session_returns_64_char_hex_token():
    token = create_app_session("user-id-123", make_db())
    assert isinstance(token, str)
    assert len(token) == 64  # secrets.token_hex(32) = 64 hex chars


def test_create_app_session_inserts_with_correct_user_id():
    db = make_db()
    create_app_session("user-abc", db)
    call_args = db.execute.call_args[0][1]
    assert call_args["user_id"] == "user-abc"


def test_create_app_session_tokens_are_unique():
    t1 = create_app_session("u1", make_db())
    t2 = create_app_session("u2", make_db())
    assert t1 != t2


def test_create_app_session_does_not_commit():
    db = make_db()
    create_app_session("u1", db)
    db.commit.assert_not_called()


def test_set_auth_cookie_sets_httponly():
    response = JSONResponse(content={})
    set_auth_cookie(response, "test-token")
    cookie_header = response.headers.get("set-cookie", "")
    assert "HttpOnly" in cookie_header


def test_set_auth_cookie_includes_token_value():
    response = JSONResponse(content={})
    set_auth_cookie(response, "my-session-token")
    assert "my-session-token" in response.headers.get("set-cookie", "")


def test_set_auth_cookie_uses_configured_cookie_name():
    response = JSONResponse(content={})
    set_auth_cookie(response, "tok")
    assert "auth_token" in response.headers.get("set-cookie", "")
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd backend
pytest tests/test_session.py -v
```

Expected: `ImportError` or `ModuleNotFoundError` — `app.core.session` does not exist yet.

- [ ] **Step 3: Create `backend/app/core/session.py`**

```python
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import Response
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def create_app_session(user_id: str, db: Session) -> str:
    """Insert a new session row and return the raw token. Caller must db.commit()."""
    token = secrets.token_hex(32)
    expires_at = utc_now() + timedelta(days=settings.SESSION_DAYS)
    db.execute(
        text(
            "INSERT INTO sessions (id, user_id, token, expires_at) "
            "VALUES (:id, :user_id, :token, :expires_at)"
        ),
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "token": token,
            "expires_at": expires_at,
        },
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

- [ ] **Step 4: Run tests — confirm they pass**

```bash
cd backend
pytest tests/test_session.py -v
```

Expected: 7 tests PASSED.

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/session.py backend/tests/test_session.py
git commit -m "feat: add shared session creation and cookie helpers in core/session.py"
```

---

## Task 3: Refactor `auth.py` to use shared helpers

**Files:**
- Modify: `backend/app/api/auth.py`

This task removes the duplicated session-insert and cookie-setting code from `auth.py`, removes the old Google handler, and replaces them with imports from `core/session.py`. No new tests are needed — the existing behavior is preserved exactly.

- [ ] **Step 1: Add imports and remove old constants**

At the top of `backend/app/api/auth.py`, add the import:

```python
from app.core.session import create_app_session, set_auth_cookie, utc_now
```

Remove the existing local `utc_now` function definition (lines ~37–38) since it now comes from `core/session.py`.

Remove the `SESSION_DAYS = 30` constant — it now lives in `settings.SESSION_DAYS`.

- [ ] **Step 2: Remove old Google code**

Delete these three items from `auth.py`:
1. `GoogleLoginBody` Pydantic schema (the `class GoogleLoginBody` block, ~lines 138–140)
2. `verify_google_token()` function (~lines 207–235)
3. The entire `POST /api/auth/google` endpoint (~lines 526–623, including the `@router.post("/google")` decorator and `google_login` function)

- [ ] **Step 3: Replace session INSERT in `login` endpoint**

Find the `login` function. Replace this block:

```python
    token = create_session_token()
    expires_at = utc_now() + timedelta(days=SESSION_DAYS)

    db.execute(
        text("""
            INSERT INTO sessions (id, user_id, token, expires_at)
            VALUES (:id, :user_id, :token, :expires_at)
        """),
        {
            "id": str(uuid.uuid4()),
            "user_id": user.id,
            "token": token,
            "expires_at": expires_at,
        },
    )
    db.commit()

    response.set_cookie(
        key="auth_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
        max_age=SESSION_DAYS * 24 * 60 * 60,
    )
```

With:

```python
    token = create_app_session(user.id, db)
    db.commit()
    set_auth_cookie(response, token)
```

- [ ] **Step 4: Replace session INSERT in `confirm_magic_link` endpoint**

Find the `confirm_magic_link` function. Apply the same substitution as Step 3 — replace the session INSERT block and `response.set_cookie(...)` with:

```python
    token = create_app_session(user.id, db)
    db.commit()
    set_auth_cookie(response, token)
```

Note: `confirm_magic_link` also has a `db.execute` for marking the token used. Keep that — only replace the session INSERT and set_cookie.

- [ ] **Step 5: Replace `set_cookie` in `change_password` endpoint**

Find the `change_password` function. It calls `response.set_cookie(...)` with hardcoded values. Replace that call with:

```python
    set_auth_cookie(response, token or "")
```

- [ ] **Step 6: Remove now-unused imports**

Remove `timedelta` from the `datetime` import if it is no longer used elsewhere in `auth.py`. Also remove the `SESSION_DAYS` reference from any remaining usage. Keep `uuid`, `secrets`, `hashlib` — they are still used by reset/verification token helpers.

- [ ] **Step 7: Verify existing auth still works**

```bash
cd backend
python -c "from app.api.auth import router; print('auth.py imports OK')"
```

Expected: `auth.py imports OK`

- [ ] **Step 8: Commit**

```bash
git add backend/app/api/auth.py
git commit -m "refactor: use shared session/cookie helpers in auth.py; remove legacy Google handler"
```

---

## Task 4: Create `google_oauth.py` — state helpers and tests

**Files:**
- Create: `backend/app/api/google_oauth.py` (state helpers only for now)
- Create: `backend/tests/test_google_oauth.py`

- [ ] **Step 1: Write failing tests for state helpers**

Create `backend/tests/test_google_oauth.py`:

```python
import base64
import hashlib
import hmac as hmac_module
import json
import os
import sys
import time

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")
os.environ["SECRET_KEY"] = "test-secret-key-for-testing"
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-client-id")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test-client-secret")
os.environ.setdefault("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("SESSION_DAYS", "30")
os.environ.setdefault("COOKIE_NAME", "auth_token")
os.environ.setdefault("COOKIE_SECURE", "false")
os.environ.setdefault("COOKIE_SAMESITE", "lax")
os.environ.setdefault("COOKIE_PATH", "/")

from app.api.google_oauth import _make_state, _verify_state, _decode_state_payload_unsafe


def _build_state(nonce: str, mode: str, exp: int, secret: str = "test-secret-key-for-testing") -> str:
    payload = json.dumps({"nonce": nonce, "mode": mode, "exp": exp})
    b64 = base64.urlsafe_b64encode(payload.encode()).decode().rstrip("=")
    sig = hmac_module.new(secret.encode(), b64.encode(), hashlib.sha256).hexdigest()
    return f"{b64}.{sig}"


def test_make_state_has_two_dot_separated_parts():
    state = _make_state("login")
    parts = state.rsplit(".", 1)
    assert len(parts) == 2


def test_make_state_payload_contains_mode():
    state = _make_state("signup")
    b64 = state.rsplit(".", 1)[0]
    padded = b64 + "=" * (4 - len(b64) % 4)
    payload = json.loads(base64.urlsafe_b64decode(padded).decode())
    assert payload["mode"] == "signup"


def test_make_state_payload_contains_nonce():
    state = _make_state("login")
    b64 = state.rsplit(".", 1)[0]
    padded = b64 + "=" * (4 - len(b64) % 4)
    payload = json.loads(base64.urlsafe_b64decode(padded).decode())
    assert "nonce" in payload
    assert len(payload["nonce"]) > 20


def test_make_state_nonces_are_unique():
    s1 = _make_state("login")
    s2 = _make_state("login")
    assert s1 != s2


def test_verify_state_returns_correct_mode():
    state = _make_state("signup")
    payload = _verify_state(state)
    assert payload["mode"] == "signup"


def test_verify_state_returns_nonce():
    state = _make_state("login")
    payload = _verify_state(state)
    assert "nonce" in payload
    assert len(payload["nonce"]) > 20


def test_verify_state_rejects_tampered_signature():
    state = _make_state("login")
    b64, _ = state.rsplit(".", 1)
    tampered = f"{b64}.{'a' * 64}"
    with pytest.raises(ValueError, match="signature"):
        _verify_state(tampered)


def test_verify_state_rejects_expired():
    state = _build_state("nonce-abc", "login", exp=int(time.time()) - 10)
    with pytest.raises(ValueError, match="expired"):
        _verify_state(state)


def test_verify_state_rejects_malformed_no_dot():
    with pytest.raises(ValueError, match="Malformed"):
        _verify_state("nodothere")


def test_verify_state_rejects_malformed_payload():
    # Valid HMAC but garbage payload
    b64 = base64.urlsafe_b64encode(b"not-json").decode().rstrip("=")
    sig = hmac_module.new("test-secret-key-for-testing".encode(), b64.encode(), hashlib.sha256).hexdigest()
    state = f"{b64}.{sig}"
    with pytest.raises(ValueError):
        _verify_state(state)
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd backend
pytest tests/test_google_oauth.py::test_make_state_has_two_dot_separated_parts -v
```

Expected: `ImportError` — `app.api.google_oauth` does not exist yet.

- [ ] **Step 3: Create `backend/app/api/google_oauth.py` with state helpers only**

```python
import base64
import hashlib
import hmac as hmac_module
import json
import secrets
import time
import uuid
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from jose import JWTError
from jose import jwk as jose_jwk
from jose import jwt as jose_jwt
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.session import create_app_session, set_auth_cookie

router = APIRouter(prefix="/api/auth", tags=["auth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
GOOGLE_ISSUER = "https://accounts.google.com"
DEFAULT_APP_TIMEZONE = "Asia/Phnom_Penh"
STATE_TTL_SECONDS = 300


def _frontend_error_url(mode: str, error: str) -> str:
    base = settings.FRONTEND_URL.rstrip("/")
    return f"{base}/auth?mode={mode}&error={error}"


def _make_state(mode: str) -> str:
    """Generate a signed OAuth state token with embedded nonce (TTL: 5 minutes)."""
    nonce = secrets.token_urlsafe(32)
    payload = json.dumps({
        "nonce": nonce,
        "mode": mode,
        "exp": int(time.time()) + STATE_TTL_SECONDS,
    })
    b64 = base64.urlsafe_b64encode(payload.encode()).decode().rstrip("=")
    sig = hmac_module.new(settings.SECRET_KEY.encode(), b64.encode(), hashlib.sha256).hexdigest()
    return f"{b64}.{sig}"


def _verify_state(state: str) -> dict:
    """Validate signed state token. Returns payload dict or raises ValueError."""
    try:
        b64, sig = state.rsplit(".", 1)
    except ValueError:
        raise ValueError("Malformed state: missing separator")

    expected = hmac_module.new(
        settings.SECRET_KEY.encode(), b64.encode(), hashlib.sha256
    ).hexdigest()
    if not hmac_module.compare_digest(sig, expected):
        raise ValueError("Invalid state signature")

    padded = b64 + "=" * (4 - len(b64) % 4)
    try:
        payload = json.loads(base64.urlsafe_b64decode(padded).decode())
    except Exception:
        raise ValueError("Malformed state payload")

    if payload.get("exp", 0) < time.time():
        raise ValueError("State expired")

    return payload


def _decode_state_payload_unsafe(state: str) -> dict:
    """Decode state payload WITHOUT signature check — only call on a state we just created."""
    b64 = state.rsplit(".", 1)[0]
    padded = b64 + "=" * (4 - len(b64) % 4)
    return json.loads(base64.urlsafe_b64decode(padded).decode())
```

> The router endpoints will be added in the next two tasks. The file is created here so the state helper tests can run.

- [ ] **Step 4: Run tests — confirm they pass**

```bash
cd backend
pytest tests/test_google_oauth.py -v
```

Expected: 11 tests PASSED.

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/google_oauth.py backend/tests/test_google_oauth.py
git commit -m "feat: add signed OAuth state helpers in google_oauth.py with tests"
```

---

## Task 5: Add `GET /api/auth/google/start` endpoint

**Files:**
- Modify: `backend/app/api/google_oauth.py`
- Modify: `backend/tests/test_google_oauth.py`

- [ ] **Step 1: Write failing test for the start endpoint**

Append to `backend/tests/test_google_oauth.py`:

```python
from fastapi import FastAPI
from fastapi.testclient import TestClient


def make_google_app():
    from app.api.google_oauth import router
    app = FastAPI()
    app.include_router(router)
    return app


def test_start_redirects_to_google_when_configured():
    client = TestClient(make_google_app(), follow_redirects=False)
    response = client.get("/api/auth/google/start?mode=login")
    assert response.status_code in (302, 307)
    location = response.headers["location"]
    assert "accounts.google.com" in location
    assert "client_id=test-client-id" in location
    assert "scope=openid" in location
    assert "state=" in location
    assert "nonce=" in location
    assert "access_type" not in location  # must not request refresh tokens


def test_start_redirects_to_error_when_client_id_missing():
    import unittest.mock as mock
    with mock.patch("app.api.google_oauth.settings") as m:
        m.GOOGLE_CLIENT_ID = None
        m.GOOGLE_CLIENT_SECRET = "secret"
        m.FRONTEND_URL = "http://localhost:3000"
        client = TestClient(make_google_app(), follow_redirects=False)
        response = client.get("/api/auth/google/start")
        assert response.status_code in (302, 307)
        assert "oauth_not_configured" in response.headers["location"]


def test_start_defaults_mode_to_login():
    client = TestClient(make_google_app(), follow_redirects=False)
    response = client.get("/api/auth/google/start")
    # Should not error — mode defaults to login
    assert response.status_code in (302, 307)
    location = response.headers["location"]
    assert "accounts.google.com" in location


def test_start_invalid_mode_falls_back_to_login():
    client = TestClient(make_google_app(), follow_redirects=False)
    response = client.get("/api/auth/google/start?mode=invalid")
    assert response.status_code in (302, 307)
    assert "accounts.google.com" in response.headers["location"]
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd backend
pytest tests/test_google_oauth.py::test_start_redirects_to_google_when_configured -v
```

Expected: FAIL — `404 Not Found` (endpoint not defined yet).

- [ ] **Step 3: Add the `start` endpoint to `google_oauth.py`**

Append to `backend/app/api/google_oauth.py` (after the helper functions):

```python
@router.get("/google/start")
def google_start(mode: str = "login"):
    """Redirect the browser to Google's OAuth 2.0 authorization endpoint."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        return RedirectResponse(
            _frontend_error_url("login", "oauth_not_configured"), status_code=302
        )

    if mode not in ("login", "signup"):
        mode = "login"

    state = _make_state(mode)
    # Extract nonce from state we just made (safe — no verification needed here)
    nonce = _decode_state_payload_unsafe(state)["nonce"]

    params = urlencode({
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "nonce": nonce,
        "prompt": "select_account",
    })
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{params}", status_code=302)
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
cd backend
pytest tests/test_google_oauth.py -v
```

Expected: 15 tests PASSED.

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/google_oauth.py backend/tests/test_google_oauth.py
git commit -m "feat: add GET /api/auth/google/start endpoint"
```

---

## Task 6: Add `GET /api/auth/google/callback` endpoint

**Files:**
- Modify: `backend/app/api/google_oauth.py`
- Modify: `backend/tests/test_google_oauth.py`

- [ ] **Step 1: Write failing tests for the callback endpoint**

Append to `backend/tests/test_google_oauth.py`:

```python
from unittest.mock import MagicMock, patch


class FakeRow:
    def __init__(self, **kwargs):
        self._mapping = kwargs
        for k, v in kwargs.items():
            setattr(self, k, v)


def make_db(user_row=None, role_exists=True, new_user_row=None):
    """Build a mock db that handles the callback's query sequence."""
    db = MagicMock()
    execute_results = []

    # 1st execute: user lookup by email
    r1 = MagicMock()
    r1.fetchone.return_value = user_row
    execute_results.append(r1)

    if user_row is None:
        # 2nd execute: role existence check
        r2 = MagicMock()
        r2.fetchone.return_value = FakeRow(name="customer") if role_exists else None
        execute_results.append(r2)

        # 3rd execute: INSERT user RETURNING
        r3 = MagicMock()
        r3.fetchone.return_value = new_user_row or FakeRow(
            id="new-user-id",
            email="test@example.com",
            full_name="Test User",
            role="customer",
            phone=None,
            avatar_url="https://pic.url",
            timezone="Asia/Phnom_Penh",
            is_active=True,
            email_verified=True,
        )
        execute_results.append(r3)

    # Session insert
    r_session = MagicMock()
    execute_results.append(r_session)

    db.execute.side_effect = execute_results
    return db


def make_callback_app(db):
    from app.core.database import get_db
    from app.api.google_oauth import router
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: db
    return app


def make_valid_state(mode: str = "login") -> str:
    return _make_state(mode)


def test_callback_missing_code_redirects_state_invalid():
    db = MagicMock()
    client = TestClient(make_callback_app(db), follow_redirects=False)
    state = make_valid_state()
    response = client.get(f"/api/auth/google/callback?state={state}")
    assert response.status_code in (302, 307)
    assert "state_invalid" in response.headers["location"]


def test_callback_missing_state_redirects_state_invalid():
    db = MagicMock()
    client = TestClient(make_callback_app(db), follow_redirects=False)
    response = client.get("/api/auth/google/callback?code=abc")
    assert response.status_code in (302, 307)
    assert "state_invalid" in response.headers["location"]


def test_callback_invalid_state_signature_redirects_error():
    db = MagicMock()
    client = TestClient(make_callback_app(db), follow_redirects=False)
    response = client.get("/api/auth/google/callback?code=abc&state=bad.state")
    assert response.status_code in (302, 307)
    assert "state_invalid" in response.headers["location"]


def test_callback_google_error_param_redirects_state_invalid():
    db = MagicMock()
    client = TestClient(make_callback_app(db), follow_redirects=False)
    state = make_valid_state()
    response = client.get(f"/api/auth/google/callback?error=access_denied&state={state}")
    assert response.status_code in (302, 307)
    assert "state_invalid" in response.headers["location"]


def test_callback_code_exchange_failure_redirects_google_failed():
    state = make_valid_state()
    db = MagicMock()
    client = TestClient(make_callback_app(db), follow_redirects=False)
    with patch("app.api.google_oauth._exchange_code", side_effect=ValueError("exchange failed")):
        response = client.get(f"/api/auth/google/callback?code=bad-code&state={state}")
    assert response.status_code in (302, 307)
    assert "google_failed" in response.headers["location"]


def test_callback_id_token_verification_failure_redirects_google_failed():
    state = make_valid_state()
    db = MagicMock()
    client = TestClient(make_callback_app(db), follow_redirects=False)
    with patch("app.api.google_oauth._exchange_code", return_value={"access_token": "acc", "id_token": "id"}), \
         patch("app.api.google_oauth._verify_google_id_token", side_effect=ValueError("bad jwt")):
        response = client.get(f"/api/auth/google/callback?code=code&state={state}")
    assert response.status_code in (302, 307)
    assert "google_failed" in response.headers["location"]


def test_callback_new_user_happy_path_redirects_to_frontend():
    state = make_valid_state("login")
    nonce = _decode_state_payload_unsafe(state)["nonce"]
    db = make_db(user_row=None)
    client = TestClient(make_callback_app(db), follow_redirects=False)

    with patch("app.api.google_oauth._exchange_code", return_value={"access_token": "acc", "id_token": "idt"}), \
         patch("app.api.google_oauth._verify_google_id_token", return_value={
             "email": "newuser@example.com", "email_verified": True, "sub": "google-123"
         }), \
         patch("app.api.google_oauth._get_userinfo", return_value={"name": "New User", "picture": "https://pic.url"}):
        response = client.get(f"/api/auth/google/callback?code=code&state={state}")

    assert response.status_code in (302, 307)
    assert "auth/google/callback" in response.headers["location"]
    assert "auth_token" in response.headers.get("set-cookie", "")


def test_callback_inactive_user_redirects_account_inactive():
    state = make_valid_state()
    inactive_user = FakeRow(
        id="u1", email="x@x.com", full_name="X", role="customer",
        phone=None, avatar_url=None, timezone="UTC",
        is_active=False, email_verified=True,
    )
    db = make_db(user_row=inactive_user)
    client = TestClient(make_callback_app(db), follow_redirects=False)

    with patch("app.api.google_oauth._exchange_code", return_value={"access_token": "acc", "id_token": "idt"}), \
         patch("app.api.google_oauth._verify_google_id_token", return_value={
             "email": "x@x.com", "email_verified": True, "sub": "g-sub"
         }), \
         patch("app.api.google_oauth._get_userinfo", return_value={}):
        response = client.get(f"/api/auth/google/callback?code=code&state={state}")

    assert response.status_code in (302, 307)
    assert "account_inactive" in response.headers["location"]
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd backend
pytest tests/test_google_oauth.py::test_callback_missing_code_redirects_state_invalid -v
```

Expected: FAIL — `404 Not Found` (callback endpoint not defined yet).

- [ ] **Step 3: Add the private HTTP helpers to `google_oauth.py`**

Append these three private helpers to `backend/app/api/google_oauth.py`:

```python
def _exchange_code(code: str) -> dict:
    """Exchange authorization code for tokens via Google's token endpoint."""
    res = httpx.post(
        GOOGLE_TOKEN_URL,
        data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        timeout=10.0,
    )
    if res.status_code != 200:
        raise ValueError(f"Token exchange failed ({res.status_code}): {res.text}")
    return res.json()


def _verify_google_id_token(id_token_str: str, nonce: str) -> dict:
    """Verify Google ID token signature with JWKS and validate all claims."""
    try:
        header = jose_jwt.get_unverified_header(id_token_str)
    except JWTError as exc:
        raise ValueError(f"Cannot parse token header: {exc}")

    kid = header.get("kid")

    # Fetch Google's public JWKS
    try:
        jwks_res = httpx.get(GOOGLE_JWKS_URL, timeout=10.0)
        jwks_res.raise_for_status()
        jwks = jwks_res.json()
    except Exception as exc:
        raise ValueError(f"Failed to fetch Google public keys: {exc}")

    key_data = next(
        (k for k in jwks.get("keys", []) if k.get("kid") == kid), None
    )
    if not key_data:
        raise ValueError("No matching public key found for token kid")

    # Verify signature and standard claims
    try:
        rsa_key = jose_jwk.construct(key_data, algorithm="RS256")
        claims = jose_jwt.decode(
            id_token_str,
            rsa_key,
            algorithms=["RS256"],
            audience=settings.GOOGLE_CLIENT_ID,
            issuer=GOOGLE_ISSUER,
        )
    except JWTError as exc:
        raise ValueError(f"Token verification failed: {exc}")

    # Validate nonce (replay protection)
    if claims.get("nonce") != nonce:
        raise ValueError("Nonce mismatch — possible replay attack")

    return claims


def _get_userinfo(access_token: str) -> dict:
    """Fetch profile enrichment from userinfo endpoint. Non-fatal — returns {} on failure."""
    try:
        res = httpx.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10.0,
        )
        if res.status_code == 200:
            return res.json()
    except Exception:
        pass
    return {}
```

- [ ] **Step 4: Add the `callback` endpoint to `google_oauth.py`**

Append to `backend/app/api/google_oauth.py`:

```python
@router.get("/google/callback")
def google_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Google OAuth 2.0 callback. Validates state, exchanges code, verifies id_token,
    finds or creates user, creates a session, sets cookie, and redirects to frontend.
    """
    # Default error mode before state is parsed
    mode = "login"

    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        return RedirectResponse(
            _frontend_error_url(mode, "oauth_not_configured"), status_code=302
        )

    # Reject if Google returned an error or required params are missing
    if error or not code or not state:
        return RedirectResponse(
            _frontend_error_url(mode, "state_invalid"), status_code=302
        )

    # 1. Validate signed state (CSRF protection)
    try:
        state_payload = _verify_state(state)
    except ValueError:
        return RedirectResponse(
            _frontend_error_url(mode, "state_invalid"), status_code=302
        )

    mode = state_payload.get("mode", "login")
    nonce = state_payload["nonce"]

    # 2. Exchange authorization code for tokens (server-to-server)
    try:
        tokens = _exchange_code(code)
    except ValueError:
        return RedirectResponse(
            _frontend_error_url(mode, "google_failed"), status_code=302
        )

    id_token_str = tokens.get("id_token")
    access_token = tokens.get("access_token")
    if not id_token_str or not access_token:
        return RedirectResponse(
            _frontend_error_url(mode, "google_failed"), status_code=302
        )

    # 3. Verify id_token signature and claims (iss, aud, exp, nonce)
    try:
        claims = _verify_google_id_token(id_token_str, nonce)
    except ValueError:
        return RedirectResponse(
            _frontend_error_url(mode, "google_failed"), status_code=302
        )

    email = claims.get("email")
    email_verified = claims.get("email_verified", False)
    if not email or not email_verified:
        return RedirectResponse(
            _frontend_error_url(mode, "google_failed"), status_code=302
        )

    # 4. Fetch profile enrichment (non-fatal — identity already established)
    userinfo = _get_userinfo(access_token)
    full_name: Optional[str] = userinfo.get("name")
    avatar_url: Optional[str] = userinfo.get("picture")

    # 5. Find or create local user by email (idempotent)
    user = db.execute(
        text("""
            SELECT id, email, full_name, role, phone, avatar_url, timezone,
                   is_active, email_verified
            FROM users WHERE email = :email
        """),
        {"email": email},
    ).fetchone()

    if not user:
        # New user — create with Google profile data
        role = "customer"
        role_exists = db.execute(
            text("SELECT 1 FROM roles WHERE name = :role"), {"role": role}
        ).fetchone()
        if not role_exists:
            return RedirectResponse(
                _frontend_error_url(mode, "google_failed"), status_code=302
            )

        user_id = str(uuid.uuid4())
        user = db.execute(
            text("""
                INSERT INTO users
                    (id, email, full_name, role, avatar_url, timezone, email_verified, is_active)
                VALUES
                    (:id, :email, :full_name, :role, :avatar_url, :timezone, TRUE, TRUE)
                RETURNING id, email, full_name, role, phone, avatar_url, timezone,
                          is_active, email_verified
            """),
            {
                "id": user_id,
                "email": email,
                "full_name": full_name,
                "role": role,
                "avatar_url": avatar_url,
                "timezone": DEFAULT_APP_TIMEZONE,
            },
        ).fetchone()
    else:
        # Existing user — check active, backfill missing fields
        if not user.is_active:
            return RedirectResponse(
                _frontend_error_url(mode, "account_inactive"), status_code=302
            )

        updates = []
        params: dict = {"id": user.id}

        if not user.email_verified:
            updates.append("email_verified = TRUE")
        if avatar_url and not user.avatar_url:
            updates.append("avatar_url = :avatar_url")
            params["avatar_url"] = avatar_url
        if full_name and not user.full_name:
            updates.append("full_name = :full_name")
            params["full_name"] = full_name

        if updates:
            db.execute(
                text(f"UPDATE users SET {', '.join(updates)} WHERE id = :id"),
                params,
            )

    # 6. Create session — commit BEFORE building the redirect response
    token = create_app_session(user.id, db)
    db.commit()

    frontend = settings.FRONTEND_URL.rstrip("/")
    redirect_response = RedirectResponse(
        f"{frontend}/auth/google/callback", status_code=302
    )
    set_auth_cookie(redirect_response, token)
    return redirect_response
```

- [ ] **Step 5: Run all google_oauth tests**

```bash
cd backend
pytest tests/test_google_oauth.py -v
```

Expected: 23 tests PASSED.

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/google_oauth.py backend/tests/test_google_oauth.py
git commit -m "feat: add GET /api/auth/google/callback endpoint with OIDC id_token verification"
```

---

## Task 7: Register router and smoke-test

**Files:**
- Modify: `backend/app/main.py`

- [ ] **Step 1: Register the new router in `main.py`**

In `backend/app/main.py`, add the import alongside the existing auth import:

```python
from app.api import auth, users, services, staff, availability, admin, locations, telegram, google_oauth
```

Then add the router registration after `app.include_router(auth.router)`:

```python
app.include_router(google_oauth.router)
```

- [ ] **Step 2: Verify the server starts**

```bash
cd backend
uvicorn app.main:app --reload &
sleep 2
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health
```

Expected: `200`

- [ ] **Step 3: Verify start endpoint is reachable**

```bash
curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:8000/api/auth/google/start?mode=login" \
  --max-redirs 0
```

Expected: `302` (redirects to Google or to error URL if env not configured — both are valid 302s).

Kill the background server: `kill %1`

- [ ] **Step 4: Run full test suite**

```bash
cd backend
pytest tests/ -v
```

Expected: all tests PASSED.

- [ ] **Step 5: Commit**

```bash
git add backend/app/main.py
git commit -m "feat: register google_oauth router in FastAPI app"
```

---

## Task 8: Create the frontend callback page

**Files:**
- Create: `app/auth/google/callback/page.tsx`
- Create: `app/auth/google/callback/callback-client.tsx`

- [ ] **Step 1: Create the server wrapper `page.tsx`**

Create `app/auth/google/callback/page.tsx`:

```tsx
import { Suspense } from "react";
import GoogleCallbackClient from "./callback-client";

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Signing in…</p>
          </div>
        </div>
      }
    >
      <GoogleCallbackClient />
    </Suspense>
  );
}
```

- [ ] **Step 2: Create `callback-client.tsx`**

Create `app/auth/google/callback/callback-client.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const ERROR_MESSAGES: Record<string, string> = {
  state_invalid:
    "The login attempt was invalid or expired. Please try again.",
  account_inactive:
    "Your account has been disabled. Please contact support.",
  oauth_not_configured:
    "Google login is not available right now.",
  google_failed:
    "Google login failed. Please try again or use email instead.",
};

function getErrorMessage(code: string | null): string {
  if (!code) return ERROR_MESSAGES.google_failed;
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.google_failed;
}

export default function GoogleCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");

  const [status, setStatus] = useState<"loading" | "error">(
    errorCode ? "error" : "loading"
  );

  useEffect(() => {
    if (errorCode) return; // show error state, no API call needed

    async function finishLogin() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json();
        const role = data?.user?.role;

        if (role === "admin" || role === "superadmin") {
          router.replace("/admin/dashboard");
        } else if (role === "staff") {
          router.replace("/staff/dashboard");
        } else if (role) {
          router.replace("/#home-services");
        } else {
          // No user found — treat as failure
          router.replace("/auth?mode=login&error=google_failed");
        }
      } catch {
        router.replace("/auth?mode=login&error=google_failed");
      }
    }

    void finishLogin();
  }, [errorCode, router]);

  if (status === "error" || errorCode) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-sm text-destructive mb-4">
            {getErrorMessage(errorCode)}
          </p>
          <Link
            href="/auth?mode=login"
            className="text-sm underline underline-offset-4 hover:opacity-70"
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Signing in…</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to the new files.

- [ ] **Step 4: Commit**

```bash
git add app/auth/google/callback/page.tsx app/auth/google/callback/callback-client.tsx
git commit -m "feat: add /auth/google/callback frontend redirect bridge page"
```

---

## Task 9: Update `auth-client.tsx` and `auth-shell.tsx`

**Files:**
- Modify: `app/auth/auth-client.tsx`
- Modify: `components/auth/auth-shell.tsx`

- [ ] **Step 1: Remove GSI code from `auth-client.tsx`**

Open `app/auth/auth-client.tsx`. Remove the following entirely:

1. The `Window` interface declaration with `google.accounts.id` (lines 21–35)
2. The `googleClientId` variable: `const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;`
3. The `googleInitialized` ref: `const googleInitialized = useRef(false);`
4. The `googleReady` state: `const [googleReady, setGoogleReady] = useState(false);`
5. The `handleGoogleCredential` callback (the entire `useCallback` block)
6. The `useEffect` that loads the GSI script from `accounts.google.com/gsi/client`

- [ ] **Step 2: Replace `handleGoogleLogin` with redirect logic**

Replace the current `handleGoogleLogin` function with:

```typescript
const handleGoogleLogin = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  setGoogleLoading(true);
  // Navigate to FastAPI start endpoint; page navigates away so googleLoading never resets
  window.location.href = `${apiUrl}/api/auth/google/start?mode=${mode}`;
};
```

- [ ] **Step 3: Update props passed to `AuthShell` in `auth-client.tsx`**

In the `<AuthShell ...>` JSX block, make these changes:

Remove these props:
- `googleClientId={googleClientId}`
- `googleReady={googleReady}`

Add this prop:
- `googleEnabled={!!process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED}`

- [ ] **Step 4: Update `AuthShellProps` type in `auth-shell.tsx`**

Open `components/auth/auth-shell.tsx`. In the `AuthShellProps` type:

Remove:
```typescript
  googleClientId?: string;
  googleReady: boolean;
```

Add:
```typescript
  googleEnabled: boolean;
```

- [ ] **Step 5: Update the Google button render condition in `auth-shell.tsx`**

Find wherever the Google button is conditionally rendered using `!!googleClientId`. Replace the condition with `googleEnabled`:

```tsx
{googleEnabled && (
  <button
    type="button"
    onClick={onGoogleLogin}
    disabled={googleLoading}
    // ... rest of existing button JSX unchanged
  >
    ...
  </button>
)}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Verify the dev server starts**

```bash
npm run dev &
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/auth
```

Expected: `200`. Kill the server: `kill %1`

- [ ] **Step 8: Commit**

```bash
git add app/auth/auth-client.tsx components/auth/auth-shell.tsx
git commit -m "feat: replace Google GSI prompt with backend OAuth redirect in auth-client"
```

---

## Task 10: Final verification

- [ ] **Step 1: Run full backend test suite**

```bash
cd backend
pytest tests/ -v
```

Expected: all tests PASSED, no regressions.

- [ ] **Step 2: Check for any remaining hardcoded `secure=False` cookie calls**

```bash
grep -rn "set_cookie" backend/app/
```

Expected: results should only be in `core/session.py` (via `set_auth_cookie`) and in `auth.py` for the `delete_cookie` calls in `logout`. Any remaining `set_cookie` with hardcoded `secure=False` is a bug — fix by routing through `set_auth_cookie`.

- [ ] **Step 3: Check frontend has no remaining GSI references**

```bash
grep -rn "accounts.google.com/gsi\|NEXT_PUBLIC_GOOGLE_CLIENT_ID\|google\.accounts\.id" app/ components/
```

Expected: no matches.

- [ ] **Step 4: Verify `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` controls button visibility**

In `.env.local`, temporarily set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=` (empty), start the dev server, navigate to `http://localhost:3000/auth`, and confirm the Google button does not appear. Restore the value when done.

- [ ] **Step 5: Manual end-to-end test (requires Google Cloud Console config)**

Preconditions:
- `backend/.env` has `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback`
- `FRONTEND_URL=http://localhost:3000` in `backend/.env`
- `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` in `.env.local`
- Both servers running

Steps:
1. Navigate to `http://localhost:3000/auth?mode=login`
2. Click "Continue with Google"
3. Complete Google authentication
4. Confirm you land on `http://localhost:3000/auth/google/callback` briefly
5. Confirm you are redirected to `/#home-services` (for a customer account)
6. Confirm the `auth_token` cookie is set (DevTools → Application → Cookies → `HttpOnly: true`)
7. Refresh the page — confirm you remain logged in

- [ ] **Step 6: Verify existing email/password login still works**

1. Navigate to `http://localhost:3000/auth?mode=login`
2. Log in with email and password
3. Confirm redirect works correctly by role

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: verify Google OAuth 2.0 refactor complete — all flows tested"
```

---

## Google Cloud Console Setup (one-time)

Before Step 5 of Task 10 works, register the callback URI in Google Cloud Console:

1. Go to **APIs & Services → Credentials**
2. Open your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:
   - `http://localhost:8000/api/auth/google/callback` (development)
   - `https://api.yourdomain.com/api/auth/google/callback` (production)
4. Remove previously registered JavaScript origins from the old GSI flow (optional cleanup)
5. Save

---

## Rollback

If something goes wrong before the refactor is confirmed stable:

```bash
# Backend rollback
git revert HEAD~N  # where N = number of commits since the refactor started
# or restore individual files from git history

# Frontend rollback
git checkout <pre-refactor-sha> -- app/auth/auth-client.tsx components/auth/auth-shell.tsx
```

No database migration is involved — there is nothing to migrate down.
