# Avatar Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users upload, display, and remove a personal avatar photo from the profile page, with server-side center-crop + resize to 256×256 WebP.

**Architecture:** A thin `avatar.py` FastAPI router handles HTTP, delegates all file I/O to `avatar_service.py` (Pillow resize, atomic write to `uploads/avatars/`), then writes the resulting relative path to `users.avatar_url`. The frontend resolves relative paths by prepending `NEXT_PUBLIC_API_URL`; absolute URLs (e.g. Google avatars) are used as-is.

**Tech Stack:** FastAPI, Pillow 11.x, SQLAlchemy (raw SQL), Next.js App Router, Tailwind CSS v4, lucide-react.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `backend/app/services/avatar_service.py` | Validate, crop, resize, atomically save/delete WebP files |
| Create | `backend/app/api/avatar.py` | `POST /api/me/avatar`, `DELETE /api/me/avatar` endpoints |
| Modify | `backend/app/main.py` | Register avatar router |
| Create | `backend/tests/test_avatar_service.py` | Unit tests for avatar_service |
| Create | `backend/tests/test_avatar_api.py` | Integration tests for avatar endpoints |
| Create | `lib/utils/avatar.ts` | `resolveAvatarUrl` helper |
| Modify | `app/profile/page.tsx` | Pass `avatar_url` and `id` to ProfileClient |
| Modify | `app/profile/ProfileClient.tsx` | Avatar upload UI section |

---

## Task 1: `avatar_service.py` — save and delete

**Files:**
- Create: `backend/app/services/avatar_service.py`

- [ ] **Step 1: Create the file**

```python
# backend/app/services/avatar_service.py
import os
import tempfile
from pathlib import Path

from fastapi import UploadFile
from PIL import Image, ImageOps

_AVATARS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "avatars"
_MAX_BYTES = 5 * 1024 * 1024  # 5 MB
_OUTPUT_SIZE = (256, 256)
_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _avatars_dir() -> Path:
    _AVATARS_DIR.mkdir(parents=True, exist_ok=True)
    return _AVATARS_DIR


async def save_avatar(user_id: str, file: UploadFile) -> str:
    """Validate, center-crop, resize to 256x256 WebP, atomically save.
    Returns the relative public path e.g. '/uploads/avatars/<user_id>.webp'.
    Raises ValueError with a short error_code string on validation failure.
    """
    content_type = file.content_type or ""
    if content_type not in _ALLOWED_TYPES:
        raise ValueError("invalid_file_type")

    contents = await file.read()
    if len(contents) > _MAX_BYTES:
        raise ValueError("file_too_large")

    try:
        # Write to temp file so Pillow can seek; also validates actual image content
        with tempfile.NamedTemporaryFile(delete=False, suffix=".tmp") as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        with Image.open(tmp_path) as img:
            img = ImageOps.exif_transpose(img)  # fix rotated phone photos
            img = img.convert("RGB")

            # Center-crop to square
            w, h = img.size
            side = min(w, h)
            left = (w - side) // 2
            top = (h - side) // 2
            img = img.crop((left, top, left + side, top + side))

            img = img.resize(_OUTPUT_SIZE, Image.LANCZOS)

            dest = _avatars_dir() / f"{user_id}.webp"
            # Atomic write: save to temp then rename
            with tempfile.NamedTemporaryFile(
                delete=False, suffix=".webp", dir=_avatars_dir()
            ) as out_tmp:
                out_path = out_tmp.name
            img.save(out_path, format="WEBP", quality=85)
            os.replace(out_path, dest)
    except ValueError:
        raise
    except Exception:
        raise ValueError("invalid_image")
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass

    return f"/uploads/avatars/{user_id}.webp"


def delete_avatar(user_id: str) -> None:
    """Delete the avatar file for user_id. Silent no-op if file does not exist."""
    path = _avatars_dir() / f"{user_id}.webp"
    try:
        path.unlink()
    except FileNotFoundError:
        pass
```

- [ ] **Step 2: Verify the file has no import errors**

