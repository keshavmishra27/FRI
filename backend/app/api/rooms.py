"""
Room API Routes
===============

GET    /api/rooms         — List all rooms
GET    /api/rooms/{id}    — Get room details + schedule
PUT    /api/rooms/{id}    — Update room metadata
DELETE /api/rooms/{id}    — Delete a room
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Room, ScheduleEntry
from ..schemas import RoomResponse

router = APIRouter(prefix="/api/rooms", tags=["rooms"])


@router.get("", response_model=list[RoomResponse])
def list_rooms(db: Session = Depends(get_db)):
    """List all registered rooms."""
    return db.query(Room).order_by(Room.room_number).all()


@router.get("/{room_id}")
def get_room(room_id: str, db: Session = Depends(get_db)):
    """Get a room's details and its full weekly schedule."""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")

    entries = (
        db.query(ScheduleEntry)
        .filter(ScheduleEntry.room_id == room_id)
        .order_by(ScheduleEntry.day, ScheduleEntry.start_time)
        .all()
    )

    return {
        "id": room.id,
        "room_number": room.room_number,
        "room_type": room.room_type,
        "building": room.building,
        "capacity": room.capacity,
        "schedule": [
            {
                "id": e.id,
                "day": e.day,
                "start_time": e.start_time,
                "end_time": e.end_time,
                "subject": e.subject,
                "faculty": e.faculty,
                "section": e.section,
                "group": e.group,
            }
            for e in entries
        ],
    }


@router.put("/{room_id}", response_model=RoomResponse)
def update_room(
    room_id: str,
    room_type: str = None,
    building: str = None,
    capacity: int = None,
    db: Session = Depends(get_db),
):
    """Update room metadata (type, building, capacity)."""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")

    if room_type is not None:
        room.room_type = room_type
    if building is not None:
        room.building = building
    if capacity is not None:
        room.capacity = capacity

    db.commit()
    db.refresh(room)
    return room


@router.delete("/{room_id}")
def delete_room(room_id: str, db: Session = Depends(get_db)):
    """Delete a room and all its schedule entries."""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")

    db.delete(room)
    db.commit()
    return {"message": f"Room {room.room_number} deleted."}
