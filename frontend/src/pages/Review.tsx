import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getTimetablePreview, approveTimetable } from "../services/api";
import type { TimetablePreview, ScheduleEntry } from "../types/timetable";

const DAYS_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function to12h(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const suffix = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${suffix}`;
}

export default function Review() {
  const { id } = useParams<{ id: string }>();
  const [preview, setPreview] = useState<TimetablePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [filterDay, setFilterDay] = useState<string>("All");
  const [filterSection, setFilterSection] = useState<string>("All");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getTimetablePreview(id)
      .then(setPreview)
      .catch(() => setError("Failed to load preview."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleApprove = async () => {
    if (!id) return;
    setApproving(true);
    try {
      await approveTimetable(id);
      setApproved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10 text-center">
        <p className="text-rose-400 text-lg">{error || "Not found"}</p>
        <Link to="/admin" className="text-accent-400 hover:underline mt-4 inline-block">
          ← Back to Admin
        </Link>
      </div>
    );
  }

  // Gather unique sections
  const sections = [
    "All",
    ...Array.from(new Set(preview.entries.map((e) => e.section || "?"))).sort(),
  ];

  // Apply filters
  let filtered = preview.entries;
  if (filterDay !== "All") filtered = filtered.filter((e) => e.day === filterDay);
  if (filterSection !== "All")
    filtered = filtered.filter((e) => e.section === filterSection);

  // Sort
  filtered.sort((a, b) => {
    const dayDiff =
      DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    return a.start_time.localeCompare(b.start_time);
  });

  // Group by day
  const grouped: Record<string, ScheduleEntry[]> = {};
  for (const entry of filtered) {
    (grouped[entry.day] ??= []).push(entry);
  }

  return (
    <main className="w-full bg-transparent min-h-screen text-white pb-10">
      <div className="mx-auto max-w-6xl px-6 pt-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <Link
            to="/admin"
            className="text-sm text-accent-400 hover:text-accent-300 transition-colors mb-2 inline-block"
          >
            ← Back to Admin
          </Link>
          <h1 className="text-2xl font-bold text-white">{preview.filename}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {preview.entries_count} entries &middot; {preview.rooms_count} rooms
            &middot; Status: {preview.status}
          </p>
        </div>

        {preview.status === "REVIEW" && !approved && (
          <button
            onClick={handleApprove}
            disabled={approving}
            className="btn-gradient flex items-center gap-2"
          >
            {approving ? (
              <>
                <span className="spinner !w-4 !h-4 !border-2" /> Approving…
              </>
            ) : (
              "✓ Approve & Activate"
            )}
          </button>
        )}

        {approved && (
          <span className="rounded-full bg-emerald-500/10 text-emerald-400 px-4 py-2 text-sm font-medium ring-1 ring-emerald-500/20">
            ✓ Approved
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">Day:</label>
          <select
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            className="form-input !w-auto !py-1.5 text-sm"
          >
            <option value="All">All Days</option>
            {DAYS_ORDER.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">Section:</label>
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="form-input !w-auto !py-1.5 text-sm"
          >
            {sections.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "All Sections" : `Section ${s}`}
              </option>
            ))}
          </select>
        </div>

        <span className="text-sm text-slate-500 ml-auto">
          Showing {filtered.length} of {preview.entries_count} entries
        </span>
      </div>

      {/* Schedule Table (grouped by day) */}
      {Object.keys(grouped).length === 0 ? (
        <div className="glass-card p-10 text-center text-slate-400">
          No entries match the current filters.
        </div>
      ) : (
        Object.entries(grouped).map(([day, entries]) => (
          <div key={day} className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent-500" />
              {day}
              <span className="text-sm font-normal text-slate-500">
                ({entries.length} classes)
              </span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-glass-border text-left text-slate-400">
                    <th className="pb-2 pr-4 font-medium">Time</th>
                    <th className="pb-2 pr-4 font-medium">Room</th>
                    <th className="pb-2 pr-4 font-medium">Subject</th>
                    <th className="pb-2 pr-4 font-medium">Section</th>
                    <th className="pb-2 pr-4 font-medium">Group</th>
                    <th className="pb-2 font-medium">Faculty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border">
                  {entries.map((e, i) => (
                    <tr
                      key={`${e.room_number}-${e.start_time}-${i}`}
                      className="text-slate-300 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-2.5 pr-4 whitespace-nowrap font-mono text-xs">
                        {to12h(e.start_time)} – {to12h(e.end_time)}
                      </td>
                      <td className="py-2.5 pr-4 font-medium text-white">
                        {e.room_number}
                      </td>
                      <td className="py-2.5 pr-4">{e.subject}</td>
                      <td className="py-2.5 pr-4">{e.section || "—"}</td>
                      <td className="py-2.5 pr-4">{e.group || "—"}</td>
                      <td className="py-2.5 text-slate-400">
                        {e.faculty || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
      </div>
    </main>
  );
}
