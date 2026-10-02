"""
Availability Service
====================

Determines which rooms are free for a given day + time interval
using the overlap detection algorithm from the PRD:

    A room is OCCUPIED if any scheduled class overlaps the requested interval.
    Overlap condition:  class_start < requested_end  AND  class_end > requested_start
"""

from sqlalchemy.orm import Session

from ..models import Room, ScheduleEntry


def find_available_rooms(
    db: Session,
    day: str,
    start_time: str,
    end_time: str,
) -> dict:
    """
    Find all rooms that have NO overlapping classes during [start_time, end_time)
    on the given day.

    Parameters
    ----------
    db : Session
        Active database session.
    day : str
        Day of the week (e.g. "Monday").
    start_time : str
        Requested start time in "HH:MM" (24-hour).
    end_time : str
        Requested end time in "HH:MM" (24-hour).

    Returns
    -------
    dict with keys:
        total_rooms, available_count, occupied_count,
        available_rooms (list[Room]), occupied_rooms (list[Room])
    """
    # Normalize day casing
    day = day.strip().capitalize()

    all_rooms = db.query(Room).order_by(Room.room_number).all()

    if not all_rooms:
        return {
            "total_rooms": 0,
            "available_count": 0,
            "occupied_count": 0,
            "available_rooms": [],
            "occupied_rooms": [],
        }

    # Get all schedule entries for the requested day
    day_entries = (
        db.query(ScheduleEntry)
        .filter(ScheduleEntry.day == day)
        .all()
    )

    # Build a set of occupied room IDs
    occupied_room_ids = set()

    for entry in day_entries:
        # Overlap condition: class_start < requested_end AND class_end > requested_start
        if entry.start_time < end_time and entry.end_time > start_time:
            occupied_room_ids.add(entry.room_id)

    available_rooms = []
    occupied_rooms = []

    for room in all_rooms:
        if room.id in occupied_room_ids:
            occupied_rooms.append(room)
        else:
            available_rooms.append(room)

    return {
        "total_rooms": len(all_rooms),
        "available_count": len(available_rooms),
        "occupied_count": len(occupied_rooms),
        "available_rooms": available_rooms,
        "occupied_rooms": occupied_rooms,
    }
