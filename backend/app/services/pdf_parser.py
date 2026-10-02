"""
PDF Timetable Parser
====================

Parses VIPS-TC style timetable PDFs into structured schedule entries.

The expected PDF structure (per section page):
  ┌──────────────────────────────────────────────────────────┐
  │  Institution header                                      │
  │  Department name                                         │
  │  Section: X  |  Semester: Y                              │
  │  Coordinator / Mentors                                   │
  ├──────┬────────┬────────┬─── ... ──┬────────┬────────────┤
  │ Days │ 9:00-  │ 9:50-  │   ...    │ 4:30-  │            │
  │      │  9:50  │ 10:40  │          │  5:20  │            │
  ├──────┼────────┼────────┼─── ... ──┼────────┼────────────┤
  │      │   1    │   2    │   ...    │  10    │            │
  ├──────┼────────┼────────┼─── ... ──┼────────┼────────────┤
  │ Mon  │ subj   │ Lab G1 │   ...    │        │            │
  │ Room │ 214    │ Lab G2 │   ...    │        │            │
  ├──────┼────────┼────────┼─── ... ──┼────────┼────────────┤
  │ Tue  │  ...   │  ...   │   ...    │  ...   │            │
  │ Room │  ...   │  ...   │   ...    │  ...   │            │
  ├──────┼── ...  ┼── ...  ┼─── ... ──┼── ...  ┼────────────┤
  │ Course Legend: Code → Subject → Faculty                  │
  └──────────────────────────────────────────────────────────┘

Key parsing challenges handled:
  - Labs span 2 consecutive time slots
  - Lab entries embed room numbers: "OS Lab G1 408"
  - Two labs can share a column (G1 in subject row, G2 in room row)
  - "Lunch" floats at different positions per day
  - Inline room entries like "VAC 411", "TTPPR 408"
  - "slot NNN" in room row = mentoring room
  - 12-hour times (1:10 = 13:10)
"""

import json
import re
import logging
from typing import Optional

import pdfplumber

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────

DAYS = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"}

# Default time slots — used as fallback if header parsing fails.
DEFAULT_TIME_SLOTS = [
    ("09:00", "09:50"),
    ("09:50", "10:40"),
    ("10:40", "11:30"),
    ("11:30", "12:20"),
    ("12:20", "13:10"),
    ("13:10", "14:00"),
    ("14:00", "14:50"),
    ("14:50", "15:40"),
    ("15:40", "16:30"),
    ("16:30", "17:20"),
]

# Regex for lab entries: "OS Lab G1 408" or "FDL Lab G2 612"
LAB_PATTERN = re.compile(
    r"^(.+?)\s+Lab\s+G(\d+)\s+(\d+)$", re.IGNORECASE
)

# Regex for inline room: "VAC 411", "TTPPR 408" (uppercase subject + room number)
INLINE_ROOM_PATTERN = re.compile(r"^([A-Za-z]+)\s+(\d{3,})$")

# Regex for "slot NNN" (mentoring room)
SLOT_PATTERN = re.compile(r"^slot\s+(\d+)$", re.IGNORECASE)

# Regex for pure room number
ROOM_NUMBER_PATTERN = re.compile(r"^\d{2,4}$")

# Subjects to skip
SKIP_SUBJECTS = {"lunch", "room no.", "room no", ""}


# ── Time Helpers ──────────────────────────────────────────────────────

def normalize_time(time_str: str) -> str:
    """
    Convert a 12-hour-ish time string to 24-hour HH:MM.

    College times run 9:00 AM – 5:20 PM.
    Hours 1–8 are PM (add 12). Hours 9–12 stay as-is.
    """
    time_str = time_str.strip().replace(" ", "")
    parts = time_str.split(":")
    hour = int(parts[0])
    minute = int(parts[1]) if len(parts) > 1 else 0

    if 1 <= hour <= 8:
        hour += 12

    return f"{hour:02d}:{minute:02d}"


def parse_time_range(slot_str: str) -> Optional[tuple[str, str]]:
    """Parse a time slot header like '9:00-9:50' or '12:20- 1:10'."""
    slot_str = slot_str.strip()
    if not slot_str or "-" not in slot_str:
        return None

    parts = slot_str.split("-")
    if len(parts) != 2:
        return None

    try:
        start = normalize_time(parts[0])
        end = normalize_time(parts[1])
        return (start, end)
    except (ValueError, IndexError):
        return None


