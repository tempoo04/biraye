"""Quran data access — fetches text, translation and per-ayah audio from the
open alquran.cloud API and caches results locally as JSON.

Editions used:
  - quran-uthmani : Arabic Uthmani script
  - en.asad       : English translation (Muhammad Asad)
  - ar.alafasy    : audio recitation (Mishary Alafasy), provides per-ayah mp3 URLs

Cache lives in <repo>/data/cache/. Once a surah is cached the app works offline.
"""

from __future__ import annotations

import json
from pathlib import Path

import httpx

API_BASE = "https://api.alquran.cloud/v1"
TEXT_EDITION = "quran-uthmani"
TRANSLATION_EDITION = "en.asad"
AUDIO_EDITION = "ar.alafasy"

CACHE_DIR = Path(__file__).resolve().parents[2] / "data" / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

_TIMEOUT = httpx.Timeout(20.0)


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


def get_surah(number: int) -> dict:
    """Return one surah merged across text/translation/audio editions.

    Shape:
        {
          "number": int, "name": str, "englishName": str, "ayahCount": int,
          "ayahs": [
            {"numberInSurah": int, "arabic": str, "translation": str, "audio": str}
          ]
        }
    """
    if not 1 <= number <= 114:
        raise DataError(f"Surah number out of range: {number}")

    cached = _read_cache(f"surah_{number:03d}")
    if cached is not None:
        return cached  # type: ignore[return-value]

    editions = ",".join([TEXT_EDITION, TRANSLATION_EDITION, AUDIO_EDITION])
    try:
        resp = httpx.get(f"{API_BASE}/surah/{number}/editions/{editions}", timeout=_TIMEOUT)
        resp.raise_for_status()
        blocks = resp.json()["data"]
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        raise DataError(f"Could not fetch surah {number}: {exc}") from exc

    by_edition = {b["edition"]["identifier"]: b for b in blocks}
    text_block = by_edition[TEXT_EDITION]
    trans_ayahs = {a["numberInSurah"]: a for a in by_edition[TRANSLATION_EDITION]["ayahs"]}
    audio_ayahs = {a["numberInSurah"]: a for a in by_edition[AUDIO_EDITION]["ayahs"]}

    ayahs = []
    for a in text_block["ayahs"]:
        n = a["numberInSurah"]
        ayahs.append(
            {
                "numberInSurah": n,
                "arabic": a["text"],
                "translation": trans_ayahs.get(n, {}).get("text", ""),
                "audio": audio_ayahs.get(n, {}).get("audio", ""),
            }
        )

    surah = {
        "number": text_block["number"],
        "name": text_block["name"],
        "englishName": text_block["englishName"],
        "englishNameTranslation": text_block["englishNameTranslation"],
        "ayahCount": text_block["numberOfAyahs"],
        "revelationType": text_block["revelationType"],
        "ayahs": ayahs,
    }
    _write_cache(f"surah_{number:03d}", surah)
    return surah
