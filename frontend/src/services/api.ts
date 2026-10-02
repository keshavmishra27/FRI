/**
 * API Service — DEMO MODE
 *
 * All responses are hardcoded mock data for GitHub Pages deployment.
 * In production, these functions call the FastAPI backend.
 */

import type {
  AvailabilityResult,
  TimetableUpload,
  TimetablePreview,
  Room,
} from "../types/timetable";

/* ── Helpers ──────────────────────────────────────────────────────── */

/** Simulates a realistic network delay */
const delay = (ms = 600) => new Promise((res) => setTimeout(res, ms));

/* ── Mock Data ────────────────────────────────────────────────────── */

const MOCK_ROOMS: Room[] = [
  { id: "1", room_number: "101", room_type: "Classroom", building: "A Block", capacity: 60 },
  { id: "2", room_number: "102", room_type: "Classroom", building: "A Block", capacity: 60 },
  { id: "3", room_number: "201", room_type: "Lab", building: "A Block", capacity: 30 },
  { id: "4", room_number: "202", room_type: "Lab", building: "A Block", capacity: 30 },
  { id: "5", room_number: "301", room_type: "Classroom", building: "B Block", capacity: 60 },
  { id: "6", room_number: "302", room_type: "Classroom", building: "B Block", capacity: 60 },
  { id: "7", room_number: "401", room_type: "Seminar Hall", building: "B Block", capacity: 120 },
  { id: "8", room_number: "CS Lab 1", room_type: "Lab", building: "C Block", capacity: 40 },
  { id: "9", room_number: "CS Lab 2", room_type: "Lab", building: "C Block", capacity: 40 },
  { id: "10", room_number: "DS Lab", room_type: "Lab", building: "C Block", capacity: 40 },
];

/** Deterministically picks available/occupied rooms based on day+time so results feel realistic */
function mockAvailability(day: string, startTime: string, endTime: string): AvailabilityResult {
  // Seed based on inputs so same query always gives same result
  const seed = (day + startTime + endTime).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const availableCount = 4 + (seed % 5); // 4–8 available rooms
  const available = MOCK_ROOMS.slice(0, availableCount).map((r) => ({
    room_number: r.room_number,
    room_type: r.room_type,
  }));
  const occupied = MOCK_ROOMS.slice(availableCount).map((r) => ({
    room_number: r.room_number,
    room_type: r.room_type,
  }));
  return {
    day,
    start_time: startTime,
    end_time: endTime,
    total_rooms: MOCK_ROOMS.length,
    available_count: available.length,
    occupied_count: occupied.length,
    available_rooms: available,
    occupied_rooms: occupied,
  };
}

const MOCK_TIMETABLES: TimetableUpload[] = [
  {
    id: "tbl-001",
    filename: "AIML_5th_Sem_Timetable.pdf",
    uploaded_at: "2026-09-15T10:30:00Z",
    status: "APPROVED",
    entries_count: 48,
    rooms_count: 8,
  },
  {
    id: "tbl-002",
    filename: "CS_3rd_Sem_Timetable.pdf",
    uploaded_at: "2026-09-20T14:00:00Z",
    status: "APPROVED",
    entries_count: 42,
    rooms_count: 7,
  },
];

const MOCK_PREVIEW: TimetablePreview = {
  upload_id: "tbl-001",
  filename: "AIML_5th_Sem_Timetable.pdf",
  status: "APPROVED",
  entries_count: 6,
  rooms_count: 3,
  entries: [
    { room_number: "101", day: "Monday", start_time: "09:00", end_time: "10:30", subject: "Machine Learning", faculty: "Dr. Sharma", section: "A" },
    { room_number: "CS Lab 1", day: "Monday", start_time: "11:00", end_time: "13:00", subject: "Deep Learning Lab", faculty: "Dr. Verma", section: "B" },
    { room_number: "201", day: "Tuesday", start_time: "09:00", end_time: "10:30", subject: "Data Science", faculty: "Dr. Patel", section: "A" },
    { room_number: "301", day: "Wednesday", start_time: "10:30", end_time: "12:00", subject: "NLP", faculty: "Dr. Sharma", section: "A" },
    { room_number: "102", day: "Thursday", start_time: "14:00", end_time: "15:30", subject: "Computer Vision", faculty: "Dr. Gupta", section: "B" },
    { room_number: "CS Lab 2", day: "Friday", start_time: "09:00", end_time: "11:00", subject: "ML Lab", faculty: "Dr. Patel", section: "A" },
  ],
};

/* ── Availability ─────────────────────────────────────────────────── */

export async function searchAvailability(
  day: string,
  startTime: string,
  endTime: string
): Promise<AvailabilityResult> {
  await delay(700);
  return mockAvailability(day, startTime, endTime);
}

/* ── Timetable ────────────────────────────────────────────────────── */

export async function uploadTimetable(_file: File): Promise<TimetableUpload> {
  await delay(1500);
  // Demo: always return a mock "uploaded" result
  return {
    id: "tbl-demo",
    filename: _file.name,
    uploaded_at: new Date().toISOString(),
    status: "REVIEW",
    entries_count: 36,
    rooms_count: 6,
  };
}

export async function listTimetables(): Promise<TimetableUpload[]> {
  await delay(500);
  return MOCK_TIMETABLES;
}

export async function getTimetablePreview(_id: string): Promise<TimetablePreview> {
  await delay(500);
  return MOCK_PREVIEW;
}

export async function approveTimetable(
  _id: string
): Promise<{ message: string; rooms_created: number; entries_created: number }> {
  await delay(800);
  return { message: "Timetable approved successfully.", rooms_created: 3, entries_created: 6 };
}

export async function deleteTimetable(_id: string): Promise<void> {
  await delay(500);
  // Demo: no-op
}

export async function deleteEntry(_uploadId: string, _entryIndex: number): Promise<void> {
  await delay(300);
  // Demo: no-op
}

/* ── Rooms ────────────────────────────────────────────────────────── */

export async function listRooms(): Promise<Room[]> {
  await delay(400);
  return MOCK_ROOMS;
}
