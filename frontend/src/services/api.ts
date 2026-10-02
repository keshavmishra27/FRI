/**
 * API Service — DEMO MODE (GitHub Pages)
 *
 * All data is parsed directly from "Time Table AIML 5th sem.pdf"
 * (AIML 5th Semester, Sections A, B, C — wef August 2026)
 *
 * In production, these functions call the FastAPI backend at /api.
 */

import type {
  AvailabilityResult,
  TimetableUpload,
  TimetablePreview,
  Room,
  ScheduleEntry,
} from "../types/timetable";

/* ── Helpers ──────────────────────────────────────────────────────── */
const delay = (ms = 400) => new Promise((res) => setTimeout(res, ms));

/* ── Time slot mapping (slot index → time range) ─────────────────── */
const SLOT_TIMES: Record<number, [string, string]> = {
  1: ["09:00", "09:50"],
  2: ["09:50", "10:40"],
  3: ["10:40", "11:30"],
  4: ["11:30", "12:20"],
  5: ["12:20", "13:10"],
  6: ["13:10", "14:00"],
  7: ["14:00", "14:50"],
  8: ["14:50", "15:40"],
  9: ["15:40", "16:30"],
  10: ["16:30", "17:20"],
};

/* ── Faculty mapping by subject and section ──────────────────────── */
const FACULTY_MAP: Record<string, string> = {
  "OS-A": "Dr. Chaitali Bhowmik",
  "OS-B": "Dr. Chaitali Bhowmik",
  "OS-C": "Dr. Aashita Chhabra",
  "DAA-A": "Dr. Sandhya Tarwani",
  "DAA-B": "Dr. Sandhya Tarwani",
  "DAA-C": "Ms. Nishi Jain",
  "FDL-A": "Ms. Kunjal Gupta",
  "FDL-B": "Ms. Deepika Rawat",
  "FDL-C": "Ms. Deepika Rawat",
  "COA-A": "Dr. Updesh Kumar Jaiswal",
  "COA-B": "Dr. Updesh Kumar Jaiswal",
  "COA-C": "Dr. Updesh Kumar Jaiswal",
  "IIOT-A": "Dr. Khushboo",
  "IIOT-B": "Dr. Ratnesh Ranjan",
  "IIOT-C": "Dr. Ratnesh Ranjan",
  "PEM-A": "Ms. Rachna Chawla",
  "PEM-B": "Ms. Swati Luthra",
  "PEM-C": "Mr. Kumar Ankur",
  "Seminar-A": "Dr. Sandhya Tarwani",
  "Seminar-B": "Ms. Deepika Rawat",
  "Seminar-C": "Dr. Mansi",
  "VAC-A": "Dr. Adeel Hashmi, Dr. Lokesh Jain",
  "VAC-B": "Dr. Adeel Hashmi, Dr. Lokesh Jain",
  "VAC-C": "Dr. Adeel Hashmi, Dr. Lokesh Jain",
  "TTPPR-A": "Dr. Sonakshi Vij",
  "TTPPR-B": "Dr. Sonakshi Vij",
  "TTPPR-C": "Dr. Sonakshi Vij",
  "Mentoring-A": "Ms. Kunjal Gupta",
  "Mentoring-B": "Ms. Deepika Rawat",
  "Mentoring-C": "Dr. Aashita Chhabra",
  "OS Lab-A": "Dr. Chaitali Bhowmik",
  "OS Lab-B": "Ms. Megha Gupta",
  "OS Lab-C": "Dr. Aashita Chhabra",
  "DAA Lab-A": "Dr. Sandhya Tarwani",
  "DAA Lab-B": "Dr. Sandhya Tarwani",
  "DAA Lab-C": "Ms. Nishi Jain",
  "FDL Lab-A": "Ms. Kunjal Gupta",
  "FDL Lab-B": "Ms. Deepika Rawat",
  "FDL Lab-C": "Ms. Deepika Rawat",
  "IIOT Lab-A": "Dr. Khushboo",
  "IIOT Lab-B": "Dr. Yashaswini Sharma",
  "IIOT Lab-C": "Dr. Ratnesh Ranjan",
};

