# BirAye — Quran Memorization App · Roadmap

> **BirAye** (bir âyet — "one verse") — verse-by-verse. A verbatim-memory engine for Hifz, not a Quran reader.
> Pitch: *"Doesn't help you read Quran. Stops you forgetting it — by attacking the exact ways huffaz actually fail."*

Stack: **Python / FastAPI** backend, **SQLite** storage, **responsive PWA** frontend (browser + installable on phone).
Data: open APIs (`alquran.cloud` for text + translation + per-ayah audio), cached locally.

## Method: agile, milestone-by-milestone

Each milestone is a **runnable, testable increment**. You test before the next one starts.

| Milestone | What you get | How you test it | Status |
|-----------|--------------|-----------------|--------|
| **M0** Skeleton | FastAPI app shell + health check | App loads in browser at `localhost:8000` | ✅ done |
| **M1** See + Listen | Pick a surah → Arabic + translation + play per-ayah audio | Open Al-Fātiḥa, read it, hear each ayah | ✅ done |
| **M2** Three-tier scheduler | sabaq/sabqi/manzil queues, FSRS-lite review engine | Memorize Fātiḥa, see it scheduled, return next day | ✅ done |
| **M3** Scaffold-withdrawal recall | Recall mode: audio fades (full → first-word → silent) + self-rate | Review an ayah with progressive hiding | ✅ done |
| **M4** Mutashabihat engine | Similar-verse contrastive drilling + twin-surfacing | Two similar verses drilled side-by-side | ✅ done |
| **M5** PWA + teacher-log + polish | Installable PWA, offline shell, sleep-timed hint, teacher logbook + CSV export | Add to home screen; export the log | ✅ done |
| **M6** Repeat trainer (Drill) | Range player: surah + from/to ayah, per-ayah & whole-range repeat ×(1/2/3/4/5/10/∞), playback speed ×(0.5/1/1.5/2) | Drill Baqarah 7→20, each ayah ×5, range ×∞, speed ×1.5 | ✅ done |

*Deferred (optional future):* per-word meaning gloss for non-Arabic speakers (needs word-by-word translation data); speech-recognition mistake detection.

## Research foundation (why these features)

- **Verbatim ≠ fact memory** → hierarchical review (macro FSRS per page/juz + micro ayah-level by error position).
- **Errors are positional** (middle of surah) **and interference-based** (mutashabihat) → M2 position tracking + M4 engine.
- **Audio aids encoding, hurts retrieval** → M3 deliberate scaffold withdrawal.
- **Sleep consolidates sequences** → M5 night-encode / morning cold-recall loop.
- **Teacher is the accuracy gate** → app is the teacher's logbook, not a replacement.

Full cited research lives in `docs/research/` (to be written up).