# ── Cell Parsers ──────────────────────────────────────────────────────

def parse_lab_cell(cell: str) -> Optional[dict]:
    """
    Try to parse a cell as a lab entry.

    "OS Lab G1 408" → { subject: "OS Lab", group: "G1", room: "408" }
    Returns None if the cell doesn't match.
    """
    match = LAB_PATTERN.match(cell.strip())
    if match:
        return {
            "subject": f"{match.group(1).strip()} Lab",
            "group": f"G{match.group(2)}",
            "room": match.group(3),
        }
    return None


def parse_inline_room(cell: str) -> Optional[dict]:
    """
    Parse an inline-room cell like "VAC 411" or "TTPPR 408".

    Returns { subject: "VAC", room: "411" } or None.
    """
    match = INLINE_ROOM_PATTERN.match(cell.strip())
    if match:
        subj = match.group(1)
        # Don't match "Room" from "Room No." leftover fragments
        if subj.lower() in ("room",):
            return None
        return {"subject": subj, "room": match.group(2)}
    return None


def extract_room_from_cell(cell: str) -> Optional[str]:
    """
    Extract a room number from a room-row cell.

    Handles: "214", "slot 214"
    """
    cell = cell.strip()
    if ROOM_NUMBER_PATTERN.match(cell):
        return cell
    slot_match = SLOT_PATTERN.match(cell)
    if slot_match:
        return slot_match.group(1)
    return None


# ── Course Legend Parser ──────────────────────────────────────────────

def parse_course_legend(table_rows: list[list[str]]) -> dict[str, dict]:
    """
    Parse the course legend at the bottom of each section's table.

    Returns a dict mapping subject abbreviation → { full_name, faculty }.
    Example: "OS" → { "full_name": "Operating Systems", "faculty": "Dr. X" }
    """
    legend = {}
    abbrev_pattern = re.compile(r"\(([A-Z][A-Z\s]*)\)\s*$")

    for row in table_rows:
        if not row or len(row) < 4:
            continue
        # Skip non-legend rows
        if row[0] and row[0].strip().upper() in ("COURSE CODE", "DAYS", ""):
            if row[0].strip().upper() == "COURSE CODE":
                continue  # header of legend
            if row[0].strip() == "":
                # Could be a continuation row
                pass

        # Check columns 0-3 (left legend) and 6-9 (right legend)
        for code_col, name_col, faculty_col in [(0, 1, 3), (6, 7, 9)]:
            if code_col >= len(row) or name_col >= len(row):
                continue
            code_cell = (row[code_col] or "").strip()
            name_cell = (row[name_col] or "").strip().replace("\n", " ")
            faculty_cell = (row[faculty_col] or "").strip() if faculty_col < len(row) else ""

            if not code_cell or not code_cell.startswith("AIML"):
                continue

            # Extract abbreviation from name: "Operating Systems (OS)" → "OS"
            abbrev_match = abbrev_pattern.search(name_cell)
            if abbrev_match:
                abbrev = abbrev_match.group(1).strip()
                full_name = name_cell[: abbrev_match.start()].strip()
                legend[abbrev] = {
                    "full_name": full_name,
                    "faculty": faculty_cell.replace("\n", " "),
                    "code": code_cell,
                }

            # Also check for lab names
            if "Lab" in name_cell:
                lab_match = abbrev_pattern.search(name_cell)
                if lab_match:
                    lab_abbrev = lab_match.group(1).strip()
                    legend[lab_abbrev] = {
                        "full_name": name_cell[: lab_match.start()].strip(),
                        "faculty": faculty_cell.replace("\n", " "),
                        "code": code_cell,
                    }

    return legend


# ── Section Metadata Parser ──────────────────────────────────────────

def extract_section_info(table_rows: list[list[str]]) -> Optional[str]:
    """Extract the section letter (A, B, C, …) from header rows."""
    for row in table_rows:
        for cell in row:
            if not cell:
                continue
            match = re.search(r"Section:\s*([A-Z])", cell, re.IGNORECASE)
            if match:
                return match.group(1).upper()
    return None


# ── Header Row Finder ─────────────────────────────────────────────────

