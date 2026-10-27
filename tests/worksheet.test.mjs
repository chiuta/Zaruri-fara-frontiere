// Teste v2.2.0 — fișe de lucru tipăribile. Rulare: PW_ROOT=/opt/npm-tools/ node tests/worksheet.test.mjs
import {createRequire} from 'module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require = createRequire(process.env.PW_ROOT ? process.env.PW_ROOT.replace(/\/?$/, '/') + 'x.js' : import.meta.url);
const {chromium} = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const URL_APP = 'file://' + path.join(HERE, '..', 'index.html');
let pass = 0, fail = 0;
const ok = (c, n, i) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (i === undefined ? '' : ' ' + JSON.stringify(i))); } };
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox']});
const net = [], errs = [];
const ctx = await browser.newContext({viewport: {width: 1100, height: 900}, locale: 'ro-RO'});
await ctx.route(/^https?:/, r => { net.push(r.request().url()); r.abort(); });
const page = await ctx.newPage();
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(URL_APP);
console.log('Zaruri — fișe de lucru');

// 1. determinism și răspunsuri verificate prin enumerare brută, independent de lessonCounts
const R = await page.evaluate(() => {
  const o = {};
  const a = ZFF.worksheet(2026, 2, 12), b = ZFF.worksheet(2026, 2, 12), c = ZFF.worksheet(2027, 2, 12);
  o.det = JSON.stringify(a) === JSON.stringify(b); o.diff = JSON.stringify(a) !== JSON.stringify(c); o.len = a.length;
  function brute(n, s) { const m = new Map(); let tot = 0, same = 0, one = 0; const rec = (k, sum, f, all, hit) => { if (!k) { m.set(sum, (m.get(sum) || 0) + 1); tot++; if (all) same++; if (hit) one++; return; } for (let x = 1; x <= s; x++) rec(k - 1, sum + x, k === n ? x : f, all && (k === n || x === f), hit || x === s); }; rec(n, 0, 0, true, false); return {m, tot, same, one}; }
  const gcd = (x, y) => y ? gcd(y, x % y) : x, fr = (k, n) => { const g = gcd(k, n); const p = k / g, q = n / g; return (q === 1 ? String(p) : p + '/' + q) + ' (' + (100 * k / n).toFixed(2) + ' %)'; };
  o.bad = []; o.kinds = {};
  for (const lv of [1, 2, 3]) for (const seed of [0, 1, 7, 2026, 99999]) for (const q of ZFF.worksheet(seed, lv, 30)) {
    o.kinds[q.kind] = 1;
    const B = brute(q.n, q.s); let exp;
    if (q.kind === 'total') exp = String(B.tot);
    else if (q.kind === 'ways') exp = String(B.m.get(q.v));
    else if (q.kind === 'ge') { let k = 0; B.m.forEach((c, v) => { if (v >= q.v) k += c; }); exp = fr(k, B.tot); }
    else if (q.kind === 'mode') { let best = 0; B.m.forEach(c => { if (c > best) best = c; }); exp = [...B.m.keys()].filter(v => B.m.get(v) === best).sort((x, y) => x - y).join(' / '); }
    else if (q.kind === 'mean') { let sum = 0; B.m.forEach((c, v) => { sum += c * v; }); exp = String(sum / B.tot); }
    else if (q.kind === 'one') exp = fr(B.one, B.tot);
    else exp = fr(B.same, B.tot);
    if (exp !== q.a) o.bad.push([lv, seed, q, exp]);
  }
  o.nk = Object.keys(o.kinds).length;
  const keys = ZFF.worksheet(5, 1, 40).map(q => q.kind + q.n + q.s + (q.v === undefined ? '' : q.v)); o.uniq = new Set(keys).size === keys.length;
  o.clamp = [ZFF.worksheet(1, 9, 999).length, ZFF.worksheet(1, 0, 0).length];
  return o;
});
ok(R.det && R.diff && R.len === 12, 'același număr de bază → aceeași fișă; alt număr → altă fișă', R);
ok(R.bad.length === 0, 'toate răspunsurile (3 niveluri × 5 numere × 30) coincid cu enumerarea brută', R.bad.slice(0, 2));
ok(R.nk === 7, 'toate cele 7 tipuri de exerciții apar', R.kinds);
ok(R.uniq, 'fără exerciții duplicate într-o fișă');
ok(R.clamp[0] <= 30 && R.clamp[1] >= 1, 'număr și nivel limitate', R.clamp);

