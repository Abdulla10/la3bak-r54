#!/usr/bin/env node
/*
 * R69zz: اختبار ضغط — يفتح لاعبين كثير (افتراضي 1000) كل واحد يلعب لودو ضد الكمبيوتر ويكتب بالشات.
 * لا تشغله على السيرفر الحقيقي. شغّله على نسخة تجريبية:
 *   SESSION_BURST=100000 MAX_CONNECTIONS_PER_USER=5 PORT=4110 npm start   (بمجلد بيانات تجريبي)
 *   node scripts/load-test.mjs --url http://127.0.0.1:4110 --players 1000 --seconds 60
 * يطبع: كم لاعب اتصل، زمن الرد (p50/p95/p99)، الأخطاء، واستهلاك ذاكرة السيرفر من /api/admin/monitor لو أعطيته --admin TOKEN.
 */
import { createHash, randomUUID } from 'node:crypto';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('url', 'http://127.0.0.1:4110'), N = Number(arg('players', 1000)), SECS = Number(arg('seconds', 60)), ADMIN = arg('admin', process.env.ADMIN_TOKEN || '');
const RAMP = Number(arg('ramp', 20)); // لاعبين بالثانية
const WS = (await import('ws')).WebSocket; // npm install يجيبه (موجود مع السيرفر)
const lat = [], errs = new Map(); let connected = 0, games = 0, moves = 0, chats = 0, finished = 0;
const err = (k) => errs.set(k, (errs.get(k) || 0) + 1);
function solve(c, bits) { for (let n = 0; ; n++) { const h = createHash('sha256').update(c + ':' + n).digest(); if (h.readUInt32BE(0) < 2 ** (32 - bits)) return String(n); } }
async function account(i) {
  const pj = await (await fetch(BASE + '/api/pow', { cache: 'no-store' })).json();
  const r = await fetch(BASE + '/api/session', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE }, body: JSON.stringify({ name: 'ضغط' + i, pow: { c: pj.c, n: solve(pj.c, pj.bits) } }) });
  if (!r.ok) throw new Error('session ' + r.status);
  return String(r.headers.get('set-cookie') || '').split(';')[0];
}
function player(i, cookie) {
  return new Promise(async (done) => {
    if (!cookie) return done();
    const ws = new WS(BASE.replace(/^http/, 'ws') + '/ws', { headers: { cookie, origin: BASE } });
    let id = 0, code = null, busyVer = -1; const pend = new Map();
    const send = (t, m = {}) => new Promise((res) => { const k = ++id; pend.set(k, { res, at: performance.now() }); ws.send(JSON.stringify({ id: k, t, ...m })); });
    const stop = setTimeout(() => { try { ws.close(); } catch {} }, SECS * 1000);
    ws.onerror = () => err('ws_error');
    ws.onclose = () => { clearTimeout(stop); clearInterval(chatT); done(); };
    let chatT;
    ws.onopen = async () => {
      connected++;
      const r = await send('room:create', { gameId: 'ludo', mode: 'bots', seats: 4, key: randomUUID().replace(/-/g, ''), voice: false });
      if (!r?.ok) { err('create:' + (r?.error || '?')); return ws.close(); }
      code = r.room?.code; games++;
      const s = await send('room:start', { code }); if (s && s.ok === false && !/بدأت|started/.test(s.error || '')) err('start:' + s.error);
      chatT = setInterval(() => { send('room:chat', { code, text: 'هلا ' + i }).then((x) => { if (x?.ok) chats++; }); }, 15000 + Math.random() * 10000);
    };
    ws.onmessage = (ev) => {
      if (process.env.LT_DEBUG && i === 0) console.log(String(ev.data).slice(0, 300));
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (m.r && pend.has(m.r)) { const p = pend.get(m.r); pend.delete(m.r); lat.push(performance.now() - p.at); return p.res(m); }
      const room = m.room || m.snapshot || m; const g = room?.game || room?.view;
      if (!g || g.game !== 'ludo' || g.ver === busyVer) return;
      if (g.phase === 'final' || g.winner) { finished++; return; }
      if (g.canRoll || (g.moves && g.moves.length)) {
        busyVer = g.ver;
        const action = g.canRoll ? { type: 'roll' } : { type: 'move', token: g.moves[0].token };
        setTimeout(() => send('game:action', { code, ver: g.ver, action }).then((x) => { if (x?.ok) moves++; else if (x) err('move:' + (x.error || '?')); }), 300 + Math.random() * 700);
      }
    };
  });
}
async function health() { if (!ADMIN) return null; try { const r = await fetch(BASE + '/api/admin/monitor', { headers: { authorization: 'Bearer ' + ADMIN } }); return r.ok ? (await r.json()).live : null; } catch { return null; } }
const pct = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return Math.round(s[Math.min(s.length - 1, Math.floor(s.length * p))]); };
// أول شي نفتح الحسابات (حل إثبات العمل ياخذ CPU) عشان ما يأثر على قياس زمن الرد
const cookies = []; process.stdout.write('فتح الحسابات… ');
for (let i = 0; i < N; i += 25) { const b = await Promise.all(Array.from({ length: Math.min(25, N - i) }, (_, j) => account(i + j).catch((e) => { err(String(e.message)); return null; }))); cookies.push(...b); }
console.log(cookies.filter(Boolean).length + '/' + N);
const t0 = Date.now(); const all = [];
const tick = setInterval(async () => { const h = await health(); console.log(`[${Math.round((Date.now() - t0) / 1000)}s] متصل=${connected} ألعاب=${games} حركات=${moves} شات=${chats} p95=${pct(lat.slice(-2000), 0.95)}ms` + (h ? ` ذاكرة=${h.rssMb}MB تأخير=${h.lagP99}ms أونلاين=${h.online}` : '')); }, 5000);
for (let i = 0; i < N; i++) { all.push(player(i, cookies[i])); if (i % RAMP === RAMP - 1) await new Promise((r) => setTimeout(r, 1000)); }
await Promise.all(all); clearInterval(tick);
console.log(JSON.stringify({ players: N, connected, games, moves, chats, finished, latencyMs: { p50: pct(lat, 0.5), p95: pct(lat, 0.95), p99: pct(lat, 0.99), max: pct(lat, 1) }, errors: Object.fromEntries(errs) }, null, 1));
