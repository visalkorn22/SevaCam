# backend/app/api/locations.py
from fastapi import APIRouter, Depends, HTTPException
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
        raise HTTPException(status_code=404, detail="Location not found")
    return dict(row._mapping)
