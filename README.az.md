<p align="center">
  <img src="frontend/brand-hero.jpg" alt="BirAye" width="640" />
</p>

<h1 align="center">BirAye &nbsp;<span dir="rtl">بِر آية</span></h1>

<p align="center"><em>bir ayə — “bir ayət.”  Quran hifzi üçün elmə əsaslanan, sözbəsöz yadda saxlama mühərriki — Quran oxuyucusu deyil.</em></p>

<p align="center"><strong>Quran oxumağa kömək etmir. Onu unutmağının qarşısını alır — hafizlərin əslində səhv etdiyi dəqiq yerlərə hücum edərək.</strong></p>

<p align="center"><a href="README.md">English</a> · <strong>Azərbaycanca</strong></p>

<p align="center">
  <a href="https://github.com/tempoo04/biraye/actions/workflows/ci.yml"><img src="https://github.com/tempoo04/biraye/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/tempoo04/biraye/actions/workflows/codeql.yml"><img src="https://github.com/tempoo04/biraye/actions/workflows/codeql.yml/badge.svg" alt="CodeQL" /></a>
  <img src="https://img.shields.io/badge/python-3.12-blue.svg" alt="Python 3.12" />
  <img src="https://img.shields.io/badge/FastAPI-009688.svg?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PWA-installable-5a0fc8.svg" alt="PWA" />
  <img src="https://img.shields.io/badge/status-alpha-orange.svg" alt="alpha" />
</p>

---

BirAye elmə əsaslanan Quran əzbərləmə tətbiqidir. Əksər tətbiqlər tam müshəfi olan
audio pleyer olduğu halda, BirAye **sözbəsöz ardıcıllıq yaddaşının** koqnitiv elmi
və ənənəvi hifz pedaqogikası ətrafında qurulub: aralıqlı təkrar, məqsədli dayaq
götürülməsi və oxşar ayələrin fərqləndirilməsi.

## Niyə fərqlidir

- **Üç-pilləli aralıqlı təkrar** — klassik *səbəq / səbqi / mənzil* dövrünü əks etdirir,
  sözbəsöz xatırlama üçün tənzimlənmiş SM-2 / FSRS-lite planlayıcısı ilə idarə olunur —
  fləşkart faktları üçün deyil.
- **Dayaq götürülməsi(dəstək mexanizmlərinin mərhələli şəkildə dayandırılması)** — yaddaş gücləndikcə audio və mətn dəstəyi sönür
  (`tam → mətn → ilk söz → kor xatırlama`), çünki araşdırmalar audionun *kodlaşdırmaya*
  kömək etdiyini, lakin *təkrar* zamanı xatırlama çətinliyini azaltdığını göstərir.
- **Mutaşabihat mühərriki** — qarşılıqlı oxşar ayələrin avtomatik müqayisəli məşqi;
  bu, hifz səhvlərinin №1 səbəbidir və hər mövcud tətbiqdə boşluqdur.
- **Müəllimin jurnalı, əvəzi deyil** — insan müəllim dəqiqlik nəzarətçisi olaraq qalır;
  tətbiq planlayır, izləyir və jurnalı ixrac edir.
- **Təkrar məşqçisi** — istənilən ayə diapazonunu hər-ayə və bütöv-diapazon üçün
  tənzimlənən təkrar sayı və dəyişdirilə bilən səslənmə sürəti ilə döngüyə salır.

## Texnologiya

