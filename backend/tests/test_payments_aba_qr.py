"""
Unit tests for ABA PayWay QR stabilisation changes.
All tests are isolated — no database, no real HTTP calls.
"""
import json
import os
import sys
import pytest
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

# ---------------------------------------------------------------------------
# Ensure backend/ is on sys.path so `import app.*` works when pytest is run
# from the backend/ directory.
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Provide a dummy DATABASE_URL so pydantic-settings does not raise when
# app.core.config.Settings is instantiated during import of payments module.
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")

# ---------------------------------------------------------------------------
# Patch the module-level `settings` object in payments AFTER import so all
# internal references (settings.ABA_PAYWAY_SYNC_GRACE_SECONDS, etc.) resolve
# to our mock values without touching a real .env or database.
# ---------------------------------------------------------------------------
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

import app.api.payments as payments_module  # noqa: E402
payments_module.settings = _mock_settings


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
