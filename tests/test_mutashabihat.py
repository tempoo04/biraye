"""Tests for the mutashabihat engine — no network.

Normalization and the contrastive token diff are tested directly. The graph
builder (`build_index`) and `get_similar` are exercised against a tiny synthetic
corpus injected in place of the full Quran: `normalize` leaves ASCII untouched,
so plain words stand in for ayahs and the n-gram gate / scoring run for real.
"""

import pytest

from biraye import mutashabihat as m

# Two near-identical "ayahs" sharing a 4-word phrase (the NGRAM=4 candidate gate)
# and differing by one word, plus an unrelated verse that shares no phrase.
_CORPUS = [
    {"surah": 1, "ayah": 1, "arabic": "the quick brown fox jumps high"},
    {"surah": 1, "ayah": 2, "arabic": "the quick brown fox leaps high"},
    {"surah": 2, "ayah": 1, "arabic": "completely different unrelated verse text here"},
]


@pytest.fixture
def synthetic_corpus(monkeypatch):
    """Build the graph from _CORPUS instead of the Quran, without touching cache."""
    monkeypatch.setattr(m.data, "get_full_quran", lambda: _CORPUS)
    monkeypatch.setattr(m.data, "_read_cache", lambda name: None)  # force a fresh build
    monkeypatch.setattr(m.data, "_write_cache", lambda name, payload: None)


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


def test_build_index_gates_on_shared_phrase_and_scores(synthetic_corpus):
    index = m.build_index(force=True)
    # the two verses sharing "the quick brown fox" are mutual neighbours
    assert "1:1" in index and "1:2" in index
    neigh = index["1:1"]
    assert len(neigh) == 1
    assert (neigh[0]["surah"], neigh[0]["ayah"]) == (1, 2)
    assert neigh[0]["ratio"] >= m.MIN_RATIO
    # the unrelated verse shares no 4-gram, so it has no entry
    assert "2:1" not in index


def test_get_similar_returns_contrastive_diffs(synthetic_corpus):
    result = m.get_similar(1, 1)
    assert result["count"] == 1
    twin = result["similar"][0]
    assert (twin["surah"], twin["ayah"]) == (1, 2)
    # neighbour's tokens, flagged vs the base: only "leaps" (index 4) differs
    assert [t["same"] for t in twin["tokens"]] == [True, True, True, True, False, True]
    # base's tokens, flagged vs the neighbour: only "jumps" (index 4) differs
    assert [t["same"] for t in twin["baseTokens"]] == [True, True, True, True, False, True]


def test_get_similar_unmatched_ayah_is_empty(synthetic_corpus):
    result = m.get_similar(2, 1)
    assert result["count"] == 0
    assert result["similar"] == []


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
