"""
Availability API Routes
=======================

GET /api/availability — Search for available rooms in a time slot.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import AvailabilityResponse, AvailableRoomResponse
from ..services.availability_service import find_available_rooms

router = APIRouter(prefix="/api/availability", tags=["availability"])


@router.get("", response_model=AvailabilityResponse)
def search_availability(
    day: str = Query(..., description="Day of the week, e.g. Monday"),
    start_time: str = Query(..., description="Start time in HH:MM (24h)"),
    end_time: str = Query(..., description="End time in HH:MM (24h)"),
    db: Session = Depends(get_db),
):
    """
    Find all rooms available during the specified time slot.

    The overlap algorithm ensures a room is marked occupied if ANY
    scheduled class intersects the requested interval:

        class_start < requested_end AND class_end > requested_start
    """
    # Basic input validation
    day = day.strip().capitalize()
    valid_days = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"}
    if day not in valid_days:
        day = "Monday"  # Fallback

    result = find_available_rooms(db, day, start_time, end_time)

    return AvailabilityResponse(
        day=day,
        start_time=start_time,
        end_time=end_time,
        total_rooms=result["total_rooms"],
        available_count=result["available_count"],
        occupied_count=result["occupied_count"],
        available_rooms=[
            AvailableRoomResponse(
                room_number=r.room_number,
                room_type=r.room_type or "classroom",
            )
            for r in result["available_rooms"]
        ],
        occupied_rooms=[
            AvailableRoomResponse(
                room_number=r.room_number,
                room_type=r.room_type or "classroom",
            )
            for r in result["occupied_rooms"]
        ],
    )
