"""Pydantic schemas for request/response validation."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ── Room ──────────────────────────────────────────────────────────────
class RoomBase(BaseModel):
    room_number: str
    room_type: str = "classroom"
    building: Optional[str] = None
    capacity: Optional[int] = None


class RoomResponse(RoomBase):
    id: str

    class Config:
        from_attributes = True


# ── Schedule Entry ────────────────────────────────────────────────────
class ScheduleEntryBase(BaseModel):
    day: str
    start_time: str
    end_time: str
    subject: str
    faculty: Optional[str] = None
    section: Optional[str] = None
    group: Optional[str] = None


class ScheduleEntryResponse(ScheduleEntryBase):
    id: str
    room_id: str
    room_number: Optional[str] = None
    timetable_upload_id: str

    class Config:
        from_attributes = True


class ScheduleEntryUpdate(BaseModel):
    """For admin edits on the preview page."""
    day: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    subject: Optional[str] = None
    faculty: Optional[str] = None
    section: Optional[str] = None
    room_number: Optional[str] = None


# ── Timetable Upload ─────────────────────────────────────────────────
class TimetableUploadResponse(BaseModel):
    id: str
    filename: str
    uploaded_at: datetime
    status: str
    processing_error: Optional[str] = None
    entries_count: int = 0
    rooms_count: int = 0

    class Config:
        from_attributes = True


class TimetableStatusResponse(BaseModel):
    status: str
    entries_found: int = 0
    rooms_found: int = 0
    processing_error: Optional[str] = None


# ── Availability ──────────────────────────────────────────────────────
class AvailabilityRequest(BaseModel):
    day: str = Field(..., description="Day of the week, e.g. Monday")
    start_time: str = Field(..., description="Start time in HH:MM format")
    end_time: str = Field(..., description="End time in HH:MM format")


class AvailableRoomResponse(BaseModel):
    room_number: str
    room_type: str


class AvailabilityResponse(BaseModel):
    day: str
    start_time: str
    end_time: str
    total_rooms: int
    available_count: int
    occupied_count: int
    available_rooms: list[AvailableRoomResponse]
    occupied_rooms: list[AvailableRoomResponse]


# ── Extracted entry (before DB insertion) ─────────────────────────────
class ExtractedEntry(BaseModel):
    """A single parsed schedule entry from the PDF, before saving to DB."""
    room_number: str
    day: str
    start_time: str
    end_time: str
    subject: str
    faculty: Optional[str] = None
    section: Optional[str] = None
    group: Optional[str] = None