```bash
cd backend
python -c "from app.services.avatar_service import save_avatar, delete_avatar; print('OK')"
```

Expected output: `OK`

---

## Task 2: Unit tests for `avatar_service`

**Files:**
- Create: `backend/tests/test_avatar_service.py`

- [ ] **Step 1: Write the tests**

```python
# backend/tests/test_avatar_service.py
import io
import os
import sys
import asyncio

import pytest
from PIL import Image
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")
os.environ.setdefault("SECRET_KEY", "test-secret")


def _make_upload_file(content: bytes, content_type: str, filename: str = "test.jpg"):
    f = MagicMock()
    f.content_type = content_type
    f.filename = filename
    f.read = AsyncMock(return_value=content)
    return f


def _make_image_bytes(mode="RGB", size=(400, 300), fmt="JPEG") -> bytes:
    buf = io.BytesIO()
    Image.new(mode, size, color=(100, 150, 200)).save(buf, format=fmt)
    return buf.getvalue()


def run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


# ── save_avatar ───────────────────────────────────────────────────────────────

def test_save_avatar_returns_relative_path(tmp_path):
    from app.services import avatar_service
    with patch.object(avatar_service, "_AVATARS_DIR", tmp_path):
        f = _make_upload_file(_make_image_bytes(), "image/jpeg")
        result = run(avatar_service.save_avatar("user-123", f))
    assert result == "/uploads/avatars/user-123.webp"


def test_save_avatar_creates_webp_file(tmp_path):
    from app.services import avatar_service
    with patch.object(avatar_service, "_AVATARS_DIR", tmp_path):
        f = _make_upload_file(_make_image_bytes(), "image/jpeg")
        run(avatar_service.save_avatar("user-abc", f))
    out = tmp_path / "user-abc.webp"
    assert out.exists()
    with Image.open(out) as img:
        assert img.size == (256, 256)
        assert img.format == "WEBP"


def test_save_avatar_rejects_invalid_content_type(tmp_path):
    from app.services import avatar_service
    with patch.object(avatar_service, "_AVATARS_DIR", tmp_path):
        f = _make_upload_file(b"data", "application/pdf")
        with pytest.raises(ValueError, match="invalid_file_type"):
            run(avatar_service.save_avatar("u1", f))


def test_save_avatar_rejects_oversized_file(tmp_path):
    from app.services import avatar_service
    big = b"x" * (6 * 1024 * 1024)
    with patch.object(avatar_service, "_AVATARS_DIR", tmp_path):
        f = _make_upload_file(big, "image/jpeg")
        with pytest.raises(ValueError, match="file_too_large"):
            run(avatar_service.save_avatar("u1", f))


def test_save_avatar_rejects_spoofed_file(tmp_path):
    from app.services import avatar_service
    with patch.object(avatar_service, "_AVATARS_DIR", tmp_path):
        f = _make_upload_file(b"this is not an image", "image/jpeg")
        with pytest.raises(ValueError, match="invalid_image"):
            run(avatar_service.save_avatar("u1", f))


def test_save_avatar_overwrites_existing(tmp_path):
    from app.services import avatar_service
    with patch.object(avatar_service, "_AVATARS_DIR", tmp_path):
        for _ in range(2):
            f = _make_upload_file(_make_image_bytes(size=(500, 500)), "image/jpeg")
            run(avatar_service.save_avatar("user-ow", f))
    files = list(tmp_path.glob("*.webp"))
    assert len(files) == 1


# ── delete_avatar ─────────────────────────────────────────────────────────────

def test_delete_avatar_removes_file(tmp_path):
    from app.services import avatar_service
    with patch.object(avatar_service, "_AVATARS_DIR", tmp_path):
        f = _make_upload_file(_make_image_bytes(), "image/jpeg")
        run(avatar_service.save_avatar("user-del", f))
        avatar_service.delete_avatar("user-del")
    assert not (tmp_path / "user-del.webp").exists()


def test_delete_avatar_silent_when_missing(tmp_path):
    from app.services import avatar_service
    with patch.object(avatar_service, "_AVATARS_DIR", tmp_path):
        avatar_service.delete_avatar("nonexistent-user")  # must not raise
```

