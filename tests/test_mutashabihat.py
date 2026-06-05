"""Tests for the mutashabihat engine's pure logic — no network.

`build_index` / `get_similar` are not exercised here (they need the full Quran
text); these cover normalization and the contrastive token diff.
"""

from biraye import mutashabihat as m


def test_normalize_strips_diacritics_and_folds_variants():
    # alef-with-hamza folds to bare alef; diacritics removed
    assert m.normalize("أَنْعَمْتَ") == "انعمت"
    assert m.normalize("الٱرْض") == "الارض"


def test_diff_flags_only_changed_words():
    base = "الحمد لله رب العالمين"
    other = "الحمد لله رب الناس"
    diff = m._diff_tokens(base, other)
    flags = [t["same"] for t in diff]
    assert flags == [True, True, True, False]  # only last word differs


def test_identical_text_all_same():
    diff = m._diff_tokens("رب العالمين", "رب العالمين")
    assert all(t["same"] for t in diff)


def test_list_pairs_dedupes_and_orders(monkeypatch):
    # tiny fake graph: a<->b symmetric, plus b<->c
    fake = {
        "2:48": [{"surah": 2, "ayah": 123, "ratio": 0.81}],
        "2:123": [{"surah": 2, "ayah": 48, "ratio": 0.81}],
        "2:62": [{"surah": 5, "ayah": 69, "ratio": 0.82}],
    }
    monkeypatch.setattr(m, "build_index", lambda: fake)
    pairs = m.list_pairs()
    keys = {(p["a"]["surah"], p["a"]["ayah"], p["b"]["surah"], p["b"]["ayah"]) for p in pairs}
    assert (2, 48, 2, 123) in keys  # 2:48<->2:123 appears once, canonical order
    assert (2, 62, 5, 69) in keys
    assert len(pairs) == 2  # the symmetric duplicate was collapsed
