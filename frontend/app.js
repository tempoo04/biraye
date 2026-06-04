"use strict";

const els = {
  // tabs / views
  tabRead: document.getElementById("tab-read"),
  tabReview: document.getElementById("tab-review"),
  tabLog: document.getElementById("tab-log"),
  viewRead: document.getElementById("view-read"),
  viewReview: document.getElementById("view-review"),
  viewLog: document.getElementById("view-log"),
  dueBadge: document.getElementById("due-badge"),
  sleepHint: document.getElementById("sleep-hint"),
  logBody: document.querySelector("#log-table tbody"),
  logEmpty: document.getElementById("log-empty"),
  logExport: document.getElementById("log-export"),
  // read
  select: document.getElementById("surah-select"),
  reader: document.getElementById("reader"),
  title: document.getElementById("surah-title"),
  meta: document.getElementById("surah-meta"),
  list: document.getElementById("ayah-list"),
  // review
  cSabaq: document.getElementById("c-sabaq"),
  cSabqi: document.getElementById("c-sabqi"),
  cManzil: document.getElementById("c-manzil"),
  cTotal: document.getElementById("c-total"),
  asof: document.getElementById("asof-input"),
  card: document.getElementById("review-card"),
  done: document.getElementById("review-done"),
  rvTier: document.getElementById("rv-tier"),
  rvRef: document.getElementById("rv-ref"),
  rvScaffold: document.getElementById("rv-scaffold"),
  rvArabic: document.getElementById("rv-arabic"),
  rvTranslation: document.getElementById("rv-translation"),
  rvListen: document.getElementById("rv-listen"),
  rvShow: document.getElementById("rv-show"),
  rvReveal: document.getElementById("rv-reveal"),
  rvSimilar: document.getElementById("rv-similar"),
  // shared
  status: document.getElementById("status"),
  player: document.getElementById("player"),
};

let playingBtn = null;
let reviewQueue = []; // flattened list of due items for the chosen day
let currentItem = null;

/* ---------- helpers ---------- */
function setStatus(msg, isError = false) {
  els.status.textContent = msg || "";
  els.status.classList.toggle("error", Boolean(isError));
}
function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/* ---------- mutashabihat (similar verses) ---------- */
function renderTokens(tokens) {
  return tokens
    .map((tk) =>
      tk.same
        ? escapeHtml(tk.t)
        : `<span class="diff">${escapeHtml(tk.t)}</span>`
    )
    .join(" ");
}

function renderContrast(d) {
  if (!d || !d.count) {
    return '<p class="similar-none">No similar verses — low confusion risk.</p>';
  }
  const pairs = d.similar
    .map(
      (s) => `
      <div class="pair">
        <div class="pair-line">
          <span class="pair-ref">${d.surah}:${d.ayah}</span>
          <span class="ayah-arabic small">${renderTokens(s.baseTokens)}</span>
        </div>
        <div class="pair-line">
          <span class="pair-ref">${s.surah}:${s.ayah}
            <em>${Math.round(s.ratio * 100)}%</em></span>
          <span class="ayah-arabic small">${renderTokens(s.tokens)}</span>
        </div>
      </div>`
    )
    .join("");
  return (
    `<p class="similar-head">⚠ ${d.count} similar verse${d.count > 1 ? "s" : ""} ` +
    `— drill the <span class="diff">highlighted</span> differences:</p>${pairs}`
  );
}

