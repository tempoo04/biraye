"use strict";

const els = {
  // tabs / views
  tabRead: document.getElementById("tab-read"),
  tabDrill: document.getElementById("tab-drill"),
  tabSimilar: document.getElementById("tab-similar"),
  tabReview: document.getElementById("tab-review"),
  tabLog: document.getElementById("tab-log"),
  viewRead: document.getElementById("view-read"),
  viewDrill: document.getElementById("view-drill"),
  viewSimilar: document.getElementById("view-similar"),
  viewReview: document.getElementById("view-review"),
  viewLog: document.getElementById("view-log"),
  simFilter: document.getElementById("sim-filter"),
  simCount: document.getElementById("sim-count"),
  simList: document.getElementById("sim-list"),
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
  // drill
  drillSurah: document.getElementById("drill-surah"),
  drillFrom: document.getElementById("drill-from"),
  drillTo: document.getElementById("drill-to"),
  drillEach: document.getElementById("drill-each"),
  drillRangeRep: document.getElementById("drill-range-rep"),
  drillSpeed: document.getElementById("drill-speed"),
  drillStart: document.getElementById("drill-start"),
  drillPause: document.getElementById("drill-pause"),
  drillStop: document.getElementById("drill-stop"),
  drillNow: document.getElementById("drill-now"),
  drillStatus: document.querySelector("#drill-now .drill-status"),
  drillArabic: document.getElementById("drill-arabic"),
  drillTranslation: document.getElementById("drill-translation"),
  // shared
  langToggle: document.getElementById("lang-toggle"),
  status: document.getElementById("status"),
  player: document.getElementById("player"),
  // help / instructions
  helpFab: document.getElementById("help-fab"),
  helpModal: document.getElementById("help-modal"),
  helpClose: document.getElementById("help-close"),
  helpBackdrop: document.getElementById("help-backdrop"),
  // research
  researchFab: document.getElementById("research-fab"),
  researchModal: document.getElementById("research-modal"),
  researchClose: document.getElementById("research-close"),
  researchBackdrop: document.getElementById("research-backdrop"),
};

let playingBtn = null;
let reviewQueue = []; // flattened list of due items for the chosen day
let currentItem = null;
let surahAyahCounts = {}; // surah number -> ayah count
let currentReadSurah = null; // last surah object loaded in the Read tab
let currentReadNumber = null;
let activeTab = "read";

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
// Pick a verse translation for the current UI language, falling back to the
// per-language map's English, then the flat `translation` field.
function trOf(obj) {
  const t = obj && obj.translations;
  return (t && (t[i18n.getLang()] || t.en)) || (obj && obj.translation) || "";
}
// Render Arabic as one span per word so playback can highlight the current word.
// `words` is the per-word list from the API; its index matches the timing
// segments' word_index. Falls back to plain text when no word list is present.
function arabicWordsHtml(words, fallback) {
  if (!words || !words.length) return escapeHtml(fallback || "");
  return words
    .map((w, i) => `<span class="w" data-w="${i}">${escapeHtml(w)}</span>`)
    .join(" ");
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
    return `<p class="similar-none">${i18n.t("similar_none")}</p>`;
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
  const head = i18n.t("similar_head", {
    N: d.count,
    HL: `<span class="diff">${i18n.t("similar_hl")}</span>`,
  });
  return `<p class="similar-head">${head}</p>${pairs}`;
}

