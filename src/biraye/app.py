"""BirAye FastAPI application.

Serves a JSON API for Quran data and the static PWA frontend.
Run: uvicorn biraye.app:app --reload   (from the src/ directory)
or:  py -m uvicorn biraye.app:app --reload --app-dir src
"""

from __future__ import annotations

import mimetypes
from datetime import date
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import __version__, data, db, memory, mutashabihat, scheduler
from .scheduler import RATINGS

# Windows' registry often lacks web-font mime types; register so StaticFiles
# serves the bundled Quran font as font/woff2 rather than text/plain.
mimetypes.add_type("font/woff2", ".woff2")
mimetypes.add_type("font/woff", ".woff")

FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"

app = FastAPI(title="BirAye", version=__version__)


@app.on_event("startup")
def _startup() -> None:
    db.init_db()


@app.middleware("http")
async def no_store_app_shell(request, call_next):
    """Force the browser to revalidate HTML/JS/CSS every load.

    The frontend changes often during development; without this a browser (or
    proxy) can serve a stale app shell. API/audio are unaffected.
    """
    response = await call_next(request)
    path = request.url.path
    if path == "/" or path == "/sw.js" or path.startswith("/static"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return response


class AyahRef(BaseModel):
    surah: int = Field(ge=1, le=114)
    ayah: int = Field(ge=1)


class ReviewIn(AyahRef):
    rating: str


def _enrich(item: dict) -> dict:
    """Attach arabic/translation/audio text to a queue/state item."""
    try:
        surah = data.get_surah(item["surah"])
        ayah = surah["ayahs"][item["ayah"] - 1]
        item = {
            **item,
            "arabic": ayah["arabic"],
            "words": ayah.get("words", []),
            "translation": ayah["translation"],
            "translations": ayah.get("translations", {}),
            "audio": ayah["audio"],
            "segments": ayah.get("segments", []),
            "surahName": surah["englishName"],
            "scaffold": scheduler.scaffold_for(item["interval_days"]),
        }
    except (data.DataError, IndexError):
        pass
    return item


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "version": __version__, "app": "BirAye"}


@app.get("/api/surahs")
def list_surahs() -> list[dict]:
    try:
        return data.get_surah_index()
    except data.DataError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/api/surah/{number}")
def read_surah(number: int) -> dict:
    try:
        return data.get_surah(number)
    except data.DataError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/memorize")
def memorize(ref: AyahRef) -> dict:
    """Start tracking an ayah (enters the sabaq queue)."""
    return memory.add_item(ref.surah, ref.ayah)


@app.post("/api/review")
def review(payload: ReviewIn) -> dict:
    if payload.rating not in RATINGS:
        raise HTTPException(status_code=422, detail=f"rating must be one of {RATINGS}")
    return memory.review_item(payload.surah, payload.ayah, payload.rating)


@app.get("/api/queue")
def queue(as_of: str | None = Query(default=None)) -> dict:
    """Ayahs due on/before `as_of` (YYYY-MM-DD; defaults to today),
    grouped by tier and enriched with text/audio."""
    try:
        when = date.fromisoformat(as_of) if as_of else None
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="as_of must be YYYY-MM-DD") from exc
    result = memory.get_queue(when)
    for tier in ("sabaq", "sabqi", "manzil"):
        result[tier] = [_enrich(i) for i in result[tier]]
    return result


@app.get("/api/progress")
def progress() -> dict:
    return memory.get_progress()


@app.get("/api/log")
def log() -> list[dict]:
    """The teacher's logbook: every tracked ayah with its scheduling state."""
    return memory.get_log()


@app.get("/api/similar/{surah}/{ayah}")
def similar(surah: int, ayah: int) -> dict:
    """Mutashabihat: verses similar to this one, with contrastive token diffs."""
    try:
        return mutashabihat.get_similar(surah, ayah)
    except data.DataError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/api/mutashabihat")
def mutashabihat_pairs() -> list[dict]:
    """All unique similar-verse pairs (for the browser tab)."""
    try:
        return mutashabihat.list_pairs()
    except data.DataError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


# Serve the frontend. index.html at "/", assets under their own paths.
@app.get("/")
def index() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/sw.js")
def service_worker() -> FileResponse:
    # served from root so its scope covers the whole app
    return FileResponse(FRONTEND_DIR / "sw.js", media_type="application/javascript")


app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