async function loadSimilar(surah, ayah, container) {
  container.innerHTML = '<p class="similar-none">Checking similar verses…</p>';
  try {
    const res = await fetch(`/api/similar/${surah}/${ayah}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    container.innerHTML = renderContrast(await res.json());
  } catch (err) {
    container.innerHTML = `<p class="similar-none">Similar check failed: ${err.message}</p>`;
  }
}

/* ---------- tabs ---------- */
function showTab(which) {
  els.viewRead.hidden = which !== "read";
  els.viewReview.hidden = which !== "review";
  els.viewLog.hidden = which !== "log";
  els.tabRead.classList.toggle("active", which === "read");
  els.tabReview.classList.toggle("active", which === "review");
  els.tabLog.classList.toggle("active", which === "log");
  stopAudio();
  if (which === "review") loadReview();
  if (which === "log") loadLog();
}
els.tabRead.addEventListener("click", () => showTab("read"));
els.tabReview.addEventListener("click", () => showTab("review"));
els.tabLog.addEventListener("click", () => showTab("log"));

/* ---------- read view ---------- */
async function loadSurahIndex() {
  setStatus("Loading surah list…");
  try {
    const res = await fetch("/api/surahs");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const surahs = await res.json();
    els.select.innerHTML =
      '<option value="">— pick a surah —</option>' +
      surahs
        .map(
          (s) =>
            `<option value="${s.number}">${s.number}. ${s.englishName} ` +
            `— ${s.name} (${s.ayahCount})</option>`
        )
        .join("");
    setStatus("");
  } catch (err) {
    setStatus(`Could not load surahs: ${err.message}`, true);
  }
}

async function loadSurah(number) {
  if (!number) {
    els.reader.hidden = true;
    return;
  }
  stopAudio();
  setStatus("Loading surah…");
  try {
    const res = await fetch(`/api/surah/${number}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const surah = await res.json();
    renderSurah(number, surah);
    setStatus("");
  } catch (err) {
    setStatus(`Could not load surah: ${err.message}`, true);
  }
}

function renderSurah(number, surah) {
  els.title.textContent = `${surah.englishName} — ${surah.name}`;
  els.meta.textContent =
    `${surah.englishNameTranslation} · ${surah.revelationType} · ` +
    `${surah.ayahCount} ayahs`;

  els.list.innerHTML = "";
  for (const ayah of surah.ayahs) {
    const li = document.createElement("li");
    li.className = "ayah";

    const arabic = document.createElement("div");
    arabic.className = "ayah-arabic";
    arabic.innerHTML =
      `${escapeHtml(ayah.arabic)}<span class="ayah-num">${ayah.numberInSurah}</span>`;

    const trans = document.createElement("p");
    trans.className = "ayah-translation";
    trans.textContent = ayah.translation;

    const actions = document.createElement("div");
    actions.className = "ayah-actions";

    const playBtn = document.createElement("button");
    playBtn.className = "play-btn";
    playBtn.type = "button";
    playBtn.textContent = "▶ Listen";
    playBtn.disabled = !ayah.audio;
    playBtn.addEventListener("click", () => togglePlay(ayah.audio, playBtn));

    const memBtn = document.createElement("button");
    memBtn.className = "ghost-btn";
    memBtn.type = "button";
    memBtn.textContent = "+ Memorize";
    memBtn.addEventListener("click", () =>
      memorize(Number(number), ayah.numberInSurah, memBtn)
    );

    const simBtn = document.createElement("button");
    simBtn.className = "ghost-btn";
    simBtn.type = "button";
    simBtn.textContent = "≈ Similar";
    const simPanel = document.createElement("div");
    simPanel.className = "similar-panel";
    simPanel.hidden = true;
    simBtn.addEventListener("click", () => {
      if (simPanel.hidden && !simPanel.dataset.loaded) {
        loadSimilar(Number(number), ayah.numberInSurah, simPanel);
        simPanel.dataset.loaded = "1";
      }
      simPanel.hidden = !simPanel.hidden;
    });

    actions.append(playBtn, memBtn, simBtn);
    li.append(arabic, trans, actions, simPanel);
    els.list.append(li);
  }
  els.reader.hidden = false;
}

async function memorize(surah, ayah, btn) {
  try {
    const res = await fetch("/api/memorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surah, ayah }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    btn.textContent = "✓ Added";
    btn.disabled = true;
    refreshDueBadge();
  } catch (err) {
    setStatus(`Could not add: ${err.message}`, true);
  }
}

/* ---------- review view ---------- */
async function refreshDueBadge() {
  try {
    const res = await fetch(`/api/queue?as_of=${els.asof.value || todayISO()}`);
    if (!res.ok) return;
    const q = await res.json();
    els.dueBadge.textContent = q.total_due;
    els.dueBadge.hidden = q.total_due === 0;
  } catch {
    /* ignore badge errors */
  }
}

async function loadProgress() {
  try {
    const res = await fetch("/api/progress");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const p = await res.json();
    els.cSabaq.textContent = p.sabaq;
    els.cSabqi.textContent = p.sabqi;
    els.cManzil.textContent = p.manzil;
    els.cTotal.textContent = p.total;
  } catch (err) {
    setStatus(`Could not load progress: ${err.message}`, true);
  }
}

function updateSleepHint() {
  // Research: encode before sleep, cold-recall after waking. Nudge by local hour.
  const h = new Date().getHours();
  let msg = "";
  if (h >= 20 || h < 2) {
    msg = "🌙 Night session — encode new material and your hardest reviews now; " +
      "sleep consolidates verbatim sequences.";
  } else if (h >= 4 && h < 11) {
    msg = "🌅 Morning — cold recall. Hide the audio and test what you slept on " +
      "before adding anything new.";
  }
  els.sleepHint.textContent = msg;
  els.sleepHint.hidden = !msg;
}

async function loadReview() {
  updateSleepHint();
  if (!els.asof.value) els.asof.value = todayISO();
  await loadProgress();
  setStatus("Loading review queue…");
  try {
    const res = await fetch(`/api/queue?as_of=${els.asof.value}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const q = await res.json();
    // sabaq first (newest/weakest), then sabqi, then manzil
    reviewQueue = [
      ...q.sabaq.map((i) => ({ ...i, _tier: "sabaq" })),
      ...q.sabqi.map((i) => ({ ...i, _tier: "sabqi" })),
      ...q.manzil.map((i) => ({ ...i, _tier: "manzil" })),
    ];
    els.dueBadge.textContent = q.total_due;
    els.dueBadge.hidden = q.total_due === 0;
    setStatus("");
    nextCard();
  } catch (err) {
    setStatus(`Could not load review: ${err.message}`, true);
  }
}

const SCAFFOLD_NOTE = {
  full: "Full scaffold — text shown, audio available.",
  text: "Text only — audio withdrawn. Recall the sound from memory.",
  first_word: "First word only — recite the rest from memory.",
  hidden: "Blind recall — recite the whole ayah, then reveal to self-check.",
};

function maskArabic(arabic, scaffold, revealed) {
  if (revealed || scaffold === "full" || scaffold === "text") {
    return escapeHtml(arabic);
  }
  const words = arabic.split(/\s+/);
  if (scaffold === "first_word") {
    const first = escapeHtml(words[0] || "");
    const rest = words
      .slice(1)
      .map((w) => `<span class="mask">${escapeHtml(w)}</span>`)
      .join(" ");
    return rest ? `${first} ${rest}` : first;
  }
  // hidden: mask every word
  return words.map((w) => `<span class="mask">${escapeHtml(w)}</span>`).join(" ");
}

function renderArabic(revealed) {
  els.rvArabic.innerHTML = maskArabic(
    currentItem.arabic || "",
    currentItem.scaffold,
    revealed
  );
}

function nextCard() {
  stopAudio();
  currentItem = reviewQueue.shift() || null;
  if (!currentItem) {
    els.card.hidden = true;
    els.done.hidden = false;
    return;
  }
  els.done.hidden = true;
  els.card.hidden = false;
  els.rvTier.textContent = currentItem._tier;
  els.rvTier.className = `tier-tag tier-${currentItem._tier}`;
  els.rvRef.textContent =
    `${currentItem.surahName || "Surah " + currentItem.surah} · ` +
    `${currentItem.surah}:${currentItem.ayah}`;

  const scaffold = currentItem.scaffold || "full";
  els.rvScaffold.textContent = SCAFFOLD_NOTE[scaffold] || "";
  renderArabic(false);

  // audio is a scaffold too — only available at the "full" level
  const audioOk = scaffold === "full" && Boolean(currentItem.audio);
  els.rvListen.hidden = !audioOk;

  // reveal-ayah only matters when text is masked
  const masked = scaffold === "first_word" || scaffold === "hidden";
  els.rvShow.hidden = !masked;
  els.rvShow.dataset.revealed = "0";
  els.rvShow.textContent = "Reveal ayah (self-check)";

  els.rvTranslation.textContent = currentItem.translation || "";
  els.rvTranslation.classList.add("reveal-hidden");
  els.rvReveal.textContent = "Reveal translation";

  els.rvSimilar.innerHTML = "";
  loadSimilar(currentItem.surah, currentItem.ayah, els.rvSimilar);
}

async function rate(rating) {
  if (!currentItem) return;
  try {
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        surah: currentItem.surah,
        ayah: currentItem.ayah,
        rating,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await loadProgress();
    nextCard();
  } catch (err) {
    setStatus(`Could not save rating: ${err.message}`, true);
  }
}

els.rvReveal.addEventListener("click", () => {
  els.rvTranslation.classList.toggle("reveal-hidden");
  els.rvReveal.textContent = els.rvTranslation.classList.contains("reveal-hidden")
    ? "Reveal translation"
    : "Hide translation";
});
els.rvShow.addEventListener("click", () => {
  const revealed = els.rvShow.dataset.revealed === "1";
  renderArabic(!revealed);
  els.rvShow.dataset.revealed = revealed ? "0" : "1";
  els.rvShow.textContent = revealed ? "Reveal ayah (self-check)" : "Hide ayah";
});
els.rvListen.addEventListener("click", () => {
  if (currentItem && currentItem.audio) togglePlay(currentItem.audio, els.rvListen);
});
document.querySelectorAll(".rate").forEach((b) =>
  b.addEventListener("click", () => rate(b.dataset.rating))
);
els.asof.addEventListener("change", loadReview);

/* ---------- log view (teacher's logbook) ---------- */
let logRows = [];

async function loadLog() {
  try {
    const res = await fetch("/api/log");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    logRows = await res.json();
  } catch (err) {
    setStatus(`Could not load log: ${err.message}`, true);
    return;
  }
  els.logBody.innerHTML = logRows
    .map(
      (r) => `<tr>
        <td>${r.surah}:${r.ayah}</td>
        <td><span class="tier-tag tier-${r.stage}">${r.stage}</span></td>
        <td>${r.reps}</td>
        <td>${r.lapses}</td>
        <td>${r.last_review || "—"}</td>
        <td>${r.due}</td>
      </tr>`
    )
    .join("");
  els.logEmpty.hidden = logRows.length > 0;
}

function exportCsv() {
  if (!logRows.length) return;
  const cols = ["surah", "ayah", "stage", "reps", "lapses", "ease", "interval_days", "last_review", "due"];
  const lines = [cols.join(",")];
  for (const r of logRows) lines.push(cols.map((c) => r[c] ?? "").join(","));
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `biraye-log-${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
els.logExport.addEventListener("click", exportCsv);

/* ---------- audio ---------- */
function togglePlay(url, btn) {
  if (playingBtn === btn && !els.player.paused) {
    stopAudio();
    return;
  }
  stopAudio();
  els.player.src = url;
  els.player.play().catch((err) => setStatus(`Audio error: ${err.message}`, true));
  btn.classList.add("playing");
  btn.dataset.label = btn.textContent;
  btn.textContent = "⏸ Playing";
  playingBtn = btn;
}
function stopAudio() {
  els.player.pause();
  if (playingBtn) {
    playingBtn.classList.remove("playing");
    playingBtn.textContent = playingBtn.dataset.label || "▶ Listen";
    playingBtn = null;
  }
}
els.player.addEventListener("ended", stopAudio);

/* ---------- init ---------- */
els.select.addEventListener("change", (e) => loadSurah(e.target.value));
loadSurahIndex();
refreshDueBadge();

// PWA: register the service worker for installability + offline use
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support unavailable — app still works online */
    });
  });
}
