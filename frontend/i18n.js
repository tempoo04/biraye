"use strict";

/* BirAye internationalization — English + Azerbaijani.
 * Static text is tagged with data-i18n / data-i18n-ph in the HTML; dynamic
 * strings are looked up with i18n.t(key) at render time. Templates use %X%
 * placeholders the caller replaces.
 */
const I18N_DICT = {
  en: {
    tagline: "An Ayah per day",
    lang_name: "EN",

    tab_read: "Read",
    tab_drill: "Drill",
    tab_similar: "Similar",
    tab_review: "Review",
    tab_log: "Log",
    sim_intro: "Browse verse pairs that are easy to mix up. Tap one to see the difference.",
    sim_count: "%N% similar-verse pairs",
    sim_all: "All surahs",

    read_surah_label: "Surah",
    opt_pick: "— pick a surah —",
    opt_loading: "Loading…",
    btn_listen: "▶ Listen",
    btn_playing: "⏸ Playing",
    btn_memorize: "+ Memorize",
    btn_added: "✓ Added",
    btn_similar: "≈ Similar",

    drill_from: "From ayah",
    drill_to: "To ayah",
    drill_each: "Each ayah ×",
    drill_range: "Whole range ×",
    drill_speed: "Speed",
    drill_start: "▶ Start drill",
    drill_pause: "⏸ Pause",
    drill_resume: "▶ Resume",
    drill_stop: "⏹ Stop",
    drill_done: "Done.",
    drill_status: "Ayah %i%/%n% · %s%:%a% · play %p%/%each% · pass %pass%/%range%",
    drill_pick: "Pick a surah to drill.",

    chip_total: "Total",
    asof_label: "Review as of (test any day)",
    rate_prompt: "Recite from memory, then rate your recall:",
    rate_again: "Again",
    rate_hard: "Hard",
    rate_good: "Good",
    rate_easy: "Easy",
    reveal_ayah: "Reveal ayah (self-check)",
    hide_ayah: "Hide ayah",
    reveal_tr: "Reveal translation",
    hide_tr: "Hide translation",
    done_nothing: "✅ Nothing due. Queue clear for this day.",
    done_meta: "Add ayahs from the Read tab, or advance the date to see scheduled reviews.",

    scaffold_full: "Full scaffold — text shown, audio available.",
    scaffold_text: "Text only — audio withdrawn. Recall the sound from memory.",
    scaffold_first_word: "First word only — recite the rest from memory.",
    scaffold_hidden: "Blind recall — recite the whole ayah, then reveal to self-check.",

    sleep_night: "🌙 Night session — encode new material and your hardest reviews now; sleep consolidates verbatim sequences.",
    sleep_morning: "🌅 Morning — cold recall. Hide the audio and test what you slept on before adding anything new.",

    similar_head: "⚠ %N% similar verses — drill the %HL% differences:",
    similar_hl: "highlighted",
    similar_none: "No similar verses — low confusion risk.",
    similar_checking: "Checking similar verses…",
    similar_fail: "Similar check failed: %M%",

    log_title: "Logbook",
    log_export: "Export CSV",
    log_meta: "A record of every tracked ayah — share with your teacher.",
    log_th_ayah: "Ayah",
    log_th_tier: "Tier",
    log_th_reps: "Reps",
    log_th_lapses: "Lapses",
    log_th_last: "Last",
    log_th_due: "Due",
    log_empty: "Nothing tracked yet. Memorize some ayahs first.",

    help_btn: "How it works",
    help_title: "How BirAye works",
    help_intro: "BirAye helps you memorize the Quran verse by verse and — more importantly — stop forgetting it. Five tabs:",
    help_read: "pick a surah, listen to each ayah, and tap “Memorize” to start tracking it.",
    help_drill: "loop a range of verses on repeat, with your own repeat counts and speed, to drum them in.",
    help_similar: "browse near-identical verses that are easy to mix up; differing words are highlighted so you learn the difference.",
    help_review: "verses come back for recall right before you’d forget them; the help fades as your memory strengthens. Rate yourself honestly.",
    help_log: "a record of every tracked ayah you can export and share with a teacher.",
    help_lang: "🌐 Switch language (English / Azerbaijani) with the button in the top-right corner.",
    help_install: "📱 On a phone, use “Add to Home Screen” to install BirAye like a normal app.",

    status_surahs: "Loading surah list…",
    status_surah: "Loading surah…",
    status_review: "Loading review queue…",
    status_audio: "Loading audio…",
    err_surahs: "Could not load surahs: %M%",
    err_surah: "Could not load surah: %M%",
    err_review: "Could not load review: %M%",
    err_progress: "Could not load progress: %M%",
    err_log: "Could not load log: %M%",
    err_add: "Could not add: %M%",
    err_rating: "Could not save rating: %M%",
    err_audio: "Audio error: %M%",
  },

  az: {
    tagline: "Hər gün bir ayə",
    lang_name: "AZ",

    tab_read: "Oxu",
    tab_drill: "Məşq",
    tab_similar: "Bənzərlər",
    tab_review: "Təkrar",
    tab_log: "Jurnal",
    sim_intro: "Bir-birinə qarışdırıla bilən ayə cütlərinə bax. Fərqi görmək üçün birinə toxun.",
    sim_count: "%N% bənzər ayə cütü",
    sim_all: "Bütün surələr",

    read_surah_label: "Surə",
    opt_pick: "— surə seçin —",
    opt_loading: "Yüklənir…",
    btn_listen: "▶ Dinlə",
    btn_playing: "⏸ Oxunur",
    btn_memorize: "+ Əzbərlə",
    btn_added: "✓ Əlavə edildi",
    btn_similar: "≈ Bənzər",

    drill_from: "Başlanğıc ayə",
    drill_to: "Son ayə",
    drill_each: "Hər ayə ×",
    drill_range: "Bütün aralıq ×",
    drill_speed: "Sürət",
    drill_start: "▶ Məşqə başla",
    drill_pause: "⏸ Fasilə",
    drill_resume: "▶ Davam et",
    drill_stop: "⏹ Dayan",
    drill_done: "Tamamlandı.",
    drill_status: "Ayə %i%/%n% · %s%:%a% · oxunuş %p%/%each% · dövr %pass%/%range%",
    drill_pick: "Məşq üçün surə seçin.",

    chip_total: "Cəmi",
    asof_label: "Bu tarixə görə təkrar (istənilən günü yoxla)",
    rate_prompt: "Yaddaşdan oxu, sonra xatırlamanı qiymətləndir:",
    rate_again: "Yenidən",
    rate_hard: "Çətin",
    rate_good: "Yaxşı",
    rate_easy: "Asan",
    reveal_ayah: "Ayəni göstər (özünü yoxla)",
    hide_ayah: "Ayəni gizlət",
    reveal_tr: "Tərcüməni göstər",
    hide_tr: "Tərcüməni gizlət",
    done_nothing: "✅ Heç nə yoxdur. Bu gün üçün növbə təmizdir.",
    done_meta: "Oxu bölməsindən ayə əlavə et və ya tarixi irəli çəkərək planlı təkrarları gör.",

    scaffold_full: "Tam dəstək — mətn göstərilir, audio mövcuddur.",
    scaffold_text: "Yalnız mətn — audio yoxdur. Səsi yaddaşdan xatırla.",
    scaffold_first_word: "Yalnız ilk söz — qalanını yaddaşdan oxu.",
    scaffold_hidden: "Yaddaşdan oxu — bütün ayəni de, sonra yoxlamaq üçün göstər.",

    sleep_night: "🌙 Gecə vaxtı — yeni materialı və ən çətin təkrarları indi öyrən; yuxu yaddaşı möhkəmləndirir.",
    sleep_morning: "🌅 Səhər — soyuq xatırlama. Yeni ayə əlavə etməzdən əvvəl audionu gizlət və gecə öyrəndiyini yoxla.",

    similar_head: "⚠ %N% bənzər ayə — %HL% fərqləri məşq et:",
    similar_hl: "seçilmiş",
    similar_none: "Bənzər ayə yoxdur — qarışdırma riski azdır.",
    similar_checking: "Bənzər ayələr yoxlanılır…",
    similar_fail: "Bənzər yoxlama alınmadı: %M%",

    log_title: "Jurnal",
    log_export: "CSV ixrac et",
    log_meta: "İzlənən hər ayənin qeydi — müəlliminlə paylaş.",
    log_th_ayah: "Ayə",
    log_th_tier: "Səviyyə",
    log_th_reps: "Təkrar",
    log_th_lapses: "Səhv",
    log_th_last: "Sonuncu",
    log_th_due: "Vaxt",
    log_empty: "Hələ heç nə yoxdur. Əvvəlcə bəzi ayələri əzbərlə.",

    help_btn: "Necə işləyir",
    help_title: "BirAye necə işləyir",
    help_intro: "BirAye Quranı ayə-ayə əzbərləməyə və — daha vacibi — onu unutmamağa kömək edir. Beş tab:",
    help_read: "surə seç, hər ayəni dinlə və izləməyə başlamaq üçün “Əzbərlə”yə toxun.",
    help_drill: "bir ayə diapazonunu öz təkrar sayın və sürətinlə döngüyə salaraq beyinə yerit.",
    help_similar: "asanlıqla qarışdırılan, az qala eyni ayələrə bax; fərqli sözlər işıqlandırılır ki, fərqi öyrənəsən.",
    help_review: "ayələr unutmağına az qalmış xatırlama üçün geri qayıdır; yaddaşın gücləndikcə kömək azalır. Özünü dürüst qiymətləndir.",
    help_log: "izlənən hər ayənin qeydi — ixrac edib müəlliminlə paylaşa bilərsən.",
    help_lang: "🌐 Dili (İngiliscə / Azərbaycanca) yuxarı-sağ küncdəki düymə ilə dəyiş.",
    help_install: "📱 Telefonda “Ana ekrana əlavə et” ilə BirAye-ni adi tətbiq kimi quraşdır.",

    status_surahs: "Surə siyahısı yüklənir…",
    status_surah: "Surə yüklənir…",
    status_review: "Təkrar növbəsi yüklənir…",
    status_audio: "Audio yüklənir…",
    err_surahs: "Surələr yüklənmədi: %M%",
    err_surah: "Surə yüklənmədi: %M%",
    err_review: "Təkrar yüklənmədi: %M%",
    err_progress: "Tərəqqi yüklənmədi: %M%",
    err_log: "Jurnal yüklənmədi: %M%",
    err_add: "Əlavə edilmədi: %M%",
    err_rating: "Qiymət saxlanmadı: %M%",
    err_audio: "Audio xətası: %M%",
  },
};

const i18n = (() => {
  let lang = localStorage.getItem("biraye_lang") || "en";
  if (!I18N_DICT[lang]) lang = "en";

  function t(key, vars) {
    let s = (I18N_DICT[lang] && I18N_DICT[lang][key]) || I18N_DICT.en[key] || key;
    if (vars) for (const k in vars) s = s.replaceAll(`%${k}%`, vars[k]);
    return s;
  }

  function applyStatic() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      el.setAttribute("placeholder", t(el.dataset.i18nPh));
    });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.setAttribute("title", t(el.dataset.i18nTitle));
    });
  }

  function setLang(next) {
    if (!I18N_DICT[next]) return;
    lang = next;
    localStorage.setItem("biraye_lang", lang);
    applyStatic();
    window.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
  }

  function getLang() {
    return lang;
  }

  return { t, applyStatic, setLang, getLang };
})();