/* ── Real schedule entries (parsed from AIML 5th Sem timetable PDF) ── */
// [day, slotIndex, roomNumber, subject, section, group?]
const RAW_SCHEDULE: [string, number, string, string, string, string?][] = [
  // ── Section A ────────────────────────────────────────────────────
  ["Monday", 3, "214", "DAA", "A"],
  ["Monday", 4, "214", "PEM", "A"],
  ["Monday", 5, "214", "FDL", "A"],
  ["Monday", 7, "214", "Seminar", "A"],
  ["Monday", 8, "214", "OS", "A"],
  ["Monday", 9, "214", "COA", "A"],
  ["Tuesday", 2, "215", "IIOT", "A"],
  ["Tuesday", 3, "215", "OS", "A"],
  ["Tuesday", 4, "215", "FDL", "A"],
  ["Tuesday", 5, "202", "OS Lab", "A", "G1"],
  ["Tuesday", 5, "105", "IIOT Lab", "A", "G2"],
  ["Tuesday", 8, "607", "PEM", "A"],
  ["Tuesday", 9, "105", "IIOT Lab", "A", "G1"],
  ["Tuesday", 9, "408", "OS Lab", "A", "G2"],
  ["Wednesday", 1, "408", "FDL Lab", "A", "G1"],
  ["Wednesday", 1, "411", "DAA Lab", "A", "G2"],
  ["Wednesday", 3, "606", "DAA", "A"],
  ["Wednesday", 4, "212", "COA", "A"],
  ["Wednesday", 5, "214", "Mentoring", "A"],
  ["Wednesday", 7, "411", "VAC", "A"],
  ["Wednesday", 7, "408", "TTPPR", "A"],
  ["Thursday", 1, "203", "DAA Lab", "A", "G1"],
  ["Thursday", 1, "510", "FDL Lab", "A", "G2"],
  ["Thursday", 3, "215", "IIOT", "A"],
  ["Thursday", 4, "215", "COA", "A"],
  ["Thursday", 6, "214", "DAA", "A"],
  ["Thursday", 7, "214", "OS", "A"],
  ["Thursday", 8, "214", "FDL", "A"],
  ["Friday", 1, "214", "IIOT", "A"],
  ["Friday", 2, "214", "OS", "A"],
  ["Friday", 4, "214", "DAA", "A"],
  ["Friday", 5, "214", "FDL", "A"],

  // ── Section B ────────────────────────────────────────────────────
  ["Monday", 2, "607", "IIOT", "B"],
  ["Monday", 3, "607", "OS", "B"],
  ["Monday", 4, "607", "DAA", "B"],
  ["Monday", 5, "105", "IIOT Lab", "B", "G2"],
  ["Monday", 5, "408", "OS Lab", "B", "G1"],
  ["Monday", 8, "211", "FDL", "B"],
  ["Monday", 9, "611", "DAA Lab", "B", "G1"],
  ["Monday", 9, "612", "FDL Lab", "B", "G2"],
  ["Tuesday", 1, "207", "IIOT", "B"],
  ["Tuesday", 2, "309", "DAA", "B"],
  ["Tuesday", 4, "210", "COA", "B"],
  ["Tuesday", 5, "215", "FDL", "B"],
  ["Wednesday", 2, "214", "PEM", "B"],
  ["Wednesday", 3, "214", "OS", "B"],
  ["Wednesday", 5, "215", "Seminar", "B"],
  ["Wednesday", 6, "212", "FDL", "B"],
  ["Wednesday", 7, "411", "VAC", "B"],
  ["Wednesday", 7, "408", "TTPPR", "B"],
  ["Thursday", 1, "610", "OS Lab", "B", "G2"],
  ["Thursday", 1, "511", "FDL Lab", "B", "G1"],
  ["Thursday", 3, "212", "COA", "B"],
  ["Thursday", 4, "214", "DAA", "B"],
  ["Thursday", 6, "212", "OS", "B"],
  ["Thursday", 7, "215", "FDL", "B"],
  ["Thursday", 8, "215", "IIOT", "B"],
  ["Friday", 1, "215", "PEM", "B"],
  ["Friday", 2, "215", "DAA", "B"],
  ["Friday", 4, "207", "OS", "B"],
  ["Friday", 5, "105", "IIOT Lab", "B", "G1"],
  ["Friday", 5, "408", "DAA Lab", "B", "G2"],
  ["Friday", 7, "215", "COA", "B"],
  ["Friday", 8, "215", "Mentoring", "B"],

  // ── Section C ────────────────────────────────────────────────────
  ["Monday", 2, "215", "OS", "C"],
  ["Monday", 3, "202", "FDL Lab", "C", "G1"],
  ["Monday", 3, "415", "DAA Lab", "C", "G2"],
  ["Monday", 7, "215", "DAA", "C"],
  ["Monday", 8, "211", "COA", "C"],
  ["Monday", 9, "215", "IIOT", "C"],
  ["Monday", 9, "411", "OS Lab", "C", "G1"],
  ["Monday", 9, "105", "IIOT Lab", "C", "G2"],
  ["Tuesday", 3, "214", "IIOT", "C"],
  ["Tuesday", 4, "214", "FDL", "C"],
  ["Tuesday", 6, "214", "DAA", "C"],
  ["Tuesday", 7, "214", "COA", "C"],
  ["Tuesday", 8, "214", "OS", "C"],
  ["Tuesday", 9, "214", "PEM", "C"],
  ["Wednesday", 1, "105", "IIOT Lab", "C", "G1"],
  ["Wednesday", 1, "202", "OS Lab", "C", "G2"],
  ["Wednesday", 3, "215", "FDL", "C"],
  ["Wednesday", 4, "214", "DAA", "C"],
  ["Wednesday", 6, "215", "OS", "C"],
  ["Wednesday", 7, "411", "VAC", "C"],
  ["Wednesday", 7, "408", "TTPPR", "C"],
  ["Thursday", 1, "215", "PEM", "C"],
  ["Thursday", 2, "215", "OS", "C"],
  ["Thursday", 4, "614", "Seminar", "C"],
  ["Thursday", 5, "215", "FDL", "C"],
  ["Thursday", 6, "215", "DAA", "C"],
  ["Friday", 1, "408", "DAA Lab", "C", "G1"],
  ["Friday", 1, "411", "FDL Lab", "C", "G2"],
  ["Friday", 4, "215", "COA", "C"],
  ["Friday", 5, "215", "FDL", "C"],
  ["Friday", 6, "210", "IIOT", "C"],
  ["Friday", 7, "406", "Mentoring", "C"],
];

