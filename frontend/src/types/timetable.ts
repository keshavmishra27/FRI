/* ── TypeScript Interfaces ─────────────────────────────────────── */

export interface Room {
  id: string;
  room_number: string;
  room_type: string;
  building?: string;
  capacity?: number;
}

export interface ScheduleEntry {
  id?: string;
  room_number: string;
  day: string;
  start_time: string;
  end_time: string;
  subject: string;
  faculty?: string;
  section?: string;
  group?: string;
}

export interface TimetableUpload {
  id: string;
  filename: string;
  uploaded_at: string;
  status: "UPLOADED" | "PROCESSING" | "REVIEW" | "APPROVED" | "FAILED";
  processing_error?: string;
  entries_count: number;
  rooms_count: number;
}

export interface AvailableRoom {
  room_number: string;
  room_type: string;
}

export interface AvailabilityResult {
  day: string;
  start_time: string;
  end_time: string;
  total_rooms: number;
  available_count: number;
  occupied_count: number;
  available_rooms: AvailableRoom[];
  occupied_rooms: AvailableRoom[];
}

export interface TimetablePreview {
  upload_id: string;
  filename: string;
  status: string;
  entries_count: number;
  rooms_count: number;
  entries: ScheduleEntry[];
}
