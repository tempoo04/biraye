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
