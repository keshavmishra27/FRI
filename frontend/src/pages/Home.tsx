import { useState } from "react";
import DaySelector from "../components/DaySelector";
import TimeSelector from "../components/TimeSelector";
import RoomGrid from "../components/RoomGrid";
import { searchAvailability } from "../services/api";
import type { AvailabilityResult } from "../types/timetable";
import { PrismaHero } from "../components/ui/prisma-hero";

export default function Home() {
  const [day, setDay] = useState("Monday");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:30");
  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!startTime || !endTime) {
      setError("Please select both start and end times.");
      return;
    }
    if (startTime >= endTime) {
      setError("End time must be after start time.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await searchAvailability(day, startTime, endTime);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="w-full min-h-screen text-white">
      <PrismaHero />
      <div className="relative z-10 mx-auto max-w-6xl w-full px-4 py-16" id="search">
        {/* Search Card */}
        <div className="glass-card mx-auto max-w-2xl p-8 mb-8" style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px" }}>
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-semibold mb-2" style={{ color: "#E1E0CC" }}>Find Available Rooms</h2>
            <p className="text-sm text-gray-400">Select a day and time slot to find empty classrooms.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <DaySelector value={day} onChange={setDay} />
            <TimeSelector
              label="Start Time"
              value={startTime}
              onChange={setStartTime}
              id="start-time"
            />
            <TimeSelector
              label="End Time"
              value={endTime}
              onChange={setEndTime}
              id="end-time"
            />
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-sm text-rose-400">
              {error}
            </div>
          )}

          <button
            onClick={handleSearch}
            disabled={loading}
            className="btn-gradient mt-6 w-full flex items-center justify-center gap-2 text-base"
            style={{ background: "#204434", color: "#E1E0CC", padding: "12px", borderRadius: "8px", border: "1px solid #10261d", transition: "background .18s,box-shadow .18s" }}
            id="search-btn"
          >
            {loading ? (
              <>
                <span className="spinner !w-5 !h-5 !border-2" />
                Searching…
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                Search Now
              </>
            )}
          </button>
        </div>

        {/* Results */}
        {result && <RoomGrid result={result} />}
      </div>
    </main>
  );
}
