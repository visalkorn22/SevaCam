# Map & Location Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared location library, multi-location service assignment, interactive Leaflet.js maps in the booking flow, and Telegram Bot location sharing on the confirmation page.

**Architecture:** The `locations` table already exists but lacks `lat/lng` — a single migration adds them plus the `service_locations` junction table, `telegram_connections`, and `location_id` on `bookings`. A shared `LocationMapView` React component (Leaflet, `ssr:false`) is reused across the service detail page, booking branch-selection step, booking summary, and confirmation page.

**Tech Stack:** Leaflet.js + react-leaflet, OpenStreetMap tiles, Nominatim geocoding (free, no key), Telegram Bot API, FastAPI, Next.js App Router, Tailwind CSS v4.

---

## Pre-flight checks

Before starting, verify the backend is running and the DB is accessible:

```bash
cd backend
uvicorn app.main:app --reload   # in one terminal
# in another terminal
curl http://localhost:8000/health  # expect {"status":"ok"}
```

---

## Task 1: Database Migration — add lat/lng, service_locations, telegram_connections, bookings.location_id

**Files:**
- Create: `backend/alembic/versions/20260412_add_map_location_feature.py`

- [ ] **Step 1: Create the migration file**

```python
# backend/alembic/versions/20260412_add_map_location_feature.py
"""add map location feature

Revision ID: 20260412maploc
Revises: 20260401utcmigrate
Create Date: 2026-04-12 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20260412maploc"
down_revision: Union[str, Sequence[str], None] = "20260401utcmigrate"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # 1. Add latitude/longitude to existing locations table
    location_cols = {col["name"] for col in inspector.get_columns("locations")}
    if "latitude" not in location_cols:
        op.add_column("locations", sa.Column("latitude", sa.Float(), nullable=True))
    if "longitude" not in location_cols:
        op.add_column("locations", sa.Column("longitude", sa.Float(), nullable=True))

    # 2. Create service_locations junction table
    table_names = set(inspector.get_table_names())
    if "service_locations" not in table_names:
        op.create_table(
            "service_locations",
            sa.Column("service_id", sa.UUID(), nullable=False),
            sa.Column("location_id", sa.UUID(), nullable=False),
            sa.ForeignKeyConstraint(["service_id"], ["services.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["location_id"], ["locations.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("service_id", "location_id"),
        )

    # 3. Create telegram_connections table
    if "telegram_connections" not in table_names:
        op.create_table(
            "telegram_connections",
            sa.Column("id", sa.UUID(), primary_key=True, nullable=False),
            sa.Column("user_id", sa.UUID(), nullable=False),
            sa.Column("chat_id", sa.BigInteger(), nullable=False, unique=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("now()"),
            ),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        )

    # 4. Add location_id to bookings
    booking_cols = {col["name"] for col in inspector.get_columns("bookings")}
    if "location_id" not in booking_cols:
        op.add_column(
            "bookings",
            sa.Column("location_id", sa.UUID(), nullable=True),
        )
        op.create_foreign_key(
            "fk_bookings_location_id",
            "bookings",
            "locations",
            ["location_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    op.drop_constraint("fk_bookings_location_id", "bookings", type_="foreignkey")
    op.drop_column("bookings", "location_id")
    op.drop_table("telegram_connections")
    op.drop_table("service_locations")
    op.drop_column("locations", "longitude")
    op.drop_column("locations", "latitude")
```

- [ ] **Step 2: Run the migration**

```bash
cd backend
alembic upgrade head
```

Expected output ends with: `Running upgrade 20260401utcmigrate -> 20260412maploc`

- [ ] **Step 3: Verify columns exist**

```bash
cd backend
python -c "
from app.core.database import engine
from sqlalchemy import inspect, text
insp = inspect(engine)
print('locations cols:', [c['name'] for c in insp.get_columns('locations')])
print('service_locations exists:', 'service_locations' in insp.get_table_names())
print('telegram_connections exists:', 'telegram_connections' in insp.get_table_names())
print('bookings cols:', [c['name'] for c in insp.get_columns('bookings') if 'location' in c['name']])
"
```

Expected: `latitude` and `longitude` in locations cols, both new tables exist, `location_id` in bookings cols.

- [ ] **Step 4: Commit**

```bash
git add backend/alembic/versions/20260412_add_map_location_feature.py
git commit -m "feat: add migration for lat/lng, service_locations, telegram_connections, bookings.location_id"
```

---

## Task 2: Update Location Schemas + Admin CRUD to include lat/lng

**Files:**
- Modify: `backend/app/models/schemas.py` (lines ~159–178)
- Modify: `backend/app/api/admin.py`

- [ ] **Step 1: Write failing test**

```python
# backend/tests/test_locations.py
import os, sys, pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")

from app.core.database import get_db
from app.core.auth import require_roles

class FakeRow:
    def __init__(self, **kwargs):
        self._mapping = kwargs

def make_db(fetchone_val=None):
    mock_db = MagicMock()
    result = MagicMock()
    result.fetchone.return_value = fetchone_val
    mock_db.execute.return_value = result
    return mock_db

def make_app(mock_db, mock_user):
    from app.api.admin import router
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[require_roles("admin", "superadmin")] = lambda: mock_user
    return app

def test_create_location_includes_lat_lng():
    created = FakeRow(
        id="loc-1", name="Main Branch", timezone="Asia/Phnom_Penh",
        address="123 St", latitude=11.5564, longitude=104.9282,
        is_active=True, created_at="2026-01-01T00:00:00"
    )
    db = make_db(created)
    user = {"id": "u1", "role": "admin"}
    client = TestClient(make_app(db, user))
    resp = client.post("/api/admin/locations", json={
        "name": "Main Branch",
        "address": "123 St",
        "latitude": 11.5564,
        "longitude": 104.9282,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["latitude"] == 11.5564
    assert data["longitude"] == 104.9282
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd backend
pytest tests/test_locations.py::test_create_location_includes_lat_lng -v
```

Expected: FAIL — `LocationCreate` has no `latitude`/`longitude` fields.

- [ ] **Step 3: Update schemas**

In `backend/app/models/schemas.py`, replace the Location schemas block (around line 159):

```python
# Location Schemas
class LocationCreate(BaseModel):
    name: str
    timezone: str = "Asia/Phnom_Penh"
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_active: bool = True

class LocationUpdate(BaseModel):
    name: Optional[str] = None
    timezone: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_active: Optional[bool] = None

class LocationResponse(BaseModel):
    id: str
    name: str
    timezone: str
    address: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    is_active: bool
    created_at: datetime
```

- [ ] **Step 4: Update admin.py create_location INSERT**

In `backend/app/api/admin.py`, update the `create_location` function's INSERT and params:

