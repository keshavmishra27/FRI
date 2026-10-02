import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  uploadTimetable,
  listTimetables,
  deleteTimetable,
  approveTimetable,
} from "../services/api";
import type { TimetableUpload } from "../types/timetable";
import ShaderShowcase from "../components/ui/hero";

const STATUS_COLORS: Record<string, string> = {
  UPLOADED: "bg-blue-500/10 text-blue-400 ring-blue-500/20",
  PROCESSING: "bg-yellow-500/10 text-yellow-400 ring-yellow-500/20",
  REVIEW: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
  APPROVED: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  FAILED: "bg-rose-500/10 text-rose-400 ring-rose-500/20",
};

export default function Admin() {
  const [uploads, setUploads] = useState<TimetableUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    loadUploads();
  }, []);

  const loadUploads = async () => {
    try {
      const data = await listTimetables();
      setUploads(data);
    } catch {
      setError("Failed to load timetables.");
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await uploadTimetable(file);
      setSuccess(
        `Uploaded "${result.filename}" — ${result.entries_count} entries extracted from ${result.rooms_count} rooms.`
      );
      await loadUploads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.toLowerCase().endsWith(".pdf")) {
      handleUpload(file);
    } else {
      setError("Only PDF files are supported.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this timetable and all its schedule entries?")) return;
    try {
      await deleteTimetable(id);
      await loadUploads();
      setSuccess("Timetable deleted.");
    } catch {
      setError("Failed to delete.");
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const result = await approveTimetable(id);
      setSuccess(result.message);
      await loadUploads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed.");
    }
  };  return (
    <main className="w-full bg-transparent min-h-screen text-white">
      <ShaderShowcase />
      <div className="mx-auto max-w-5xl px-6 py-16 relative z-10" id="admin-dashboard">

      {/* Upload Area */}
      <div
        className={`glass-card p-10 text-center cursor-pointer transition-all mb-8 ${
          dragOver
            ? "!border-accent-500 !bg-accent-500/10"
            : "hover:!border-accent-500/30"
        }`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        id="upload-area"
      >
        <input
          type="file"
          ref={fileRef}
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="spinner" />
            <p className="text-slate-300">Processing PDF…</p>
          </div>
        ) : (
          <>
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-400">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-white">
              Upload Timetable PDF
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Drag and drop or click to browse &middot; Max 10 MB
            </p>
          </>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-400">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right text-rose-400/60 hover:text-rose-400"
          >
            ✕
          </button>
        </div>
      )}
      {success && (
        <div className="mb-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-400">
          {success}
          <button
            onClick={() => setSuccess(null)}
            className="float-right text-emerald-400/60 hover:text-emerald-400"
          >
            ✕
          </button>
        </div>
      )}

      {/* Uploads List */}
      <h2 className="text-xl font-semibold text-white mb-4">
        Uploaded Timetables
      </h2>

      {uploads.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-slate-400">
            No timetables uploaded yet. Upload a PDF to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {uploads.map((u) => (
            <div
              key={u.id}
              className="glass-card p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <p className="font-semibold text-white truncate">
                    {u.filename}
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                      STATUS_COLORS[u.status] || STATUS_COLORS.UPLOADED
                    }`}
                  >
                    {u.status}
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  {u.entries_count} entries &middot; {u.rooms_count} rooms
                  &middot;{" "}
                  {new Date(u.uploaded_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {u.processing_error && (
                  <p className="text-xs text-rose-400 mt-1">
                    Error: {u.processing_error}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {u.status === "REVIEW" && (
                  <>
                    <Link
                      to={`/admin/review/${u.id}`}
                      className="rounded-lg bg-amber-500/10 px-3.5 py-2 text-sm font-medium text-amber-400 ring-1 ring-amber-500/20 hover:bg-amber-500/20 transition-colors"
                    >
                      Review
                    </Link>
                    <button
                      onClick={() => handleApprove(u.id)}
                      className="rounded-lg bg-emerald-500/10 px-3.5 py-2 text-sm font-medium text-emerald-400 ring-1 ring-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                    >
                      Approve
                    </button>
                  </>
                )}
                {u.status === "APPROVED" && (
                  <Link
                    to={`/admin/review/${u.id}`}
                    className="rounded-lg bg-accent-500/10 px-3.5 py-2 text-sm font-medium text-accent-400 ring-1 ring-accent-500/20 hover:bg-accent-500/20 transition-colors"
                  >
                    View
                  </Link>
                )}
                <button
                  onClick={() => handleDelete(u.id)}
                  className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-400 ring-1 ring-rose-500/20 hover:bg-rose-500/20 transition-colors"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </main>
  );
}
