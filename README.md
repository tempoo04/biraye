# BirAye <span dir="rtl">بِر آية</span>

> **bir âyet — "one verse."** A verbatim-memory engine for Quran Hifz, not a Quran reader.
>
> *Doesn't help you read Quran. Stops you forgetting it — by attacking the exact ways huffaz actually fail.*

BirAye is an evidence-based Quran memorization app. Where most apps are audio players
with a full mushaf, BirAye is built around the cognitive science of **verbatim sequence
memory** and traditional Hifz pedagogy: spaced review, deliberate scaffold withdrawal,
and (coming soon) similar-verse disambiguation.

## Why it's different

- **Three-tier spaced review** mirroring the classic *sabaq / sabqi / manzil* cycle, driven
  by an SM-2 / FSRS-lite scheduler tuned for verbatim recall — not flashcard facts.
- **Scaffold withdrawal** — audio and text support fade as a memory strengthens
  (`full → text → first-word → blind recall`), because research shows audio aids *encoding*
  but reduces retrieval difficulty at *review*.
- **Mutashabihat engine** *(planned, M4)* — automatic contrastive drilling of mutually-similar
  verses, the #1 cause of Hifz errors and a gap in every existing app.
- **Teacher's logbook, not a replacement** *(planned, M5)* — the human teacher stays the
  accuracy gate; the app schedules and tracks.

## Tech

- **Backend:** Python / FastAPI + SQLite
- **Frontend:** responsive web (browser + installable PWA, phone-friendly)
- **Data:** open APIs — [alquran.cloud](https://alquran.cloud) for Uthmani text,
  Muhammad Asad translation, and Mishary Alafasy per-ayah audio — cached locally.

## Run it

```bash
pip install -r requirements.txt
cd src
python -m uvicorn biraye.app:app --reload
```

Open <http://127.0.0.1:8000>.

- **Read** tab → pick a surah, read Arabic + translation, listen per ayah, **+ Memorize**.
- **Review** tab → due ayahs as recall cards with scaffold withdrawal; rate
  *Again / Hard / Good / Easy*. The "Review as of" date control lets you simulate future
  days to watch the scheduler work.

## API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET`  | `/api/health` | liveness |
| `GET`  | `/api/surahs` | list all 114 surahs |
| `GET`  | `/api/surah/{n}` | one surah: text + translation + audio |
| `POST` | `/api/memorize` | start tracking an ayah |
| `POST` | `/api/review` | rate recall, reschedule |
| `GET`  | `/api/queue?as_of=YYYY-MM-DD` | due ayahs by tier |
| `GET`  | `/api/progress` | counts per tier |

## Status

Built milestone-by-milestone — see [ROADMAP.md](ROADMAP.md). Done: M0–M3 (skeleton,
read+listen, scheduler, scaffold-withdrawal recall). Next: M4 mutashabihat engine.