```python
@router.post("/locations", response_model=LocationResponse)
def create_location(
    payload: LocationCreate,
    current_user: dict = Depends(require_roles("admin", "superadmin")),
    db: Session = Depends(get_db),
):
    location_id = str(uuid.uuid4())
    db.execute(
        text("""
        INSERT INTO locations (id, name, timezone, address, latitude, longitude, is_active)
        VALUES (:id, :name, :timezone, :address, :latitude, :longitude, :is_active)
        """),
        {
            "id": location_id,
            "name": payload.name,
            "timezone": payload.timezone,
            "address": payload.address,
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "is_active": payload.is_active,
        },
    )
    log_audit(db, current_user.get("id"), "create", "location", location_id, payload.model_dump())
    db.commit()
    created = db.execute(
        text("SELECT * FROM locations WHERE id = :id"), {"id": location_id}
    ).fetchone()
    return dict(created._mapping)
```

- [ ] **Step 5: Update admin.py update_location to handle lat/lng**

In the `update_location` function, add after the `is_active` block:

```python
    if payload.latitude is not None:
        updates.append("latitude = :latitude")
        params["latitude"] = payload.latitude
    if payload.longitude is not None:
        updates.append("longitude = :longitude")
        params["longitude"] = payload.longitude
```

Also wrap the existing raw SQL strings with `text()`:
```python
    result = db.execute(
        text(f"UPDATE locations SET {', '.join(updates)} WHERE id = :id"),
        params,
    )
    # ... and:
    updated = db.execute(
        text("SELECT * FROM locations WHERE id = :id"), {"id": location_id}
    ).fetchone()
```

Also wrap the `delete_location` and `list_locations` raw strings:
```python
# list_locations:
result = db.execute(text("SELECT * FROM locations ORDER BY created_at DESC"))
# delete_location:
result = db.execute(text("DELETE FROM locations WHERE id = :id"), {"id": location_id})
```

- [ ] **Step 6: Run test to confirm it passes**

```bash
cd backend
pytest tests/test_locations.py::test_create_location_includes_lat_lng -v
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/models/schemas.py backend/app/api/admin.py backend/tests/test_locations.py
git commit -m "feat: add latitude/longitude to location schemas and admin CRUD"
```

---

## Task 3: Public locations endpoint + service_locations API

**Files:**
- Create: `backend/app/api/locations.py`
- Modify: `backend/app/api/services.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/test_locations_public.py
import os, sys
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")

from app.core.database import get_db
from app.core.auth import get_current_user, require_roles

class FakeRow:
    def __init__(self, **kwargs):
        self._mapping = kwargs
    def __iter__(self):
        return iter([self])

class FakeResult:
    def __init__(self, rows):
        self._rows = rows
    def fetchall(self):
        return self._rows
    def fetchone(self):
        return self._rows[0] if self._rows else None

def make_db(fetchall_val=None, fetchone_val=None):
    mock_db = MagicMock()
    result = MagicMock()
    result.fetchall.return_value = fetchall_val or []
    result.fetchone.return_value = fetchone_val
    mock_db.execute.return_value = result
    return mock_db

def make_app(mock_db):
    from app.api.locations import router
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: mock_db
    return app

def test_list_locations_public():
    row = FakeRow(
        id="loc-1", name="Main Branch", timezone="Asia/Phnom_Penh",
        address="123 St", latitude=11.5564, longitude=104.9282,
        is_active=True, created_at="2026-01-01T00:00:00"
    )
    db = make_db(fetchall_val=[row])
    client = TestClient(make_app(db))
    resp = client.get("/api/locations")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["name"] == "Main Branch"
    assert data[0]["latitude"] == 11.5564
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd backend
pytest tests/test_locations_public.py::test_list_locations_public -v
```

Expected: FAIL — module `app.api.locations` does not exist.

- [ ] **Step 3: Create `backend/app/api/locations.py`**

```python
# backend/app/api/locations.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List

from app.core.database import get_db
from app.models.schemas import LocationResponse

router = APIRouter(prefix="/api/locations", tags=["locations"])


@router.get("/", response_model=List[LocationResponse])
def list_locations(db: Session = Depends(get_db)):
    """Public endpoint — returns all active locations."""
    rows = db.execute(
        text("SELECT * FROM locations WHERE is_active = TRUE ORDER BY name")
    ).fetchall()
    return [dict(row._mapping) for row in rows]


@router.get("/{location_id}", response_model=LocationResponse)
def get_location(location_id: str, db: Session = Depends(get_db)):
    row = db.execute(
        text("SELECT * FROM locations WHERE id = :id"), {"id": location_id}
    ).fetchone()
    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Location not found")
    return dict(row._mapping)
```

- [ ] **Step 4: Register the router in main.py**

In `backend/app/main.py`, add after the existing router imports:

```python
from app.api import auth, users, services, staff, availability, admin, locations
```

And add after `app.include_router(admin.router)`:

```python
app.include_router(locations.router)
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
cd backend
pytest tests/test_locations_public.py::test_list_locations_public -v
```

Expected: PASS

- [ ] **Step 6: Add service_locations assignment to services.py**

In `backend/app/api/services.py`, add these two functions before the `handleSubmit` area (after the existing GET service by ID endpoint). Find the route `@router.get("/{service_id}")` and add AFTER it:

```python
@router.get("/{service_id}/locations")
def get_service_locations(service_id: str, db: Session = Depends(get_db)):
    """Return all locations assigned to a service."""
    rows = db.execute(
        text("""
        SELECT l.*
        FROM locations l
        JOIN service_locations sl ON sl.location_id = l.id
        WHERE sl.service_id = :service_id AND l.is_active = TRUE
        ORDER BY l.name
        """),
        {"service_id": service_id},
    ).fetchall()
    return [dict(row._mapping) for row in rows]


@router.put("/{service_id}/locations")
def set_service_locations(
    service_id: str,
    payload: dict,
    current_user: dict = Depends(require_permissions("services:manage")),
    db: Session = Depends(get_db),
):
    """Replace the full set of locations for a service. payload: {"location_ids": [...]}"""
    location_ids: list[str] = payload.get("location_ids", [])
    db.execute(
        text("DELETE FROM service_locations WHERE service_id = :sid"),
        {"sid": service_id},
    )
    for loc_id in location_ids:
        db.execute(
            text("INSERT INTO service_locations (service_id, location_id) VALUES (:sid, :lid)"),
            {"sid": service_id, "lid": loc_id},
        )
    db.commit()
    return {"ok": True, "location_ids": location_ids}
```

Also add `text` to the imports at the top of `services.py` if not already there (check line 1–10 — `from sqlalchemy import text` is already present).

- [ ] **Step 7: Update GET /api/services and GET /api/services/{id} to embed locations**

In the `get_service_by_id` function in `services.py`, after fetching the service row and before returning, add:

```python
    service_data = dict(row._mapping)
    service_data["id"] = str(service_data["id"])
    if service_data.get("admin_id"):
        service_data["admin_id"] = str(service_data["admin_id"])

    # Embed assigned locations
    loc_rows = db.execute(
        text("""
        SELECT l.id, l.name, l.address, l.latitude, l.longitude, l.timezone
        FROM locations l
        JOIN service_locations sl ON sl.location_id = l.id
        WHERE sl.service_id = :sid AND l.is_active = TRUE
        ORDER BY l.name
        """),
        {"sid": service_data["id"]},
    ).fetchall()
    service_data["locations"] = [
        {
            "id": str(r._mapping["id"]),
            "name": r._mapping["name"],
            "address": r._mapping["address"],
            "latitude": r._mapping["latitude"],
            "longitude": r._mapping["longitude"],
            "timezone": r._mapping["timezone"],
        }
        for r in loc_rows
    ]
    return service_data
```

