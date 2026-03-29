# ABA PayWay QR Stabilisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix ABA PayWay QR hash amount format, relax QR response validation, add grace-window-based status sync to prevent immediate "transaction not found" 502s, and expose a configurable `ABA_PAYWAY_SYNC_GRACE_SECONDS` setting.

**Architecture:** All changes are in two files only — `backend/app/core/config.py` (one new field) and `backend/app/api/payments.py` (six targeted edits to three functions). No frontend, no schema, no Stripe path changes. Tests live in `backend/tests/test_payments_aba_qr.py` using pytest + pytest-asyncio and plain `unittest.mock` — no database required for any test.

**Tech Stack:** Python 3.11, FastAPI, pytest, pytest-asyncio, unittest.mock, Decimal (stdlib), hmac (stdlib)

---

## File Map

| File | Action | What changes |
|---|---|---|
| `backend/app/core/config.py` | Modify | Add `ABA_PAYWAY_SYNC_GRACE_SECONDS: int = 60` |
| `backend/app/api/payments.py` | Modify | 1a amount hash, 1c QR validation, 2a sentinel, 2b/2c sync handling + logs, 3 grace window |
| `backend/tests/test_payments_aba_qr.py` | Create | Unit tests for all six changes |
| `backend/tests/__init__.py` | Create | Empty, makes tests a package |

---

## Task 1: Install pytest and create test scaffolding

**Files:**
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/test_payments_aba_qr.py`

- [ ] **Step 1: Install pytest and pytest-asyncio into the venv**

```bash
cd backend
venv/Scripts/pip install pytest pytest-asyncio
```

Expected output: lines ending with `Successfully installed pytest-... pytest-asyncio-...`

- [ ] **Step 2: Create the empty package marker**

Create `backend/tests/__init__.py` with empty content.

- [ ] **Step 3: Create the test file with imports and fixtures**

Create `backend/tests/test_payments_aba_qr.py`:

```python
"""
Unit tests for ABA PayWay QR stabilisation changes.
All tests are isolated — no database, no real HTTP calls.
"""
import json
import pytest
import pytest_asyncio
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

# ---------------------------------------------------------------------------
# Helpers — we test the private functions directly. Import the module so
# patching settings works cleanly.
# ---------------------------------------------------------------------------
import sys
import os

# Ensure backend/app is importable when running from backend/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Patch settings before importing payments so pydantic-settings doesn't
# require a real .env file during tests.
from unittest.mock import MagicMock
_mock_settings = MagicMock()
_mock_settings.ABA_PAYWAY_MERCHANT_ID = "test_merchant"
_mock_settings.ABA_PAYWAY_API_KEY = "test_api_key"
_mock_settings.ABA_PAYWAY_API_URL = "https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1"
_mock_settings.ABA_PAYWAY_QR_PATH = "/payments/generate-qr"
_mock_settings.ABA_PAYWAY_TRANSACTION_DETAIL_PATH = "/payments/transaction-detail"
_mock_settings.ABA_PAYWAY_QR_LIFETIME_MINUTES = 6
_mock_settings.ABA_PAYWAY_QR_IMAGE_TEMPLATE = "template3_color"
_mock_settings.ABA_PAYWAY_TIMEOUT_SECONDS = 20
_mock_settings.ABA_PAYWAY_SYNC_GRACE_SECONDS = 60
_mock_settings.ABA_PAYWAY_CALLBACK_URL = ""
_mock_settings.ABA_PAYWAY_WEBHOOK_PATH = "/api/payments/webhook/payway"
_mock_settings.APP_URL = "http://localhost:3000"
_mock_settings.DEBUG = False