async function loadSimilar(surah, ayah, container) {
  container.innerHTML = `<p class="similar-none">${i18n.t("similar_checking")}</p>`;
  try {
    const res = await fetch(`/api/similar/${surah}/${ayah}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    container.innerHTML = renderContrast(await res.json());
  } catch (err) {
    container.innerHTML =
      `<p class="similar-none">${i18n.t("similar_fail", { M: err.message })}</p>`;
  }
}

/* ---------- tabs ---------- */
function showTab(which) {
  els.viewRead.hidden = which !== "read";
  els.viewDrill.hidden = which !== "drill";
  els.viewSimilar.hidden = which !== "similar";
  els.viewReview.hidden = which !== "review";
  els.viewLog.hidden = which !== "log";
  els.tabRead.classList.toggle("active", which === "read");
  els.tabDrill.classList.toggle("active", which === "drill");
  els.tabSimilar.classList.toggle("active", which === "similar");
  els.tabReview.classList.toggle("active", which === "review");
  els.tabLog.classList.toggle("active", which === "log");
  stopAudio();
  activeTab = which;
  if (which !== "drill") stopDrill();
  if (which === "similar") loadMutashabihat();
  if (which === "review") loadReview();
  if (which === "log") loadLog();
}
els.tabRead.addEventListener("click", () => showTab("read"));
els.tabDrill.addEventListener("click", () => showTab("drill"));
els.tabSimilar.addEventListener("click", () => showTab("similar"));
els.tabReview.addEventListener("click", () => showTab("review"));
els.tabLog.addEventListener("click", () => showTab("log"));

/* ---------- read view ---------- */
async function loadSurahIndex() {
  setStatus(i18n.t("status_surahs"));
  try {
    const res = await fetch("/api/surahs");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const surahs = await res.json();
    surahAyahCounts = Object.fromEntries(surahs.map((s) => [s.number, s.ayahCount]));
    const opts =
      `<option value="">${i18n.t("opt_pick")}</option>` +
      surahs
        .map(
          (s) =>
            `<option value="${s.number}">${s.number}. ${s.englishName} ` +
            `— ${s.name} (${s.ayahCount})</option>`
        )
        .join("");
    els.select.innerHTML = opts;
    els.drillSurah.innerHTML = opts;
    els.simFilter.innerHTML =
      `<option value="">${i18n.t("sim_all")}</option>` +
      surahs
        .map((s) => `<option value="${s.number}">${s.number}. ${s.englishName}</option>`)
        .join("");
    setStatus("");
  } catch (err) {
    setStatus(i18n.t("err_surahs", { M: err.message }), true);
  }
}

async function loadSurah(number) {
  if (!number) {
    els.reader.hidden = true;
    return;
  }
  stopAudio();
  setStatus(i18n.t("status_surah"));
  try {
    const res = await fetch(`/api/surah/${number}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const surah = await res.json();
    renderSurah(number, surah);
    setStatus("");
  } catch (err) {
    setStatus(i18n.t("err_surah", { M: err.message }), true);
  }
}

function renderSurah(number, surah) {
  currentReadNumber = number;
  currentReadSurah = surah;
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
      `${arabicWordsHtml(ayah.words, ayah.arabic)}` +
      `<span class="ayah-num">${ayah.numberInSurah}</span>`;
    arabic._seg = ayah.segments || [];
    arabic._audio = ayah.audio || "";

    const trans = document.createElement("p");
    trans.className = "ayah-translation";
    trans.textContent = trOf(ayah);

    const actions = document.createElement("div");
    actions.className = "ayah-actions";

    const playBtn = document.createElement("button");
    playBtn.className = "play-btn";
    playBtn.type = "button";
    playBtn.textContent = i18n.t("btn_listen");
    playBtn.disabled = !ayah.audio;
    playBtn.addEventListener("click", () => togglePlay(ayah.audio, playBtn));

    const memBtn = document.createElement("button");
    memBtn.className = "ghost-btn";
    memBtn.type = "button";
    memBtn.textContent = i18n.t("btn_memorize");
    memBtn.addEventListener("click", () =>
      memorize(Number(number), ayah.numberInSurah, memBtn)
    );

    const simBtn = document.createElement("button");
    simBtn.className = "ghost-btn";
    simBtn.type = "button";
    simBtn.textContent = i18n.t("btn_similar");
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
    btn.textContent = i18n.t("btn_added");
    btn.disabled = true;
    refreshDueBadge();
  } catch (err) {
    setStatus(i18n.t("err_add", { M: err.message }), true);
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
    setStatus(i18n.t("err_progress", { M: err.message }), true);
  }
}

