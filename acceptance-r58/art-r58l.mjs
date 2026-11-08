// R58k–l: رسومات المالك — 20 فقاعة، 20 لوحة، 20 لقب (15 جديد + 5 موجودة)، 20 شارة، قوالب الأيدي. خادم محلي فقط.
// الاستخدام: node acceptance-r58/art-r58l.mjs http://127.0.0.1:4104 <مجلد الكوكيز>
import WebSocket from 'ws'; import fs from 'node:fs'; import { randomUUID } from 'node:crypto';
const [B, JARS] = process.argv.slice(2);
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(B || '')) { console.error('محلي فقط'); process.exit(2); }
const R = []; const ok = (n, c, x = '') => { R.push(!!c); console.log(c ? 'PASS' : 'FAIL', n, x ? '— ' + String(x).slice(0, 300) : ''); };
const tok = fs.readFileSync(`${JARS}/a.cj`, 'utf8').split('\n').find((l) => l.includes('qa_s')).split('\t')[6].trim();
const ws = new WebSocket(B.replace('http', 'ws') + '/ws', { headers: { Cookie: 'qa_s=' + tok, Origin: B } }); let n = 0; const pend = new Map();
ws.on('message', (d) => { const m = JSON.parse(d); if (m.r && pend.has(m.r)) { pend.get(m.r)(m); pend.delete(m.r); } });
const req = (t, x = {}) => new Promise((res) => { const id = ++n; pend.set(id, res); ws.send(JSON.stringify({ id, t, ...x })); });
await new Promise((r) => ws.on('open', r));
const shop = await req('shop:get');
const bub = shop.items.filter((i) => i.id.startsWith('art-bub-')), bd = shop.items.filter((i) => i.id.startsWith('art-bd-'));
ok('20 فقاعة دردشة جديدة بالمتجر بالمجوهرات', bub.length === 20 && bub.every((i) => i.slot === 'chat-bubble' && i.currency === 'gems' && /^art\d\d$/.test(i.css)), bub.length);
ok('20 لوحة اسم جديدة بالمتجر بالمجوهرات', bd.length === 20 && bd.every((i) => i.slot === 'board' && i.currency === 'gems' && /^art\d\d$/.test(i.css)), bd.length);
ok('الفقاعات واللوحات القديمة باقية (ما انحذف شي)', ['lux-bub-gold', 'lux-bub-imperial', 'lux-board-gold', 'lux-board-inferno'].every((id) => shop.items.some((i) => i.id === id)));
const titles = shop.achievements.filter((a) => a.kind === 'title');
ok('15 لقب جديد مكتسب + الألقاب القديمة باقية', titles.filter((a) => /^ach-t-a\d\d$/.test(a.id)).length === 15 && ['ach-t-domino', 'ach-t-baloot', 'ach-t-emperor', 'ach-t-thrones', 'ach-t-rookie'].every((id) => titles.some((a) => a.id === id)), titles.length);
ok('اسم لقب الجاكارو صار مطابق للرسمة', titles.find((a) => a.id === 'ach-t-jackaro')?.name === 'ملك الجاكارو');
ok('شارة «تنين الكون» للبيع', shop.items.some((i) => i.id === 'art-b-20' && i.slot === 'badge' && i.currency === 'gems'));
const files = [...Array.from({ length: 20 }, (_, i) => `/assets/art58/bubbles/b${String(i + 1).padStart(2, '0')}.webp`), ...Array.from({ length: 20 }, (_, i) => `/assets/art58/boards/b${String(i + 1).padStart(2, '0')}.webp`), ...Array.from({ length: 20 }, (_, i) => `/assets/art58/titles/t${String(i + 1).padStart(2, '0')}.webp`), ...Array.from({ length: 20 }, (_, i) => `/assets/art58/badges/b${String(i + 1).padStart(2, '0')}.webp`), ...Array.from({ length: 20 }, (_, i) => `/assets/art58/idplates/p${String(i + 1).padStart(2, '0')}.webp`)];
const st = await Promise.all(files.map(async (f) => (await fetch(B + f)).status));
ok('كل ملفات الرسومات (100) موجودة', st.every((s) => s === 200), files.filter((_, i) => st[i] !== 200).join(','));
const css = await (await fetch(B + '/art58-r58l.css')).text();
ok('كل فقاعة ولوحة لها تنسيق برسمتها', Array.from({ length: 20 }, (_, i) => String(i + 1).padStart(2, '0')).every((k) => css.includes(`rp-bubble-art${k}`) && css.includes(`lux-board-art${k}`)));
const ref = await (await fetch(B + '/reference-assets.js')).text();
ok('كل الشارات المكتسبة والمتجر مربوطة برسومات المالك', ['ach-b-first', 'ach-b-win1', 'ach-b-10', 'ach-b-carrom', 'badge-star', 'badge2-crown'].every((id) => new RegExp(`"${id}": "art-b-\\d\\d"`).test(ref)));
// شراء وتجهيز فقاعة ولوحة جديدة (الأرخص غير المملوك)
const cheap = (list) => list.filter((i) => !shop.owned.includes(i.id)).sort((a, b) => a.price - b.price)[0];
for (const it of [cheap(bub), cheap(bd)].filter(Boolean)) {
  const before = (await req('shop:get')).gems; const b = await req('shop:buy', { item: it.id, key: randomUUID() }); const e = await req('shop:equip', { item: it.id });
  ok(`شراء وتجهيز ${it.name} (الخصم بالسعر بالضبط)`, b.ok !== false && before - b.gems === it.price && e.ok !== false && e.equipped[it.slot] === it.id, JSON.stringify({ err: b.error || e.error, before, after: b.gems, price: it.price }));
}
ws.close(); console.log(`\n${R.filter(Boolean).length}/${R.length} PASS`); process.exit(R.every(Boolean) ? 0 : 1);
