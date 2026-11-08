// R58j: التذكارات — 28 قطعة بالمتجر بالمجوهرات، الشراء يمر بالمحفظة، ما تنجهّز، وتطلع برف «تذكاراتي». خادم محلي فقط.
// الاستخدام: ADMIN_TOKEN=... node acceptance-r58/souvenir-r58.mjs http://127.0.0.1:4104 <مجلد الكوكيز>
import WebSocket from 'ws'; import fs from 'node:fs'; import { randomUUID } from 'node:crypto';
const [B, JARS] = process.argv.slice(2);
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(B || '')) { console.error('محلي فقط'); process.exit(2); }
const R = []; const ok = (n, c, x = '') => { R.push(!!c); console.log(c ? 'PASS' : 'FAIL', n, x ? '— ' + String(x).slice(0, 300) : ''); };
const tok = fs.readFileSync(`${JARS}/a.cj`, 'utf8').split('\n').find((l) => l.includes('qa_s')).split('\t')[6].trim();
const ws = new WebSocket(B.replace('http', 'ws') + '/ws', { headers: { Cookie: 'qa_s=' + tok, Origin: B } }); let n = 0; const pend = new Map();
ws.on('message', (d) => { const m = JSON.parse(d); if (m.r && pend.has(m.r)) { pend.get(m.r)(m); pend.delete(m.r); } });
const req = (t, x = {}) => new Promise((res) => { const id = ++n; pend.set(id, res); ws.send(JSON.stringify({ id, t, ...x })); });
await new Promise((r) => ws.on('open', r));
const shop = await req('shop:get'); const sv = shop.items.filter((i) => i.slot === 'souvenir');
ok('28 تذكار معروضة بالمتجر', sv.length === 28, sv.length);
ok('كلها بالمجوهرات وبسعر من سلّم الندرة', sv.every((i) => i.currency === 'gems' && i.price >= 5000), sv.map((i) => i.price).join(','));
ok('كل تذكار له رسمة من رسومات المالك', sv.every((i) => /^\/assets\/art58\/souv\/s\d{2}\.webp$/.test(i.art)));
const exists = await Promise.all(sv.slice(0, 28).map(async (i) => (await fetch(B + i.art)).status));
ok('ملفات الرسومات موجودة على الخادم', exists.every((s) => s === 200), exists.join(','));
const target = sv.filter((i) => !shop.owned.includes(i.id)).sort((a, b) => a.price - b.price)[0];
const before = shop.gems;
const b1 = await req('shop:buy', { item: target.id, key: randomUUID() });
ok('شراء تذكار ينجح ويخصم سعره بالضبط', b1.ok !== false && b1.owned.includes(target.id) && before - b1.gems === target.price, JSON.stringify({ err: b1.error, before, after: b1.gems, price: target.price }));
const b2 = await req('shop:buy', { item: target.id, key: randomUUID() });
ok('ما ينشرى مرتين', b2.ok === false && b2.code === 'owned', b2.error);
const eq = await req('shop:equip', { item: target.id });
ok('التذكار ما يتجهّز (ينعرض بالرف تلقائيًا)', eq.ok === false && eq.code === 'souvenir', eq.error);
ws.close();
console.log(`\n${R.filter(Boolean).length}/${R.length} PASS`); process.exit(R.every(Boolean) ? 0 : 1);
