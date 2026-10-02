"""
Smart Classroom Finder — FastAPI Application
=============================================

Main entry point. Registers routes, CORS, and startup events.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db
from .api import timetable, availability, rooms

# ── Logging ───────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(name)s │ %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan ──────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    logger.info("Initializing database…")
    init_db()
    logger.info("Database ready.")
    yield
    logger.info("Shutting down.")


# ── App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Smart Classroom Finder",
    description=(
        "Process college timetable PDFs and find available classrooms. "
        "Upload a timetable → extract schedule → query room availability."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────
app.include_router(timetable.router)
app.include_router(availability.router)
app.include_router(rooms.router)


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "Smart Classroom Finder"}