function updateSleepHint() {
  // Research: encode before sleep, cold-recall after waking. Nudge by local hour.
  const h = new Date().getHours();
  let msg = "";
  if (h >= 20 || h < 2) msg = i18n.t("sleep_night");
  else if (h >= 4 && h < 11) msg = i18n.t("sleep_morning");
  els.sleepHint.textContent = msg;
  els.sleepHint.hidden = !msg;
}

async function loadReview() {
  updateSleepHint();
  if (!els.asof.value) els.asof.value = todayISO();
  await loadProgress();
  setStatus(i18n.t("status_review"));
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
    setStatus(i18n.t("err_review", { M: err.message }), true);
  }
}

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
  // At the "full" scaffold audio is available, so render per-word spans and
  // attach timings for word-level highlight. Other levels mask/withdraw audio,
  // so plain (masked) text is fine and carries no timing.
  if (currentItem.scaffold === "full") {
    els.rvArabic.innerHTML = arabicWordsHtml(currentItem.words, currentItem.arabic);
    els.rvArabic._seg = currentItem.segments || [];
    els.rvArabic._audio = currentItem.audio || "";
  } else {
    els.rvArabic.innerHTML = maskArabic(currentItem.arabic || "", currentItem.scaffold, revealed);
    els.rvArabic._seg = null;
    els.rvArabic._audio = "";
  }
}

function nextCard() {
  stopAudio();
  currentItem = reviewQueue.shift() || null;
  renderCard();
}

function renderCard() {
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
  els.rvScaffold.textContent = i18n.t(`scaffold_${scaffold}`);
  renderArabic(false);

  // audio is a scaffold too — only available at the "full" level
  const audioOk = scaffold === "full" && Boolean(currentItem.audio);
  els.rvListen.hidden = !audioOk;

  // reveal-ayah only matters when text is masked
  const masked = scaffold === "first_word" || scaffold === "hidden";
  els.rvShow.hidden = !masked;
  els.rvShow.dataset.revealed = "0";
  els.rvShow.textContent = i18n.t("reveal_ayah");

  els.rvTranslation.textContent = trOf(currentItem);
  els.rvTranslation.classList.add("reveal-hidden");
  els.rvReveal.textContent = i18n.t("reveal_tr");

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
    setStatus(i18n.t("err_rating", { M: err.message }), true);
  }
}

