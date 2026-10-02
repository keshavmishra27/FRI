import type { AvailableRoom } from "../types/timetable";

interface Props {
  room: AvailableRoom;
  index: number;
}

export default function RoomCard({ room, index }: Props) {
  const isLab = room.room_type === "laboratory";

  return (
    <div
      className="glass-card room-available p-5 flex flex-col items-start gap-2"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      {/* Room badge */}
      <div className="flex items-center gap-2 w-full">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold ${
            isLab
              ? "bg-purple-500/15 text-purple-400"
              : "bg-emerald-500/15 text-emerald-400"
          }`}
        >
          {isLab ? "🔬" : "🏫"}
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold text-base">
            {isLab ? "Lab" : "Room"} {room.room_number}
          </p>
          <p className="text-xs text-slate-400 capitalize">{room.room_type}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Available
        </span>
      </div>
    </div>
  );
}
