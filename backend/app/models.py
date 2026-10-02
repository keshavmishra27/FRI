"""SQLAlchemy ORM models."""
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from .database import Base


def generate_uuid():
    return str(uuid.uuid4())


class Room(Base):
    """Represents a physical room (classroom or laboratory)."""

    __tablename__ = "rooms"

    id = Column(String, primary_key=True, default=generate_uuid)
    room_number = Column(String, unique=True, nullable=False, index=True)
    room_type = Column(String, default="classroom")  # classroom, laboratory
    building = Column(String, nullable=True)
    capacity = Column(Integer, nullable=True)

    schedule_entries = relationship(
        "ScheduleEntry", back_populates="room", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Room {self.room_number} ({self.room_type})>"


class ScheduleEntry(Base):
    """A single scheduled class/lab occupying a room at a specific time."""

    __tablename__ = "schedule_entries"

    id = Column(String, primary_key=True, default=generate_uuid)
    room_id = Column(String, ForeignKey("rooms.id"), nullable=False, index=True)
    day = Column(String, nullable=False, index=True)  # Monday-Friday
    start_time = Column(String, nullable=False)  # HH:MM (24-hour)
    end_time = Column(String, nullable=False)  # HH:MM (24-hour)
    subject = Column(String, nullable=False)
    faculty = Column(String, nullable=True)
    section = Column(String, nullable=True)  # A, B, C
    group = Column(String, nullable=True)  # G1, G2
    timetable_upload_id = Column(
        String, ForeignKey("timetable_uploads.id"), nullable=False, index=True
    )

    room = relationship("Room", back_populates="schedule_entries")
    timetable_upload = relationship("TimetableUpload", back_populates="schedule_entries")

    def __repr__(self):
        return (
            f"<ScheduleEntry {self.subject} | {self.day} "
            f"{self.start_time}-{self.end_time} | Room {self.room_id}>"
        )


class TimetableUpload(Base):
    """Tracks an uploaded timetable PDF and its processing status."""

    __tablename__ = "timetable_uploads"

    id = Column(String, primary_key=True, default=generate_uuid)
    filename = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="UPLOADED")
    # Status values: UPLOADED, PROCESSING, REVIEW, APPROVED, FAILED
    processing_error = Column(Text, nullable=True)
    extracted_data = Column(Text, nullable=True)  # JSON string of extracted entries
    entries_count = Column(Integer, default=0)
    rooms_count = Column(Integer, default=0)

    schedule_entries = relationship(
        "ScheduleEntry", back_populates="timetable_upload", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<TimetableUpload {self.filename} ({self.status})>"