els.rvReveal.addEventListener("click", () => {
  els.rvTranslation.classList.toggle("reveal-hidden");
  els.rvReveal.textContent = els.rvTranslation.classList.contains("reveal-hidden")
    ? i18n.t("reveal_tr")
    : i18n.t("hide_tr");
});
els.rvShow.addEventListener("click", () => {
  const revealed = els.rvShow.dataset.revealed === "1";
  renderArabic(!revealed);
  els.rvShow.dataset.revealed = revealed ? "0" : "1";
  els.rvShow.textContent = revealed ? i18n.t("reveal_ayah") : i18n.t("hide_ayah");
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
    setStatus(i18n.t("err_log", { M: err.message }), true);
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

/* ---------- drill (repeat trainer) ---------- */
const REPS = [1, 2, 3, 4, 5, 10, Infinity];
const SPEEDS = [0.5, 1, 1.5, 2];
const repLabel = (v) => (v === Infinity ? "∞" : String(v));
const speedLabel = (v) => `×${v}`;

const drill = {
  active: false,
  paused: false,
  slice: [], // [{ayah, audio, arabic, translation}]
  idx: 0, // position within slice
  plays: 0, // completed plays of the current ayah
  pass: 0, // completed passes over the range
};

function valOf(btn) {
  return btn._values[Number(btn.dataset.idx || 0)];
}

function setupCycle(btn, values, startIdx, fmt, onChange) {
  btn._values = values;
  btn.dataset.idx = String(startIdx);
  btn.querySelector("b").textContent = fmt(values[startIdx]);
  btn.addEventListener("click", () => {
    const next = (Number(btn.dataset.idx) + 1) % values.length;
    btn.dataset.idx = String(next);
    btn.querySelector("b").textContent = fmt(values[next]);
    if (onChange) onChange(values[next]);
  });
}
setupCycle(els.drillEach, REPS, 0, repLabel);
setupCycle(els.drillRangeRep, REPS, 0, repLabel);
setupCycle(els.drillSpeed, SPEEDS, 1, speedLabel, (v) => {
  if (drill.active) els.player.playbackRate = v; // live speed change
});

function clampDrillRange() {
  const count = surahAyahCounts[els.drillSurah.value] || 1;
  els.drillFrom.max = count;
  els.drillTo.max = count;
  if (Number(els.drillTo.value) > count || Number(els.drillTo.value) < 1) {
    els.drillTo.value = count;
  }
  if (Number(els.drillFrom.value) < 1) els.drillFrom.value = 1;
}
els.drillSurah.addEventListener("change", () => {
  els.drillFrom.value = 1;
  els.drillTo.value = surahAyahCounts[els.drillSurah.value] || 1;
  clampDrillRange();
});
els.drillFrom.addEventListener("change", clampDrillRange);
els.drillTo.addEventListener("change", clampDrillRange);

async function startDrill() {
  const number = els.drillSurah.value;
  if (!number) {
    setStatus(i18n.t("drill_pick"), true);
    return;
  }
  clampDrillRange();
  const from = Math.max(1, Number(els.drillFrom.value));
  const to = Math.max(from, Number(els.drillTo.value));

  setStatus(i18n.t("status_audio"));
  let surah;
  try {
    const res = await fetch(`/api/surah/${number}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    surah = await res.json();
  } catch (err) {
    setStatus(i18n.t("err_surah", { M: err.message }), true);
    return;
  }
  setStatus("");

  drill.slice = surah.ayahs.slice(from - 1, to).map((a) => ({
    ayah: a.numberInSurah,
    audio: a.audio,
    arabic: a.arabic,
    words: a.words || [],
    segments: a.segments || [],
    translation: a.translation,
    translations: a.translations || {},
  }));
  if (!drill.slice.length) return;

  drill.active = true;
  drill.paused = false;
  drill.idx = 0;
  drill.plays = 0;
  drill.pass = 0;
  els.drillStart.hidden = true;
  els.drillPause.hidden = false;
  els.drillPause.textContent = i18n.t("drill_pause");
  els.drillStop.hidden = false;
  els.drillNow.hidden = false;
  playDrillCurrent();
}

function togglePauseDrill() {
  if (!drill.active) return;
  if (drill.paused) {
    drill.paused = false;
    els.drillPause.textContent = i18n.t("drill_pause");
    els.player.play().catch((err) => setStatus(i18n.t("err_audio", { M: err.message }), true));
  } else {
    drill.paused = true;
    els.drillPause.textContent = i18n.t("drill_resume");
    els.player.pause(); // keeps position; no "ended" fires, drill state preserved
  }
}

function playDrillCurrent() {
  const a = drill.slice[drill.idx];
  const each = valOf(els.drillEach);
  const range = valOf(els.drillRangeRep);
  els.drillStatus.textContent = i18n.t("drill_status", {
    i: drill.idx + 1,
    n: drill.slice.length,
    s: els.drillSurah.value,
    a: a.ayah,
    p: drill.plays + 1,
    each: repLabel(each),
    pass: drill.pass + 1,
    range: repLabel(range),
  });
  els.drillArabic.innerHTML = arabicWordsHtml(a.words, a.arabic);
  els.drillArabic._seg = a.segments || [];
  els.drillArabic._audio = a.audio || "";
  els.drillTranslation.textContent = trOf(a);
  els.player.src = a.audio;
  els.player.playbackRate = valOf(els.drillSpeed);
  els.player.play().catch((err) => setStatus(i18n.t("err_audio", { M: err.message }), true));
  showTracker(els.drillArabic); // word highlight follows the current verse
}

function drillEnded() {
  const each = valOf(els.drillEach);
  const range = valOf(els.drillRangeRep);

  drill.plays += 1;
  if (drill.plays < each) {
    playDrillCurrent(); // repeat the same ayah
    return;
  }
  drill.plays = 0;
  drill.idx += 1;
  if (drill.idx < drill.slice.length) {
    playDrillCurrent(); // next ayah in range
    return;
  }
  // finished one pass over the range
  drill.idx = 0;
  drill.pass += 1;
  if (drill.pass < range) {
    playDrillCurrent(); // repeat the whole range
    return;
  }
  stopDrill(); // done
}

function stopDrill() {
  if (!drill.active) return;
  drill.active = false;
  drill.paused = false;
  els.player.pause();
  clearTracker();
  els.drillStart.hidden = false;
  els.drillPause.hidden = true;
  els.drillStop.hidden = true;
  els.drillStatus.textContent = i18n.t("drill_done");
}
els.drillStart.addEventListener("click", startDrill);
els.drillPause.addEventListener("click", togglePauseDrill);
els.drillStop.addEventListener("click", stopDrill);

/* ---------- mutashabihat browser ---------- */
let allPairs = null;

async function loadMutashabihat() {
  if (allPairs) {
    renderPairs();
    return;
  }
  els.simList.innerHTML = `<p class="similar-none">${i18n.t("similar_checking")}</p>`;
  try {
    const res = await fetch("/api/mutashabihat");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allPairs = await res.json();
  } catch (err) {
    els.simList.innerHTML = `<p class="similar-none">${i18n.t("similar_fail", { M: err.message })}</p>`;
    return;
  }
  renderPairs();
}

function renderPairs() {
  if (!allPairs) return;
  const f = els.simFilter.value;
  const pairs = f
    ? allPairs.filter((p) => String(p.a.surah) === f || String(p.b.surah) === f)
    : allPairs;
  els.simCount.textContent = i18n.t("sim_count", { N: pairs.length });
  els.simList.innerHTML = pairs
    .map(
      (p, i) => `
      <div class="sim-row" data-i="${i}">
        <button class="sim-head" type="button">
          <span class="sim-ref">${p.a.surah}:${p.a.ayah} ↔ ${p.b.surah}:${p.b.ayah}</span>
          <em>${Math.round(p.ratio * 100)}%</em>
        </button>
        <div class="similar-panel" hidden></div>
      </div>`
    )
    .join("");
  // bind expanders (use the filtered list for lookups)
  els.simList.querySelectorAll(".sim-row").forEach((row) => {
    const p = pairs[Number(row.dataset.i)];
    const panel = row.querySelector(".similar-panel");
    row.querySelector(".sim-head").addEventListener("click", () => {
      if (panel.hidden && !panel.dataset.loaded) {
        loadPairContrast(p, panel);
        panel.dataset.loaded = "1";
      }
      panel.hidden = !panel.hidden;
    });
  });
}

async function loadPairContrast(pair, container) {
  container.innerHTML = `<p class="similar-none">${i18n.t("similar_checking")}</p>`;
  try {
    const res = await fetch(`/api/similar/${pair.a.surah}/${pair.a.ayah}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    // keep only the twin for this pair, so the row shows just the relevant contrast
    const twin = d.similar.find(
      (s) => s.surah === pair.b.surah && s.ayah === pair.b.ayah
    );
    container.innerHTML = renderContrast(
      twin ? { ...d, similar: [twin], count: 1 } : d
    );
  } catch (err) {
    container.innerHTML = `<p class="similar-none">${i18n.t("similar_fail", { M: err.message })}</p>`;
  }
}
els.simFilter.addEventListener("change", renderPairs);

/* ---------- now-playing tracker (word-level, follows audio time) ---------- */
// Highlights the word currently being recited, in sync with audio. `host` is
// the .ayah-arabic element; its `_seg` property holds timing segments
// [[wordIndex, startMs, endMs], ...] that line up with the rendered .w spans.
// If an ayah has no timing the words simply don't light — there is no bar.
let trackerHost = null;
let trackerSeg = null;
let trackerWords = [];
let trackerActive = -1;

function showTracker(host) {
  clearTracker();
  if (!host) return;
  trackerHost = host;
  trackerSeg = host._seg && host._seg.length ? host._seg : null;
  trackerWords = host.querySelectorAll(".w");
  trackerActive = -1;
  host.classList.add("playing-ayah");
  host.scrollIntoView({ block: "center", behavior: "smooth" });
}

function updateTracker() {
  if (!trackerHost || !trackerSeg || !trackerWords.length) return;
  const t = els.player.currentTime * 1000; // segments are ms of media time
  let active = -1;
  for (const s of trackerSeg) {
    if (t >= s[1] && t < s[2]) {
      active = s[0];
      break;
    }
    if (t >= s[2]) active = s[0]; // keep last passed word lit across gaps
  }
  if (active !== trackerActive) {
    if (trackerWords[trackerActive]) trackerWords[trackerActive].classList.remove("w-on");
    if (trackerWords[active]) trackerWords[active].classList.add("w-on");
    trackerActive = active;
  }
}

function clearTracker() {
  if (!trackerHost) return;
  trackerHost.classList.remove("playing-ayah");
  trackerHost.querySelectorAll(".w-on").forEach((w) => w.classList.remove("w-on"));
  trackerHost = null;
  trackerSeg = null;
  trackerWords = [];
  trackerActive = -1;
}
els.player.addEventListener("timeupdate", updateTracker);

/* ---------- audio ---------- */
function togglePlay(url, btn) {
  if (playingBtn === btn && !els.player.paused) {
    stopAudio();
    return;
  }
  stopAudio();
  els.player.src = url;
  els.player.playbackRate = 1; // drill speed must not leak into single playback
  els.player.play().catch((err) => setStatus(i18n.t("err_audio", { M: err.message }), true));
  btn.classList.add("playing");
  btn.dataset.label = btn.textContent;
  btn.textContent = i18n.t("btn_playing");
  playingBtn = btn;
  // highlight + track the ayah this button belongs to (Read row or Review card)
  const host =
    btn.closest(".ayah")?.querySelector(".ayah-arabic") ||
    (btn === els.rvListen ? els.rvArabic : null);
  showTracker(host);
}
function stopAudio() {
  els.player.pause();
  clearTracker();
  if (playingBtn) {
    playingBtn.classList.remove("playing");
    playingBtn.textContent = playingBtn.dataset.label || i18n.t("btn_listen");
    playingBtn = null;
  }
}
els.player.addEventListener("ended", () => {
  if (drill.active) drillEnded();
  else stopAudio();
});

// Tap any highlighted word to jump the audio to that word and play from there.
function seekToWord(host, wordIdx) {
  const seg = (host._seg || []).find((s) => s[0] === wordIdx);
  if (!seg || !host._audio) return;
  // Tapping a word resumes playback, so a paused drill is no longer paused —
  // keep the drill state + Pause/Resume button label in sync.
  if (drill.active && drill.paused) {
    drill.paused = false;
    els.drillPause.textContent = i18n.t("drill_pause");
  }
  const target = seg[1] / 1000; // segment start (ms) -> seconds
  const startAt = () => {
    try {
      els.player.currentTime = target;
    } catch {
      /* metadata not ready yet; loadedmetadata handler will retry */
    }
    els.player.play().catch((err) => setStatus(i18n.t("err_audio", { M: err.message }), true));
  };

  // Already playing this exact ayah: just seek, keep tracker/scroll as-is.
  if (trackerHost === host && els.player.src === host._audio) {
    startAt();
    return;
  }

  stopAudio();
  els.player.src = host._audio;
  els.player.playbackRate = drill.active ? valOf(els.drillSpeed) : 1;
  showTracker(host);
  // reflect playing state on the row's / card's Listen button so stopAudio resets it
  const row = host.closest(".ayah");
  const btn = row ? row.querySelector(".play-btn") : host === els.rvArabic ? els.rvListen : null;
  if (btn) {
    btn.classList.add("playing");
    btn.dataset.label = btn.dataset.label || btn.textContent;
    btn.textContent = i18n.t("btn_playing");
    playingBtn = btn;
  }
  if (els.player.readyState >= 1) {
    startAt();
  } else {
    els.player.addEventListener("loadedmetadata", startAt, { once: true });
    els.player.load(); // preload="none" needs an explicit kick to fetch metadata
  }
}

document.addEventListener("click", (e) => {
  const w = e.target.closest(".w");
  if (!w) return;
  const host = w.closest(".ayah-arabic");
  if (host) seekToWord(host, Number(w.dataset.w));
});

/* ---------- help / instructions ---------- */
function openHelp() {
  els.helpModal.hidden = false;
}
function closeHelp() {
  els.helpModal.hidden = true;
}
els.helpFab.addEventListener("click", openHelp);
els.helpClose.addEventListener("click", closeHelp);
els.helpBackdrop.addEventListener("click", closeHelp);

function openResearch() {
  els.researchModal.hidden = false;
}
function closeResearch() {
  els.researchModal.hidden = true;
}
els.researchFab.addEventListener("click", openResearch);
els.researchClose.addEventListener("click", closeResearch);
els.researchBackdrop.addEventListener("click", closeResearch);

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!els.helpModal.hidden) closeHelp();
  if (!els.researchModal.hidden) closeResearch();
});