def find_header_row(table: list[list[str]]) -> Optional[int]:
    """Find the row containing time-slot headers like '9:00-9:50'."""
    for idx, row in enumerate(table):
        if not row:
            continue
        first_cell = (row[0] or "").strip().lower()
        if first_cell == "days":
            return idx
        # Also check if multiple cells look like time ranges
        time_cells = sum(1 for c in row[1:] if c and "-" in c and ":" in c)
        if time_cells >= 5:
            return idx
    return None


# ── Main Day-Row Processor ────────────────────────────────────────────

def process_day_rows(
    day: str,
    subject_row: list[str],
    room_row: list[str],
    time_slots: list[tuple[str, str]],
    section: str,
    legend: dict[str, dict],
) -> list[dict]:
    """
    Process a pair of rows (subject + room) for one day.

    Returns a list of schedule entry dicts.
    """
    entries = []
    processed_slots = set()  # Slots already consumed by a 2-slot lab

    num_slots = min(len(time_slots), len(subject_row) - 1, len(room_row) - 1)

    for slot_idx in range(num_slots):
        col = slot_idx + 1  # Column 0 is the day/room label

        if slot_idx in processed_slots:
            continue

        sub_cell = (subject_row[col] if col < len(subject_row) else "") or ""
        room_cell = (room_row[col] if col < len(room_row) else "") or ""
        sub_cell = sub_cell.strip()
        room_cell = room_cell.strip()

        # Skip empty / lunch
        if sub_cell.lower() in SKIP_SUBJECTS and room_cell.lower() in SKIP_SUBJECTS:
            continue
        if sub_cell.lower() == "lunch" or room_cell.lower() == "lunch":
            # If one is lunch but the other has content, process the content
            if sub_cell.lower() == "lunch":
                sub_cell = ""
            if room_cell.lower() == "lunch":
                room_cell = ""
            if not sub_cell and not room_cell:
                continue

        start_time, end_time = time_slots[slot_idx]

        # ── Case 1: Lab entry in subject row ──
        lab_sub = parse_lab_cell(sub_cell)
        lab_room = parse_lab_cell(room_cell)

        if lab_sub or lab_room:
            # Labs span 2 consecutive slots
            lab_end_time = end_time
            if slot_idx + 1 < len(time_slots):
                lab_end_time = time_slots[slot_idx + 1][1]
                processed_slots.add(slot_idx + 1)

            if lab_sub:
                faculty = _lookup_faculty(lab_sub["subject"], legend)
                entries.append({
                    "room_number": lab_sub["room"],
                    "day": day,
                    "start_time": start_time,
                    "end_time": lab_end_time,
                    "subject": lab_sub["subject"],
                    "faculty": faculty,
                    "section": section,
                    "group": lab_sub["group"],
                })

            if lab_room:
                faculty = _lookup_faculty(lab_room["subject"], legend)
                entries.append({
                    "room_number": lab_room["room"],
                    "day": day,
                    "start_time": start_time,
                    "end_time": lab_end_time,
                    "subject": lab_room["subject"],
                    "faculty": faculty,
                    "section": section,
                    "group": lab_room["group"],
                })

            continue  # Both cells handled

        # ── Case 2: Regular subject entry ──
        subject = sub_cell
        room = None

        # Try extracting room from room_cell
        room = extract_room_from_cell(room_cell)

        # Check if subject cell has inline room (e.g., "VAC 411")
        inline_sub = parse_inline_room(sub_cell)
        if inline_sub:
            subject = inline_sub["subject"]
            room = inline_sub["room"]

        # Check if room_cell has an inline-room entry (e.g., "TTPPR 408")
        inline_rm = parse_inline_room(room_cell)
        if inline_rm and not room:
            # Room cell IS the entry (subject + room together)
            subject = inline_rm["subject"] if not subject else subject
            room = inline_rm["room"]

        if not subject or subject.lower() in SKIP_SUBJECTS:
            continue

        if room:
            faculty = _lookup_faculty(subject, legend)
            entries.append({
                "room_number": room,
                "day": day,
                "start_time": start_time,
                "end_time": end_time,
                "subject": subject,
                "faculty": faculty,
                "section": section,
                "group": None,
            })

    return entries


