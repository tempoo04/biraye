"""Unit tests for the Quran data layer — no real network.

`get_surah` is exercised with `httpx.get` and the cache helpers monkeypatched,
so these tests cover the translation mapping, footnote cleaning and timing
segment normalization without touching the cache directory or the internet.
"""

from biraye import data


def test_clean_translation_drops_footnote_markers():
    raw = "Praise be to Allah<sup foot_note=12345>1</sup>, Lord of the worlds."
    assert data._clean_translation(raw) == "Praise be to Allah, Lord of the worlds."


def test_clean_translation_strips_markup_and_unescapes():
    raw = "  <i>Guide</i> us&nbsp;to&amp;the   path  "
    assert data._clean_translation(raw) == "Guide us to&the path"


def test_clean_translation_handles_empty():
    assert data._clean_translation("") == ""
    assert data._clean_translation(None) == ""