- [ ] **Step 2: Run the tests — expect all to pass**

```bash
cd backend
python -m pytest tests/test_avatar_service.py -v
```

Expected: `8 passed`

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/avatar_service.py backend/tests/test_avatar_service.py
git commit -m "feat: add avatar_service — center-crop resize 256x256 WebP with atomic write"
```

---

## Task 3: `avatar.py` — API router

**Files:**
- Create: `backend/app/api/avatar.py`

- [ ] **Step 1: Create the router**

```python
# backend/app/api/avatar.py
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.services.avatar_service import delete_avatar, save_avatar

router = APIRouter(prefix="/api/me", tags=["avatar"])


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = str(current_user["id"])

    try:
        avatar_url = await save_avatar(user_id, file)
    except ValueError as exc:
        error_code = str(exc)
        messages = {
            "invalid_file_type": "Please upload a JPG, PNG, or WebP image.",
            "file_too_large": "File too large — max 5 MB.",
            "invalid_image": "File could not be read as an image.",
        }
        raise HTTPException(
            status_code=400,
            detail=messages.get(error_code, "Upload failed."),
        )

    db.execute(
        text("UPDATE users SET avatar_url = :url WHERE id = :id"),
        {"url": avatar_url, "id": user_id},
    )
    db.commit()
    return {"avatar_url": avatar_url}


