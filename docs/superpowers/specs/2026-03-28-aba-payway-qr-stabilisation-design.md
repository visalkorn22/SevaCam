# ABA PayWay QR Stabilisation — Design Spec

**Date:** 2026-03-28
**Author:** Claude Code (brainstorming session)
**Status:** Approved by user
**Scope:** Backend-only. No frontend changes required.

---

## Problem Statement

The ABA PayWay QR payment flow is partially working but unstable:

- PayWay sometimes returns `status.code = "00"` with `qrImage`, `qrString`, and `abapay_deeplink` — so the QR generation path is functional.
- However, scanning in the ABA sandbox app can still return "transaction not found." This is partly a provider-side sandbox limitation, not purely a code bug.
- Earlier failures were caused by hash/payload issues. Some may still persist.
- After QR creation, every GET on a pending payment immediately calls `_fetch_payway_transaction_detail`, which hits PayWay and frequently returns "transaction not found" — causing noisy 502 logs and degraded UX even before the user has had a chance to scan.

### Out of scope

- ABA sandbox app behaviour after scanning (provider-side, cannot be fixed in our code).
- Frontend changes — the existing frontend already handles QR display, fallback rendering, sandbox banner, deferred polling, and manual sandbox confirmation correctly.
- Stripe — untouched.

---

## Approach: Option B — Targeted Fixes + Sandbox Grace Period

Five targeted changes to `backend/app/api/payments.py` and one new config field.

---

## Change 1a — Fix Amount Format in QR Hash

**File:** `backend/app/api/payments.py`
**Function:** `_create_payway_qr`
**Priority:** High — confirmed source of past "Wrong Hash" errors.

**Current code:**
```python
amount_value = float(amount_decimal)
# ...
amount_hash_value = str(payload["amount"])  # → "1.0" for $1.00
```

**Fixed code:**
```python
amount_value = float(amount_decimal)
amount_hash_value = format(amount_decimal, "f")  # → "1.00" for $1.00
```

`format(amount_decimal, "f")` is explicit and stable. It formats a `Decimal` as a fixed-point string without scientific notation, matching the `"1.00"` string that the checkout path already produces via `f"{Decimal(...):.2f}"`.

The `payload["amount"]` field sent in the JSON body stays as `float` — only the hash input string changes.

---

## Change 1b — Null Optional Fields in QR Payload

**Status: Investigate, do not blindly omit.**

The current payload sends `None` for `return_deeplink`, `custom_fields`, `return_params`, `payout`. These serialise as JSON `null`.

This is **not confirmed** to cause failures. PayWay example payloads sometimes include these optional keys. The hash must always match the payload exactly — so either both include or both omit is safe; a mismatch between the two is not.

**Rule:**
- If current QR generation succeeds end-to-end with the null fields present, leave them.
- Only revisit if there is evidence (e.g. a fresh "Wrong Hash" or "Invalid Items" error) that these specific fields are the cause.
- Do not treat omission as a safe default without a working request to prove it.

**No implementation change in this iteration.**

---

## Change 1c — Relax qrImage / qrString Validation

**File:** `backend/app/api/payments.py`
**Function:** `_create_payway_qr`
**Priority:** Medium — prevents false 502 in sandbox when only one of the two fields is returned.

**Current code:**
```python
if not isinstance(qr_image, str) or not qr_image.strip():
    raise HTTPException(status_code=502, detail="Payway QR response missing qrImage")
if not isinstance(qr_string, str) or not qr_string.strip():
    raise HTTPException(status_code=502, detail="Payway QR response missing qrString")
```

**Fixed code:**
```python
qr_image = response_payload.get("qrImage")
qr_string = response_payload.get("qrString")
has_qr_image = isinstance(qr_image, str) and qr_image.strip()
has_qr_string = isinstance(qr_string, str) and qr_string.strip()
if not has_qr_image and not has_qr_string:
    raise HTTPException(
        status_code=502,
        detail="PayWay QR response missing both qrImage and qrString"
    )
```

If only one is present, continue normally. The response dict sets whichever is present and `None` for the other. The frontend already handles both cases via its `normalizeAbaIntent` fallback chain.

---

## Change 2 — Transaction-Detail "Not Found" Handling

**File:** `backend/app/api/payments.py`
**Functions:** `_fetch_payway_transaction_detail`, `_sync_payway_payment_status`

### 2a — Sentinel return from `_fetch_payway_transaction_detail`

**Current behaviour:** Any non-00 status code raises `HTTPException(502)`.

**New behaviour:** After checking the status code is not 00, inspect `status.message` (case-insensitive). If the message contains recognisable "not found" / "no transaction" language, return a sentinel dict `{"_not_found": True}` instead of raising. All other non-00 responses still raise `HTTPException(502)`.

Scope constraints:
- Only applied to parsed JSON responses (not network errors, not non-JSON bodies).
- The check is on the parsed `status.message` string — not on HTTP status code alone.
- Do not widen the scope: this is not a catch-all for all failed lookups.