- [ ] **Step 8: Commit**

```bash
git add backend/app/api/locations.py backend/app/api/services.py backend/app/main.py backend/tests/test_locations_public.py
git commit -m "feat: add public locations endpoint and service_locations assignment API"
```

---

## Task 4: Update bookings API to accept location_id

**Files:**
- Modify: `backend/app/models/schemas.py` (BookingCreate)
- Modify: `backend/app/api/bookings.py`

- [ ] **Step 1: Write failing test**

```python
# Add to backend/tests/test_locations.py

def test_booking_create_schema_has_location_id():
    from app.models.schemas import BookingCreate
    from datetime import datetime, timezone
    b = BookingCreate(
        service_id="s1",
        staff_id="st1",
        customer_id="c1",
        start_time_utc=datetime(2026, 5, 1, 10, 0, tzinfo=timezone.utc),
        location_id="loc-1",
    )
    assert b.location_id == "loc-1"
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd backend
pytest tests/test_locations.py::test_booking_create_schema_has_location_id -v
```

Expected: FAIL — `BookingCreate` has no `location_id` field.

- [ ] **Step 3: Update BookingCreate schema**

In `backend/app/models/schemas.py`, update `BookingCreate` (around line 419):

```python
class BookingCreate(BaseModel):
    service_id: str
    staff_id: str
    customer_id: str
    start_time_utc: datetime
    booking_source: str = "web"
    customer_timezone: str = "Asia/Phnom_Penh"
    location_id: Optional[str] = None
```

- [ ] **Step 4: Update the INSERT in bookings.py**

In `backend/app/api/bookings.py`, find the `INSERT INTO bookings` around line 705. Replace:

```python
    db.execute(
        """
        INSERT INTO bookings (id, service_id, staff_id, customer_id, start_time_utc,
                            end_time_utc, booking_source, customer_timezone, status, payment_status)
        VALUES (:id, :service_id, :staff_id, :customer_id, :start_time_utc,
                :end_time_utc, :booking_source, :customer_timezone, :status, :payment_status)
        """,
        {
            "id": booking_id,
            "service_id": booking.service_id,
            "staff_id": booking.staff_id,
            "customer_id": booking.customer_id,
            "start_time_utc": booking.start_time_utc,
            "end_time_utc": end_time_utc,
            "booking_source": booking.booking_source,
            "customer_timezone": booking.customer_timezone,
            "status": booking_status,
            "payment_status": payment_status,
        }
    )
```

With:

```python
    db.execute(
        text("""
        INSERT INTO bookings (id, service_id, staff_id, customer_id, start_time_utc,
                            end_time_utc, booking_source, customer_timezone, status,
                            payment_status, location_id)
        VALUES (:id, :service_id, :staff_id, :customer_id, :start_time_utc,
                :end_time_utc, :booking_source, :customer_timezone, :status,
                :payment_status, :location_id)
        """),
        {
            "id": booking_id,
            "service_id": booking.service_id,
            "staff_id": booking.staff_id,
            "customer_id": booking.customer_id,
            "start_time_utc": booking.start_time_utc,
            "end_time_utc": end_time_utc,
            "booking_source": booking.booking_source,
            "customer_timezone": booking.customer_timezone,
            "status": booking_status,
            "payment_status": payment_status,
            "location_id": booking.location_id,
        }
    )
```

Note: `text` is already imported in `bookings.py` via sqlalchemy.

- [ ] **Step 5: Run test to confirm it passes**

```bash
cd backend
pytest tests/test_locations.py::test_booking_create_schema_has_location_id -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/models/schemas.py backend/app/api/bookings.py
git commit -m "feat: add location_id to BookingCreate schema and bookings INSERT"
```

---

## Task 5: Telegram Bot router

**Files:**
- Create: `backend/app/api/telegram.py`
- Modify: `backend/app/core/config.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Add Telegram settings to config.py**

In `backend/app/core/config.py`, add inside `class Settings`:

```python
    # =========================
    # Telegram Bot
    # =========================
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_BOT_USERNAME: str = ""   # bot username without @
    TELEGRAM_WEBHOOK_URL: Optional[str] = None
```

- [ ] **Step 2: Write failing test**

```python
# backend/tests/test_telegram.py
import os, sys
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")

from app.core.database import get_db
from app.core.auth import get_current_user

class FakeRow:
    def __init__(self, **kwargs):
        self._mapping = kwargs

def make_db(fetchone_val=None):
    mock_db = MagicMock()
    result = MagicMock()
    result.fetchone.return_value = fetchone_val
    mock_db.execute.return_value = result
    return mock_db

def make_app(mock_db, mock_user):
    from app.api.telegram import router
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_user
    return app

def test_status_returns_not_connected_when_no_row():
    db = make_db(fetchone_val=None)
    user = {"id": "user-1", "role": "customer"}
    client = TestClient(make_app(db, user))
    resp = client.get("/api/telegram/status")
    assert resp.status_code == 200
    assert resp.json()["connected"] is False

def test_status_returns_connected_when_row_exists():
    row = FakeRow(id="t1", user_id="user-1", chat_id=123456789, created_at="2026-01-01")
    db = make_db(fetchone_val=row)
    user = {"id": "user-1", "role": "customer"}
    client = TestClient(make_app(db, user))
    resp = client.get("/api/telegram/status")
    assert resp.status_code == 200
    assert resp.json()["connected"] is True
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
cd backend
pytest tests/test_telegram.py -v
```

Expected: FAIL — module `app.api.telegram` does not exist.

- [ ] **Step 4: Create `backend/app/api/telegram.py`**

```python
# backend/app/api/telegram.py
import uuid
import httpx
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.config import settings

router = APIRouter(prefix="/api/telegram", tags=["telegram"])

ALGORITHM = "HS256"
CONNECT_TOKEN_MINUTES = 15


def _make_connect_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=CONNECT_TOKEN_MINUTES)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.SECRET_KEY, algorithm=ALGORITHM)


def _decode_connect_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload["sub"]
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired connect token")


@router.get("/status")
def telegram_status(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.execute(
        text("SELECT id FROM telegram_connections WHERE user_id = :uid"),
        {"uid": current_user["id"]},
    ).fetchone()
    return {"connected": row is not None}


@router.post("/webhook")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)):
    """Receives updates from Telegram. Handles /start {token} command."""
    body = await request.json()
    message = body.get("message", {})
    text_msg: str = message.get("text", "")
    chat_id: int = message.get("chat", {}).get("id")

    if not chat_id:
        return {"ok": True}

    if text_msg.startswith("/start"):
        parts = text_msg.split(" ", 1)
        if len(parts) < 2:
            return {"ok": True}
        token = parts[1].strip()
        try:
            user_id = _decode_connect_token(token)
        except HTTPException:
            return {"ok": True}  # silently ignore bad tokens

        # Upsert telegram_connections
        existing = db.execute(
            text("SELECT id FROM telegram_connections WHERE user_id = :uid"),
            {"uid": user_id},
        ).fetchone()
        if not existing:
            db.execute(
                text("""
                INSERT INTO telegram_connections (id, user_id, chat_id)
                VALUES (:id, :uid, :chat_id)
                ON CONFLICT (chat_id) DO UPDATE SET user_id = EXCLUDED.user_id
                """),
                {"id": str(uuid.uuid4()), "uid": user_id, "chat_id": chat_id},
            )
            db.commit()

        # Send welcome message
        _send_telegram_message(chat_id, "✅ Connected! You can now receive location cards from this booking system.")

    return {"ok": True}


