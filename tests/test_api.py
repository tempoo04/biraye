"""API smoke tests using FastAPI's TestClient — no external network.

The Quran data layer (which fetches from alquran.cloud) is not exercised here;
these tests cover the local endpoints: health, memorize, review, progress.
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
