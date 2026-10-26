// Teste v2.0.0 — motor de reguli din fișier, istoric verificabil, aruncare comună. Rulare: node tests/rules-engine.test.mjs
import {createRequire as __fffCR} from 'node:module';
const __fffAxe = () => process.env.FFF_AXE || process.env.AXE_PATH || (() => { try { return __fffCR(import.meta.url).resolve('axe-core/axe.min.js'); } catch { return undefined; } })();
import {createRequire} from 'module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require = createRequire(process.env.PW_ROOT || import.meta.url);
const {chromium} = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const URL_APP = 'file://' + path.join(HERE, '..', 'index.html');
const AXE = __fffAxe();
let pass = 0, fail = 0;
const ok = (c, n, i) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (i === undefined ? '' : ' ' + JSON.stringify(i).slice(0, 500))); } };
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox']});
const net = [], errs = [];
async function mk(w = 1100, h = 900) {
  const ctx = await browser.newContext({viewport: {width: w, height: h}, acceptDownloads: true, locale: 'ro-RO'});
  await ctx.route(/^https?:/, r => { net.push(r.request().url()); r.abort(); });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL_APP);
  return {ctx, page};
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zffr-'));
console.log('Zaruri — motor de reguli + istoric verificabil + aruncare comună');
let {ctx, page} = await mk();
// ---------- 1. motor ----------
const E = await page.evaluate(() => {
  const R = ZFF.RULES, o = {};
  o.sha_abc = R.sha256('abc'); o.sha_empty = R.sha256('');
  o.sha_long = R.sha256('a'.repeat(1000));
  const base = {format: 'zff-rules/1', name: 'T', vars: {mod: 2, dc: 12}, rolls: [
    {id: 'a', label: 'A', type: 'sum', expr: '1d20+{mod}', outcomes: [{min: '{dc}', label: 'ok'}, {label: 'ko'}]},
    {id: 'p', label: 'P', type: 'pool', count: 5, sides: 10, target: 8, explode: true, botch: true, outcomes: [{max: -1, label: 'botch'}, {label: 'x'}]},
    {id: 'f', label: 'F', type: 'fate', bonus: '{mod}'}]};
  const good = R.parseSystem(base); o.good = !!good.system;
  const clone = () => JSON.parse(JSON.stringify(base));
  const t = (f) => { const c = clone(); f(c); return R.parseSystem(c).error || null; };
  o.badFormat = t(c => { c.format = 'x'; });
  o.badId = t(c => { c.rolls[0].id = 'Bad Id'; });
  o.dupId = t(c => { c.rolls[1].id = 'a'; });
  o.badExpr = t(c => { c.rolls[0].expr = '1d20+zzz'; });
  o.badRef = t(c => { c.rolls[0].expr = '1d20+{nope}'; });
  o.badType = t(c => { c.rolls[0].type = 'eval'; });
  o.badSides = t(c => { c.rolls[1].sides = 5000; });
  o.manyVars = t(c => { c.vars = {}; for (let i = 0; i < 13; i++) c.vars['v' + i] = 1; });
  o.protoVar = t(c => { c.vars = JSON.parse('{"__proto__": 1}'); });
  const sys = good.system, rng1 = R.seedRng('aa'), rng2 = R.seedRng('aa'), rng3 = R.seedRng('ab');
  o.det = rng1.int(1000) === rng2.int(1000) && rng1.int(1000) === rng2.int(1000);
  o.diff = Array.from({length: 8}, () => R.seedRng('aa').int(1e6)).join() !== Array.from({length: 8}, () => rng3.int(1e6)).join();
  // lanț
  const h = []; let prev = null;
  for (let i = 0; i < 6; i++) { const e = R.makeEntry(sys, ['a', 'p', 'f'][i % 3], {mod: i}, prev, R.sha256('s' + i), null, '2026-01-01T00:00:00Z'); h.push(e); prev = e; }
  o.chain = R.verifyHistory(sys, h);
  const mutate = (f) => { const c = JSON.parse(JSON.stringify(h)); f(c); return R.verifyHistory(sys, c); };
  o.tTotal = mutate(c => { c[2].total += 1; });
  o.tTotalRehash = mutate(c => { c[2].total += 1; const e = c[2]; e.hash = R.sha256(JSON.stringify(['zff-h1', e.i, e.at, e.sys, e.roll, Object.keys(e.vars).sort().map(k => [k, e.vars[k]]), e.seed, e.total, e.values, e.oi, null, e.prev])); });
  o.tDrop = mutate(c => { c.splice(1, 1); });
  o.tSwap = mutate(c => { const x = c[1]; c[1] = c[2]; c[2] = x; });
  o.tSeed = mutate(c => { c[3].seed = R.sha256('other'); });
  // valorile zarurilor stau în intervale
  o.range = h.every(e => e.values.every(v => e.roll === 'f' ? (v >= -1 && v <= 1) : (v >= 1 && v <= 20)));
  // pool: botch doar fără succese și cu cel puțin un 1
  let botchOK = true;
  for (let i = 0; i < 400; i++) { const r = R.evalRoll(sys.rolls[1], {}, R.seedRng('b' + i)); const succ = r.values.filter(v => v >= 8).length, ones = r.values.filter(v => v === 1).length; if ((r.total === -1) !== (succ === 0 && ones > 0)) botchOK = false; if (r.total !== -1 && r.total !== succ) botchOK = false; }
  o.botchOK = botchOK;
  // comună
  const mk = (n, nonce) => ({n, c: R.commitOf(n, nonce), r: nonce});
  const pl = [mk('Ana', 'a'.repeat(32)), mk('Bob', 'b'.repeat(32)), mk('Cip', 'c'.repeat(32))];
  const s1 = R.sharedSeed(pl, '1', 'T', 'a'), s2 = R.sharedSeed(pl.slice().reverse(), '1', 'T', 'a'), s3 = R.sharedSeed(pl, '2', 'T', 'a');
  o.sharedOK = s1.ok && s1.seed === s2.seed && s1.seed !== s3.seed;
  const cheat = pl.map(p => Object.assign({}, p)); cheat[1].r = 'd'.repeat(32);
  const sc = R.sharedSeed(cheat, '1', 'T', 'a'); o.cheat = !sc.ok && sc.why === 'commit' && sc.name === 'Bob';
  o.one = R.sharedSeed(pl.slice(0, 1), '1', 'T', 'a').ok === false;
  const e1 = R.makeEntry(sys, 'a', {}, null, s1.seed, {round: '1', players: pl.slice().sort((a, b) => a.n < b.n ? -1 : 1)}, '2026-01-01T00:00:00Z');
  const e2 = R.makeEntry(sys, 'a', {}, null, s2.seed, {round: '1', players: pl.slice().sort((a, b) => a.n < b.n ? -1 : 1)}, '2026-01-01T00:00:00Z');
  o.sameDice = JSON.stringify(e1.values) === JSON.stringify(e2.values) && R.verifyHistory(sys, [e1]).ok;
  const bad = JSON.parse(JSON.stringify(e1)); bad.shared.players[0].r = 'f'.repeat(32);
  o.sharedTamper = R.verifyHistory(sys, [bad]).ok === false;
  return o;
});
ok(E.sha_abc === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'SHA-256("abc") corect', E.sha_abc);
ok(E.sha_empty === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'SHA-256("") corect');
ok(E.sha_long === '41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3', 'SHA-256 pe 1000 de „a” corect', E.sha_long);
ok(E.good, 'un sistem valid e acceptat');
for (const k of ['badFormat', 'badId', 'dupId', 'badExpr', 'badRef', 'badType', 'badSides', 'manyVars', 'protoVar']) ok(!!E[k], 'respins: ' + k, E[k]);
ok(E.det && E.diff, 'fluxul din sămânță e determinist și depinde de sămânță');
ok(E.chain.ok && E.chain.n === 6, 'lanțul de 6 intrări se verifică', E.chain);
ok(!E.tTotal.ok && E.tTotal.i === 3 && E.tTotal.why === 'hash', 'modificarea unui total e prinsă (hash)', E.tTotal);
ok(!E.tTotalRehash.ok && E.tTotalRehash.i === 3, 'total modificat + hash recalculat: prins mai departe (replay sau legătură)', E.tTotalRehash);
ok(!E.tDrop.ok && !E.tSwap.ok && !E.tSeed.ok, 'ștergerea, schimbarea ordinii și schimbarea semințelor sunt prinse');
ok(E.range && E.botchOK, 'zarurile sunt în interval; botch doar fără succese și cu cel puțin un 1');
ok(E.sharedOK, 'sămânța comună nu depinde de ordine, dar depinde de rundă');
ok(E.cheat, 'un secret care nu corespunde angajamentului e detectat (cu numele trișorului)');
ok(E.one, 'un singur participant nu produce aruncare comună');
ok(E.sameDice && E.sharedTamper, 'toți obțin aceleași zaruri; intrarea comună modificată e respinsă');
// ---------- 2. UI ----------
await page.locator('#tab-rules').click();
ok(await page.locator('#view-rules').isVisible(), 'fila „Reguli” se deschide');
await page.locator('#rl-roll-check').click();
await page.locator('#rl-roll-adv').click();
ok(await page.locator('#rl-hist li').count() === 2, 'două aruncări în istoric');
ok(/Total/.test(await page.locator('#rl-out').innerText()), 'rezultatul e afișat');
await page.locator('#rl-pb-check').click();
const pr = await page.locator('#rl-prob-check').innerText();
ok(/%/.test(pr) && /exacte|Exact/i.test(pr), 'probabilități exacte pentru d20+mod', pr);
await page.locator('#rl-pb-adv').click();
ok(/Estimare|Estimate/.test(await page.locator('#rl-prob-adv').innerText()), 'estimare pentru 2d20kh1');
await page.locator('#rl-verify').click();
ok(/valid/i.test(await page.locator('#rl-vres').innerText()) && !/INVALID/.test(await page.locator('#rl-vres').innerText()), 'verificarea istoricului local reușește', await page.locator('#rl-vres').innerText());
// variabilă schimbată
await page.fill('#rl-var-mod', '9'); await page.locator('#rl-roll-dmg').click();
const last = await page.evaluate(() => ZFF_RULES.state().hist.slice(-1)[0]);
ok(last.vars.mod === 9, 'variabila introdusă intră în aruncare și în înregistrare', last.vars);
// export + reimport (valid, apoi trucat)
const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#rl-export').click()]);
const fp = path.join(tmp, 'h.json'); await dl.saveAs(fp);
const exported = JSON.parse(fs.readFileSync(fp, 'utf8'));
ok(exported.format === 'zff-rolls/1' && exported.entries.length === 3, 'exportul conține sistemul și intrările');
await page.setInputFiles('#rl-hfile', fp);
await page.waitForFunction(() => /valid/i.test(document.querySelector('#rl-vres').textContent));
ok(!/INVALID/.test(await page.locator('#rl-vres').innerText()), 'istoricul exportat se verifică la import');
exported.entries[1].total += 5; const fp2 = path.join(tmp, 'h2.json'); fs.writeFileSync(fp2, JSON.stringify(exported));
await page.setInputFiles('#rl-hfile', fp2);
await page.waitForFunction(() => /INVALID/.test(document.querySelector('#rl-vres').textContent));
ok(/#2/.test(await page.locator('#rl-vres').innerText()), 'istoricul trucat e respins la intrarea #2', await page.locator('#rl-vres').innerText());
// sistem din fișier
const mySys = {format: 'zff-rules/1', name: 'Test sys', vars: {n: 4}, rolls: [{id: 'p6', label: 'Pool d6', type: 'pool', count: '{n}', sides: 6, target: 5, outcomes: [{max: 0, label: 'Nimic'}, {label: 'Merge'}]}]};
const sp = path.join(tmp, 's.json'); fs.writeFileSync(sp, JSON.stringify(mySys));
await page.setInputFiles('#rl-file', sp);
await page.waitForSelector('#rl-roll-p6');
ok(await page.locator('#rl-sys option:checked').innerText().then(x => /Test sys/.test(x)), 'sistemul din fișier devine activ');
await page.locator('#rl-roll-p6').click();
ok(await page.locator('#rl-hist li').count() === 1, 'istoricul pornește gol pentru sistemul nou');
const bp = path.join(tmp, 'bad.json'); fs.writeFileSync(bp, JSON.stringify({format: 'zff-rules/1', name: 'x', rolls: [{id: 'a', label: 'a', type: 'sum', expr: 'rm -rf'}]}));
await page.setInputFiles('#rl-file', bp);
await page.waitForSelector('#rl-err:not([hidden])');
ok(/rolls\[0\]\.expr/.test(await page.locator('#rl-err').innerText()), 'fișier invalid: eroare cu calea câmpului', await page.locator('#rl-err').innerText());
ok(await page.locator('#rl-roll-p6').count() === 1, 'sistemul valid rămâne activ după un fișier respins');
const big = path.join(tmp, 'big.json'); fs.writeFileSync(big, ' '.repeat(100 * 1024));
await page.setInputFiles('#rl-file', big);
await page.waitForFunction(() => /prea mare|too large/i.test(document.querySelector('#rl-err').textContent));
ok(true, 'fișier prea mare respins');
// persistență
await page.reload(); await page.locator('#tab-rules').click();
ok(await page.locator('#rl-roll-p6').count() === 1 && await page.locator('#rl-hist li').count() === 1, 'sistemul și istoricul persistă după reîncărcare');
// editor JSON
await page.locator('#rl-edit summary').click();
await page.fill('#rl-json', '{"nu": ');
await page.locator('#rl-apply').click();
ok(!(await page.locator('#rl-err').isHidden()), 'JSON invalid în editor: mesaj de eroare');
// ---------- 3. aruncare comună prin UI ----------
await page.locator('#rl-sys').selectOption('dnd');
await page.locator('#rl-shared summary').click();
await page.fill('#rl-sh-name', 'Eu'); await page.fill('#rl-sh-round', '7');
await page.locator('#rl-sh-roll').selectOption('check');
await page.locator('#rl-sh-1').click();
const mine = await page.inputValue('#rl-sh-mycommit');
ok(/^C1:Eu:[0-9a-f]{64}$/.test(mine), 'angajamentul meu are formatul așteptat', mine);
const others = await page.evaluate(() => { const R = ZFF.RULES; const o = {}; for (const [n, nonce] of [['Ana', 'a1'.repeat(16)], ['Bob', 'b2'.repeat(16)]]) o[n] = {c: R.commitCode(n, R.commitOf(n, nonce)), r: R.revealCode(n, nonce), nonce}; return o; });
await page.fill('#rl-sh-commits', others.Ana.c + '\n' + others.Bob.c);
await page.locator('#rl-sh-2').click();
const myRev = await page.inputValue('#rl-sh-myreveal');
ok(/^R1:Eu:[0-9a-f]{32}$/.test(myRev), 'secretul meu dezvăluit are formatul așteptat');
// trișor: Bob dezvăluie alt secret
await page.fill('#rl-sh-reveals', others.Ana.r + '\n' + 'R1:Bob:' + 'e'.repeat(32));
await page.locator('#rl-sh-3').click();
ok(/ATEN|WARN/.test(await page.locator('#rl-sh-msg').innerText()) && /Bob/.test(await page.locator('#rl-sh-msg').innerText()), 'trișorul e semnalat cu numele');
const n0 = await page.locator('#rl-hist li').count();
await page.fill('#rl-sh-reveals', others.Ana.r + '\n' + others.Bob.r);
await page.locator('#rl-sh-3').click();
ok(await page.locator('#rl-hist li').count() === n0 + 1, 'aruncarea comună valabilă intră în istoric');
// un alt participant calculează independent aceleași zaruri
const indep = await page.evaluate(([myR, a, b]) => {
  const R = ZFF.RULES, nonceMe = myR.split(':')[2];
  const pl = [['Eu', nonceMe], ['Ana', 'a1'.repeat(16)], ['Bob', 'b2'.repeat(16)]].map(([n, r]) => ({n, c: R.commitOf(n, r), r}));
  const seed = R.sharedSeed(pl, '7', ZFF_RULES.state().sys.name, 'check').seed;
  const e = ZFF_RULES.state().hist.slice(-1)[0];
  const again = R.makeEntry(ZFF_RULES.state().sys, 'check', {mod: 3, dc: 15}, null, seed, null, e.at);
  return {same: JSON.stringify(again.values) === JSON.stringify(e.values) && again.seed === e.seed, shared: !!e.shared && e.shared.round === '7'};
}, [myRev, others.Ana.r, others.Bob.r]);
ok(indep.same && indep.shared, 'un alt participant ajunge independent la aceleași zaruri');
await page.locator('#rl-verify').click();
ok(!/INVALID/.test(await page.locator('#rl-vres').innerText()), 'istoricul cu aruncare comună se verifică');
// ---------- 4. accesibilitate, limbi, mobil ----------
if (AXE) {
  await page.evaluate(fs.readFileSync(AXE, 'utf8') + '\n;0');
  const v = await page.evaluate(async () => (await axe.run(document.querySelector('#view-rules'), {resultTypes: ['violations']})).violations.map(x => x.id + ':' + x.nodes.map(n => n.target.join(' ')).slice(0, 3).join('|')));
  ok(v.length === 0, 'axe: 0 violări în fila Reguli', v);
}
for (const l of ['ro', 'en', 'fr', 'it', 'es', 'pt', 'de', 'hu']) {
  await page.selectOption('#lang', l);
  const txt = await page.locator('#view-rules').innerText();
  ok(!/\brl_[a-z_0-9]+\b/.test(txt) && !/tab_rules|rules_h/.test(await page.locator('#tab-rules').innerText()), 'limba ' + l + ': fără chei netraduse');
}
await ctx.close();
({ctx, page} = await mk(360, 740));
await page.locator('#tab-rules').click();
ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'mobil 360 px: fără depășire orizontală');
await ctx.close();
ok(errs.length === 0, 'fără erori JS/CSP', errs); ok(net.length === 0, '0 cereri de rețea', net);
await browser.close();
console.log(`${pass} ok, ${fail} fail`); process.exit(fail ? 1 : 0);