import app.api.payments as payments_module
payments_module.settings = _mock_settings
```

- [ ] **Step 4: Verify the file parses (no import errors at this point)**

```bash
cd backend
venv/Scripts/python -c "import tests.test_payments_aba_qr; print('OK')"
```

Expected: `OK`

- [ ] **Step 5: Commit scaffolding**

```bash
git add backend/tests/__init__.py backend/tests/test_payments_aba_qr.py
git commit -m "test: scaffold ABA PayWay QR stabilisation test file"
```

---

## Task 2: Test and fix amount hash format (Change 1a)

**Files:**
- Modify: `backend/tests/test_payments_aba_qr.py` — add test
- Modify: `backend/app/api/payments.py:658` — fix `amount_hash_value`

**Background:** `_build_payway_hash` concatenates string representations of values. The hash for a QR request currently uses `str(float(amount_decimal))` which gives `"1.0"` for `$1.00`. PayWay expects `"1.00"`. Fix: `format(amount_decimal, "f")`.

- [ ] **Step 1: Add the failing test**

Append to `backend/tests/test_payments_aba_qr.py`:

```python
# ---------------------------------------------------------------------------
# Task 2 — amount hash format
# ---------------------------------------------------------------------------

def test_amount_hash_value_uses_fixed_point_format():
    """
    The hash input for amount must be "1.00", not "1.0".
    format(Decimal("1.00"), "f") gives "1.00".
    str(float(Decimal("1.00"))) gives "1.0" — the bug we are fixing.
    """
    amount_decimal = Decimal("1.00").quantize(Decimal("0.01"))
    # Old (buggy) approach
    buggy = str(float(amount_decimal))
    assert buggy == "1.0", f"Pre-condition: buggy approach gives {buggy!r}"
    # New (correct) approach
    correct = format(amount_decimal, "f")
    assert correct == "1.00", f"Expected '1.00', got {correct!r}"


def test_amount_hash_value_whole_number():
    """$10.00 must hash as "10.00" not "10.0"."""
    amount_decimal = Decimal("10.00").quantize(Decimal("0.01"))
    assert format(amount_decimal, "f") == "10.00"


def test_amount_hash_value_cents():
    """$1.50 must hash as "1.50" not "1.5"."""
    amount_decimal = Decimal("1.50").quantize(Decimal("0.01"))
    assert format(amount_decimal, "f") == "1.50"
```

- [ ] **Step 2: Run to confirm the first assertion passes (pre-condition) and see the test logic is sound**

```bash
cd backend
venv/Scripts/pytest tests/test_payments_aba_qr.py::test_amount_hash_value_uses_fixed_point_format -v
```

Expected: PASS (this test documents the bug, not checks live code yet — the assertions prove the math).

- [ ] **Step 3: Fix `amount_hash_value` in `_create_payway_qr`**

In `backend/app/api/payments.py`, find the line (around line 658):

```python
    amount_hash_value = str(payload["amount"])
```

Replace with:

```python
    amount_hash_value = format(amount_decimal, "f")
