# Changelog — Zaruri fără frontiere

Format: [SemVer](https://semver.org/lang/ro/) MAJOR.MINOR.PATCH. Istoricul versiunilor anterioare se află în secțiunea „Istoric / Changelog” din `README.ro.md`.

## 2.2.0 — 2026-10-27

### Adăugat
- **Fișe de lucru tipăribile** (fila Simulator, sub „Lecție de probabilități”): număr de bază (0–999999), nivel (1–3) și număr de exerciții (1–30) → aceeași fișă pe orice dispozitiv (`ZFF.worksheet(seed, nivel, număr)`, PRNG mulberry32). Șapte tipuri de întrebări: rezultate posibile, în câte moduri se obține o sumă, P(S ≥ v) ca fracție, suma cea mai frecventă, media, P(cel puțin o dată fața maximă), P(toate zarurile identice). Răspunsurile se calculează exact; butoane „Tipărește fișa” și „Tipărește cu baremul” (barem pe a doua pagină, `@media print`, alb-negru).
- Textele sunt în 8 limbi (fr/it/es/pt/de/hu: traducere automată, neverificată nativ).
- Test nou `tests/worksheet.test.mjs` (18 verificări): determinism, **toate răspunsurile verificate prin enumerare brută independentă** (3 niveluri × 5 numere × 30 de exerciții), toate cele 7 tipuri, PDF A4 de 2 pagini, 8 limbi, mobil, 0 cereri de rețea.

### Marcaj onest
- Fișele **nu au fost revizuite de un cadru didactic** (neverificat didactic); sunt marcate astfel în aplicație și pe foaia tipărită. Corectitudinea matematică a răspunsurilor este verificată prin test; adecvarea pedagogică, nu.

### Neschimbat
- Offline, fără CDN/urmărire/conturi; hash-urile CSP recalculate. `tests/probability-lesson.test.mjs` (25) și `tests/rules-engine.test.mjs` (57) rămân verzi.
- „Mod multiplayer local unificat”: **planificat**, nu implementat.

## 2.1.0 — 2026-10-27

### Adăugat
- **Lecție de probabilități** (fila Simulator): histogramă SVG a sumei a *n* zaruri cu *s* fețe (n = 1–8, s ∈ {4, 6, 8, 10, 12, 20}), cu bara/barile cele mai frecvente evidențiate. Afișează numărul de combinații pentru fiecare sumă, media, abaterea standard, suma cea mai frecventă, **P(suma ≥ v)** ca fracție exactă (ex. 3d6, v = 10: 135 / 216 = 62,50 %) și un tabel (sumă, combinații, probabilitate) accesibil de la tastatură. Butonul „Aruncă de 10 000 de ori și compară” suprapune frecvențele observate peste barele exacte (legea numerelor mari).
- Calculul este **exact**: `ZFF.lessonCounts(n, s)` numără cu numere întregi (programare dinamică), fără aproximări; refuză parametrii care ar depăși precizia întreagă.
- Texte în cele 8 limbi (fr/it/es/pt/hu/de: traduceri automate, neverificate nativ).
- Test nou: `tests/probability-lesson.test.mjs` (25 de verificări): valori cunoscute (2d6, 3d6), enumerare completă pentru 3d4, 4d3, 2d8, 1d10, 5d4, suma = s^n, media și varianța analitice, concordanță cu `exactDistribution`, simetrie, interfață, 8 limbi, mobil, 0 cereri de rețea.

### Neschimbat
- Offline: un singur `index.html`, fără CDN, fără urmărire, fără conturi. Hash-urile CSP ale scripturilor inline au fost recalculate. `tests/rules-engine.test.mjs`: 57 ok / 0 fail, înainte și după.
- „Mod multiplayer local unificat”: **planificat**, nu implementat.