@router.post("/send-location")
def send_location(
    payload: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a native Telegram location card + booking summary to the user's chat."""
    booking_id: str = payload.get("booking_id", "")
    if not booking_id:
        raise HTTPException(status_code=400, detail="booking_id required")

    # Check connection
    conn_row = db.execute(
        text("SELECT chat_id FROM telegram_connections WHERE user_id = :uid"),
        {"uid": current_user["id"]},
    ).fetchone()

    if not conn_row:
        connect_token = _make_connect_token(current_user["id"])
        return {
            "connected": False,
            "connect_token": connect_token,
            "bot_username": settings.TELEGRAM_BOT_USERNAME,
        }

    chat_id = conn_row._mapping["chat_id"]

    # Fetch booking + location
    booking = db.execute(
        text("""
        SELECT b.start_time_utc, b.customer_timezone,
               s.name AS service_name,
               l.name AS location_name, l.address, l.latitude, l.longitude
        FROM bookings b
        JOIN services s ON s.id = b.service_id
        LEFT JOIN locations l ON l.id = b.location_id
        WHERE b.id = :bid AND b.customer_id = (
            SELECT id FROM customers WHERE user_id = :uid LIMIT 1
        )
        """),
        {"bid": booking_id, "uid": current_user["id"]},
    ).fetchone()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    bm = booking._mapping
    if bm["latitude"] is None or bm["longitude"] is None:
        raise HTTPException(status_code=422, detail="This service has no location set")

    # Send native location card
    _send_telegram_location(chat_id, float(bm["latitude"]), float(bm["longitude"]))

    # Send text summary
    start_fmt = bm["start_time_utc"].strftime("%d %b %Y, %I:%M %p")
    msg = (
        f"📍 *{bm['location_name']}*\n"
        f"{bm['address']}\n\n"
        f"🗓 *{bm['service_name']}*\n"
        f"📅 {start_fmt} ({bm['customer_timezone']})"
    )
    _send_telegram_message(chat_id, msg, parse_mode="Markdown")

    return {"ok": True}


def _send_telegram_location(chat_id: int, latitude: float, longitude: float) -> None:
    if not settings.TELEGRAM_BOT_TOKEN:
        return
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendLocation"
    httpx.post(url, json={"chat_id": chat_id, "latitude": latitude, "longitude": longitude}, timeout=10)


def _send_telegram_message(chat_id: int, text: str, parse_mode: str = "") -> None:
    if not settings.TELEGRAM_BOT_TOKEN:
        return
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    body: dict = {"chat_id": chat_id, "text": text}
    if parse_mode:
        body["parse_mode"] = parse_mode
    httpx.post(url, json=body, timeout=10)
```

- [ ] **Step 5: Register telegram router in main.py**

In `backend/app/main.py`, update the import line:

```python
from app.api import auth, users, services, staff, availability, admin, locations, telegram
```

Add after `app.include_router(locations.router)`:

```python
app.include_router(telegram.router)
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
cd backend
pytest tests/test_telegram.py -v
```

Expected: both tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/app/api/telegram.py backend/app/core/config.py backend/app/main.py backend/tests/test_telegram.py
git commit -m "feat: add Telegram Bot router (status, webhook, send-location)"
```

---

## Task 6: Install Leaflet + create shared LocationMapView component

**Files:**
- Modify: `package.json` (npm install)
- Modify: `app/globals.css`
- Create: `components/booking/LocationMapView.tsx`

- [ ] **Step 1: Install dependencies**

```bash
cd c:/Personal/Y4T1/Internship/Dev/booking-schedule-system
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

- [ ] **Step 2: Import Leaflet CSS in globals.css**

At the very top of `app/globals.css`, add:

```css
@import "leaflet/dist/leaflet.css";
```

- [ ] **Step 3: Copy Leaflet marker icons to public/**

```bash
cp node_modules/leaflet/dist/images/marker-icon.png public/
cp node_modules/leaflet/dist/images/marker-icon-2x.png public/
cp node_modules/leaflet/dist/images/marker-shadow.png public/
```

- [ ] **Step 4: Create `components/booking/LocationMapView.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { MapPin, Navigation } from "lucide-react";

export interface LocationData {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface LocationMapViewProps {
  location: LocationData;
  height?: number;
  compact?: boolean;
}

export default function LocationMapView({
  location,
  height,
  compact = false,
}: LocationMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const mapHeight = height ?? (compact ? 200 : 280);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Dynamic import — Leaflet needs window
    import("leaflet").then((L) => {
      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "/marker-icon.png",
        iconRetinaUrl: "/marker-icon-2x.png",
        shadowUrl: "/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [location.latitude, location.longitude],
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      L.marker([location.latitude, location.longitude])
        .addTo(map)
        .bindPopup(`<b>${location.name}</b><br/>${location.address}`)
        .openPopup();

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [location.latitude, location.longitude, location.name, location.address]);

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{location.name}</p>
          <p className="text-xs text-[var(--text-disabled)]">{location.address}</p>
        </div>
      </div>

      <div
        ref={mapRef}
        style={{ height: mapHeight }}
        className="w-full rounded-[0.7rem] overflow-hidden border border-[var(--border-subtle)]"
      />

      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-[0.55rem] border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
      >
        <Navigation className="h-3.5 w-3.5" />
        Get Directions
      </a>
    </div>
  );
}
```

- [ ] **Step 5: Verify the component renders**

Start the dev server and navigate to any page. Confirm no SSR errors in the terminal about `window` or `document`.

```bash
npm run dev
```

Check terminal for errors. A Leaflet SSR error looks like: `ReferenceError: window is not defined`. If that appears, the component is being rendered server-side — make sure it's always imported with dynamic import in the pages where it's used (covered in Task 7).

- [ ] **Step 6: Commit**

```bash
git add components/booking/LocationMapView.tsx app/globals.css public/marker-icon.png public/marker-icon-2x.png public/marker-shadow.png package.json package-lock.json
git commit -m "feat: add LocationMapView component with Leaflet.js and OSM tiles"
```

---

## Task 7: Admin Location Library page

**Files:**
- Create: `app/admin/locations/page.tsx`
- Create: `app/admin/locations/LocationsClient.tsx`
- Create: `components/admin/LocationPickerMap.tsx`
- Modify: `components/dashboard/sidebar-config.ts`

- [ ] **Step 1: Add "Locations" to sidebar for admin and superadmin**

In `components/dashboard/sidebar-config.ts`, find the `adminSections` `"Operations"` section and add after `"Services"`:

```ts
{ title: "Locations", icon: MapPin, href: "/admin/locations" },
```

Also add to `superAdminSections` in the same position.

Add `MapPin` to the import at the top of the file (find the existing lucide-react import line and add `MapPin`).

- [ ] **Step 2: Create `components/admin/LocationPickerMap.tsx`**

This is the editable map used in the admin create/edit modal.

```tsx
"use client";

import { useEffect, useRef } from "react";

interface LocationPickerMapProps {
  latitude: number | null;
  longitude: number | null;
  onPinMove: (lat: number, lng: number) => void;
  height?: number;
}

export default function LocationPickerMap({
  latitude,
  longitude,
  onPinMove,
  height = 280,
}: LocationPickerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const defaultCenter: [number, number] = [11.5564, 104.9282]; // Phnom Penh

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "/marker-icon.png",
        iconRetinaUrl: "/marker-icon-2x.png",
        shadowUrl: "/marker-shadow.png",
      });

      const center: [number, number] =
        latitude && longitude ? [latitude, longitude] : defaultCenter;

      const map = L.map(mapRef.current!, {
        center,
        zoom: 14,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      if (latitude && longitude) {
        const marker = L.marker([latitude, longitude], { draggable: true }).addTo(map);
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          onPinMove(pos.lat, pos.lng);
        });
        markerRef.current = marker;
      }

      // Click to place/move pin
      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
          marker.on("dragend", () => {
            const pos = marker.getLatLng();
            onPinMove(pos.lat, pos.lng);
          });
          markerRef.current = marker;
        }
        onPinMove(lat, lng);
      });

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker when lat/lng props change externally (from Nominatim search)
  useEffect(() => {
    if (!mapInstanceRef.current || latitude === null || longitude === null) return;
    import("leaflet").then((L) => {
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      } else {
        const marker = L.marker([latitude, longitude], { draggable: true }).addTo(
          mapInstanceRef.current
        );
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          onPinMove(pos.lat, pos.lng);
        });
        markerRef.current = marker;
      }
      mapInstanceRef.current.setView([latitude, longitude], 15);
    });
  }, [latitude, longitude, onPinMove]);

  return (
    <div
      ref={mapRef}
      style={{ height }}
      className="w-full rounded-[0.7rem] overflow-hidden border border-[var(--border-subtle)]"
    />
  );
}
```

- [ ] **Step 3: Create `app/admin/locations/page.tsx`**

```tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import LocationsClient from "./LocationsClient";