/* ── All rooms extracted from the timetable ──────────────────────── */
const ROOM_TYPE_MAP: Record<string, string> = {
  "105": "Classroom", "202": "Classroom", "203": "Classroom",
  "207": "Classroom", "210": "Classroom", "211": "Classroom",
  "212": "Classroom", "214": "Classroom", "215": "Classroom",
  "309": "Classroom", "406": "Classroom", "408": "Classroom",
  "411": "Seminar Hall", "415": "Classroom", "510": "Classroom",
  "511": "Classroom", "606": "Classroom", "607": "Classroom",
  "610": "Classroom", "611": "Classroom", "612": "Classroom",
  "614": "Seminar Hall",
};

const ALL_ROOMS: Room[] = Object.entries(ROOM_TYPE_MAP).map(([num, type], i) => ({
  id: String(i + 1),
  room_number: num,
  room_type: type,
  building: "VIPS-TC",
}));

/* ── Schedule entries for display (all 96 entries) ────────────────── */
const SCHEDULE_ENTRIES: ScheduleEntry[] = RAW_SCHEDULE.map(
  ([day, slot, room, subject, section, group]) => {
    const [start_time, end_time] = SLOT_TIMES[slot];
    const faculty = FACULTY_MAP[`${subject}-${section}`] || undefined;
    return {
      room_number: room,
      day,
      start_time,
      end_time,
      subject,
      section,
      faculty,
      group: group || undefined,
    };
  }
);