// 2. interfață
await page.click('#tab-sim');
await page.waitForSelector('#ws-box #ws-prev li');
const U1 = await page.evaluate(() => ({n: document.querySelectorAll('#ws-prev li').length, txt: document.getElementById('ws-box').innerText}));
ok(U1.n === 10, 'previzualizare: 10 exerciții implicit', U1.n);
ok(/Neverificat didactic/.test(U1.txt), 'avertisment „neverificat didactic” vizibil');
await page.fill('#ws-count', '6'); await page.dispatchEvent('#ws-count', 'change');
await page.selectOption('#ws-level', '3');
ok(await page.evaluate(() => document.querySelectorAll('#ws-prev li').length) === 6, 'număr de exerciții schimbat → 6');

// 3. tipărire: captăm DOM-ul fișei din window.print
await page.evaluate(() => { window.__printed = []; window.print = function () { const r = document.getElementById('ws-print'); window.__printed.push({cls: document.body.className, pages: r.querySelectorAll('.ws-page').length, items: r.querySelectorAll('li').length, txt: r.innerText, vis: getComputedStyle(r).display}); }; });
await page.click('#ws-print-btn');
await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
await page.click('#ws-print-key');
await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
const P = await page.evaluate(() => ({p: window.__printed, left: !!document.getElementById('ws-print'), cls: document.body.className}));
ok(P.p.length === 2 && P.p[0].pages === 1 && P.p[0].items === 6, 'fișă simplă: 1 pagină, 6 exerciții', P.p[0] && {pages: P.p[0].pages, items: P.p[0].items});
ok(P.p[1].pages === 2 && P.p[1].items === 12 && /Barem/.test(P.p[1].txt), 'cu barem: 2 pagini, răspunsurile pe a doua', P.p[1] && {pages: P.p[1].pages, items: P.p[1].items});
ok(!/Răspuns: \d/.test(P.p[0].txt.split('Barem')[0]), 'pagina elevului nu conține răspunsuri');
ok(!P.left && !P.cls.includes('ws-printing'), 'după tipărire, elementul și clasa sunt curățate', P);
// PDF real, mediu print: doar fișa se vede
await page.evaluate(() => { delete window.print; });
await page.evaluate(() => { const orig = window.print; });
const pdfPages = await page.evaluate(() => 0);
await page.evaluate(() => { const r = document.createElement('div'); r.id = 'ws-print'; document.body.appendChild(r); r.remove(); });
// construim fișa fără apel print() și o randăm în print-media
await page.evaluate(() => { window.print = function () {}; });
await page.click('#ws-print-key');
const pdf = await page.pdf({format: 'A4', printBackground: true});
const npages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
ok(npages === 2, 'PDF A4 în media print: 2 pagini (fișă + barem)', npages);
await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));

// 4. limbi
const miss = [];
for (const l of ['en', 'fr', 'it', 'es', 'pt', 'de', 'hu', 'ro']) {
  await page.selectOption('#lang', l);
  const txt = await page.evaluate(() => document.getElementById('ws-box').innerText);
  if (/\bws_[a-z_]+\b/.test(txt) || !txt.trim()) miss.push(l);
  if (l === 'de') ok(/Arbeitsblatt/.test(txt), 'fișa apare în germană');
}
ok(miss.length === 0, 'fără chei netraduse în 8 limbi', miss);
await page.setViewportSize({width: 360, height: 740});
ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'mobil 360 px: fără depășire orizontală');
ok(errs.length === 0, 'fără erori JS/CSP', errs);
ok(net.length === 0, '0 cereri de rețea', net);
await browser.close();
console.log(pass + ' ok, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