async function getLocations() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";
  const res = await fetch(`${apiUrl}/api/admin/locations`, {
    headers: { Cookie: cookie },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

async function getMe() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";
  const res = await fetch(`${apiUrl}/api/auth/me`, {
    headers: { Cookie: cookie },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function LocationsPage() {
  const user = await getMe();
  if (!user || !["admin", "superadmin"].includes(user.role)) {
    redirect("/admin/dashboard");
  }
  const locations = await getLocations();
  return <LocationsClient initialLocations={locations} />;
}
```

- [ ] **Step 4: Create `app/admin/locations/LocationsClient.tsx`**

```tsx
"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const LocationPickerMap = dynamic(
  () => import("@/components/admin/LocationPickerMap"),
  { ssr: false }
);

type Location = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  is_active: boolean;
};

type LocationDraft = {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

async function geocodeAddress(query: string) {
  const params = new URLSearchParams({ q: query, format: "json", limit: "5" });
  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { "Accept-Language": "en" },
  });
  return res.json();
}

const emptyDraft = (): LocationDraft => ({
  name: "",
  address: "",
  latitude: null,
  longitude: null,
  timezone: "Asia/Phnom_Penh",
});

export default function LocationsClient({
  initialLocations,
}: {
  initialLocations: Location[];
}) {
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LocationDraft>(emptyDraft());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setSearchQuery("");
    setSearchResults([]);
    setModalOpen(true);
  };

  const openEdit = (loc: Location) => {
    setEditingId(loc.id);
    setDraft({
      name: loc.name,
      address: loc.address ?? "",
      latitude: loc.latitude,
      longitude: loc.longitude,
      timezone: loc.timezone,
    });
    setSearchQuery(loc.address ?? "");
    setSearchResults([]);
    setModalOpen(true);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimer) clearTimeout(searchTimer);
    if (value.length < 3) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const results = await geocodeAddress(value);
      setSearchResults(results);
    }, 500);
    setSearchTimer(t);
  };

  const selectResult = (result: any) => {
    setDraft((d) => ({
      ...d,
      address: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    }));
    setSearchQuery(result.display_name);
    setSearchResults([]);
  };

  const handlePinMove = useCallback((lat: number, lng: number) => {
    setDraft((d) => ({ ...d, latitude: lat, longitude: lng }));
  }, []);

  const handleSave = async () => {
    if (!draft.name.trim()) return;
    setIsSaving(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const url = editingId
        ? `${apiUrl}/api/admin/locations/${editingId}`
        : `${apiUrl}/api/admin/locations`;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("Save failed");
      const saved: Location = await res.json();
      setLocations((prev) =>
        editingId
          ? prev.map((l) => (l.id === editingId ? saved : l))
          : [saved, ...prev]
      );
      setModalOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this location? Services using it will lose their location.")) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    await fetch(`${apiUrl}/api/admin/locations/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    setLocations((prev) => prev.filter((l) => l.id !== id));
  };

  const fieldLabel = "mb-1.5 block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-disabled)]";
  const fieldInput = "h-10 rounded-[0.55rem] border border-[var(--border-subtle)] bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus-visible:border-[var(--accent-primary)] focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Locations</h1>
          <p className="text-sm text-[var(--text-disabled)]">Manage physical branch locations</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Location
        </Button>
      </div>

      {locations.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[0.85rem] border border-dashed border-[var(--border-subtle)] py-16 text-center">
          <MapPin className="h-8 w-8 text-[var(--text-disabled)]" />
          <p className="text-sm text-[var(--text-disabled)]">No locations yet. Add your first branch.</p>
        </div>
      ) : (
        <div className="rounded-[0.85rem] border border-[var(--border-subtle)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-inset)]">
                <th className="px-4 py-2.5 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-disabled)]">Name</th>
                <th className="px-4 py-2.5 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-disabled)]">Address</th>
                <th className="px-4 py-2.5 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-disabled)]">Coordinates</th>
                <th className="px-4 py-2.5 text-right text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-disabled)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc, i) => (
                <tr key={loc.id} className={i > 0 ? "border-t border-[var(--border-subtle)]" : ""}>
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{loc.name}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{loc.address ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--text-disabled)]">
                    {loc.latitude != null ? `${loc.latitude.toFixed(4)}, ${loc.longitude?.toFixed(4)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(loc)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(loc.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg rounded-[1rem] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[var(--text-primary)]">
              {editingId ? "Edit Location" : "New Location"}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div>
              <label className={fieldLabel}>Location Name</label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Main Branch"
                className={fieldInput}
              />
            </div>
            <div className="relative">
              <label className={fieldLabel}>Search Address</label>
              <Input
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Type to search address..."
                className={fieldInput}
              />
              {searchResults.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-[0.7rem] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-xl">
                  {searchResults.slice(0, 5).map((r, i) => (
                    <button
                      key={i}
                      onClick={() => selectResult(r)}
                      className="block w-full px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] first:rounded-t-[0.7rem] last:rounded-b-[0.7rem]"
                    >
                      {r.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <LocationPickerMap
              latitude={draft.latitude}
              longitude={draft.longitude}
              onPinMove={handlePinMove}
              height={260}
            />
            {draft.latitude !== null && (
              <p className="text-[0.68rem] text-[var(--text-disabled)]">
                Pin: {draft.latitude.toFixed(6)}, {draft.longitude?.toFixed(6)}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving || !draft.name.trim()}>
                {isSaving ? "Saving…" : "Save Location"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 5: Verify the admin locations page works**

With the dev server running (`npm run dev`), log in as admin and navigate to `/admin/locations`. Confirm:
- "Locations" appears in the admin sidebar under Operations
- The table renders (empty or with existing data)
- "Add Location" opens the modal
- Typing in the search box triggers Nominatim results after 500ms
- Clicking a result drops a pin on the map
- Dragging the pin updates the coordinates text
- Clicking directly on the map also places a pin
- Saving creates a new location and it appears in the table

- [ ] **Step 6: Commit**

```bash
git add app/admin/locations/ components/admin/LocationPickerMap.tsx components/dashboard/sidebar-config.ts
git commit -m "feat: add admin location library page with Nominatim search and Leaflet picker"
```

---

## Task 8: Service form — Location multi-select step

**Files:**
- Create: `app/admin/services/service-form/enhanced/EnhancedLocation.tsx`
- Modify: `app/admin/services/service-form/enhanced/types.ts`
- Modify: `app/admin/services/EnhancedServiceForm.tsx`

- [ ] **Step 1: Update `types.ts` to add `location_ids`**

In `app/admin/services/service-form/enhanced/types.ts`, add to `ServiceFormData`:

```ts
export type ServiceFormData = {
  name: string;
  description: string;
  category: string;
  duration_minutes: number;
  price: number;
  deposit_amount: number;
  max_capacity: number;
  buffer_minutes: number;
  image_url: string;
  image_urls: string[];
  is_active: boolean;
  tags: string;
  inclusions: string;
  prep_notes: string;
  location_ids: string[];
};
```

- [ ] **Step 2: Create `EnhancedLocation.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, Check } from "lucide-react";
import type { ServiceFormData, UpdateServiceField } from "./types";

const LocationMapView = dynamic(
  () => import("@/components/booking/LocationMapView"),
  { ssr: false }
);

type LocationOption = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

type EnhancedLocationProps = {
  formData: ServiceFormData;
  updateField: UpdateServiceField;
};

const fieldLabel =
  "mb-2 block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-disabled)]";

export default function EnhancedLocation({ formData, updateField }: EnhancedLocationProps) {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${apiUrl}/api/locations`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setLocations(data))
      .catch(() => setLocations([]))
      .finally(() => setLoading(false));
  }, []);

  const toggleLocation = (id: string) => {
    const current = formData.location_ids ?? [];
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    updateField("location_ids", next);
  };

  const selectedLocations = locations.filter((l) =>
    (formData.location_ids ?? []).includes(l.id)
  );

  const previewLocation = selectedLocations.find(
    (l) => l.latitude !== null && l.longitude !== null
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--text-disabled)]">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
        Loading locations…
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="rounded-[0.85rem] border border-dashed border-[var(--border-subtle)] p-8 text-center">
        <MapPin className="mx-auto mb-2 h-6 w-6 text-[var(--text-disabled)]" />
        <p className="text-sm text-[var(--text-disabled)]">
          No locations defined yet.{" "}
          <a href="/admin/locations" className="underline text-[var(--accent-primary)]">
            Create one first.
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <label className={fieldLabel}>Assign Branches</label>
        <p className="mb-3 text-xs text-[var(--text-disabled)]">
          Select all locations where this service is offered.
        </p>
        <div className="space-y-2">
          {locations.map((loc) => {
            const selected = (formData.location_ids ?? []).includes(loc.id);
            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => toggleLocation(loc.id)}
                className={`flex w-full items-center gap-3 rounded-[0.7rem] border px-4 py-3 text-left transition-colors ${
                  selected
                    ? "border-[var(--accent-primary)] bg-[rgba(122,213,221,0.08)]"
                    : "border-[var(--border-subtle)] bg-[var(--bg-inset)] hover:bg-[var(--bg-elevated)]"
                }`}
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                    selected
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]"
                      : "border-[var(--border-subtle)]"
                  }`}
                >
                  {selected && <Check className="h-3 w-3 text-black" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">{loc.name}</p>
                  {loc.address && (
                    <p className="truncate text-xs text-[var(--text-disabled)]">{loc.address}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {previewLocation && previewLocation.latitude !== null && previewLocation.longitude !== null && (
        <div>
          <label className={fieldLabel}>Map Preview</label>
          <LocationMapView
            location={{
              name: previewLocation.name,
              address: previewLocation.address ?? "",
              latitude: previewLocation.latitude,
              longitude: previewLocation.longitude,
            }}
            height={200}
            compact
          />
          {selectedLocations.length > 1 && (
            <p className="mt-1.5 text-[0.68rem] text-[var(--text-disabled)]">
              Showing first selected location. All {selectedLocations.length} branches will be available to customers.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add location step to EnhancedServiceForm**

In `app/admin/services/EnhancedServiceForm.tsx`:

1. Add import at the top:
```tsx
import EnhancedLocation from "./service-form/enhanced/EnhancedLocation";
import { MapPin } from "lucide-react";
```

2. Add `location_ids: []` to the initial `formData` state (inside the `useState<ServiceFormData>({...})` call):
```tsx
location_ids: Array.isArray(initialValues?.location_ids) ? initialValues.location_ids : [],
```

3. Add the new step to the `steps` array (after the staff step, or before schedule — add it as the last entry):
```tsx
{
  id: "location",
  title: "Locations",
  icon: MapPin,
  description: "Assign branch locations for this service",
},
```

4. Add the render block inside the steps conditional renders (after the schedule block):
```tsx
{steps[currentStep]?.id === "location" && (
  <EnhancedLocation
    formData={formData}
    updateField={updateField}
  />
)}
```

5. After service creation, call the location assignment endpoint. Find the block where `createdServiceId` is used after schedule creation, and add:

```tsx
      if (createdServiceId && formData.location_ids.length > 0) {
        await fetch(`/api/services/${createdServiceId}/locations`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ location_ids: formData.location_ids }),
        });
      }
```

- [ ] **Step 4: Verify in browser**

Navigate to `/admin/services/new`. Confirm:
- "Locations" step appears in the step indicator
- The checklist shows your saved locations
- Selecting locations updates the map preview below the list
- Creating a service with locations assigned calls the assignment endpoint (check network tab or server logs)

- [ ] **Step 5: Commit**

```bash
git add app/admin/services/service-form/enhanced/EnhancedLocation.tsx app/admin/services/service-form/enhanced/types.ts app/admin/services/EnhancedServiceForm.tsx
git commit -m "feat: add location multi-select step to service creation form"
```

---

## Task 9: Customer-facing — Service detail page map

**Files:**
- Modify: `app/book/[serviceId]/page.tsx`

- [ ] **Step 1: Add `locations` to `ServiceRow` type and fetch**

In `app/book/[serviceId]/page.tsx`, update the `ServiceRow` type to add:

```tsx
type ServiceRow = {
  // ... existing fields ...
  locations?: Array<{
    id: string;
    name: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
  }>;
};
```

- [ ] **Step 2: Add dynamic LocationMapView import**

At the top of `app/book/[serviceId]/page.tsx`:

```tsx
import dynamic from "next/dynamic";
const LocationMapView = dynamic(
  () => import("@/components/booking/LocationMapView"),
  { ssr: false }
);
```

- [ ] **Step 3: Render map section in the service detail JSX**

Find the section after the service description renders and add before the closing of the service info section:

```tsx
{/* Location section */}
{service.locations && service.locations.filter(l => l.latitude !== null).length > 0 && (
  <div className="mt-6 space-y-4">
    <h3 className="text-sm font-semibold uppercase tracking-widest text-[var(--text-disabled)]">
      Location{service.locations.length > 1 ? "s" : ""}
    </h3>
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
```

- [ ] **Step 4: Verify in browser**

Navigate to a service detail page (e.g. `/book/[some-id]`). If that service has locations assigned with lat/lng, the map(s) should appear with the pin and "Get Directions" button.

- [ ] **Step 5: Commit**

```bash
git add app/book/[serviceId]/page.tsx
git commit -m "feat: show location maps on service detail page"
```

---

## Task 10: Customer-facing — Branch selection step in booking form

**Files:**
- Create: `components/booking/BranchSelectionStep.tsx`
- Modify: `components/booking/booking-form.tsx`

- [ ] **Step 1: Create `components/booking/BranchSelectionStep.tsx`**

```tsx
"use client";

import dynamic from "next/dynamic";
import { Check, MapPin } from "lucide-react";

const LocationMapView = dynamic(
  () => import("@/components/booking/LocationMapView"),
  { ssr: false }
);

export type BranchLocation = {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
};

interface BranchSelectionStepProps {
  locations: BranchLocation[];
  selectedLocationId: string | null;
  onSelect: (locationId: string) => void;
}

export default function BranchSelectionStep({
  locations,
  selectedLocationId,
  onSelect,
}: BranchSelectionStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Choose a Branch</h3>
        <p className="text-sm text-[var(--text-disabled)]">Select your preferred location for this appointment.</p>
      </div>
      <div className="space-y-3">
        {locations.map((loc) => {
          const selected = loc.id === selectedLocationId;
          return (
            <div
              key={loc.id}
              className={`rounded-[0.85rem] border p-4 transition-colors cursor-pointer ${
                selected
                  ? "border-[var(--accent-primary)] bg-[rgba(122,213,221,0.06)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-inset)] hover:bg-[var(--bg-elevated)]"
              }`}
              onClick={() => onSelect(loc.id)}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    selected
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]"
                      : "border-[var(--border-subtle)]"
                  }`}
                >
                  {selected && <Check className="h-3 w-3 text-black" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--text-primary)]">{loc.name}</p>
                  {loc.address && (
                    <p className="text-sm text-[var(--text-disabled)] mt-0.5">{loc.address}</p>
                  )}
                  {selected && loc.latitude !== null && loc.longitude !== null && (
                    <div className="mt-3">
                      <LocationMapView
                        location={{
                          name: loc.name,
                          address: loc.address,
                          latitude: loc.latitude,
                          longitude: loc.longitude,
                        }}
                        height={180}
                        compact
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add branch selection state and step to booking-form.tsx**

In `components/booking/booking-form.tsx`:

1. Import the new component and type at the top:
```tsx
import BranchSelectionStep, { type BranchLocation } from "./BranchSelectionStep";
```

2. Add `locations` to `BookingFormProps`:
```tsx
interface BookingFormProps {
  service: BookingService;
  staff: BookingStaff[];
  customer: BookingCustomer;
  bookingSource?: "web" | "social";
  locations?: BranchLocation[];  // ADD THIS
}
```

3. Add state inside the component:
```tsx
const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
  () => props.locations?.length === 1 ? (props.locations[0].id) : null
);
```
(Replace `props` with the destructured param name used in the component.)

4. Find where the booking steps array or step flow is defined. The form has steps like staff → date → time → summary. Add a branch step at the beginning if the service has multiple locations:

The exact step insertion depends on the booking form's step management. Find the `steps` definition or the step-rendering logic and add:
```tsx
// Insert before date/time selection if multiple locations
...(locations && locations.length > 1 ? [{
  id: "branch",
  label: "Choose Branch",
}] : []),
```

And render it:
```tsx
{currentStep === "branch" && locations && (
  <BranchSelectionStep
    locations={locations}
    selectedLocationId={selectedLocationId}
    onSelect={(id) => {
      setSelectedLocationId(id);
      // advance to next step
      setCurrentStep(/* next step id */);
    }}
  />
)}
```

5. Pass `location_id: selectedLocationId` in the booking POST payload when calling the backend.

- [ ] **Step 3: Pass locations to the booking form from the service page**

In `app/book/[serviceId]/page.tsx`, fetch the service locations and pass them to `<BookingForm>`:

```tsx
// After fetching service, also fetch locations:
const locations = service.locations?.filter(
  (l) => l.latitude !== null && l.longitude !== null
) ?? [];

// In JSX:
<BookingForm
  service={service}
  staff={staffOptions}
  customer={me}
  locations={locations}
/>
```

- [ ] **Step 4: Show map in booking summary step**

Inside `booking-form.tsx`, find where the booking summary is rendered (the final review step before payment). Add the selected location's map there:

```tsx
{selectedLocationId && locations && (() => {
  const loc = locations.find(l => l.id === selectedLocationId);
  if (!loc || loc.latitude === null) return null;
  return (
    <div className="mt-4">
      <LocationMapView
        location={{
          name: loc.name,
          address: loc.address,
          latitude: loc.latitude!,
          longitude: loc.longitude!,
        }}
        compact
      />
    </div>
  );
})()}
```

- [ ] **Step 5: Verify in browser**

Navigate to `/book/[serviceId]` for a service with 2+ locations. Confirm:
- Branch selection step appears first
- Selecting a branch shows the mini-map for that branch
- The booking summary shows the selected branch map
- Single-location services skip the branch step entirely

- [ ] **Step 6: Commit**

```bash
git add components/booking/BranchSelectionStep.tsx components/booking/booking-form.tsx app/book/[serviceId]/page.tsx
git commit -m "feat: add branch selection step and location map to booking flow"
```

---

## Task 11: Telegram Share Button on confirmation page

**Files:**
- Create: `components/payment/TelegramShareButton.tsx`
- Modify: `app/payment/[bookingId]/page.tsx`

- [ ] **Step 1: Create `components/payment/TelegramShareButton.tsx`**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Send, CheckCircle, Loader2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type State =
  | "idle"
  | "sending"
  | "not_connected"
  | "awaiting_start"
  | "sent"
  | "error";

interface TelegramShareButtonProps {
  bookingId: string;
}

export default function TelegramShareButton({ bookingId }: TelegramShareButtonProps) {
  const [state, setState] = useState<State>("idle");
  const [botUsername, setBotUsername] = useState("");
  const [connectToken, setConnectToken] = useState("");
  const [pollInterval, setPollInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  // Use a ref so startPolling can always call the latest sendLocation without stale closures
  const sendLocationRef = useRef<() => Promise<void>>();

  const stopPolling = useCallback(() => {
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
  }, [pollInterval]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const startPolling = useCallback(() => {
    const interval = setInterval(async () => {
      const res = await fetch("/api/telegram/status", { credentials: "include" });
      const data = await res.json();
      if (data.connected) {
        stopPolling();
        setState("idle");
        sendLocationRef.current?.();
      }
    }, 3000);
    setPollInterval(interval);
  }, [stopPolling]);

  const sendLocation = async () => {
    setState("sending");
    try {
      const res = await fetch("/api/telegram/send-location", {

        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ booking_id: bookingId }),
      });
      const data = await res.json();
      if (data.connected === false) {
        setBotUsername(data.bot_username ?? "");
        setConnectToken(data.connect_token ?? "");
        setState("not_connected");
        return;
      }
      if (!res.ok) { setState("error"); return; }
      setState("sent");
      setTimeout(() => setState("idle"), 4000);
    } catch {
      setState("error");
    }
  };
  // Keep ref in sync so startPolling can always call the latest version
  sendLocationRef.current = sendLocation;

  const handleStartBot = () => {
    setState("awaiting_start");
    startPolling();
  };

  const botLink = botUsername
    ? `https://t.me/${botUsername}?start=${connectToken}`
    : "";

  if (state === "sent") {
    return (
      <div className="flex items-center gap-2 rounded-[0.7rem] border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400">
        <CheckCircle className="h-4 w-4" />
        Location sent to your Telegram
      </div>
    );
  }

  if (state === "not_connected" || state === "awaiting_start") {
    return (
      <div className="space-y-3 rounded-[0.85rem] border border-[var(--border-subtle)] bg-[var(--bg-inset)] p-4">
        <p className="text-sm font-medium text-[var(--text-primary)]">Connect Telegram first</p>
        <p className="text-xs text-[var(--text-disabled)]">
          Open our Telegram bot and tap <strong>Start</strong> to link your account. Then come back here.
        </p>
        {botLink && (
          <a
            href={botLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-[0.55rem] bg-[#229ed9] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1e8fc4]"
          >
            <Send className="h-3.5 w-3.5" />
            Open @{botUsername}
          </a>
        )}
        {state === "awaiting_start" && (
          <p className="flex items-center gap-1.5 text-xs text-[var(--text-disabled)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Waiting for you to start the bot…
          </p>
        )}
        {state === "not_connected" && (
          <Button variant="ghost" size="sm" onClick={handleStartBot} className="text-xs">
            I&apos;ve started the bot
          </Button>
        )}
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={sendLocation}
      disabled={state === "sending"}
      className="gap-1.5 border-[var(--border-subtle)] text-[var(--text-secondary)]"
    >
      {state === "sending" ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Send className="h-4 w-4" />
      )}
      {state === "sending" ? "Sending…" : "Share Location to Telegram"}
    </Button>
  );
}
```

- [ ] **Step 2: Add Next.js proxy routes for Telegram**

Create `app/api/telegram/status/route.ts`:

```ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";
  const res = await fetch(`${apiUrl}/api/telegram/status`, {
    headers: { Cookie: cookie },
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

Create `app/api/telegram/send-location/route.ts`:

```ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function POST(request: Request) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";
  const body = await request.json();
  const res = await fetch(`${apiUrl}/api/telegram/send-location`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

- [ ] **Step 3: Add TelegramShareButton to the payment/confirmation page**

In `app/payment/[bookingId]/page.tsx`:

1. Import at the top:
```tsx
import TelegramShareButton from "@/components/payment/TelegramShareButton";
```

2. Find the `PaymentReceiptActions` component usage or the section where booking details are shown. Add `TelegramShareButton` after the existing action buttons, only if the booking has a location:

First add `location` to `BookingRow` type:
```tsx
type BookingRow = {
  // ... existing fields ...
  location?: {
    name: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
};
```

Then in JSX:
```tsx
{booking.location?.latitude && (
  <TelegramShareButton bookingId={booking.id} />
)}
```

Also show the map on the confirmation page:
```tsx
{booking.location?.latitude && booking.location?.longitude && (
  <div className="mt-6">
    <LocationMapView
      location={{
        name: booking.location.name,
        address: booking.location.address,
        latitude: booking.location.latitude!,
        longitude: booking.location.longitude!,
      }}
    />
  </div>
)}
```

Add dynamic import at top:
```tsx
import dynamic from "next/dynamic";
const LocationMapView = dynamic(
  () => import("@/components/booking/LocationMapView"),
  { ssr: false }
);
```

- [ ] **Step 4: Add TELEGRAM_BOT_USERNAME to backend .env**

Open `backend/.env` and add below `TELEGRAM_BOT_TOKEN`:

```
TELEGRAM_BOT_USERNAME=YourActualBotUsername
```

(Replace `YourActualBotUsername` with the bot's username from BotFather, without the `@`.)

- [ ] **Step 5: Register the Telegram webhook with Telegram**

After deploying or when your dev environment is publicly accessible (e.g. via ngrok), register the webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.com/api/telegram/webhook"}'
```

For local development, test by calling `send-location` directly — `not_connected` state will trigger showing the bot link.

- [ ] **Step 6: Verify end-to-end**

1. Go to a completed booking's confirmation page
2. If the booking's service has a location with lat/lng, the map appears
3. Click "Share Location to Telegram"
4. If not connected: the bot link appears — click it, start the bot in Telegram, come back
5. Once connected: clicking the button sends a native location card to your Telegram chat

- [ ] **Step 7: Commit**

```bash
git add components/payment/TelegramShareButton.tsx app/api/telegram/ app/payment/[bookingId]/page.tsx
git commit -m "feat: add Telegram Bot location share on booking confirmation page"
```

---

## Task 12: Final verification

- [ ] **Step 1: Run all backend tests**

```bash
cd backend
pytest tests/ -v
```

Expected: all tests PASS.

- [ ] **Step 2: Run frontend build check**

```bash
cd c:/Personal/Y4T1/Internship/Dev/booking-schedule-system
npm run lint
```

Expected: no ESLint errors.

- [ ] **Step 3: Full flow manual test**

Walk through this sequence:
1. Admin: create a location at `/admin/locations` with a Nominatim search + pin drag
2. Admin: create a service at `/admin/services/new`, assign the location on the Locations step
3. Customer: browse to that service at `/services` — location map appears
4. Customer: click "Book" — branch selection step appears (or skipped if 1 location)
5. Customer: complete booking — confirmation page shows map + Telegram button
6. Customer: click Telegram button → connect bot → receive location card in Telegram

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete map location feature — Leaflet maps, branch selection, Telegram Bot sharing"
```
