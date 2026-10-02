"""
Timetable API Routes
====================

POST /api/timetables/upload       — Upload a PDF
GET  /api/timetables              — List all uploads
GET  /api/timetables/{id}/status  — Processing status
GET  /api/timetables/{id}/preview — Extracted entries (for admin review)
POST /api/timetables/{id}/approve — Approve and save to database
PUT  /api/timetables/{id}/entries/{entry_id} — Edit an extracted entry
DELETE /api/timetables/{id}/entries/{entry_id} — Delete an extracted entry
DELETE /api/timetables/{id}       — Delete a timetable upload
"""

import os
import json
import uuid
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import TimetableUpload, ScheduleEntry, Room
from ..schemas import (
    TimetableUploadResponse,
    TimetableStatusResponse,
    ScheduleEntryResponse,
    ScheduleEntryUpdate,
)
from ..services.pdf_parser import parse_timetable_pdf, entries_to_json, entries_from_json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/timetables", tags=["timetables"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload", response_model=TimetableUploadResponse)
async def upload_timetable(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a timetable PDF for processing."""

    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # Read and validate size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum is {MAX_FILE_SIZE // (1024*1024)} MB.")

    if len(content) < 100:
        raise HTTPException(status_code=400, detail="File appears to be empty or corrupted.")

    # Save file
    upload_id = str(uuid.uuid4())
    safe_filename = f"{upload_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    # Create upload record
    upload = TimetableUpload(
        id=upload_id,
        filename=file.filename,
        uploaded_at=datetime.utcnow(),
        status="PROCESSING",
    )
    db.add(upload)
    db.commit()

    # Process the PDF immediately (synchronous for MVP)
    try:
        entries = parse_timetable_pdf(file_path)

        if not entries:
            upload.status = "FAILED"
            upload.processing_error = "No timetable entries could be extracted from the PDF."
            db.commit()
            db.refresh(upload)
            return upload

        # Store extracted data as JSON for preview
        upload.extracted_data = entries_to_json(entries)
        upload.entries_count = len(entries)
        upload.rooms_count = len(set(e["room_number"] for e in entries))
        upload.status = "REVIEW"
        db.commit()

    except Exception as e:
        logger.exception(f"Failed to process PDF: {e}")
        upload.status = "FAILED"
        upload.processing_error = str(e)
        db.commit()

    db.refresh(upload)
    return upload


@router.get("", response_model=list[TimetableUploadResponse])
def list_timetables(db: Session = Depends(get_db)):
    """List all timetable uploads."""
    return (
        db.query(TimetableUpload)
        .order_by(TimetableUpload.uploaded_at.desc())
        .all()
    )


@router.get("/{upload_id}/status", response_model=TimetableStatusResponse)
def get_status(upload_id: str, db: Session = Depends(get_db)):
    """Get the processing status of a timetable upload."""
    upload = db.query(TimetableUpload).filter(TimetableUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found.")
    return TimetableStatusResponse(
        status=upload.status,
        entries_found=upload.entries_count,
        rooms_found=upload.rooms_count,
        processing_error=upload.processing_error,
    )


@router.get("/{upload_id}/preview")
def get_preview(upload_id: str, db: Session = Depends(get_db)):
    """Get extracted timetable entries for admin review."""
    upload = db.query(TimetableUpload).filter(TimetableUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found.")

    if not upload.extracted_data:
        raise HTTPException(status_code=400, detail="No extracted data available.")

    entries = entries_from_json(upload.extracted_data)
    return {
        "upload_id": upload.id,
        "filename": upload.filename,
        "status": upload.status,
        "entries_count": len(entries),
        "rooms_count": len(set(e["room_number"] for e in entries)),
        "entries": entries,
    }


@router.put("/{upload_id}/entries/{entry_index}")
def update_entry(
    upload_id: str,
    entry_index: int,
    update: ScheduleEntryUpdate,
    db: Session = Depends(get_db),
):
    """Edit an extracted entry during review (before approval)."""
    upload = db.query(TimetableUpload).filter(TimetableUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found.")
    if upload.status not in ("REVIEW", "PROCESSING"):
        raise HTTPException(status_code=400, detail="Cannot edit entries after approval.")
    if not upload.extracted_data:
        raise HTTPException(status_code=400, detail="No extracted data available.")

    entries = entries_from_json(upload.extracted_data)

    if entry_index < 0 or entry_index >= len(entries):
        raise HTTPException(status_code=404, detail="Entry index out of range.")

    entry = entries[entry_index]
    update_data = update.model_dump(exclude_none=True)
    entry.update(update_data)
    entries[entry_index] = entry

    upload.extracted_data = entries_to_json(entries)
    upload.entries_count = len(entries)
    upload.rooms_count = len(set(e["room_number"] for e in entries))
    db.commit()

    return {"message": "Entry updated", "entry": entry}


@router.delete("/{upload_id}/entries/{entry_index}")
def delete_entry(upload_id: str, entry_index: int, db: Session = Depends(get_db)):
    """Delete an extracted entry during review."""
    upload = db.query(TimetableUpload).filter(TimetableUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found.")
    if upload.status not in ("REVIEW", "PROCESSING"):
        raise HTTPException(status_code=400, detail="Cannot delete entries after approval.")
    if not upload.extracted_data:
        raise HTTPException(status_code=400, detail="No extracted data available.")

    entries = entries_from_json(upload.extracted_data)

    if entry_index < 0 or entry_index >= len(entries):
        raise HTTPException(status_code=404, detail="Entry index out of range.")

    deleted = entries.pop(entry_index)
    upload.extracted_data = entries_to_json(entries)
    upload.entries_count = len(entries)
    upload.rooms_count = len(set(e["room_number"] for e in entries))
    db.commit()

    return {"message": "Entry deleted", "deleted": deleted}


@router.post("/{upload_id}/approve")
def approve_timetable(upload_id: str, db: Session = Depends(get_db)):
    """
    Approve extracted timetable and save entries to the database.

    This is the critical step that converts preview data into live schedule entries.
    """
    upload = db.query(TimetableUpload).filter(TimetableUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found.")
    if upload.status == "APPROVED":
        raise HTTPException(status_code=400, detail="Timetable already approved.")
    if not upload.extracted_data:
        raise HTTPException(status_code=400, detail="No extracted data to approve.")

    entries = entries_from_json(upload.extracted_data)

    # Remove any existing schedule entries from previously approved timetables
    # (prevents duplicates if re-uploading)
    db.query(ScheduleEntry).filter(
        ScheduleEntry.timetable_upload_id == upload_id
    ).delete()

    # Create/get rooms and schedule entries
    rooms_created = 0
    entries_created = 0
    lab_rooms = set()

    # First pass: identify lab rooms
    for entry in entries:
        if "Lab" in entry.get("subject", ""):
            lab_rooms.add(entry["room_number"])

    for entry in entries:
        room_number = entry["room_number"]

        # Get or create room
        room = db.query(Room).filter(Room.room_number == room_number).first()
        if not room:
            room_type = "laboratory" if room_number in lab_rooms else "classroom"
            room = Room(
                id=str(uuid.uuid4()),
                room_number=room_number,
                room_type=room_type,
            )
            db.add(room)
            db.flush()  # Get the ID without committing
            rooms_created += 1

        # Create schedule entry
        schedule_entry = ScheduleEntry(
            id=str(uuid.uuid4()),
            room_id=room.id,
            day=entry["day"],
            start_time=entry["start_time"],
            end_time=entry["end_time"],
            subject=entry["subject"],
            faculty=entry.get("faculty"),
            section=entry.get("section"),
            group=entry.get("group"),
            timetable_upload_id=upload_id,
        )
        db.add(schedule_entry)
        entries_created += 1

    upload.status = "APPROVED"
    db.commit()

    return {
        "message": "Timetable approved and saved to database.",
        "rooms_created": rooms_created,
        "entries_created": entries_created,
    }


@router.delete("/{upload_id}")
def delete_timetable(upload_id: str, db: Session = Depends(get_db)):
    """Delete a timetable upload and its associated entries."""
    upload = db.query(TimetableUpload).filter(TimetableUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found.")

    # Delete associated schedule entries
    db.query(ScheduleEntry).filter(
        ScheduleEntry.timetable_upload_id == upload_id
    ).delete()

    # Delete the upload record
    db.delete(upload)
    db.commit()

    # Try to delete the PDF file
    for f in os.listdir(UPLOAD_DIR):
        if f.startswith(upload_id):
            try:
                os.remove(os.path.join(UPLOAD_DIR, f))
            except OSError:
                pass

    return {"message": "Timetable deleted."}