/* ---------- language ---------- */
function syncLangButton() {
  els.langToggle.textContent = i18n.t("lang_name");
}
els.langToggle.addEventListener("click", () => {
  i18n.setLang(i18n.getLang() === "en" ? "az" : "en");
});

// Re-render dynamic (JS-generated) text when the language changes.
window.addEventListener("langchange", () => {
  syncLangButton();
  // refresh the "— pick a surah —" placeholder option in both selects
  if (els.select.options[0]) els.select.options[0].textContent = i18n.t("opt_pick");
  if (els.drillSurah.options[0]) els.drillSurah.options[0].textContent = i18n.t("opt_pick");
  if (els.simFilter.options[0]) els.simFilter.options[0].textContent = i18n.t("sim_all");
  if (currentReadSurah) renderSurah(currentReadNumber, currentReadSurah);
  if (activeTab === "similar" && allPairs) renderPairs();
  if (activeTab === "review") {
    updateSleepHint();
    renderCard();
  }
  if (activeTab === "log") loadLog();
  // pause button label reflects live drill state, not just the static default
  if (drill.active) {
    els.drillPause.textContent = i18n.t(drill.paused ? "drill_resume" : "drill_pause");
    els.drillTranslation.textContent = trOf(drill.slice[drill.idx]);
  }
});

/* ---------- init ---------- */
i18n.applyStatic();
syncLangButton();
els.select.addEventListener("change", (e) => loadSurah(e.target.value));
loadSurahIndex();
refreshDueBadge();

// Service worker is intentionally DISABLED during active development so the app
// always loads fresh from the server (no stale-cache surprises). Any worker that
// a device installed previously is torn down here and by the kill-switch sw.js.
// (Re-enable a proper offline/installable worker before launch.)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {});
  if (window.caches) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
  }
}
