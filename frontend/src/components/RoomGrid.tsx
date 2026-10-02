import type { AvailabilityResult } from "../types/timetable";
import RoomCard from "./RoomCard";

interface Props {
  result: AvailabilityResult;
}

/** Converts "14:00" to "2:00 PM" */
function to12h(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const suffix = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${suffix}`;
}

export default function RoomGrid({ result }: Props) {
  return (
    <div className="mt-10 fade-in-up">
      {/* Summary Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Available Rooms</h2>
          <p className="text-slate-400 mt-1">
            {result.day} &middot; {to12h(result.start_time)} – {to12h(result.end_time)}
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-3">
          <div className="stat-card min-w-[5rem]">
            <p className="text-2xl font-bold text-white">{result.total_rooms}</p>
            <p className="text-xs text-slate-400 mt-0.5">Total</p>
          </div>
          <div className="stat-card min-w-[5rem] !border-emerald-500/20">
            <p className="text-2xl font-bold text-emerald-400">
              {result.available_count}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Available</p>
          </div>
          <div className="stat-card min-w-[5rem] !border-rose-500/20">
            <p className="text-2xl font-bold text-rose-400">
              {result.occupied_count}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Occupied</p>
          </div>
        </div>
      </div>

      {/* Room Cards Grid */}
      {result.available_count === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-4xl mb-3">😔</p>
          <p className="text-lg font-medium text-slate-300">
            No rooms available
          </p>
          <p className="text-sm text-slate-500 mt-1">
            All rooms are occupied during this time slot. Try a different time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {result.available_rooms.map((room, i) => (
            <RoomCard key={room.room_number} room={room} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