def _lookup_faculty(subject: str, legend: dict[str, dict]) -> Optional[str]:
    """Look up faculty name from the course legend."""
    # Try exact match first
    if subject in legend:
        return legend[subject].get("faculty")
    # Try without "Lab" suffix
    base = subject.replace(" Lab", "").strip()
    if base in legend:
        return legend[base].get("faculty")
    # Try abbreviation variations
    for key in legend:
        if key in subject or subject in key:
            return legend[key].get("faculty")
    return None


# ── Main Parser ───────────────────────────────────────────────────────

def parse_timetable_pdf(pdf_path: str) -> list[dict]:
    """
    Parse a complete timetable PDF and return all schedule entries.

    Parameters
    ----------
    pdf_path : str
        Absolute path to the PDF file.

    Returns
    -------
    list[dict]
        Each dict has keys: room_number, day, start_time, end_time,
        subject, faculty, section, group.
    """
    all_entries: list[dict] = []

    with pdfplumber.open(pdf_path) as pdf:
        for page_idx, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            if not tables:
                logger.warning(f"Page {page_idx + 1}: no tables found")
                continue

            for table in tables:
                entries = _parse_section_table(table, page_idx)
                all_entries.extend(entries)

    # De-duplicate: same room + day + time + section + group
    seen = set()
    unique_entries = []
    for entry in all_entries:
        key = (
            entry["room_number"],
            entry["day"],
            entry["start_time"],
            entry["end_time"],
            entry["section"],
            entry.get("group"),
        )
        if key not in seen:
            seen.add(key)
            unique_entries.append(entry)

    logger.info(
        f"Parsed {len(unique_entries)} unique schedule entries "
        f"from {pdf_path}"
    )
    return unique_entries


def _parse_section_table(table: list[list[str]], page_idx: int) -> list[dict]:
    """Parse a single section's table (one per page, typically)."""
    if not table or len(table) < 5:
        return []

    # Extract section info
    section = extract_section_info(table) or f"Page{page_idx + 1}"

    # Find the header row with time slots
    header_idx = find_header_row(table)
    if header_idx is None:
        logger.warning(f"Page {page_idx + 1}: could not find time-slot header")
        return []

    # Parse time slots from header
    header_row = table[header_idx]
    time_slots = []
    for cell in header_row[1:]:  # Skip "Days" column
        parsed = parse_time_range(cell or "")
        if parsed:
            time_slots.append(parsed)
        else:
            time_slots.append(None)

    # Fill in missing slots from defaults
    filled_slots = []
    for i, slot in enumerate(time_slots):
        if slot:
            filled_slots.append(slot)
        elif i < len(DEFAULT_TIME_SLOTS):
            filled_slots.append(DEFAULT_TIME_SLOTS[i])
    time_slots = filled_slots

    if len(time_slots) < 5:
        logger.warning(f"Page {page_idx + 1}: only {len(time_slots)} time slots found")
        return []

    # Parse course legend (rows after the schedule grid)
    legend = parse_course_legend(table)
    logger.debug(f"Section {section}: legend has {len(legend)} entries")

    # Process day rows (pairs: subject row + room row)
    # Period number row is at header_idx + 1
    day_start = header_idx + 2
    entries = []

    row_idx = day_start
    while row_idx + 1 < len(table):
        subject_row = table[row_idx]
        room_row = table[row_idx + 1]

        if not subject_row or not subject_row[0]:
            row_idx += 1
            continue

        day_name = subject_row[0].strip()

        # Check if this is a day row
        if day_name in DAYS:
            # Verify room row starts with "Room No."
            room_label = (room_row[0] or "").strip().lower()
            if "room" in room_label:
                day_entries = process_day_rows(
                    day=day_name,
                    subject_row=subject_row,
                    room_row=room_row,
                    time_slots=time_slots,
                    section=section,
                    legend=legend,
                )
                entries.extend(day_entries)
                row_idx += 2
                continue

        # Not a day row — skip (probably legend or header)
        row_idx += 1

    logger.info(f"Section {section}: extracted {len(entries)} entries")
    return entries


def entries_to_json(entries: list[dict]) -> str:
    """Serialize extracted entries to JSON string."""
    return json.dumps(entries, indent=2, ensure_ascii=False)


def entries_from_json(json_str: str) -> list[dict]:
    """Deserialize entries from JSON string."""
    return json.loads(json_str)
