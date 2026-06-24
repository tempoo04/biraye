"""API smoke tests using FastAPI's TestClient — no external network.

The Quran data layer (which fetches from alquran.cloud) is not exercised here;
these tests cover the local endpoints: health, memorize, review, progress,
queue (with enrichment) and the teacher log.
"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch):
    from biraye import app as app_module
    from biraye import db

    monkeypatch.setattr(db, "DB_PATH", tmp_path / "test.db")
    db.init_db()
    with TestClient(app_module.app) as c:
        yield c


def _fake_surah(number):
    """A minimal surah payload so `_enrich` can run without the network."""
    return {
        "number": number,
        "englishName": f"Surah{number}",
        "ayahs": [
            {
                "numberInSurah": 1,
                "arabic": "بِسْمِ",
                "words": ["بِسْمِ"],
                "translation": "In the name",
                "translations": {"en": "In the name", "az": "Adı ilə"},
                "audio": "https://example/1.mp3",
                "segments": [[0, 0, 100]],
            }
        ],
    }


def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["app"] == "BirAye"


def test_memorize_then_progress(client):
    res = client.post("/api/memorize", json={"surah": 1, "ayah": 1})
    assert res.status_code == 200
    assert res.json()["stage"] == "sabaq"

    progress = client.get("/api/progress").json()
    assert progress["total"] == 1
    assert progress["sabaq"] == 1


def test_review_promotes_stage(client):
    client.post("/api/memorize", json={"surah": 1, "ayah": 2})
    res = client.post("/api/review", json={"surah": 1, "ayah": 2, "rating": "good"})
    assert res.status_code == 200
    assert res.json()["stage"] == "sabqi"

    progress = client.get("/api/progress").json()
    assert progress["sabqi"] == 1


def test_invalid_rating_rejected(client):
    client.post("/api/memorize", json={"surah": 1, "ayah": 3})
    res = client.post("/api/review", json={"surah": 1, "ayah": 3, "rating": "bogus"})
    assert res.status_code == 422


def test_queue_groups_by_tier_and_enriches(client, monkeypatch):
    from biraye import data

    monkeypatch.setattr(data, "get_surah", lambda n: _fake_surah(n))
    client.post("/api/memorize", json={"surah": 1, "ayah": 1})

    body = client.get("/api/queue").json()
    assert body["total_due"] == 1
    assert len(body["sabaq"]) == 1
    item = body["sabaq"][0]
    # enrichment attached from the (mocked) data layer
    assert item["arabic"] == "بِسْمِ"
    assert item["translation"] == "In the name"
    assert item["translations"]["az"] == "Adı ilə"
    assert item["audio"] == "https://example/1.mp3"
    assert item["surahName"] == "Surah1"
    # scaffold derived from interval maturity (new item -> full)
    assert item["scaffold"] == "full"


def test_queue_rejects_bad_as_of(client):
    res = client.get("/api/queue", params={"as_of": "24-06-2026"})
    assert res.status_code == 422
    assert "YYYY-MM-DD" in res.json()["detail"]
