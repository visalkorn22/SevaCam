from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from app.core.database import get_db
from app.core.auth import get_current_user, is_admin
from app.core.config import settings
from app.models.schemas import PaymentCreate, PaymentResponse, PaymentIntent
import uuid
import hashlib
import time
import hmac
import json
import httpx
import base64
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

router = APIRouter()

PAYWAY_STATUS_MAP = {
    "success": "completed",
    "successful": "completed",
    "completed": "completed",
    "paid": "completed",
    "ok": "completed",
    "failed": "failed",
    "fail": "failed",
    "error": "failed",
    "declined": "failed",
    "cancelled": "failed",
    "canceled": "failed",
    "refunded": "refunded",
}


def _map_provider_status(raw_status: str | None) -> str:
    if not raw_status:
        return "failed"
    return PAYWAY_STATUS_MAP.get(raw_status.strip().lower(), "failed")


def _extract_payway_redirect_url(payload: dict) -> str | None:
    for key in ("checkout_url", "payment_url", "redirect_url", "url", "checkoutUrl"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value

    data = payload.get("data")
    if isinstance(data, dict):
        for key in ("checkout_url", "payment_url", "redirect_url", "url"):
            value = data.get(key)
            if isinstance(value, str) and value.strip():
                return value
    return None


def _extract_provider_reference(payload: dict) -> str | None:
    for key in ("transaction_id", "transactionId", "payment_id", "provider_reference", "reference"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value

    data = payload.get("data")
    if isinstance(data, dict):
        for key in ("transaction_id", "transactionId", "payment_id", "provider_reference", "reference"):
            value = data.get(key)
            if isinstance(value, str) and value.strip():
                return value
    return None


def _verify_signature(raw_body: bytes, provided_signature: str | None) -> bool:
    secret = settings.ABA_PAYWAY_WEBHOOK_SECRET
    if not secret:
        # Allow unsigned webhooks only in local debug mode.
        return bool(settings.DEBUG)

    if not provided_signature:
        return False

    expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    candidate = provided_signature.strip()

    # Support values like "sha256=<hash>".
    if "=" in candidate:
        _, candidate = candidate.split("=", 1)

    return hmac.compare_digest(expected, candidate)


def _to_decimal(value: object | None) -> Decimal | None:
    if value is None:
        return None
    try:
        return Decimal(str(value).strip())
    except (InvalidOperation, ValueError):
        return None


async def _create_payway_checkout(
    payment_id: str,
    transaction_id: str,
    payment: PaymentCreate,
    db: Session,
) -> tuple[str, str]:
    api_url = settings.ABA_PAYWAY_API_URL.rstrip("/")
    checkout_path = settings.ABA_PAYWAY_CHECKOUT_PATH
    endpoint = f"{api_url}{checkout_path}"

    booking = db.execute(
        text("SELECT id FROM bookings WHERE id = :id"),
        {"id": payment.booking_id},
    ).fetchone()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    callback_url = f"{settings.APP_URL.rstrip('/')}{settings.ABA_PAYWAY_WEBHOOK_PATH}"
    return_url = settings.ABA_PAYWAY_RETURN_URL or f"{settings.APP_URL.rstrip('/')}/payments"
    cancel_url = settings.ABA_PAYWAY_CANCEL_URL or f"{settings.APP_URL.rstrip('/')}/payments"

    req_time = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    amount_str = f"{Decimal(str(payment.amount)):.2f}"

    # PayWay purchase hash order must match documentation exactly.
    hash_fields = {
        "req_time": req_time,
        "merchant_id": settings.ABA_PAYWAY_MERCHANT_ID,
        "tran_id": transaction_id,
        "amount": amount_str,
        "items": "",
        "shipping": "",
        "firstname": "",
        "lastname": "",
        "email": "",
        "phone": "",
        "type": "purchase",
        "payment_option": "",
        "return_url": return_url,
        "cancel_url": cancel_url,
        "continue_success_url": "",
        "return_deeplink": "",
        "currency": payment.currency.upper(),
        "custom_fields": "",
        "return_params": payment_id,
        "payout": "",
        "lifetime": "",
        "additional_params": "",
        "google_pay_token": "",
        "skip_success_page": "",
    }

    hash_input = "".join(hash_fields.values())
    signing_key = (settings.ABA_PAYWAY_PUBLIC_KEY or settings.ABA_PAYWAY_API_KEY).strip()
    hash_bytes = hmac.new(
        signing_key.encode("utf-8"),
        hash_input.encode("utf-8"),
        hashlib.sha512,
    ).digest()
    payway_hash = base64.b64encode(hash_bytes).decode("utf-8")

    # Use multipart form fields expected by PayWay purchase endpoint.
    payload = {
        "req_time": req_time,
        "merchant_id": settings.ABA_PAYWAY_MERCHANT_ID,
        "tran_id": transaction_id,
        "amount": amount_str,
        "currency": payment.currency.upper(),
        "type": "purchase",
        "return_url": return_url,
        "cancel_url": cancel_url,
        "return_params": payment_id,
        "hash": payway_hash,
        # Keep callback reference in custom fields for easier tracing.
        "custom_fields": base64.b64encode(
            json.dumps(
                {
                    "payment_id": payment_id,
                    "booking_id": payment.booking_id,
                    "callback_url": callback_url,
                }
            ).encode("utf-8")
        ).decode("utf-8"),
    }

    timeout = httpx.Timeout(settings.ABA_PAYWAY_TIMEOUT_SECONDS)
    try:
        # Do not follow redirects; PayWay often returns checkout URL in Location header.
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
            response = await client.post(
                endpoint,
                files={k: (None, str(v)) for k, v in payload.items()},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Payway request failed: {exc}") from exc

    if 300 <= response.status_code < 400:
        location = response.headers.get("location")
        if location and "/checkout/" in location:
            return location, transaction_id

    if response.status_code < 200 or response.status_code >= 300:
        location = response.headers.get("location")
        location_info = f" redirect={location}" if location else ""
        raise HTTPException(
            status_code=502,
            detail=(
                f"Payway rejected request ({response.status_code})"
                f"{location_info}: {response.text[:300]}"
            ),
        )

    try:
        response_payload = response.json()
    except ValueError as exc:
        # Some upstream failures return HTML/plain text; surface a safe snippet.
        location = response.headers.get("location")
        location_hint = f" location={location[:220]}" if location else ""
        raise HTTPException(
            status_code=502,
            detail=(
                "Payway returned non-JSON response "
                f"({response.status_code}): {response.text[:300]}{location_hint}"
            ),
        ) from exc

    payment_url = _extract_payway_redirect_url(response_payload)
    if not payment_url:
        raise HTTPException(status_code=502, detail="Payway response missing redirect URL")

    provider_reference = _extract_provider_reference(response_payload) or transaction_id
    return payment_url, provider_reference

def _get_customer_id(db: Session, user_id: str) -> str | None:
    record = db.execute(
        "SELECT id FROM customers WHERE user_id = :user_id",
        {"user_id": user_id},
    ).fetchone()
    return record[0] if record else None

def _ensure_booking_access(db: Session, booking_id: str, current_user: dict) -> None:
    record = db.execute(
        "SELECT staff_id, customer_id FROM bookings WHERE id = :id",
        {"id": booking_id},
    ).fetchone()

    if not record:
        raise HTTPException(status_code=404, detail="Booking not found")

    if is_admin(current_user):
        return

    role = current_user.get("role")
    if role == "staff":
        if record[0] != current_user.get("id"):
            raise HTTPException(status_code=403, detail="Forbidden")
        return

    if role == "customer":
        customer_id = _get_customer_id(db, current_user.get("id"))
        if not customer_id or record[1] != customer_id:
            raise HTTPException(status_code=403, detail="Forbidden")
        return

    raise HTTPException(status_code=403, detail="Forbidden")

@router.post("/create-intent", response_model=PaymentIntent)
async def create_payment_intent(
    payment: PaymentCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a payment intent with ABA Payway sandbox."""
    _ensure_booking_access(db, payment.booking_id, current_user)
    payment_id = str(uuid.uuid4())
    # PayWay tran_id supports up to 20 chars.
    transaction_id = f"pw{uuid.uuid4().hex[:18]}"

    payment_url, provider_reference = await _create_payway_checkout(
        payment_id=payment_id,
        transaction_id=transaction_id,
        payment=payment,
        db=db,
    )

    metadata = {
        "provider": payment.provider,
        "checkout_created_at": int(time.time()),
        "sandbox": "sandbox" in settings.ABA_PAYWAY_API_URL.lower(),
    }

    db.execute(
        text(
            """
            INSERT INTO payments (id, booking_id, provider, provider_reference,
                                  amount, currency, status, metadata)
            VALUES (:id, :booking_id, :provider, :provider_reference,
                    :amount, :currency, 'pending', CAST(:metadata AS JSONB))
            """
        ),
        {
            "id": payment_id,
            "booking_id": payment.booking_id,
            "provider": payment.provider,
            "provider_reference": provider_reference,
            "amount": payment.amount,
            "currency": payment.currency,
            "metadata": json.dumps(metadata),
        }
    )
    db.commit()

    return {
        "payment_url": payment_url,
        "payment_id": payment_id,
        "transaction_id": transaction_id,
    }

@router.post("/{payment_id}/confirm")
async def confirm_payment(
    payment_id: str,
    transaction_status: str = "success",
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin/customer-confirmation fallback for manual testing."""
    if not settings.DEBUG and not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Manual confirmation is disabled")

    payment = db.execute(
        "SELECT booking_id FROM payments WHERE id = :id",
        {"id": payment_id},
    ).fetchone()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    _ensure_booking_access(db, payment.booking_id, current_user)
    status = "completed" if transaction_status == "success" else "failed"
    
    db.execute(
        "UPDATE payments SET status = :status WHERE id = :id",
        {"status": status, "id": payment_id}
    )
    
    # Update booking payment status
    if status == "completed":
        db.execute(
            """
            UPDATE bookings SET payment_status = 'paid', status = 'confirmed'
            WHERE id = (SELECT booking_id FROM payments WHERE id = :payment_id)
            """,
            {"payment_id": payment_id}
        )
    
    db.commit()
    
    return {"message": "Payment status updated", "status": status}


@router.post("/webhook/payway")
async def payway_webhook(
    request: Request,
    x_signature: str | None = Header(default=None, alias="X-Signature"),
    x_payway_signature: str | None = Header(default=None, alias="X-Payway-Signature"),
    db: Session = Depends(get_db),
):
    """Process Payway payment webhook and update payment idempotently."""
    raw_body = await request.body()
    signature = x_signature or x_payway_signature
    if not _verify_signature(raw_body, signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        payload = await request.json()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON payload") from exc

    payment_id = payload.get("order_id") or payload.get("payment_id")
    provider_reference = (
        payload.get("transaction_id")
        or payload.get("provider_reference")
        or payload.get("reference")
    )

    if not payment_id and not provider_reference:
        raise HTTPException(status_code=400, detail="Missing payment reference")

    if payment_id:
        payment = db.execute(
            text(
                "SELECT id, booking_id, status, amount, currency, provider "
                "FROM payments WHERE id = :id"
            ),
            {"id": payment_id},
        ).fetchone()
    else:
        payment = db.execute(
            text(
                "SELECT id, booking_id, status, amount, currency, provider FROM payments "
                "WHERE provider_reference = :provider_reference "
                "ORDER BY created_at DESC LIMIT 1"
            ),
            {"provider_reference": provider_reference},
        ).fetchone()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment[5] != "aba_payway":
        raise HTTPException(status_code=400, detail="Webhook provider mismatch")

    payload_amount = _to_decimal(payload.get("amount") or payload.get("total_amount"))
    if payload_amount is not None:
        expected_amount = _to_decimal(payment[3])
        if expected_amount is not None and payload_amount != expected_amount:
            raise HTTPException(status_code=400, detail="Webhook amount mismatch")

    payload_currency = payload.get("currency")
    if isinstance(payload_currency, str) and payload_currency.strip():
        if payload_currency.strip().upper() != str(payment[4]).upper():
            raise HTTPException(status_code=400, detail="Webhook currency mismatch")

    normalized_status = _map_provider_status(payload.get("status") or payload.get("transaction_status"))
    current_status = payment[2]
    if current_status == normalized_status:
        return {"message": "Already processed", "status": current_status}

    # Ignore regressive transitions for idempotent processing.
    if current_status in ("completed", "refunded") and normalized_status == "failed":
        return {"message": "Ignored regressive status", "status": current_status}

    db.execute(
        text(
            """
            UPDATE payments
            SET status = :status,
                provider_reference = COALESCE(:provider_reference, provider_reference),
                metadata = COALESCE(metadata, '{}'::jsonb) || CAST(:metadata_patch AS JSONB)
            WHERE id = :id
            """
        ),
        {
            "id": payment[0],
            "status": normalized_status,
            "provider_reference": provider_reference,
            "metadata_patch": json.dumps(
                {
                    "webhook_received_at": int(time.time()),
                    "provider_status": payload.get("status") or payload.get("transaction_status"),
                    "provider_reference": provider_reference,
                }
            ),
        },
    )

    if normalized_status == "completed":
        db.execute(
            text(
                """
                UPDATE bookings
                SET payment_status = 'paid', status = 'confirmed'
                WHERE id = :booking_id
                """
            ),
            {"booking_id": payment[1]},
        )
    elif normalized_status == "failed":
        db.execute(
            text(
                """
                UPDATE bookings
                SET payment_status = 'failed'
                WHERE id = :booking_id
                """
            ),
            {"booking_id": payment[1]},
        )
    elif normalized_status == "refunded":
        db.execute(
            text(
                """
                UPDATE bookings
                SET payment_status = 'refunded', status = 'cancelled'
                WHERE id = :booking_id
                """
            ),
            {"booking_id": payment[1]},
        )

    db.commit()
    return {"message": "Webhook processed", "status": normalized_status}

@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get payment by ID"""
    result = db.execute(
        "SELECT * FROM payments WHERE id = :id",
        {"id": payment_id}
    )
    
    payment = result.fetchone()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    _ensure_booking_access(db, payment.booking_id, current_user)
    return dict(payment._mapping)

@router.get("/booking/{booking_id}", response_model=List[PaymentResponse])
async def get_booking_payments(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all payments for a booking"""
    _ensure_booking_access(db, booking_id, current_user)
    result = db.execute(
        "SELECT * FROM payments WHERE booking_id = :booking_id ORDER BY created_at DESC",
        {"booking_id": booking_id}
    )
    
    payments = result.fetchall()
    return [dict(row._mapping) for row in payments]

@router.post("/{payment_id}/refund")
async def refund_payment(
    payment_id: str,
    amount: float,
    reason: str = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process refund (Mock)"""
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Forbidden")
    refund_id = str(uuid.uuid4())
    provider_refund_id = hashlib.md5(f"{refund_id}{time.time()}".encode()).hexdigest()
    
    db.execute(
        """
        INSERT INTO refunds (id, payment_id, amount, reason, provider_refund_id, status)
        VALUES (:id, :payment_id, :amount, :reason, :provider_refund_id, 'completed')
        """,
        {
            "id": refund_id,
            "payment_id": payment_id,
            "amount": amount,
            "reason": reason,
            "provider_refund_id": provider_refund_id,
        }
    )
    
    # Update payment status
    db.execute(
        "UPDATE payments SET status = 'refunded' WHERE id = :id",
        {"id": payment_id}
    )
    
    # Update booking
    db.execute(
        """
        UPDATE bookings SET payment_status = 'refunded', status = 'cancelled'
        WHERE id = (SELECT booking_id FROM payments WHERE id = :payment_id)
        """,
        {"payment_id": payment_id}
    )
    
    db.commit()
    
    return {
        "message": "Refund processed",
        "refund_id": refund_id,
        "provider_refund_id": provider_refund_id,
    }
