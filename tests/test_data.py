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


def test_normalize_segment_four_int_row():
    # [seg_no, word_no, start, end] -> [word_no-1, start, end]
    assert data._normalize_segment([5, 2, 100, 200]) == [1, 100, 200]


def test_normalize_segment_three_int_row():
    # [word_no, start, end] -> [word_no-1, start, end]
    assert data._normalize_segment([3, 100, 200]) == [2, 100, 200]


def test_normalize_segment_rejects_bad_rows():
    assert data._normalize_segment([0, 100, 200]) is None  # word_no < 1
    assert data._normalize_segment([1, 200, 200]) is None  # end <= start
    assert data._normalize_segment([1, 2]) is None  # too short
    assert data._normalize_segment(["x", "y", "z"]) is None  # non-numeric
    assert data._normalize_segment([]) is None  # empty


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self._payload


def test_get_surah_maps_translations_by_language(monkeypatch):
    """get_surah keys each translation to its UI language by resource_id and
    keeps a flat English `translation` for backward compatibility."""
    verses_payload = {
        "verses": [
            {
                "verse_number": 1,
                "words": [
                    {"text_uthmani": "بِسْمِ", "char_type_name": "word"},
                    {"text_uthmani": "ٱللَّهِ", "char_type_name": "word"},
                    {"text_uthmani": "۝", "char_type_name": "end"},
                ],
                "translations": [
                    {"resource_id": 20, "text": "In the name of Allah<sup foot_note=1>1</sup>"},
                    {"resource_id": 23, "text": "Allahın adı ilə"},
                    {"resource_id": 999, "text": "ignored — unknown id"},
                ],
                "audio": {
                    "url": "Alafasy/mp3/001001.mp3",
                    "segments": [[1, 1, 0, 500], [1, 2, 500, 900]],
                },
            }
        ]
    }

    monkeypatch.setattr(data, "_read_cache", lambda name: None)
    monkeypatch.setattr(data, "_write_cache", lambda name, payload: None)
    monkeypatch.setattr(
        data,
        "get_surah_index",
        lambda: [
            {
                "number": 1,
                "name": "الفاتحة",
                "englishName": "Al-Faatiha",
                "englishNameTranslation": "The Opening",
                "ayahCount": 7,
                "revelationType": "Meccan",
            }
        ],
    )
    monkeypatch.setattr(data.httpx, "get", lambda *a, **k: _FakeResponse(verses_payload))

    surah = data.get_surah(1)
    assert surah["englishName"] == "Al-Faatiha"
    ayah = surah["ayahs"][0]
    # only pronounced words kept, joined in order
    assert ayah["words"] == ["بِسْمِ", "ٱللَّهِ"]
    assert ayah["arabic"] == "بِسْمِ ٱللَّهِ"
    # translations keyed by language, footnote cleaned, unknown id dropped
    assert ayah["translations"] == {"en": "In the name of Allah", "az": "Allahın adı ilə"}
    assert ayah["translation"] == "In the name of Allah"
    # audio prefixed with the CDN base, segments normalized to [idx, start, end]
    assert ayah["audio"] == data.QURAN_AUDIO_BASE + "Alafasy/mp3/001001.mp3"
    assert ayah["segments"] == [[0, 0, 500], [1, 500, 900]]
