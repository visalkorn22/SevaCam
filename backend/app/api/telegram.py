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


def _send_telegram_message(chat_id: int, text_msg: str, parse_mode: str = "") -> None:
    if not settings.TELEGRAM_BOT_TOKEN:
        return
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    body: dict = {"chat_id": chat_id, "text": text_msg}
    if parse_mode:
        body["parse_mode"] = parse_mode
    httpx.post(url, json=body, timeout=10)
