#!/usr/bin/env node
/*
 * R71: فحص شكل الموقع تلقائياً — يفتح كل الصفحات (جوال 390px، الوضع الداكن والفاتح) ويدوّر:
 *   1) أخطاء جافاسكربت   2) ملفات ناقصة (404)   3) صفحة أعرض من الشاشة (تنسحب يمين/يسار)
 *   4) كلام لونه قريب من لون خلفيته (ما يبين) — حسب معيار WCAG
 * يطلع تقرير، ويرجع خطأ (exit 1) لو فيه مشكلة كبيرة → يوقف التحديث بالـ CI قبل ما ينزل.
 *   node scripts/ui-check.mjs --url http://127.0.0.1:3000 [--out ui-shots] [--strict]
 */
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
const { chromium } = await import('playwright');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('url', 'http://127.0.0.1:3000'), OUT = arg('out', ''), STRICT = process.argv.includes('--strict');
const MIN_RATIO = Number(arg('min-ratio', 2.2)); // أقل من كذا = ما يبين تقريباً
const ROUTES = ['#/home', '#/games', '#/hub/baloot', '#/hub/jackaro', '#/rooms', '#/messages', '#/settings', '#/profile', '#/shop', '#/friends', '#/community', '#/missions', '#/league', '#/casino', '#/leaderboard', '#/wallet', '#/notifications', '#/groups', '#/lfg', '#/majalis', '#/vibe', '#/perks'];
const GAMES = [['ludo', 2], ['baloot', 4], ['pool', 2], ['uno', 2]];
if (OUT) mkdirSync(OUT, { recursive: true });

function solve(c, bits) { for (let n = 0; ; n++) { if (createHash('sha256').update(c + ':' + n).digest().readUInt32BE(0) < 2 ** (32 - bits)) return String(n); } }
async function account() {
  const pj = await (await fetch(BASE + '/api/pow', { cache: 'no-store' })).json();
  const r = await fetch(BASE + '/api/session', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE }, body: JSON.stringify({ name: 'فحص الشكل', pow: { c: pj.c, n: solve(pj.c, pj.bits) } }) });
  if (!r.ok) throw new Error('ما قدرت أفتح حساب تجربة: ' + r.status);
  return /qa_s=([^;]+)/.exec(r.headers.get('set-cookie') || '')?.[1];
}

/* يشتغل داخل الصفحة: يرجع الكلام اللي تباينه ضعيف */
const CONTRAST = (minRatio) => {
  const rgb = (s) => { const m = String(s).match(/[\d.]+/g); return m ? [+m[0], +m[1], +m[2], m[3] === undefined ? 1 : +m[3]] : null; };
  const L = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const mix = (top, bot) => [0, 1, 2].map((i) => top[i] * top[3] + bot[i] * (1 - top[3])).concat(1);
  const bgOf = (el) => {
    const stack = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') {
        if (/url\(/.test(cs.backgroundImage)) return null; // صورة خلفية: ما نقدر نحكم
        const cols = (cs.backgroundImage.match(/rgba?\([^)]*\)/g) || []).map(rgb).filter(Boolean);
        if (cols.length) { const avg = [0, 1, 2].map((i) => cols.reduce((a, c) => a + c[i], 0) / cols.length).concat(Math.min(...cols.map((c) => c[3]))); stack.push(avg); if (avg[3] > 0.9) break; continue; }
      }
      const c = rgb(cs.backgroundColor); if (c && c[3] > 0) { stack.push(c); if (c[3] > 0.9) break; }
      if (+cs.opacity < 0.5) return null;
    }
    let base = [13, 6, 20, 1]; // خلفية الموقع الداكنة لو ما لقينا شي
    const bodyBg = rgb(getComputedStyle(document.body).backgroundColor); if (bodyBg && bodyBg[3] > 0.9) base = bodyBg;
    for (let i = stack.length - 1; i >= 0; i--) base = mix(stack[i], base);
    return base;
  };
  const out = []; const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const txt = t.textContent.trim(); if (txt.length < 2 || !/[\p{L}\p{N}]/u.test(txt)) continue;
    const el = t.parentElement; if (!el || seen.has(el)) continue; seen.add(el);
    if (el.closest('svg,canvas,[aria-hidden="true"],input,textarea,select,option,[hidden]')) continue;
    const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight * 3) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity < 0.4 || cs.color === 'transparent' || /text/.test(cs.webkitBackgroundClip || cs.backgroundClip || '')) continue;
    const fg = rgb(cs.color); const bg = bgOf(el); if (!fg || !bg || fg[3] < 0.3) continue;
    const f = mix(fg, bg); const a = L(f), b = L(bg); const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    if (ratio < minRatio) out.push({ ratio: Math.round(ratio * 100) / 100, text: txt.slice(0, 40), sel: [el, el.parentElement, el.parentElement?.parentElement].filter(Boolean).map((n) => n.tagName.toLowerCase() + (typeof n.className === 'string' && n.className.trim() ? '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.') : '')).reverse().join(' > '), fg: cs.color, bg: `rgb(${bg.slice(0, 3).map(Math.round).join(',')})` });
  }
  return out;
};

