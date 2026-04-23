# Avatar Upload — Design Spec
**Date:** 2026-04-22
**Status:** Approved

---

## Overview

Add profile avatar upload to the booking system. Users can upload a photo from the profile page; the backend resizes it to 256×256 WebP and stores it locally. Google sign-in users get their Google profile photo imported automatically and can replace it later. `avatar_url` (already in the `users` table) is the single source of truth — no migration required.

---

## Goals

- Upload, display, and remove a personal avatar from the profile page
- Server-side center-crop + resize to 256×256 WebP (consistent size, small files)
- Local disk storage for dev/single-VPS; abstracted so S3/Cloudinary can replace it later without touching the API or database
- Google OAuth already sets `avatar_url` from the provider — this feature lets users override it

---

## Non-Goals (this phase)

- `avatar_public_id` and `avatar_type` columns — deferred until external storage is added
- Cloudinary / S3 integration — storage abstraction is designed for it but not implemented
- In-browser crop UI — server-side crop is sufficient

---

## Database

No migration needed. `users.avatar_url VARCHAR(255)` already exists.

**Storage rule:**
- Uploaded local file: relative path `/uploads/avatars/<user_id>.webp`
- Google profile photo: absolute URL `https://...googleusercontent.com/...`
- No avatar: `NULL`

Relative paths are stored as-is; the frontend prefixes `NEXT_PUBLIC_API_URL` for local files. Absolute URLs (Google) are used directly. A helper function handles both cases.

---

## Backend

### `backend/app/services/avatar_service.py`

Responsibilities: validate, process, and persist avatar files. No HTTP logic.

```
save_avatar(user_id: str, file: UploadFile) -> str
    - enforce ≤ 5 MB before reading fully
    - validate content-type: image/jpeg, image/png, image/webp
    - open with Pillow (validates actual content, rejects spoofed types)
    - apply ImageOps.exif_transpose (fixes rotated phone photos)
    - center-crop to square, resize to 256×256, LANCZOS resampling
    - write to temp file, atomically rename to uploads/avatars/<user_id>.webp
    - return "/uploads/avatars/<user_id>.webp"

delete_avatar(user_id: str) -> None
    - delete uploads/avatars/<user_id>.webp if it exists (silent no-op if missing)
```

Output directory `uploads/avatars/` is created on first use.

### `backend/app/api/avatar.py`

Thin router, no processing logic.

**`POST /api/me/avatar`** — requires auth cookie
1. Validate file type and size client hint (service does final validation)
2. Call `avatar_service.save_avatar(current_user.id, file)`
3. `UPDATE users SET avatar_url = :url WHERE id = :id`
4. Return `{"avatar_url": "/uploads/avatars/<user_id>.webp"}`

**`DELETE /api/me/avatar`** — requires auth cookie
1. Call `avatar_service.delete_avatar(current_user.id)`
2. `UPDATE users SET avatar_url = NULL WHERE id = :id`
3. Return `{"avatar_url": null}`

### `backend/app/main.py`

Register `avatar.router` alongside existing routers (no prefix needed — routes are already namespaced under `/api/me`).

---

## Frontend

### Avatar URL helper (`lib/utils/avatar.ts`)

```ts
export function resolveAvatarUrl(avatarUrl: string | null, cacheBust?: number): string | null {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
    return cacheBust ? `${avatarUrl}?v=${cacheBust}` : avatarUrl;
  }
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  return `${base}${avatarUrl}${cacheBust ? `?v=${cacheBust}` : ""}`;
}
```

### Profile page avatar section (`app/profile/ProfileClient.tsx`)

**Display:**
- Circular image, 96×96 (desktop) / 80×80 (mobile)
- If `resolveAvatarUrl(avatar_url, cacheBust)` is non-null → `<img>`
- If null → SVG initials avatar built from `full_name` (first + last initial, coloured background)
- Hidden `<input type="file" accept="image/jpeg,image/png,image/webp" ref={fileInputRef}>`

**Triggers (both):**
- Clicking the avatar circle calls `fileInputRef.current.click()`
- "Change photo" button calls `fileInputRef.current.click()`
- Camera icon overlay on the avatar circle, visible on hover (CSS only); persistent small badge on mobile

**On file selected (`onChange`):**
1. Client-side check: type in `[image/jpeg, image/png, image/webp]` and size ≤ 5 MB — show inline error and abort if invalid
2. Reset file input value (`fileInputRef.current.value = ""`) after handling (success or error), so re-selecting the same file fires `onChange`
3. Set `uploading = true`, disable avatar click / "Change photo" / "Remove" during request
4. `POST /api/me/avatar` with `FormData`, `credentials: "include"`
5. On success: update `avatar_url` state + `setCacheBust(Date.now())`
6. On error: show inline error message below the avatar section

**Remove:**
- "Remove" text link below the button, visible only when `avatar_url` is non-null
- `DELETE /api/me/avatar`, `credentials: "include"`
- On success: clear `avatar_url` state + `setCacheBust(0)`

**Accessibility:**
- Avatar `<div>` has `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space triggers file picker)
- "Change photo" is a `<button>` with clear label
- `<img>` has `alt={full_name ?? "Profile photo"}`
- "Remove" is a real `<button>` styled as a text link

---

## Error Handling

| Scenario | Backend response | Frontend display |
|---|---|---|
| File too large (>5MB) | 400 `file_too_large` | "File too large — max 5 MB" (inline) |
| Invalid file type | 400 `invalid_file_type` | "Please upload a JPG, PNG, or WebP image" (inline) |
| Pillow cannot open file | 400 `invalid_image` | "File could not be read as an image" (inline) |
| Auth missing | 401 | Redirect to /auth (handled globally) |
| Server error | 500 | "Upload failed — please try again" (inline) |

---

## Data Flow

```
User selects file
  → client validates type + size
  → POST /api/me/avatar (multipart, with cookie)
    → avatar_service.save_avatar()
      → Pillow: exif_transpose → center-crop → 256×256 → WebP
      → atomic write to uploads/avatars/<user_id>.webp
    → UPDATE users SET avatar_url = '/uploads/avatars/<user_id>.webp'
    → return { avatar_url }
  → frontend: update state + cacheBust = Date.now()
  → <img src="http://localhost:8000/uploads/avatars/<user_id>.webp?v=1234567890">
```

---

## File Structure

```
backend/
  app/
    api/
      avatar.py            ← new
    services/
      avatar_service.py    ← new
  uploads/
    avatars/               ← created on first upload

app/
  profile/
    ProfileClient.tsx      ← modified (avatar section)

lib/
  utils/
    avatar.ts              ← new helper
```

---

## Environment Variables

No new variables required for local dev. Future S3 additions:

```env
# Future only — not implemented in this phase
STORAGE_DRIVER=local      # or s3
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```