- **Backend:** Python / FastAPI + SQLite
- **Frontend:** uyğunlaşan veb (brauzer + quraşdırıla bilən PWA, telefona uyğun)
- **Data:** açıq API-lər — [alquran.cloud](https://alquran.cloud) Üsmani mətni,
  Muhəmməd Əsəd tərcüməsi və Mişari Əlafasi ayə-ayə audiosu üçün — yerli olaraq keşlənir.

## İşə salmaq

```bash
pip install -r requirements.txt
cd src
python -m uvicorn biraye.app:app --reload
```

<http://127.0.0.1:8000> ünvanını aç.

## BirAye-dən istifadə

Tətbiqin beş tabı var: **Oxu**, **Məşq**, **Bənzərlər**, **Təkrar**, **Jurnal**.
Dili (İngiliscə / Azərbaycanca) yuxarı-sağ küncdəki düymə ilə dəyişin.

### Oxu — gözdən keçir və əzbərləməyə başla
1. Açılan siyahıdan bir surə seç.
2. Hər ayə üçün:
   - **▶ Dinlə** — tilavəti səsləndir.
   - **+ Əzbərlə** — izləməyə başla (təkrar üçün *səbəq* növbəsinə girir).
   - **≈ Bənzərlər** — mutaşabihatı (oxşar ayələri) fərqli sözləri
     **sarı ilə işıqlandıraraq** göstər ki, onları fərqləndirməyi öyrənəsən.

### Məşq — təkrar məşqçisi
Ayələri beyinə yeritmək üçün bir diapazonu döngüyə sal.
1. **Surə**, sonra **Bu ayədən** və **Bu ayəyə qədər** seç (məsələn Əl-Bəqərə 7 → 20).
2. Döngü saylarını tənzimlə — hər düymə **hər klikdə dəyişir**:
   - **Hər ayə ×** — növbətiyə keçmədən hər ayənin neçə dəfə təkrarlanması
     (`1 → 2 → 3 → 4 → 5 → 10 → ∞`).
   - **Bütöv diapazon ×** — bütün diapazonun neçə dəfə təkrarlanması
     (`1 → 2 → 3 → 4 → 5 → 10 → ∞`).
   - **Sürət** — səslənmə tempi (`×0.5 → ×1 → ×1.5 → ×2`); məşq oynayarkən
     canlı dəyişdirilə bilər.
3. **▶ Məşqə başla** bas. Status sətri cari ayəni, hansı təkrarı və hansı keçidi
   göstərir. **⏸ Fasilə** yerini saxlayır; **⏹ Dayan** sıfırlayır.

### Bənzərlər — mutaşabihat brauzeri
Asanlıqla qarışdırılan hər ayə cütünü gözdən keçir (avtomatik hesablanır —
~1,400 cüt). Surəyə görə süz, sonra istənilən cütə toxun ki, iki ayə
**fərqli sözlər işıqlandırılmış** halda yan-yana açılsın. Bu, heç bir başqa
tətbiqdə olmayan funksiyadır — bax [Mutaşabihat mühərriki necə işləyir](#mutaşabihat-mühərriki-necə-işləyir).

> Nümunə: Bəqərə 7→20, Hər ayə ×5, Bütöv diapazon ×∞, Sürət ×1 — hər ayəni
> beş dəfə oynadır, bütün diapazonu keçir, sonra diapazonu sonsuz döngüyə salır.

### Təkrar — dayaq götürülməsi ilə aralıqlı xatırlama
1. Əzbərlənmiş ayələr zamanla burada vaxtı çatır. **Vaxtı çatan nişanı** sayını göstərir.
2. Hər vaxtı çatan ayə bir xatırlama kartıdır. Nə qədər kömək alacağın yaddaşın
   nə qədər güclü olmasından asılıdır (*dayaq* səviyyəsi, qeyddə göstərilir):
   - **tam** — mətn göstərilir, audio mövcuddur
   - **mətn** — yalnız mətn, audio götürülüb (səsi xatırla)
   - **ilk söz** — yalnız ilk söz göstərilir
   - **kor** — heç nə göstərilmir; yaddaşdan oxu, sonra **Ayəni aç** ilə özünü yoxla
3. Oxu, sonra dürüst qiymətləndir: **Yenidən / Çətin / Yaxşı / Asan**. Bu, ayəni yenidən planlaşdırır.
4. Ayənin oxşar ayələri varsa, **⚠ müqayisə paneli** çıxır ki, fərqi təzə ikən məşq edəsən.
5. **"Bu tarixə görə təkrar"** seçicisi gələcək günə keçib nəyin vaxtı çatacağını
   görməyə imkan verir — planlayıcını gözləmədən sınamaq üçün əlverişlidir.

### Jurnal — müəllimin jurnalı
İzlənən hər ayənin cədvəli (pillə, təkrarlar, sürüşmələr, son təkrar, vaxt tarixi).
**CSV ixrac et** ilə yüklə və müəllimlə paylaş.

### Telefonuna quraşdır (PWA)
BirAye Progressive Web App-dır. Mobil brauzerdə (və ya masaüstü Chrome-da)
**Ana ekrana əlavə et** / quraşdırma işarəsindən istifadə edərək onu yerli tətbiq
kimi işə sal; ilk yüklədikdən sonra oflayn işləyir. (Quraşdırma `https://` və ya
`localhost` tələb edir — yerli şəbəkə üzərində adi `http://` onu aktivləşdirmir.)

## API

| Metod | Endpoint | Məqsəd |
|--------|----------|---------|
| `GET`  | `/api/health` | canlılıq |
| `GET`  | `/api/surahs` | bütün 114 surənin siyahısı |
| `GET`  | `/api/surah/{n}` | bir surə: mətn + tərcümə + audio |
| `POST` | `/api/memorize` | ayəni izləməyə başla |
| `POST` | `/api/review` | xatırlamanı qiymətləndir, yenidən planlaşdır |
| `GET`  | `/api/queue?as_of=YYYY-MM-DD` | pilləyə görə vaxtı çatan ayələr |
| `GET`  | `/api/progress` | pillə üzrə saylar |
| `GET`  | `/api/similar/{s}/{a}` | müqayisəli fərqlərlə oxşar ayələr |
| `GET`  | `/api/mutashabihat` | bütün unikal oxşar-ayə cütləri |
| `GET`  | `/api/log` | izlənən ayələrin tam jurnalı |

## Mutaşabihat mühərriki necə işləyir

*Mutaşabihat* (المتشابهات) qarşılıqlı oxşar ayələrdir — bir söz, ədat və ya
sıra ilə fərqlənən, az qala eyni ifadə. Onlar **hifz səhvlərinin №1 səbəbidir**:
yaddaş paylaşılan hissəni nümunə-uyğunlaşdırır və yanlış ayəyə "relsdən çıxır".
Ənənəvi müəllimlər bu cütləri yan-yana məşq etdirir; heç bir əsas tətbiq etmir.

BirAye oxşar-ayə qrafını **Quran mətnindən alqoritmik olaraq** qurur — seçilmiş
hazır data yoxdur:

1. **Normallaşdır** hər ayəni — diakritikləri/tatvili sil və hərf variantlarını
   birləşdir (`أ إ آ ٱ → ا`, `ة → ه`, …) ki, müqayisə yazılış deyil, məğz üzərində olsun.
2. **Namizəd qapısı** — paylaşılan hər 4-sözlük ifadəni indeksləşdir; iki ayə yalnız
   birini paylaşırsa namizəddir. (Ucuz; əlaqəsiz cütləri atır.)
3. **Qiymətləndir** namizədləri token-ardıcıllığı oxşarlığına görə; ≥ 55% oxşar cütləri saxla.
4. **Fərqləndir** hər cütü hər iki istiqamətdə və işıqlandırma üçün fərqli sözləri qeyd et.

Qraf (6,236 ayə üzərində ~1,400 cüt) bir dəfə hesablanır və keşlənir. **Bənzərlər**
tabı onu gözdən keçirməyə imkan verir; **Təkrar**-da əkizlər vaxtı çatan ayənin
yanında avtomatik üzə çıxır.

## Status

Mərhələ-mərhələ qurulub — bax [ROADMAP.md](ROADMAP.md). Hazır: M0–M6
(skelet, oxu+dinlə, üç-pilləli planlayıcı, dayaq-götürülməsi ilə xatırlama,
mutaşabihat mühərriki, PWA + müəllim jurnalı, təkrar məşqçisi), oxşar-ayə
brauzeri və İngilis/Azərbaycan lokalizasiyası — üstəlik CI / CodeQL / Dependabot /
pre-commit və test dəsti.

> ⚠️ **Alfa.** Erkən istifadəçilərlə sınaqdadır. Data hələlik cihaza görədir; hesablar,
> bulud sinxronizasiyası və davamlı verilənlər bazası planlaşdırılır.
