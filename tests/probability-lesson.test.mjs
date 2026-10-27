// Teste v2.1.0 — lecția de probabilități (histogramă SVG exactă). Rulare: node tests/probability-lesson.test.mjs
import {createRequire} from 'module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require = createRequire(process.env.PW_ROOT || import.meta.url);
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
console.log('Zaruri — lecție de probabilități');

// ---------- 1. calcul exact ----------
const E = await page.evaluate(() => {
  const o = {}, L = ZFF.lessonCounts;
  const a = L(2, 6); o.c26 = a.counts; o.t26 = a.total; o.modes26 = a.modes; o.atl10 = a.atLeast(10);
  const b = L(3, 6); o.c36 = b.counts; o.ge10 = b.atLeast(10);
  // numărare brută pentru 3d4 și 4d3
  function brute(n, s) { const m = new Map(); const rec = (k, sum) => { if (!k) { m.set(sum, (m.get(sum) || 0) + 1); return; } for (let f = 1; f <= s; f++) rec(k - 1, sum + f); }; rec(n, 0); return m; }
  o.brute = [[3, 4], [4, 3], [2, 8], [1, 10], [5, 4]].map(([n, s]) => { const l = L(n, s), m = brute(n, s); return l.counts.every((c, i) => m.get(l.min + i) === c) && l.counts.length === m.size; });
  // sumă = total, medie și varianță analitice
  o.sums = [[1, 4], [2, 6], [3, 8], [4, 10], [5, 12], [6, 20], [8, 20]].map(([n, s]) => { const l = L(n, s); return l.counts.reduce((x, y) => x + y, 0) === l.total && Math.abs(l.mean - n * (s + 1) / 2) < 1e-9 && Math.abs(l.variance - n * (s * s - 1) / 12) < 1e-9; });
  // concordanță cu exactDistribution (motorul existent)
  o.agree = [[2, 6], [3, 8], [4, 4]].map(([n, s]) => { const l = L(n, s), d = ZFF.exactDistribution(n + 'd' + s); return l.counts.every((c, i) => Math.abs(d.get(l.min + i) - c / l.total) < 1e-12); });
  o.sym = L(4, 6).counts.every((c, i, arr) => c === arr[arr.length - 1 - i]);
  o.bad = [L(0, 6), L(9, 6), L(2, 1), L(2, 101), L(2.5, 6) && null, L(8, 100)];
  o.uni = L(1, 20).counts.every(c => c === 1) && L(1, 20).modes.length === 20;
  return o;
});
ok(JSON.stringify(E.c26) === '[1,2,3,4,5,6,5,4,3,2,1]' && E.t26 === 36, '2d6: 1,2,3,4,5,6,5,4,3,2,1 din 36');
ok(JSON.stringify(E.modes26) === '[7]', '2d6: suma cea mai frecventă este 7');
ok(E.atl10 === 6, '2d6: P(S ≥ 10) = 6/36');
ok(JSON.stringify(E.c36) === '[1,3,6,10,15,21,25,27,27,25,21,15,10,6,3,1]' && E.ge10 === 135, '3d6: valori cunoscute, P(S ≥ 10) = 135/216');
ok(E.brute.every(Boolean), 'identic cu numărarea brută (3d4, 4d3, 2d8, 1d10, 5d4)', E.brute);
ok(E.sums.every(Boolean), 'suma combinațiilor = s^n; media și varianța analitice', E.sums);
ok(E.agree.every(Boolean), 'concordă cu exactDistribution', E.agree);
ok(E.sym, '4d6: distribuție simetrică');
ok(E.uni, '1d20: uniformă, 20 de moduri');
ok(E.bad[0] === null && E.bad[1] === null && E.bad[2] === null && E.bad[3] === null && E.bad[5] === null, 'parametri invalizi → null (n=0, 9; s=1, 101; total ≥ 2^53)', E.bad.map(x => !!x));

// ---------- 2. interfață ----------
await page.click('#tab-sim');
await page.waitForSelector('#les-chart svg');
const U1 = await page.evaluate(() => ({rects: document.querySelectorAll('#les-chart rect').length, thr: document.getElementById('les-thr').value, pr: document.getElementById('les-pr').textContent, alt: document.querySelector('#les-chart svg').getAttribute('aria-label'), rows: document.querySelectorAll('#les-table tbody tr').length, modeRect: document.querySelector('#les-chart rect.mode').getAttribute('data-sum')}));
ok(U1.rects === 11 && U1.rows === 11, 'implicit 2d6: 11 bare și 11 rânduri în tabel', U1);
ok(U1.modeRect === '7', 'bara evidențiată = 7');
ok(U1.thr === '7' && /21 \/ 36/.test(U1.pr), 'prag implicit 7 (media): P(S ≥ 7) = 21 / 36', U1.pr);
ok(/2d6|2 zaruri cu 6/.test(U1.alt) && /7/.test(U1.alt), 'etichetă ARIA a graficului', U1.alt);
await page.fill('#les-n', '3'); await page.dispatchEvent('#les-n', 'change');
await page.fill('#les-thr', '10');
const U2 = await page.evaluate(() => ({rects: document.querySelectorAll('#les-chart rect').length, pr: document.getElementById('les-pr').textContent, hot: document.querySelectorAll('#les-chart rect.hot').length}));
ok(U2.rects === 16, '3d6: 16 bare', U2);
ok(/135 \/ 216/.test(U2.pr) && /62\.50/.test(U2.pr), 'P(S ≥ 10) = 135 / 216 = 62.50 %', U2.pr);
ok(U2.hot === 9, 'barile ≥ 10 sunt evidențiate (9 din 16)', U2.hot);
await page.selectOption('#les-s', '20'); 
const U3 = await page.evaluate(() => document.querySelectorAll('#les-chart rect').length);
ok(U3 === 58, '3d20: 58 bare', U3);
await page.fill('#les-n', '2'); await page.dispatchEvent('#les-n', 'change'); await page.selectOption('#les-s', '6');
await page.click('#les-cmp');
const U4 = await page.evaluate(() => ({dots: document.querySelectorAll('#les-chart circle').length, res: document.getElementById('les-cmp-res').textContent, gap: parseFloat((document.getElementById('les-cmp-res').textContent.match(/(\d+[.,]\d+) puncte/) || [])[1])}));
ok(U4.dots === 11 && isFinite(U4.gap) && U4.gap < 3, 'comparație: 11 puncte observate, abatere < 3 puncte procentuale la 10 000 de aruncări', U4);
// limbi: fără chei netraduse
const miss = [];
for (const l of ['en', 'fr', 'it', 'es', 'pt', 'de', 'hu', 'ro']) {
  await page.selectOption('#lang', l);
  const txt = await page.evaluate(() => document.getElementById('les-box').innerText);
  if (/\bles_[a-z_]+\b/.test(txt) || !txt.trim()) miss.push(l);
  if (l === 'de') ok(/Wahrscheinlichkeit/.test(txt), 'lecția apare în germană');
}
const keysOk = await page.evaluate(() => typeof ZFF.lessonCounts === 'function');
ok(keysOk, 'API ZFF.lessonCounts expus');
ok(miss.length === 0, 'lecția: fără chei netraduse în 8 limbi', miss);
// mobil
await page.setViewportSize({width: 360, height: 740});
const ov = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
ok(ov, 'mobil 360 px: fără depășire orizontală');
ok(errs.length === 0, 'fără erori JS/CSP', errs);
ok(net.length === 0, '0 cereri de rețea', net);
await browser.close();
console.log(pass + ' ok, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
