// R51: فحص وظيفي للغرف والدردشة عبر WebSocket بلاعبين اختبار معزولين على خادم محلي (بدون رسوم أو أموال).
import WebSocket from 'ws';
const B = process.argv[2] || 'http://127.0.0.1:4100'; const R = []; const ok = (n, c, x = '') => { R.push(!!c); console.log(c ? 'PASS' : 'FAIL', n, x); };
async function player(name) {
  const r = await fetch(B + '/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: B }, body: JSON.stringify({ name }) });
  const cookie = r.headers.get('set-cookie').split(';')[0];
  const ws = new WebSocket(B.replace('http', 'ws') + '/ws', { headers: { Cookie: cookie, Origin: B } });
  const pend = new Map(); const events = []; let n = 0;
  ws.on('message', (raw) => { const m = JSON.parse(String(raw)); if (m.r !== undefined && pend.has(m.r)) { pend.get(m.r)(m); pend.delete(m.r); } else events.push(m); });
  await new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); });
  const req = (t, b = {}) => new Promise((res) => { const id = ++n; pend.set(id, res); ws.send(JSON.stringify({ id, t, ...b })); setTimeout(() => { if (pend.has(id)) { pend.delete(id); res({ ok: false, error: 'timeout' }); } }, 6000); });
  return { ws, req, events, cookie };
}
const a = await player('لاعب أ'); const b = await player('لاعب ب');
const c = await a.req('room:create', { gameId: 'uno', mode: 'friends', seats: 2, key: 'r51-room-key-0001', visibility: 'private', password: 'r51-test-pass' });
ok('إنشاء غرفة أونو خاصة', c.ok && c.room?.code, c.error || '');
const code = c.room?.code;
const c2 = await a.req('room:create', { gameId: 'uno', mode: 'friends', seats: 2, key: 'r51-room-key-0001', visibility: 'private', password: 'r51-test-pass' });
ok('إعادة نفس طلب الإنشاء (نفس المفتاح) ما تسوي غرفة ثانية', c2.ok ? c2.room?.code === code : true, JSON.stringify({ ok: c2.ok, code: c2.room?.code, e: c2.error }));
const j = await b.req('room:join', { code, password: 'r51-test-pass' });
ok('اللاعب الثاني ينضم بالرمز', j.ok, j.error || '');
// دردشة غرفة اللعب = رسائل/تفاعلات room:react، وroom:chat يرجّع سجلها
const ch = await b.req('room:react', { code, text: 'حظ سعيد' });
await new Promise((r) => setTimeout(r, 700));
const seen = a.events.some((e) => JSON.stringify(e).includes('حظ سعيد'));
ok('رسالة دردشة (رد سريع من القائمة المسموحة) توصل للاعب الأول', ch.ok && seen, JSON.stringify(ch).slice(0, 200) + ' | ' + a.events.map((e) => e.t).join(','));
const log = await a.req('room:chat', { code });
ok('سجل دردشة الغرفة يرجّع الرسالة', log.ok && JSON.stringify(log.log).includes('حظ سعيد'));
await new Promise((r) => setTimeout(r, 1300));
const bad = await b.req('room:react', { code, text: 'x'.repeat(5000) });
const log2 = await a.req('room:chat', { code });
ok('رسالة 5000 حرف تنرفض أو تنقص', !bad.ok || !JSON.stringify(log2.log).includes('x'.repeat(1000)), bad.error || 'قُبلت');
await b.req('room:ready', { code, ready: true }); await a.req('room:ready', { code, ready: true });
const s = await a.req('room:start', { code });
ok('بدء اللعبة من صاحب الغرفة', s.ok, s.error || '');
const l = await b.req('room:leave', { code });
ok('مغادرة الغرفة', l.ok !== false, l.error || '');
const bogus = await b.req('room:join', { code: '<script>' });
ok('رمز غرفة غير صالح ينرفض', !bogus.ok, bogus.error || '');
a.ws.close(); b.ws.close();
console.log('SUMMARY pass', R.filter(Boolean).length, 'fail', R.filter((x) => !x).length);
