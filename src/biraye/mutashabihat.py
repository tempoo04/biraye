"""Mutashabihat engine — finds mutually-similar ayahs for contrastive drilling.

Mutashabihat (mutually-similar verses) are the single biggest cause of Hifz
errors: verses that read almost identically but differ by a word, particle, or
order. No curated open dataset covers them comprehensively, so BirAye builds the
similarity graph algorithmically from the Quran text itself:

  1. Normalize each ayah (strip diacritics/tatweel, fold alef/hamza/ya/ta-marbuta).
  2. Use shared word n-grams as a candidate gate (verses sharing a long phrase).
  3. Score candidate pairs by token-sequence similarity and keep the closest.

The graph is computed once and cached. At review time the engine returns, for a
given ayah, its similar verses with a token-level diff so the UI can highlight
exactly which words differ — the words a hafiz must consciously disambiguate.
"""

from __future__ import annotations

import re
from difflib import SequenceMatcher

from . import data

# ---- tuning ----
NGRAM = 4  # shared phrase length (words) used as a candidate gate
MIN_RATIO = 0.55  # minimum token-sequence similarity to count as "similar"
MAX_NEIGHBORS = 8  # neighbours kept per ayah
MAX_CANDIDATES = 400  # cap on candidates scored per ayah (cost guard)

_DIACRITICS = re.compile(r"[ؐ-ًؚ-ٰٟۖ-ۭـ]")
_INDEX_CACHE_NAME = "mutashabihat"


def normalize(text: str) -> str:
    """Strip diacritics and fold orthographic variants for robust matching."""
    text = _DIACRITICS.sub("", text)
    text = (
        text.replace("أ", "ا")
        .replace("إ", "ا")
        .replace("آ", "ا")
        .replace("ٱ", "ا")
        .replace("ى", "ي")
        .replace("ؤ", "و")
        .replace("ئ", "ي")
        .replace("ة", "ه")
        .replace("ء", "")
    )
    return text.strip()


def _tokens(text: str) -> list[str]:
    return normalize(text).split()


def _key(surah: int, ayah: int) -> str:
    return f"{surah}:{ayah}"


def build_index(force: bool = False) -> dict[str, list[dict]]:
    """Build (or load) the similar-verse graph: {"s:a": [{surah,ayah,ratio}]}."""
    if not force:
        cached = data._read_cache(_INDEX_CACHE_NAME)
        if cached is not None:
            return cached  # type: ignore[return-value]

    quran = data.get_full_quran()
    tokens = [_tokens(a["arabic"]) for a in quran]

    # inverted index: n-gram -> list of ayah indices that contain it
    ngram_to_ids: dict[tuple[str, ...], list[int]] = {}
    for i, toks in enumerate(tokens):
        for g in {tuple(toks[j : j + NGRAM]) for j in range(len(toks) - NGRAM + 1)}:
            ngram_to_ids.setdefault(g, []).append(i)

    # candidate neighbours for each ayah = others sharing any n-gram
    candidates: list[set[int]] = [set() for _ in quran]
    for ids in ngram_to_ids.values():
        if len(ids) < 2:
            continue
        for i in ids:
            candidates[i].update(j for j in ids if j != i)

    index: dict[str, list[dict]] = {}
    for i, cand in enumerate(candidates):
        if not cand:
            continue
        scored = []
        for j in list(cand)[:MAX_CANDIDATES]:
            if tokens[i] == tokens[j]:
                ratio = 1.0
            else:
                ratio = SequenceMatcher(None, tokens[i], tokens[j]).ratio()
            if ratio >= MIN_RATIO:
                scored.append((ratio, j))
        if not scored:
            continue
        scored.sort(reverse=True)
        index[_key(quran[i]["surah"], quran[i]["ayah"])] = [
            {
                "surah": quran[j]["surah"],
                "ayah": quran[j]["ayah"],
                "ratio": round(ratio, 3),
            }
            for ratio, j in scored[:MAX_NEIGHBORS]
        ]

    data._write_cache(_INDEX_CACHE_NAME, index)
    return index


def _diff_tokens(a_arabic: str, b_arabic: str) -> list[dict]:
    """Token list for `a_arabic`, each marked same/different vs `b_arabic`.

    Comparison is done on normalized tokens, but the original (vocalized) tokens
    are returned for display.
    """
    a_raw = a_arabic.split()
    b_raw = b_arabic.split()
    a_norm = [normalize(t) for t in a_raw]
    b_norm = [normalize(t) for t in b_raw]
    out = [{"t": t, "same": False} for t in a_raw]
    for tag, i1, i2, _j1, _j2 in SequenceMatcher(None, a_norm, b_norm).get_opcodes():
        if tag == "equal":
            for k in range(i1, i2):
                out[k]["same"] = True
    return out


def list_pairs() -> list[dict]:
    """All unique similar-verse pairs for the browser view.

    Returns [{"a": {surah, ayah}, "b": {surah, ayah}, "ratio": float}, ...],
    de-duplicated (each pair once) and ordered by reference.
    """
    index = build_index()
    seen: set[tuple] = set()
    pairs: list[dict] = []
    for key, neighbours in index.items():
        s, a = (int(x) for x in key.split(":"))
        for n in neighbours:
            lo, hi = sorted([(s, a), (n["surah"], n["ayah"])])
            if (lo, hi) in seen:
                continue
            seen.add((lo, hi))
            pairs.append(
                {
                    "a": {"surah": lo[0], "ayah": lo[1]},
                    "b": {"surah": hi[0], "ayah": hi[1]},
                    "ratio": n["ratio"],
                }
            )
    pairs.sort(key=lambda p: (p["a"]["surah"], p["a"]["ayah"], p["b"]["surah"], p["b"]["ayah"]))
    return pairs


def get_similar(surah: int, ayah: int) -> dict:
    """Return an ayah's similar verses with token-level contrastive diffs."""
    index = build_index()
    neighbours = index.get(_key(surah, ayah), [])

    quran = data.get_full_quran()
    by_ref = {(a["surah"], a["ayah"]): a["arabic"] for a in quran}
    base_arabic = by_ref.get((surah, ayah), "")

    similar = []
    for n in neighbours:
        other = by_ref.get((n["surah"], n["ayah"]), "")
        similar.append(
            {
                "surah": n["surah"],
                "ayah": n["ayah"],
                "ratio": n["ratio"],
                "arabic": other,
                # the other ayah's tokens, differing words flagged vs base
                "tokens": _diff_tokens(other, base_arabic),
                # the base ayah's tokens, differing words flagged vs this neighbour
                "baseTokens": _diff_tokens(base_arabic, other),
            }
        )

    return {
        "surah": surah,
        "ayah": ayah,
        "arabic": base_arabic,
        "similar": similar,
        "count": len(similar),
    }
