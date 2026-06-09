"""Quran data access — fetches text, translation and per-ayah audio, and caches
results locally as JSON.

Sources:
  - quran.com API v4 : per-surah Arabic (word-by-word Uthmani), English
    translation (Saheeh International), Mishary Alafasy per-ayah audio, and the
    word-by-word audio *timing segments* that drive word-level highlight. Using
    a single source keeps the audio, the word text, and the timings perfectly
    aligned (no drift, no basmala offset).
  - alquran.cloud   : the surah index (names/metadata) and the full-Quran text
    used only to build the mutashabihat similarity graph.

Cache lives in <repo>/data/cache/. Once a surah is cached the app works offline.
"""

from __future__ import annotations

import html
import json
import re
from pathlib import Path

import httpx

API_BASE = "https://api.alquran.cloud/v1"
TEXT_EDITION = "quran-uthmani"

# quran.com: word text, translation, matched audio + per-word timing segments.
QURAN_API = "https://api.quran.com/api/v4"
QURAN_AUDIO_BASE = "https://verses.quran.com/"
RECITER_ID = 7  # Mishary Rashid al-Afasy
TRANSLATION_ID = 20  # Saheeh International (clear, standard English)

CACHE_DIR = Path(__file__).resolve().parents[2] / "data" / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

_TIMEOUT = httpx.Timeout(30.0)
_SUP_RE = re.compile(r"<sup\b[^>]*>.*?</sup>", re.DOTALL)  # footnote markers (drop content too)
_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


class DataError(RuntimeError):
    """Raised when upstream data cannot be fetched."""


def _cache_path(name: str) -> Path:
    return CACHE_DIR / f"{name}.json"


def _read_cache(name: str) -> dict | list | None:
    path = _cache_path(name)
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return None


def _write_cache(name: str, payload: dict | list) -> None:
    _cache_path(name).write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def get_full_quran() -> list[dict]:
    """Return the entire Quran text as a flat list of ayahs.

    Shape: [{"surah": int, "ayah": int, "arabic": str}, ...] (6236 entries).
    Fetched in a single request and cached; used to build the mutashabihat index.
    """
    cached = _read_cache("quran_full")
    if cached is not None:
        return cached  # type: ignore[return-value]

    try:
        resp = httpx.get(f"{API_BASE}/quran/{TEXT_EDITION}", timeout=httpx.Timeout(60.0))
        resp.raise_for_status()
        payload = resp.json()["data"]
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        raise DataError(f"Could not fetch full Quran: {exc}") from exc

    flat = [
        {"surah": s["number"], "ayah": a["numberInSurah"], "arabic": a["text"]}
        for s in payload["surahs"]
        for a in s["ayahs"]
    ]
    _write_cache("quran_full", flat)
    return flat


def get_surah_index() -> list[dict]:
    """Return metadata for all 114 surahs (number, names, ayah count)."""
    cached = _read_cache("surah_index")
    if cached is not None:
        return cached  # type: ignore[return-value]

    try:
        resp = httpx.get(f"{API_BASE}/surah", timeout=_TIMEOUT)
        resp.raise_for_status()
        raw = resp.json()["data"]
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        raise DataError(f"Could not fetch surah index: {exc}") from exc

    index = [
        {
            "number": s["number"],
            "name": s["name"],
            "englishName": s["englishName"],
            "englishNameTranslation": s["englishNameTranslation"],
            "ayahCount": s["numberOfAyahs"],
            "revelationType": s["revelationType"],
        }
        for s in raw
    ]
    _write_cache("surah_index", index)
    return index


def _normalize_segment(seg: list[int]) -> list[int] | None:
    """Normalize a quran.com timing segment to ``[word_index_0based, start_ms, end_ms]``.

    quran.com emits ``[seg_no, word_no, start, end]`` (4 ints) or
    ``[word_no, start, end]`` (3 ints); word numbers are 1-based and count only
    pronounced words (the ayah-end marker is excluded), matching the word spans
    the frontend renders. Returns ``None`` for malformed rows so they are skipped.
    """
    try:
        if len(seg) >= 4:
            word_no, start, end = int(seg[1]), int(seg[2]), int(seg[3])
        else:
            word_no, start, end = int(seg[0]), int(seg[1]), int(seg[2])
    except (TypeError, ValueError, IndexError):
        return None
    if word_no < 1 or end <= start:
        return None
    return [word_no - 1, start, end]


def _clean_translation(text: str) -> str:
    """Strip footnote markers and markup from a quran.com translation string.

    Footnotes arrive as ``<sup foot_note=...>1</sup>`` — drop the whole element
    (including the digit) so no stray numbers leak into the displayed text.
    """
    text = _SUP_RE.sub("", text or "")
    text = _TAG_RE.sub("", text)
    return _WS_RE.sub(" ", html.unescape(text)).strip()


def get_surah(number: int) -> dict:
    """Return one surah with per-ayah Arabic, translation, audio and word timings.

    All ayah content comes from quran.com so the word text, audio recording and
    timing segments are mutually aligned. Surah metadata comes from the cached
    alquran.cloud index.

    Shape:
        {
          "number": int, "name": str, "englishName": str, "ayahCount": int,
          "ayahs": [
            {"numberInSurah": int, "arabic": str, "translation": str,
             "audio": str, "segments": [[word_index, start_ms, end_ms], ...]}
          ]
        }
    """
    if not 1 <= number <= 114:
        raise DataError(f"Surah number out of range: {number}")

    cached = _read_cache(f"surah_{number:03d}")
    if cached is not None:
        return cached  # type: ignore[return-value]

    meta = next((s for s in get_surah_index() if s["number"] == number), None)
    if meta is None:
        raise DataError(f"Unknown surah: {number}")

    params = {
        "words": "true",
        "word_fields": "text_uthmani",
        "translations": TRANSLATION_ID,
        "audio": RECITER_ID,
        "per_page": 300,
    }
    try:
        resp = httpx.get(f"{QURAN_API}/verses/by_chapter/{number}", params=params, timeout=_TIMEOUT)
        resp.raise_for_status()
        verses = resp.json()["verses"]
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        raise DataError(f"Could not fetch surah {number}: {exc}") from exc

    ayahs = []
    for v in verses:
        # One entry per pronounced word-object; this is the unit the timing
        # segments are keyed to, so the frontend renders one span per entry and
        # word_index lines up exactly (don't whitespace-split the joined string —
        # some words carry an internal space for a pause mark).
        word_list = [
            w.get("text_uthmani", "")
            for w in v.get("words", [])
            if w.get("char_type_name") == "word"
        ]
        arabic = " ".join(word_list).strip()

        translations = v.get("translations") or []
        translation = _clean_translation(translations[0]["text"]) if translations else ""

        audio = v.get("audio") or {}
        audio_url = QURAN_AUDIO_BASE + audio["url"] if audio.get("url") else ""
        segments = [s for s in (_normalize_segment(x) for x in audio.get("segments") or []) if s]

        ayahs.append(
            {
                "numberInSurah": v["verse_number"],
                "arabic": arabic,
                "words": word_list,
                "translation": translation,
                "audio": audio_url,
                "segments": segments,
            }
        )

    surah = {
        "number": meta["number"],
        "name": meta["name"],
        "englishName": meta["englishName"],
        "englishNameTranslation": meta["englishNameTranslation"],
        "ayahCount": meta["ayahCount"],
        "revelationType": meta["revelationType"],
        "ayahs": ayahs,
    }
    _write_cache(f"surah_{number:03d}", surah)
    return surah
