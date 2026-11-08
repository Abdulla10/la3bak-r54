// R57: اختبار توسعة المتجر على خادم محلي (حسابات اختبار + رصيد اختبار من مفتاح الإدارة المحلي فقط).
// الاستخدام: ADMIN_TOKEN=... node acceptance-r57/store-r57.mjs http://127.0.0.1:4104 <مجلد الكوكيز>
import WebSocket from 'ws'; import fs from 'node:fs'; import { randomUUID } from 'node:crypto';
const [B, JARS] = process.argv.slice(2);
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(B || '')) { console.error('محلي فقط'); process.exit(2); }
const R = []; const ok = (n, c, x = '') => { R.push(!!c); console.log(c ? 'PASS' : 'FAIL', n, x ? '— ' + String(x).slice(0, 300) : ''); };
const tok = (u) => fs.readFileSync(`${JARS}/${u}.cj`, 'utf8').split('\n').find((l) => l.includes('qa_s')).split('\t')[6].trim();
async function fresh(name) { const r = await fetch(B + '/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: B }, body: JSON.stringify({ name }) }); return r.headers.get('set-cookie').split(';')[0].split('=')[1]; }
function client(token) {
  const ws = new WebSocket(B.replace('http', 'ws') + '/ws', { headers: { Cookie: 'qa_s=' + token, Origin: B } }); let n = 0; const pend = new Map();
  ws.on('message', (raw) => { const m = JSON.parse(String(raw)); if (m.r !== undefined && pend.has(m.r)) { pend.get(m.r)(m); pend.delete(m.r); } });
  const ready = new Promise((r) => ws.once('open', r));
  return { ready, close: () => ws.close(), req: (t, b = {}) => new Promise((res) => { const id = ++n; pend.set(id, res); ws.send(JSON.stringify({ id, t, ...b })); setTimeout(() => { if (pend.has(id)) { pend.delete(id); res({ ok: false, error: 'timeout' }); } }, 8000); }) };
}
const me = async (t) => (await (await fetch(B + '/api/me', { headers: { cookie: 'qa_s=' + t } })).json()).user;
async function gems(token, amount, key) {
  // الإدارة تمنح مليون كحد أقصى بالعملية: نقسم الرصيد التجريبي (محلي فقط)
  if (amount > 1_000_000) { let ok1 = true; for (let i = 0; amount > 0; i++) { const d = Math.min(amount, 1_000_000); ok1 = (await gems(token, d, key + '-' + i)) && ok1; amount -= d; } return ok1; }
  const id = (await me(token)).id;
  const r = await fetch(B + `/api/admin/players/${id}/adjust`, { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.ADMIN_TOKEN, 'x-admin': '1', Origin: B, 'Content-Type': 'application/json' }, body: JSON.stringify({ cur: 'gems', delta: amount, reason: 'رصيد اختبار محلي R57', key }) });
  return r.ok;
}
const t1 = await fresh('مشتري ' + Date.now().toString(36)), t2 = await fresh('منافس ' + Date.now().toString(36));
ok('رصيد اختبار للحسابين (محلي فقط)', await gems(t1, 65_200_000, 'r57-' + randomUUID().slice(0, 12)) && await gems(t2, 20000, 'r57-' + randomUUID().slice(0, 12)));
const c1 = client(t1), c2 = client(t2); await c1.ready; await c2.ready;
const shop = await c1.req('shop:get');
const bySlot = (s) => shop.items.filter((i) => i.slot === s);
ok('إطارات المالك (20) معروضة للبيع، وإطارات lux-f القديمة مخفية', shop.items.filter((i) => i.id.startsWith('art-f-') && i.status === 'available').length === 20 && !shop.items.some((i) => i.id.startsWith('lux-f-') && i.status === 'available'), shop.items.filter((i) => i.id.startsWith('art-f-')).length);
ok('المتجر فيه 8 خلفيات فخمة جديدة', shop.items.filter((i) => i.id.startsWith('lux-b-')).length === 8);
ok('فقاعات الدردشة (6) ولوحات الأسماء (5) صارت أقسام فيها منتجات', bySlot('chat-bubble').length === 6 && bySlot('board').length === 5);
ok('السيارات انشالت من المتجر بالكامل (طلب المالك)', !shop.items.some((i) => i.slot === 'entrance'), shop.items.filter((i) => i.slot === 'entrance').map((i) => i.id).join(','));
const carBuy = await c1.req('shop:buy', { item: 'entrance-sport', key: randomUUID() }); ok('شراء سيارة ينرفض من الخادم', !carBuy.ok, carBuy.error);
ok('أيديات مميزة معروضة للبيع', bySlot('special-id').length >= 20);
ok('إطار «جليدي» المقصوص ما ينعرض للبيع', !shop.items.some((i) => i.id === 'ref-p-frame-11' && i.status === 'available'));
// R58b: المتجر بالمجوهرات فقط وأسعار فخمة
const deco = shop.items.filter((i) => ['frame', 'bg', 'chat-bubble', 'board', 'special-id', 'room-id'].includes(i.slot) && i.price > 0 && i.status === 'available');
const coinsLeft = deco.filter((i) => i.currency !== 'gems');
ok('كل الزينة (إطارات/خلفيات/سيارات/فقاعات/لوحات/أيديات) بالمجوهرات فقط', coinsLeft.length === 0, coinsLeft.map((i) => i.id + ':' + i.currency).slice(0, 8).join(','));
const luxF = shop.items.filter((i) => i.id.startsWith('art-f-'));
ok('إطارات المالك بالمجوهرات، والأسطورية والخرافية 100 ألف وفوق', luxF.every((i) => i.currency === 'gems' && i.price >= 2000) && luxF.filter((i) => ['legendary', 'ultra'].includes(i.rarity)).every((i) => i.price >= 100000), luxF.map((i) => i.price).join(','));
ok('الأيديات المميزة 45 مليون وفوق', bySlot('special-id').every((i) => i.price >= 45_000_000) && bySlot('room-id').every((i) => i.price >= 45_000_000), Math.min(...bySlot('special-id').map((i) => i.price)) + '');
const buy = (c, item) => c.req('shop:buy', { item, key: randomUUID() });
const b1 = await buy(c1, 'lux-bub-gold'); ok('شراء فقاعة ذهبية', b1.ok && b1.owned.includes('lux-bub-gold'), b1.error);
const e1 = await c1.req('shop:equip', { item: 'lux-bub-gold' }); ok('تجهيز الفقاعة', e1.ok && e1.equipped['chat-bubble'] === 'lux-bub-gold', e1.error);
const b2 = await buy(c1, 'lux-board-amethyst'); const e2 = await c1.req('shop:equip', { item: 'lux-board-amethyst' });
ok('شراء وتجهيز لوحة الاسم', b2.ok && e2.ok && e2.equipped.board === 'lux-board-amethyst', b2.error || e2.error);
// أيدي مميز: نختار رقم متاح
const sid = bySlot('special-id').filter((i) => i.price <= 60_000_000 && !shop.owned.includes(i.id)).sort((a, b) => a.price - b.price)[0]; // الأرخص المتاح — الأرخص ينحجز من التشغيلات السابقة
const before = (await me(t1));
const s1 = await buy(c1, sid.id); const after = await (await fetch(B + '/api/account', { headers: { cookie: 'qa_s=' + t1 } })).json().catch(() => null);
const acct = await (await fetch(B + '/api/me', { headers: { cookie: 'qa_s=' + t1 } })).json();
ok(`شراء الأيدي المميز ${sid.css} ينجح`, s1.ok, s1.error);
const shop2 = await c2.req('shop:get');
ok('بعد الشراء، الأيدي ما يطلع لحساب ثاني', !shop2.items.some((i) => i.id === sid.id));
const s2 = await buy(c2, sid.id); ok('حساب ثاني ما يقدر يشتري نفس الأيدي', !s2.ok, s2.error);
const found = await (await fetch(B + '/api/social-private/search?q=' + sid.css, { headers: { cookie: 'qa_s=' + t2 } })).json();
ok('الأيدي الجديد صار رقم الحساب الظاهر (البحث بالرقم يلقاه)', JSON.stringify(found).includes(sid.css) && JSON.stringify(found).includes('مشتري'), JSON.stringify(found).slice(0, 200));
const un = await c1.req('shop:equip', { slot: 'special-id', item: null }); ok('ترجع لرقمك العادي بإلغاء التجهيز', un.ok, un.error);
const re = await c1.req('shop:equip', { item: sid.id }); ok('وترجع للأيدي المميز متى ما تبي', re.ok, re.error);
const poor = client(await fresh('فقير ' + Date.now().toString(36))); await poor.ready;
const sid2 = bySlot('special-id').find((i) => i.id !== sid.id && i.price >= 45_000_000);
const p1 = await buy(poor, sid2.id); ok('بدون رصيد: الشراء ينرفض والأيدي ما ينحجز', !p1.ok && (await c2.req('shop:get')).items.some((i) => i.id === sid2.id), p1.error);
// المؤثرات تظهر بالغرفة: المالك يسوي غرفة ويكتب، ونقرأ عرض الغرفة
const cmd = async (t, body) => (await fetch(B + '/api/social/command', { method: 'POST', headers: { cookie: 'qa_s=' + t, Origin: B, 'Content-Type': 'application/json' }, body: JSON.stringify({ key: randomUUID(), ...body }) })).json();
await cmd(t1, { command: 'prefs:update', adultAcknowledged: true });
const room = await cmd(t1, { command: 'room:create', name: 'غرفة R57' });
const det = await (await fetch(B + '/api/social/rooms/' + room.roomId, { headers: { cookie: 'qa_s=' + t1 } })).json();
const mine = det.room?.members?.find((m) => m.board || m.bubble);
ok('عرض الغرفة يحمل الفقاعة ولوحة الاسم المجهّزة', mine?.bubble === 'vip-gold' && mine?.board === 'amethyst', JSON.stringify(det.room?.members?.[0] || det).slice(0, 200));
await cmd(t1, { command: 'room:delete', roomId: room.roomId });
c1.close(); c2.close(); poor.close();
console.log('SUMMARY pass', R.filter(Boolean).length, 'fail', R.filter((x) => !x).length);
process.exit(0);