**Sentinel keywords to match** (case-insensitive, substring match):
- `"transaction not found"`
- `"no transaction"`
- `"not found"`

```python
status_message = str(status.get("message") or "").strip().lower()
NOT_FOUND_PHRASES = ("transaction not found", "no transaction", "not found")
if any(phrase in status_message for phrase in NOT_FOUND_PHRASES):
    return {"_not_found": True}
raise HTTPException(
    status_code=502,
    detail=f"Payway transaction detail failed: {json.dumps(response_payload)[:300]}",
)
```

### 2b — Sync function handles sentinel

`_sync_payway_payment_status` checks for the sentinel before any status mapping:

```python
detail_payload = await _fetch_payway_transaction_detail(provider_transaction_id)
if detail_payload.get("_not_found"):
    # Log depending on payment age (see Change 3)
    return payment  # stay pending
```

The existing `HTTPException` catch block is retained for network/server errors.

### 2c — Log level differentiation

- During grace window: `logger.debug` — "PayWay transaction not found within grace window, staying pending"
- After grace window: `logger.warning` — "PayWay transaction not found after grace window expired"

---

## Change 3 — Grace Window in Status Sync

**Files:**
- `backend/app/core/config.py` — new config field
- `backend/app/api/payments.py` — applied in `_sync_payway_payment_status`

### Config addition

```python
ABA_PAYWAY_SYNC_GRACE_SECONDS: int = 60
```

Added to the `Settings` class in `config.py` under the ABA Payway section. Configurable via `.env`.

### Grace window logic in `_sync_payway_payment_status`

At the start of the function, before calling `_fetch_payway_transaction_detail`:

```python
created_at = payment.get("created_at")
if created_at is not None:
    # Timezone-safe: if naive, assume UTC; if aware, convert to UTC
    if created_at.tzinfo is None:
        created_at_utc = created_at.replace(tzinfo=timezone.utc)
    else:
        created_at_utc = created_at.astimezone(timezone.utc)
    age_seconds = (datetime.now(timezone.utc) - created_at_utc).total_seconds()
    if age_seconds < settings.ABA_PAYWAY_SYNC_GRACE_SECONDS:
        logger.debug(
            "PayWay sync skipped — within grace window",
            extra={"payment_id": str(payment.get("id")), "age_seconds": age_seconds},
        )
        return payment
```

**Scope:** Only applies to `_sync_payway_payment_status`, which is only called for `provider == "aba_payway"` and `status == "pending"` payments. Terminal payments are never synced. Stripe is unaffected.

---

## Final Error Handling Matrix

| Scenario | Before | After |
|---|---|---|
| Hash for `$1.00` | `"1.0"` → likely wrong hash | `"1.00"` → correct |
| `qrImage` absent, `qrString` present | 502 raised | Response returned with `qrString` |
| Both `qrImage` and `qrString` absent with 00 | 502 raised | 502 raised (unchanged) |
| Transaction-not-found within grace window | 502 → caught → pending (warning log) | Sync skipped entirely (debug log) |
| Transaction-not-found after grace window | 502 → caught → pending (warning log) | Sentinel → pending (warning log) |
| Real PayWay API error | 502 raised | 502 raised (unchanged) |
| Sandbox scan "not found" in ABA app | App shows error, UX breaks | App shows sandbox banner, stays pending, manual confirm available. ABA app behaviour remains provider-dependent. |

---

## Files Changed

| File | Change |
|---|---|
| `backend/app/api/payments.py` | Changes 1a, 1c, 2a, 2b, 2c, 3 |
| `backend/app/core/config.py` | New `ABA_PAYWAY_SYNC_GRACE_SECONDS` field |

No changes to:
- `components/payment/payment-form.tsx`
- `components/payment/payment-return-status.tsx`
- `app/payment/[bookingId]/page.tsx`
- `app/payments/page.tsx`
- `backend/app/models/schemas.py`
- Any Stripe path

---

## Acceptance Criteria

1. `POST /api/payments/create-intent` with `provider: "aba_payway"` returns a response containing at least one of `qr_image` or `qr_string` when PayWay returns status 00.
2. `GET /api/payments/{id}` for a payment created within 60 seconds returns `status: "pending"` without hitting PayWay's transaction-detail API.
3. `GET /api/payments/{id}` for a payment older than 60 seconds calls PayWay transaction-detail; if PayWay returns "not found", returns `status: "pending"` with a warning log — does not raise 502 to the frontend.
4. The QR is rendered on the payment page and remains visible after generation.
5. The sandbox banner is shown when `gateway_mode == "sandbox"`.
6. The "Mark Sandbox Paid" button is available on localhost.
7. No Stripe path regression.

---

## Remaining Provider-Side Limitation

After these fixes, the ABA sandbox app may still show "transaction not found" when scanning. This is expected behaviour in ABA sandbox environments where QR transactions are generated but not fully resolvable in the sandbox payment app. This cannot be resolved from our codebase. The fix here ensures our app stays in a pending/recoverable state rather than treating it as a failure.