@router.delete("/avatar")
def remove_avatar(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = str(current_user["id"])
    delete_avatar(user_id)
    db.execute(
        text("UPDATE users SET avatar_url = NULL WHERE id = :id"),
        {"id": user_id},
    )
    db.commit()
    return {"avatar_url": None}
```

- [ ] **Step 2: Register the router in `backend/app/main.py`**

Add the import and `app.include_router` call alongside the existing routers:

```python
# In the imports at the top (line ~5):
from app.api import auth, avatar, google_oauth, users, services, staff, availability, admin, locations, telegram

# After app.include_router(auth.router) (line ~23):
app.include_router(avatar.router)
```

- [ ] **Step 3: Verify the routes are registered**

```bash
cd backend
FEATURE_SET=core python -c "
from app.main import app
routes = [r.path for r in app.routes]
assert '/api/me/avatar' in routes, 'POST route missing'
print('Routes OK:', [r for r in routes if 'avatar' in r])
"
```

Expected output includes `/api/me/avatar` twice (POST + DELETE).

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/avatar.py backend/app/main.py
git commit -m "feat: add POST /api/me/avatar and DELETE /api/me/avatar endpoints"
```

---

## Task 4: API integration tests

**Files:**
- Create: `backend/tests/test_avatar_api.py`

- [ ] **Step 1: Write the tests**

```python
# backend/tests/test_avatar_api.py
import io
import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("SESSION_DAYS", "30")
os.environ.setdefault("COOKIE_NAME", "auth_token")
os.environ.setdefault("COOKIE_SECURE", "false")
os.environ.setdefault("COOKIE_SAMESITE", "lax")
os.environ.setdefault("COOKIE_PATH", "/")


FAKE_USER = {
    "id": "user-test-123",
    "email": "test@example.com",
    "full_name": "Test User",
    "role": "customer",
    "is_active": True,
    "email_verified": True,
}


def _make_image_bytes(size=(400, 300)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, color=(100, 150, 200)).save(buf, format="JPEG")
    return buf.getvalue()


def make_app(db):
    from app.api.avatar import router
    from app.core.auth import get_current_user
    from app.core.database import get_db

    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: FAKE_USER
    return app


def make_db():
    db = MagicMock()
    db.execute.return_value = MagicMock()
    return db


# ── POST /api/me/avatar ───────────────────────────────────────────────────────

def test_upload_avatar_happy_path(tmp_path):
    from app.services import avatar_service
    db = make_db()
    client = TestClient(make_app(db))

    with patch.object(avatar_service, "_AVATARS_DIR", tmp_path):
        resp = client.post(
            "/api/me/avatar",
            files={"file": ("photo.jpg", _make_image_bytes(), "image/jpeg")},
        )

    assert resp.status_code == 200
    assert resp.json()["avatar_url"] == "/uploads/avatars/user-test-123.webp"
    db.execute.assert_called()
    db.commit.assert_called_once()


def test_upload_avatar_invalid_type_returns_400(tmp_path):
    from app.services import avatar_service
    db = make_db()
    client = TestClient(make_app(db))

    with patch.object(avatar_service, "_AVATARS_DIR", tmp_path):
        resp = client.post(
            "/api/me/avatar",
            files={"file": ("doc.pdf", b"data", "application/pdf")},
        )

    assert resp.status_code == 400
    assert "JPG" in resp.json()["detail"] or "PNG" in resp.json()["detail"]


def test_upload_avatar_too_large_returns_400(tmp_path):
    from app.services import avatar_service
    db = make_db()
    client = TestClient(make_app(db))

    big = b"x" * (6 * 1024 * 1024)
    with patch.object(avatar_service, "_AVATARS_DIR", tmp_path):
        resp = client.post(
            "/api/me/avatar",
            files={"file": ("big.jpg", big, "image/jpeg")},
        )

    assert resp.status_code == 400
    assert "5 MB" in resp.json()["detail"]


# ── DELETE /api/me/avatar ─────────────────────────────────────────────────────

def test_delete_avatar_returns_null(tmp_path):
    from app.services import avatar_service
    db = make_db()
    client = TestClient(make_app(db))

    with patch.object(avatar_service, "_AVATARS_DIR", tmp_path):
        resp = client.delete("/api/me/avatar")

    assert resp.status_code == 200
    assert resp.json()["avatar_url"] is None
    db.commit.assert_called_once()


def test_delete_avatar_removes_file(tmp_path):
    from app.services import avatar_service

    # Create the file first
    (tmp_path / "user-test-123.webp").write_bytes(b"fake")

    db = make_db()
    client = TestClient(make_app(db))

    with patch.object(avatar_service, "_AVATARS_DIR", tmp_path):
        resp = client.delete("/api/me/avatar")

    assert resp.status_code == 200
    assert not (tmp_path / "user-test-123.webp").exists()
```

- [ ] **Step 2: Run all backend avatar tests**

```bash
cd backend
python -m pytest tests/test_avatar_service.py tests/test_avatar_api.py -v
```

Expected: `13 passed`

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_avatar_api.py
git commit -m "test: add avatar API integration tests"
```

---

## Task 5: `resolveAvatarUrl` frontend helper

**Files:**
- Create: `lib/utils/avatar.ts`

- [ ] **Step 1: Create the helper**

```typescript
// lib/utils/avatar.ts

/**
 * Resolve an avatar_url value to a displayable URL.
 * - Absolute URLs (Google profile photos) are used as-is.
 * - Relative paths (/uploads/...) are prefixed with NEXT_PUBLIC_API_URL.
 * - null/undefined returns null (caller shows initials fallback).
 * - cacheBust appends ?v=<number> to bust same-path overwrites.
 */
export function resolveAvatarUrl(
  avatarUrl: string | null | undefined,
  cacheBust?: number,
): string | null {
  if (!avatarUrl) return null;

  const base =
    avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")
      ? avatarUrl
      : `${process.env.NEXT_PUBLIC_API_URL ?? ""}${avatarUrl}`;

  return cacheBust ? `${base}?v=${cacheBust}` : base;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep avatar
```

Expected: no output (no errors in avatar.ts).

- [ ] **Step 3: Commit**

```bash
git add lib/utils/avatar.ts
git commit -m "feat: add resolveAvatarUrl helper for relative and absolute avatar URLs"
```

---

## Task 6: Profile page — pass `avatar_url` and `id` from server component

**Files:**
- Modify: `app/profile/page.tsx`

- [ ] **Step 1: Add `id` and `avatar_url` to `MeUser` type and pass to `ProfileClient`**

Replace the existing `MeUser` type and `ProfileClient` usage:

```typescript
// app/profile/page.tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import ProfileClient from "./ProfileClient";

type MeUser = {
  id: string;
  email: string;
  role: "customer" | "staff" | "admin" | "superadmin";
  full_name?: string | null;
  phone?: string | null;
  timezone?: string | null;
  avatar_url?: string | null;
};

async function getMe(): Promise<MeUser | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";

  const res = await fetch(`${apiUrl}/api/auth/me`, {
    method: "GET",
    headers: { Cookie: cookie },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return (await res.json()) as MeUser;
}

export default async function ProfilePage() {
  const me = await getMe();
  if (!me) redirect("/auth/login");

  return (
    <DashboardLayout>
      <ProfileClient user={me} />
    </DashboardLayout>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "profile/page|ProfileClient"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/profile/page.tsx
git commit -m "feat: pass avatar_url and id to ProfileClient from server component"
```

---

## Task 7: Profile page — avatar upload UI

**Files:**
- Modify: `app/profile/ProfileClient.tsx`

- [ ] **Step 1: Add imports at the top of `ProfileClient.tsx`**

Add to the existing import block:

```typescript
import { useRef, useState as useStateAlias } from "react";  // useRef is new
import { Camera } from "lucide-react";  // add Camera to existing lucide import
import { resolveAvatarUrl } from "@/lib/utils/avatar";
```

Specifically, update the existing lucide import line to include `Camera`:

```typescript
import {
  Camera,
  CheckCircle2,
  Clock3,
  KeyRound,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  XCircle,
} from "lucide-react";
```

And add `resolveAvatarUrl` import:

```typescript
import { resolveAvatarUrl } from "@/lib/utils/avatar";
```

- [ ] **Step 2: Update `ProfileUser` type to include `id` and `avatar_url`**

Find the existing `ProfileUser` type and replace it:

```typescript
type ProfileUser = {
  id: string;
  email: string;
  role?: "customer" | "staff" | "admin" | "superadmin";
  full_name?: string | null;
  phone?: string | null;
  timezone?: string | null;
  avatar_url?: string | null;
};
```

- [ ] **Step 3: Add avatar state variables inside `ProfileClient`**

Add these after the existing `const [profileSaving, setProfileSaving] = useState(false);` line:

```typescript
const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatar_url ?? null);
const [cacheBust, setCacheBust] = useState<number>(0);
const [avatarUploading, setAvatarUploading] = useState(false);
const [avatarError, setAvatarError] = useState<string | null>(null);
const fileInputRef = useRef<HTMLInputElement>(null);
```

- [ ] **Step 4: Add avatar upload handlers inside `ProfileClient`**

Add these handler functions after the existing state declarations, before the `return` statement:

```typescript
const triggerFilePicker = () => {
  if (!avatarUploading) fileInputRef.current?.click();
};

const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  // Reset input so the same file can be re-selected after an error
  if (fileInputRef.current) fileInputRef.current.value = "";
  if (!file) return;

  // Client-side validation
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    setAvatarError("Please upload a JPG, PNG, or WebP image.");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    setAvatarError("File too large — max 5 MB.");
    return;
  }

  setAvatarError(null);
  setAvatarUploading(true);

  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${apiUrl}/api/me/avatar`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.detail ?? "Upload failed — please try again.");
    }

    const data = await res.json();
    setAvatarUrl(data.avatar_url);
    setCacheBust(Date.now());
  } catch (err) {
    setAvatarError(err instanceof Error ? err.message : "Upload failed.");
  } finally {
    setAvatarUploading(false);
  }
};

const handleRemoveAvatar = async () => {
  setAvatarError(null);
  setAvatarUploading(true);

  try {
    const res = await fetch(`${apiUrl}/api/me/avatar`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Remove failed — please try again.");
    setAvatarUrl(null);
    setCacheBust(0);
  } catch (err) {
    setAvatarError(err instanceof Error ? err.message : "Remove failed.");
  } finally {
    setAvatarUploading(false);
  }
};
```

- [ ] **Step 5: Replace the existing initials avatar `<div>` with the full avatar section**

Find this block in the JSX (around line 215):

```tsx
<div className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-(--seva-elevated) text-[0.86rem] font-semibold uppercase tracking-[0.16em] text-(--seva-text)">
  {initials}
</div>
```

Replace it with:

```tsx
{/* Avatar upload section */}
<div className="flex flex-col items-center gap-2">
  {/* Hidden file input */}
  <input
    ref={fileInputRef}
    type="file"
    accept="image/jpeg,image/png,image/webp"
    className="hidden"
    onChange={handleFileChange}
    aria-label="Upload profile photo"
  />

  {/* Clickable avatar circle */}
  <button
    type="button"
    onClick={triggerFilePicker}
    disabled={avatarUploading}
    aria-label="Change profile photo"
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") triggerFilePicker();
    }}
    className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-(--seva-elevated) focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:opacity-60"
  >
    {resolveAvatarUrl(avatarUrl, cacheBust || undefined) ? (
      <img
        src={resolveAvatarUrl(avatarUrl, cacheBust || undefined)!}
        alt={fullName || user.email}
        className="h-full w-full object-cover"
      />
    ) : (
      <span className="flex h-full w-full items-center justify-center text-[0.86rem] font-semibold uppercase tracking-[0.16em] text-(--seva-text)">
        {initials}
      </span>
    )}

    {/* Hover / loading overlay */}
    <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
      {avatarUploading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      ) : (
        <Camera className="h-4 w-4 text-white" />
      )}
    </span>
  </button>

  {/* Change photo + Remove buttons */}
  <div className="flex flex-col items-center gap-1">
    <button
      type="button"
      onClick={triggerFilePicker}
      disabled={avatarUploading}
      className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-(--seva-text-soft) hover:text-(--seva-text) transition-colors disabled:opacity-40"
    >
      {avatarUploading ? "Uploading…" : "Change photo"}
    </button>

    {avatarUrl && !avatarUploading && (
      <button
        type="button"
        onClick={handleRemoveAvatar}
        className="text-[0.62rem] text-(--seva-text-muted) hover:text-red-400 transition-colors"
      >
        Remove
      </button>
    )}
  </div>

  {/* Inline error */}
  {avatarError && (
    <p className="text-[0.72rem] text-[#ffd5b8] max-w-[140px] text-center leading-5">
      {avatarError}
    </p>
  )}
</div>
```

- [ ] **Step 6: Verify TypeScript — no errors in profile files**

```bash
npx tsc --noEmit 2>&1 | grep -E "profile|avatar"
```

Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add app/profile/ProfileClient.tsx
git commit -m "feat: add avatar upload UI to profile page — click or button, initials fallback, cache-bust"
```

---

## Task 8: End-to-end smoke test

- [ ] **Step 1: Start both servers**

Terminal 1:
```bash
cd backend && uvicorn app.main:app --reload
```

Terminal 2:
```bash
npm run dev
```

- [ ] **Step 2: Test the happy path**

1. Go to `http://localhost:3000/auth` and log in
2. Navigate to `http://localhost:3000/profile`
3. Click the avatar circle → file picker opens
4. Select a JPG/PNG/WebP photo → spinner appears → avatar updates immediately
5. Refresh the page → avatar persists (loaded from `avatar_url` in DB)
6. Click "Remove" → avatar reverts to initials
7. Verify `backend/uploads/avatars/<your-user-id>.webp` was created then deleted

- [ ] **Step 3: Test error cases**

1. Try uploading a PDF → inline error "Please upload a JPG, PNG, or WebP image."
2. Try uploading a file > 5 MB → inline error "File too large — max 5 MB."
3. Try selecting the same file twice in a row → file picker opens both times (input reset working)

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: avatar upload — backend resize + atomic write, frontend upload UI complete"
```