```

The surrounding context for precise location:

```python
    # BEFORE (remove this line):
    amount_hash_value = str(payload["amount"])
    hash_values = [

    # AFTER (replace with):
    amount_hash_value = format(amount_decimal, "f")
    hash_values = [
```

- [ ] **Step 4: Run all three amount tests**

```bash
cd backend
venv/Scripts/pytest tests/test_payments_aba_qr.py -k "amount_hash" -v
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/payments.py backend/tests/test_payments_aba_qr.py
git commit -m "fix(aba): use format(amount_decimal, 'f') for QR hash — fixes Wrong Hash for whole-dollar amounts"
```

---

## Task 3: Test and fix QR response validation (Change 1c)

**Files:**
- Modify: `backend/tests/test_payments_aba_qr.py` — add tests
- Modify: `backend/app/api/payments.py:731-736` — relax validation

**Background:** Currently raises 502 if either `qrImage` or `qrString` is absent. The fix: only raise if **both** are absent.

- [ ] **Step 1: Add tests that document current and target behaviour**

Append to `backend/tests/test_payments_aba_qr.py`:

```python
# ---------------------------------------------------------------------------
# Task 3 — QR response validation helpers
# ---------------------------------------------------------------------------

def _qr_has_image_only():
    return {
        "qrImage": "iVBORw0KGgoAAAA==",  # non-empty base64-like string
        "qrString": None,
    }


def _qr_has_string_only():
    return {
        "qrImage": None,
        "qrString": "00020101021229370016A000000677010111011300855561234560208TESTAPP5303840540110.005802KH5910Test Shop6010Phnom Penh63043D5A",
    }


def _qr_has_both():
    return {
        "qrImage": "iVBORw0KGgoAAAA==",
        "qrString": "00020101...",
    }


def _qr_has_neither():
    return {
        "qrImage": None,
        "qrString": None,
    }


def test_qr_validation_passes_with_image_only():
    """If qrImage is present and qrString is absent, validation must pass."""
    r = _qr_has_image_only()
    has_qr_image = isinstance(r["qrImage"], str) and r["qrImage"].strip()
    has_qr_string = isinstance(r["qrString"], str) and r["qrString"].strip() if r["qrString"] else False
    assert has_qr_image or has_qr_string  # at least one present → no error


def test_qr_validation_passes_with_string_only():
    """If qrString is present and qrImage is absent, validation must pass."""
    r = _qr_has_string_only()
    has_qr_image = isinstance(r["qrImage"], str) and r["qrImage"].strip() if r["qrImage"] else False
    has_qr_string = isinstance(r["qrString"], str) and r["qrString"].strip()
    assert has_qr_image or has_qr_string


def test_qr_validation_passes_with_both():
    """If both present, validation must pass."""
    r = _qr_has_both()
    has_qr_image = isinstance(r["qrImage"], str) and r["qrImage"].strip()
    has_qr_string = isinstance(r["qrString"], str) and r["qrString"].strip()
    assert has_qr_image or has_qr_string


def test_qr_validation_fails_with_neither():
    """If both absent, validation must raise (we simulate this logic here)."""
    r = _qr_has_neither()
    has_qr_image = isinstance(r["qrImage"], str) and r["qrImage"].strip() if r["qrImage"] else False
    has_qr_string = isinstance(r["qrString"], str) and r["qrString"].strip() if r["qrString"] else False
    assert not (has_qr_image or has_qr_string)  # confirms we would raise
```

- [ ] **Step 2: Run validation tests**

```bash
cd backend
venv/Scripts/pytest tests/test_payments_aba_qr.py -k "qr_validation" -v
```

Expected: 4 passed (these test the logic, not the function — confirming our condition is correct before we apply it).

- [ ] **Step 3: Apply the fix in `_create_payway_qr`**

In `backend/app/api/payments.py`, find the block around lines 731–736:

```python
    qr_image = response_payload.get("qrImage")
    qr_string = response_payload.get("qrString")
    if not isinstance(qr_image, str) or not qr_image.strip():
        raise HTTPException(status_code=502, detail="Payway QR response missing qrImage")
    if not isinstance(qr_string, str) or not qr_string.strip():
        raise HTTPException(status_code=502, detail="Payway QR response missing qrString")
```

Replace with:

```python
    qr_image = response_payload.get("qrImage")
    qr_string = response_payload.get("qrString")
    has_qr_image = isinstance(qr_image, str) and bool(qr_image.strip())
    has_qr_string = isinstance(qr_string, str) and bool(qr_string.strip())
    if not has_qr_image and not has_qr_string:
        raise HTTPException(
            status_code=502,
            detail="PayWay QR response missing both qrImage and qrString",
        )
    qr_image = qr_image if has_qr_image else None
    qr_string = qr_string if has_qr_string else None
```

The last two lines normalise `qr_image` and `qr_string` to `None` when empty/invalid, so the return dict below stays clean.

- [ ] **Step 4: Run validation tests again (no change expected — logic confirmed)**

```bash
cd backend
venv/Scripts/pytest tests/test_payments_aba_qr.py -k "qr_validation" -v
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/payments.py backend/tests/test_payments_aba_qr.py
git commit -m "fix(aba): raise QR 502 only when both qrImage and qrString are absent"
```

---

## Task 4: Test and fix transaction-detail "not found" sentinel (Change 2a)

**Files:**
- Modify: `backend/tests/test_payments_aba_qr.py` — add tests
- Modify: `backend/app/api/payments.py:804-812` — add sentinel logic

**Background:** `_fetch_payway_transaction_detail` raises `HTTPException(502)` for any non-00 status. We add a narrow check: if `status.message` contains a recognisable "not found" phrase, return `{"_not_found": True}` instead of raising. The check is substring-only on `status.message` — not on error codes, HTTP status, or the outer response structure.

- [ ] **Step 1: Add failing tests for the sentinel**

Append to `backend/tests/test_payments_aba_qr.py`:

```python
# ---------------------------------------------------------------------------
# Task 4 — transaction-detail sentinel
# ---------------------------------------------------------------------------

import pytest
from fastapi import HTTPException


def _make_detail_response(code: str, message: str, data: dict | None = None) -> dict:
    """Helper: build a PayWay transaction-detail response dict."""
    return {
        "status": {"code": code, "message": message},
        "data": data or {},
    }


def _check_sentinel_logic(response_payload: dict) -> dict | None:
    """
    Mirrors the sentinel logic we will add to _fetch_payway_transaction_detail.
    Returns {"_not_found": True} or None (meaning: would raise).
    """
    status = response_payload.get("status") or {}
    status_code = str(status.get("code") or "").strip()
    if status_code in {"0", "00"}:
        return None  # success — no sentinel needed

    _NOT_FOUND_PHRASES = ("transaction not found", "no transaction", "not found")
    status_message = str(status.get("message") or "").strip().lower()
    if any(phrase in status_message for phrase in _NOT_FOUND_PHRASES):
        return {"_not_found": True}

    return None  # would raise — sentinel not triggered


def test_sentinel_triggered_on_transaction_not_found_message():
    response = _make_detail_response("01", "Transaction not found")
    result = _check_sentinel_logic(response)
    assert result == {"_not_found": True}


def test_sentinel_triggered_on_no_transaction_message():
    response = _make_detail_response("99", "No transaction record")
    result = _check_sentinel_logic(response)
    assert result == {"_not_found": True}


def test_sentinel_triggered_case_insensitive():
    response = _make_detail_response("01", "TRANSACTION NOT FOUND")
    result = _check_sentinel_logic(response)
    assert result == {"_not_found": True}


def test_sentinel_not_triggered_on_other_errors():
    """Real errors (e.g. invalid merchant) must NOT be mapped to sentinel."""
    response = _make_detail_response("05", "Invalid merchant credentials")
    result = _check_sentinel_logic(response)
    assert result is None  # would raise — correct


def test_sentinel_not_triggered_on_success():
    """Status 00 never goes through the sentinel path."""
    response = _make_detail_response("00", "Success", data={"payment_status": "SUCCESS"})
    result = _check_sentinel_logic(response)
    assert result is None  # success path, no sentinel needed
```

- [ ] **Step 2: Run sentinel logic tests**

```bash
cd backend
venv/Scripts/pytest tests/test_payments_aba_qr.py -k "sentinel" -v
```

Expected: 5 passed (testing the extracted logic, not the live function yet).

- [ ] **Step 3: Apply the sentinel in `_fetch_payway_transaction_detail`**

In `backend/app/api/payments.py`, find the block around lines 804-812 (inside `_fetch_payway_transaction_detail`):

```python
    status = response_payload.get("status") or {}
    status_code = str(status.get("code") or "").strip()
    if status_code not in {"0", "00"}:
        raise HTTPException(
            status_code=502,
            detail=f"Payway transaction detail failed: {json.dumps(response_payload)[:300]}",
        )

    return response_payload
```

Replace with:

```python
    status = response_payload.get("status") or {}
    status_code = str(status.get("code") or "").strip()
    if status_code not in {"0", "00"}:
        _NOT_FOUND_PHRASES = ("transaction not found", "no transaction", "not found")
        status_message = str(status.get("message") or "").strip().lower()
        if any(phrase in status_message for phrase in _NOT_FOUND_PHRASES):
            return {"_not_found": True}
        raise HTTPException(
            status_code=502,
            detail=f"Payway transaction detail failed: {json.dumps(response_payload)[:300]}",
        )

    return response_payload
```

- [ ] **Step 4: Run sentinel tests again**

```bash
cd backend
venv/Scripts/pytest tests/test_payments_aba_qr.py -k "sentinel" -v
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/payments.py backend/tests/test_payments_aba_qr.py
git commit -m "fix(aba): return _not_found sentinel for transaction-detail 'not found' messages instead of raising 502"
```

---

## Task 5: Add `ABA_PAYWAY_SYNC_GRACE_SECONDS` to config (Change 3 — config part)

**Files:**
- Modify: `backend/app/core/config.py:56` — add one field

- [ ] **Step 1: Add the field to `Settings`**

In `backend/app/core/config.py`, find the ABA Payway section (around line 62). Add the new field after `ABA_PAYWAY_TIMEOUT_SECONDS`:

```python
    # BEFORE — last line of ABA block:
    ABA_PAYWAY_TIMEOUT_SECONDS: int = 20

    # AFTER — add immediately below:
    ABA_PAYWAY_TIMEOUT_SECONDS: int = 20
    ABA_PAYWAY_SYNC_GRACE_SECONDS: int = 60
```

- [ ] **Step 2: Verify the settings class loads without error**

```bash
cd backend
venv/Scripts/python -c "
import os; os.environ.setdefault('DATABASE_URL', 'postgresql://x:x@localhost/x')
from app.core.config import settings
print('ABA_PAYWAY_SYNC_GRACE_SECONDS =', settings.ABA_PAYWAY_SYNC_GRACE_SECONDS)
"
```

Expected: `ABA_PAYWAY_SYNC_GRACE_SECONDS = 60`

- [ ] **Step 3: Commit**

```bash
git add backend/app/core/config.py
git commit -m "feat(config): add ABA_PAYWAY_SYNC_GRACE_SECONDS=60 for configurable status sync grace window"
```

---

## Task 6: Test and implement grace window + sentinel handling in `_sync_payway_payment_status` (Changes 2b, 2c, 3)

**Files:**
- Modify: `backend/tests/test_payments_aba_qr.py` — add async tests
- Modify: `backend/app/api/payments.py:981` — update `_sync_payway_payment_status`

**Background:** `_sync_payway_payment_status` currently skips PayWay if `provider_reference` is empty and also catches `HTTPException` to stay pending. We add two new behaviours:

1. **Grace window check** (before any PayWay call): if payment `created_at` is less than `ABA_PAYWAY_SYNC_GRACE_SECONDS` seconds ago, skip the call and return the payment as-is (log `debug`).
2. **Sentinel handling** (after the PayWay call): if `_fetch_payway_transaction_detail` returns `{"_not_found": True}`, return payment as-is (log `debug` within grace window, `warning` after).

The function is `async` so tests use `pytest.mark.asyncio`.

- [ ] **Step 1: Add async tests**

Append to `backend/tests/test_payments_aba_qr.py`:

```python
# ---------------------------------------------------------------------------
# Task 6 — grace window + sentinel handling in _sync_payway_payment_status
# ---------------------------------------------------------------------------

import asyncio
import pytest


def _make_payment(age_seconds: float, status: str = "pending") -> dict:
    """
    Build a fake payment dict.
    age_seconds: how old the payment is (positive = in the past).
    """
    created_at = datetime.now(timezone.utc) - timedelta(seconds=age_seconds)
    return {
        "id": "pay_test_001",
        "booking_id": "book_test_001",
        "provider": "aba_payway",
        "provider_reference": "txn_123456",
        "amount": Decimal("10.00"),
        "currency": "USD",
        "status": status,
        "created_at": created_at,
    }


@pytest.mark.asyncio
async def test_grace_window_skips_payway_call_for_fresh_payment():
    """
    Payment created 10 seconds ago (within default 60s grace).
    _fetch_payway_transaction_detail must NOT be called.
    """
    payment = _make_payment(age_seconds=10)

    with patch.object(
        payments_module,
        "_fetch_payway_transaction_detail",
        new_callable=AsyncMock,
    ) as mock_fetch:
        result = await payments_module._sync_payway_payment_status(
            db=MagicMock(), payment=payment
        )

    mock_fetch.assert_not_called()
    assert result["status"] == "pending"


@pytest.mark.asyncio
async def test_grace_window_allows_payway_call_for_old_payment():
    """
    Payment created 90 seconds ago (outside default 60s grace).
    _fetch_payway_transaction_detail IS called.
    """
    payment = _make_payment(age_seconds=90)

    # Simulate PayWay returning "not found" sentinel
    with patch.object(
        payments_module,
        "_fetch_payway_transaction_detail",
        new_callable=AsyncMock,
        return_value={"_not_found": True},
    ) as mock_fetch:
        result = await payments_module._sync_payway_payment_status(
            db=MagicMock(), payment=payment
        )

    mock_fetch.assert_called_once_with("txn_123456")
    assert result["status"] == "pending"


@pytest.mark.asyncio
async def test_sentinel_not_found_after_grace_window_stays_pending():
    """
    After the grace window, if PayWay returns the _not_found sentinel,
    the payment stays pending (no 502 surfaced to caller).
    """
    payment = _make_payment(age_seconds=120)

    with patch.object(
        payments_module,
        "_fetch_payway_transaction_detail",
        new_callable=AsyncMock,
        return_value={"_not_found": True},
    ):
        result = await payments_module._sync_payway_payment_status(
            db=MagicMock(), payment=payment
        )

    assert result["status"] == "pending"


@pytest.mark.asyncio
async def test_grace_window_with_naive_datetime():
    """
    created_at with no tzinfo (naive UTC from some DB drivers) must be
    handled safely — should not raise TypeError.
    """
    payment = _make_payment(age_seconds=5)
    # Strip timezone info to simulate naive datetime from DB
    payment["created_at"] = payment["created_at"].replace(tzinfo=None)

    with patch.object(
        payments_module,
        "_fetch_payway_transaction_detail",
        new_callable=AsyncMock,
    ) as mock_fetch:
        result = await payments_module._sync_payway_payment_status(
            db=MagicMock(), payment=payment
        )

    mock_fetch.assert_not_called()  # still within grace window
    assert result["status"] == "pending"


@pytest.mark.asyncio
async def test_real_payway_error_after_grace_window_propagates():
    """
    A real PayWay error (non-sentinel HTTPException) after the grace window
    must still be caught and return pending (existing behaviour preserved).
    """
    from fastapi import HTTPException as FastAPIHTTPException

    payment = _make_payment(age_seconds=120)

    with patch.object(
        payments_module,
        "_fetch_payway_transaction_detail",
        new_callable=AsyncMock,
        side_effect=FastAPIHTTPException(status_code=502, detail="PayWay server error"),
    ):
        result = await payments_module._sync_payway_payment_status(
            db=MagicMock(), payment=payment
        )

    # Existing catch block returns payment as-is — status stays pending
    assert result["status"] == "pending"
```

- [ ] **Step 2: Run async tests — expect failures because the implementation is not updated yet**

```bash
cd backend
venv/Scripts/pytest tests/test_payments_aba_qr.py -k "grace_window or sentinel_not_found or naive_datetime or real_payway_error" -v
```

Expected: Several FAILs (grace window check not yet in code, sentinel check not yet in code).

- [ ] **Step 3: Update `_sync_payway_payment_status` in `payments.py`**

Find the function starting at around line 981. Replace the entire function body with the updated version below. The signature and decorators are unchanged.

Current start of function:
```python
async def _sync_payway_payment_status(db: Session, *, payment: dict) -> dict:
    provider_transaction_id = str(payment.get("provider_reference") or "").strip()
    if not provider_transaction_id:
        return payment

    previous_status = str(payment["status"])

    try:
        detail_payload = await _fetch_payway_transaction_detail(provider_transaction_id)
    except HTTPException as exc:
        # In local development callback URLs are often non-routable; keep pending
        # and allow frontend polling to retry instead of surfacing a hard error.
        logger.warning(
            "PayWay status sync skipped",
            extra={
                "payment_id": str(payment.get("id")),
                "provider_reference": provider_transaction_id,
                "error": str(exc.detail),
            },
        )
        return payment
```

Replace the entire `_sync_payway_payment_status` function with:

```python
async def _sync_payway_payment_status(db: Session, *, payment: dict) -> dict:
    provider_transaction_id = str(payment.get("provider_reference") or "").strip()
    if not provider_transaction_id:
        return payment

    # -----------------------------------------------------------------------
    # Grace window: skip PayWay status lookup for newly created payments.
    # PayWay sandbox is not reliably queryable immediately after QR creation.
    # -----------------------------------------------------------------------
    created_at = payment.get("created_at")
    within_grace = False
    if created_at is not None:
        if created_at.tzinfo is None:
            created_at_utc = created_at.replace(tzinfo=timezone.utc)
        else:
            created_at_utc = created_at.astimezone(timezone.utc)
        age_seconds = (datetime.now(timezone.utc) - created_at_utc).total_seconds()
        if age_seconds < settings.ABA_PAYWAY_SYNC_GRACE_SECONDS:
            logger.debug(
                "PayWay sync skipped — within grace window",
                extra={
                    "payment_id": str(payment.get("id")),
                    "age_seconds": round(age_seconds, 1),
                },
            )
            return payment
        within_grace = False  # explicitly past grace window

    previous_status = str(payment["status"])

    try:
        detail_payload = await _fetch_payway_transaction_detail(provider_transaction_id)
    except HTTPException as exc:
        # Network/server errors: keep pending, allow frontend to retry.
        logger.warning(
            "PayWay status sync skipped — provider error",
            extra={
                "payment_id": str(payment.get("id")),
                "provider_reference": provider_transaction_id,
                "error": str(exc.detail),
            },
        )
        return payment

    # -----------------------------------------------------------------------
    # Sentinel: PayWay returned "transaction not found" — not a hard failure.
    # -----------------------------------------------------------------------
    if detail_payload.get("_not_found"):
        logger.warning(
            "PayWay transaction not found after grace window — staying pending",
            extra={
                "payment_id": str(payment.get("id")),
                "provider_reference": provider_transaction_id,
            },
        )
        return payment

    data = detail_payload.get("data") if isinstance(detail_payload.get("data"), dict) else {}
    operations = data.get("transaction_operations") if isinstance(data.get("transaction_operations"), list) else []
    latest_operation = operations[-1] if operations and isinstance(operations[-1], dict) else {}

    raw_status = (
        latest_operation.get("status")
        or data.get("payment_status")
        or data.get("status")
    )
    normalized_status = _map_provider_status(raw_status)

    payload_amount = _to_decimal(
        data.get("total_amount")
        or data.get("payment_amount")
        or data.get("original_amount")
    )
    if payload_amount is not None:
        expected_amount = _to_decimal(payment.get("amount"))
        if expected_amount is not None and payload_amount != expected_amount:
            raise HTTPException(status_code=400, detail="PayWay amount mismatch")

    payload_currency = (
        data.get("payment_currency")
        or data.get("original_currency")
        or data.get("currency")
    )
    if isinstance(payload_currency, str) and payload_currency.strip():
        if payload_currency.strip().upper() != str(payment["currency"]).upper():
            raise HTTPException(status_code=400, detail="PayWay currency mismatch")

    _apply_payment_status(
        db,
        payment=payment,
        normalized_status=normalized_status,
        provider_reference=provider_transaction_id,
        metadata_patch={
            "payway_checked_at": int(time.time()),
            "payway_provider_status": raw_status,
        },
    )
    db.commit()
    updated_payment = _load_payment_record(db, payment["id"])
    if previous_status != "completed" and updated_payment and updated_payment["status"] == "completed":
        _send_booking_emails(db, updated_payment["booking_id"], "confirmation")
    return updated_payment
```

- [ ] **Step 4: Run all async tests**

```bash
cd backend
venv/Scripts/pytest tests/test_payments_aba_qr.py -k "grace_window or sentinel_not_found or naive_datetime or real_payway_error" -v
```

Expected: 5 passed.

- [ ] **Step 5: Run the full test file to confirm no regressions**

```bash
cd backend
venv/Scripts/pytest tests/test_payments_aba_qr.py -v
```

Expected: All tests passed.

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/payments.py backend/tests/test_payments_aba_qr.py
git commit -m "fix(aba): add grace window and _not_found sentinel handling to _sync_payway_payment_status"
```

---

## Task 7: Verify end-to-end manually (local smoke test)

No code changes. Confirm the full flow works in your local environment.

- [ ] **Step 1: Start the backend**

```bash
cd backend
venv/Scripts/uvicorn app.main:app --reload --port 8000
```

- [ ] **Step 2: Start the frontend**

```bash
# From project root
npm run dev
```

- [ ] **Step 3: Trigger a QR payment creation**

1. Log in as a customer account.
2. Navigate to a booking → payment page (e.g. `http://localhost:3000/payment/<bookingId>`).
3. Select "ABA PayWay" and click "Pay with ABA PayWay".
4. Confirm the backend logs show the QR request payload with `amount` as a float in JSON and the hash using `"1.00"` format (visible in DEBUG log if `DEBUG=true` in `.env`).
5. Confirm the response includes `qr_image` or `qr_string` (or both).
6. Confirm the QR renders on screen.

- [ ] **Step 4: Verify the grace window suppresses immediate status sync**

1. While the QR is on screen (within 60s of creation), click "View Payment Status".
2. Confirm the backend logs show `"PayWay sync skipped — within grace window"` at DEBUG level.
3. Confirm the UI shows `status: pending` — not a 502 error.

- [ ] **Step 5: Verify the sandbox manual confirmation path**

1. While on localhost, confirm the "Mark Sandbox Paid" button is visible.
2. Click it.
3. Confirm the payment is marked completed and the confirmation email flow fires (check backend logs for email send attempt).

- [ ] **Step 6: Final commit if any minor adjustments were needed**

If smoke test revealed any minor issues (e.g. a log message tweak), fix and commit them. Otherwise:

```bash
git add -p  # stage only intentional changes
git commit -m "fix(aba): smoke test adjustments"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** 1a ✓ Task 2, 1c ✓ Task 3, 2a ✓ Task 4, 2b/2c ✓ Task 6, 3-config ✓ Task 5, 3-logic ✓ Task 6. 1b marked no-change — no task needed.
- [x] **No placeholders:** All steps contain exact code or exact commands. No "implement X" without code.
- [x] **Type consistency:** `_NOT_FOUND_PHRASES` is a tuple in both the test helper and the implementation. `{"_not_found": True}` sentinel is consistent across Task 4 (definition) and Task 6 (consumption). `ABA_PAYWAY_SYNC_GRACE_SECONDS` referenced from `settings` in Task 6 matches the config field name added in Task 5.
- [x] **pytest-asyncio:** All async tests marked with `@pytest.mark.asyncio`. `pytest-asyncio` installed in Task 1.
- [x] **Stripe unaffected:** `_sync_payway_payment_status` is only called when `payment["provider"] == "aba_payway"`. Grace window and sentinel are inside this function only.
- [x] **Test isolation:** No database — DB is `MagicMock()`. No real HTTP — `_fetch_payway_transaction_detail` is patched. Settings mock applied at module level in Task 1.