const browser = await chromium.launch();
const cookie = arg('cookie', '') || await account();
const report = { pages: 0, jsErrors: [], missing: [], overflow: [], contrast: [] };
for (const theme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const host = new URL(BASE).hostname;
  await ctx.addCookies([{ name: 'qa_s', value: cookie, domain: host, path: '/' }]);
  await ctx.addInitScript((th) => { try { localStorage.setItem('la3bak.dark', th === 'dark' ? '1' : '0'); } catch {} }, theme);
  const p = await ctx.newPage(); let where = '';
  p.on('pageerror', (e) => report.jsErrors.push(`[${theme} ${where}] ${String(e.message).slice(0, 160)}`));
  p.on('response', (r) => { const u = r.url(); if (r.status() >= 400 && !u.includes('/api/') && !u.includes('/fonts/')) report.missing.push(`${r.status()} ${u.replace(BASE, '')}`); });
  await p.goto(BASE + '/'); await p.waitForTimeout(2500);
  const pages = [...ROUTES.map((r) => ['route', r])];
  if (theme === 'dark') for (const g of GAMES) pages.push(['game', g]);
  for (const [kind, v] of pages) {
    where = kind === 'route' ? v : 'game:' + v[0];
    if (kind === 'route') await p.evaluate((r) => globalThis.__LA3BAK_NAV__.go(r), v);
    else {
      const code = await p.evaluate(([g, seats, key]) => new Promise((res) => { const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'); let n = 0; const send = (t, b) => new Promise((r) => { const id = ++n; const h = (e) => { const m = JSON.parse(e.data); if (m.r === id) { ws.removeEventListener('message', h); r(m); } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id, t, ...b })); }); ws.onopen = async () => { const c = await send('room:create', { gameId: g, mode: 'bots', seats, key }); if (!c.ok) { ws.close(); return res(null); } await send('room:start', { code: c.room.code }); ws.close(); res(c.room.code); }; setTimeout(() => res(null), 8000); }), [v[0], v[1], 'ui' + randomUUID().replace(/-/g, '').slice(0, 20)]);
      if (!code) { report.jsErrors.push(`[${where}] ما قدرت أبدأ لعبة`); continue; }
      await p.evaluate((c) => globalThis.__LA3BAK_NAV__.go('#/room/' + c), code);
    }
    await p.waitForTimeout(1600); report.pages++;
    const ov = await p.evaluate(() => { const w = document.documentElement.scrollWidth; return w > innerWidth + 2 ? w : 0; });
    if (ov) report.overflow.push(`[${theme} ${where}] عرض الصفحة ${ov}px والشاشة 390px`);
    for (const c of await p.evaluate(CONTRAST, MIN_RATIO)) report.contrast.push({ where: `${theme} ${where}`, ...c });
    if (OUT) await p.screenshot({ path: `${OUT}/${theme}-${where.replace(/[^\w-]+/g, '_')}.png` });
  }
  await ctx.close();
}
await browser.close();
report.missing = [...new Set(report.missing)];
const lines = [`صفحات مفحوصة: ${report.pages}`, `أخطاء جافاسكربت: ${report.jsErrors.length}`, ...report.jsErrors.slice(0, 20).map((x) => '  ' + x), `ملفات ناقصة: ${report.missing.length}`, ...report.missing.slice(0, 20).map((x) => '  ' + x), `صفحات أعرض من الشاشة: ${report.overflow.length}`, ...report.overflow.map((x) => '  ' + x), `كلام ما يبين (تباين أقل من ${MIN_RATIO}): ${report.contrast.length}`, ...report.contrast.slice(0, 60).map((c) => `  [${c.where}] ${c.ratio} «${c.text}» ${c.sel} ${c.fg} على ${c.bg}`)];
console.log(lines.join('\n'));
if (OUT) writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
const bad = report.jsErrors.length + report.missing.length + report.overflow.length + (STRICT ? report.contrast.length : 0);
process.exit(bad ? 1 : 0);