/* ── Core availability logic ─────────────────────────────────────── */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function slotsOverlap(
  slotStart: string, slotEnd: string,
  queryStart: string, queryEnd: string
): boolean {
  const ss = timeToMinutes(slotStart);
  const se = timeToMinutes(slotEnd);
  const qs = timeToMinutes(queryStart);
  const qe = timeToMinutes(queryEnd);
  return ss < qe && se > qs;
}

/* ── Availability ─────────────────────────────────────────────────── */
export async function searchAvailability(
  day: string,
  startTime: string,
  endTime: string
): Promise<AvailabilityResult> {
  await delay(600);

  const occupiedRoomNumbers = new Set<string>();
  for (const [d, slot, room] of RAW_SCHEDULE) {
    if (d !== day) continue;
    const [slotStart, slotEnd] = SLOT_TIMES[slot];
    if (slotsOverlap(slotStart, slotEnd, startTime, endTime)) {
      occupiedRoomNumbers.add(room);
    }
  }

  const availableRooms = ALL_ROOMS
    .filter((r) => !occupiedRoomNumbers.has(r.room_number))
    .map((r) => ({ room_number: r.room_number, room_type: r.room_type }));

  const occupiedRooms = ALL_ROOMS
    .filter((r) => occupiedRoomNumbers.has(r.room_number))
    .map((r) => ({ room_number: r.room_number, room_type: r.room_type }));

  return {
    day,
    start_time: startTime,
    end_time: endTime,
    total_rooms: ALL_ROOMS.length,
    available_count: availableRooms.length,
    occupied_count: occupiedRooms.length,
    available_rooms: availableRooms,
    occupied_rooms: occupiedRooms,
  };
}

/* ── Timetable ────────────────────────────────────────────────────── */
export async function uploadTimetable(_file: File): Promise<TimetableUpload> {
  await delay(1200);
  return {
    id: "tbl-demo-upload",
    filename: _file.name,
    uploaded_at: new Date().toISOString(),
    status: "REVIEW",
    entries_count: 96,
    rooms_count: 22,
  };
}

export async function listTimetables(): Promise<TimetableUpload[]> {
  await delay(300);
  return [
    {
      id: "tbl-aiml-5th",
      filename: "Time Table AIML 5th sem.pdf",
      uploaded_at: "2026-08-01T09:00:00Z",
      status: "APPROVED",
      entries_count: 96,
      rooms_count: 22,
    },
  ];
}

export async function getTimetablePreview(_id: string): Promise<TimetablePreview> {
  await delay(300);
  return {
    upload_id: "tbl-aiml-5th",
    filename: "Time Table AIML 5th sem.pdf",
    status: "APPROVED",
    entries_count: SCHEDULE_ENTRIES.length,
    rooms_count: ALL_ROOMS.length,
    entries: SCHEDULE_ENTRIES, // Return all 96 entries across Sections A, B, C & Mon-Fri!
  };
}

export async function approveTimetable(
  _id: string
): Promise<{ message: string; rooms_created: number; entries_created: number }> {
  await delay(600);
  return {
    message: "Timetable approved successfully.",
    rooms_created: ALL_ROOMS.length,
    entries_created: SCHEDULE_ENTRIES.length,
  };
}

export async function deleteTimetable(_id: string): Promise<void> {
  await delay(400);
}

export async function deleteEntry(_uploadId: string, _entryIndex: number): Promise<void> {
  await delay(200);
}

/* ── Rooms ────────────────────────────────────────────────────────── */
export async function listRooms(): Promise<Room[]> {
  await delay(300);
  return ALL_ROOMS;
}
