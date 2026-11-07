// R52: إعداد اختبار محلي فقط لصفحتي VIP ونوبل، عبر واجهات الإدارة الحقيقية على خادم محلي ببيانات مؤقتة.
// ممنوع تشغيله على الإنتاج: يرفض أي عنوان غير 127.0.0.1/localhost. القيم هنا للاختبار وليست اقتراح أسعار أو حدود معتمدة.
// الاستخدام: ADMIN_TOKEN=... node acceptance-r52/seed-local.mjs http://127.0.0.1:4102 <معرّف حساب الاختبار>
const [B, PLAYER] = process.argv.slice(2);
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(B || '')) { console.error('محلي فقط'); process.exit(2); }
const H = { Authorization: 'Bearer ' + process.env.ADMIN_TOKEN, 'x-admin': '1', 'Content-Type': 'application/json', Origin: B };
let n = 0; const key = () => `r52-seed-${Date.now()}-${++n}`;
async function call(path, method, body) {
  const r = await fetch(B + path, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${t.slice(0, 300)}`); return t ? JSON.parse(t) : {};
}
// 1) حدود VIP (15) ونوبل (9) + أسماء مستويات نوبل
await call('/api/admin/progression', 'POST', { reason: 'إعداد اختبار محلي R52', key: key(),
  vip: { enabled: true, thresholds: [100, 300, 800, 2000, 5000, 10000, 20000, 40000, 80000, 500000, 800000, 1200000, 1800000, 2600000, 4000000] },
  noble: { enabled: true, thresholds: [10000, 20000, 40000, 100000, 200000, 500000, 1000000, 2000000, 4000000],
    levels: ['فارس', 'بارون', 'فيكونت', 'إيرل', 'ماركيز', 'دوق', 'أمير', 'ملك', 'إمبراطور'].map((name, i) => ({ rank: i + 1, name, artwork: null, color: null, rarity: null })) } });
// 2) عناصر متجر مشروطة برتب (minVip / minNoble) — عناصر موجودة أصلاً بالكتالوج
const req = { 'ref-p-frame-01': { minVip: 1 }, 'ref-p-frame-05': { minVip: 3 }, 'ref-p-frame-08': { minVip: 10 }, 'entrance-sport': { minVip: 12 },
  'ref-p-frame-03': { minNoble: 2 }, 'entrance-royal': { minNoble: 4 }, 'ref-p-frame-06': { minNoble: 7 }, 'ref-p-frame-02': { minNoble: 9 } };
for (const [id, v] of Object.entries(req)) await call('/api/admin/shop/items/' + id, 'PUT', v);
// 3) مكافآت رتب نوبل وVIP
await call('/api/admin/rank-rewards', 'POST', { reason: 'إعداد اختبار محلي R52', key: key(), policies: [
  { system: 'noble', rank: 1, rewards: [{ type: 'item', itemId: 'ref-p-frame-04', mode: 'grant' }, { type: 'currency', cur: 'coins', amount: 500 }] },
  { system: 'noble', rank: 2, rewards: [{ type: 'item', itemId: 'ref-p-frame-07', mode: 'grant' }] },
  { system: 'noble', rank: 3, rewards: [{ type: 'item', itemId: 'ref-p-frame-09', mode: 'grant' }, { type: 'currency', cur: 'gems', amount: 50 }] },
  { system: 'vip', rank: 2, rewards: [{ type: 'currency', cur: 'coins', amount: 1000 }] },
  { system: 'vip', rank: 11, rewards: [{ type: 'item', itemId: 'ref-p-frame-12', mode: 'grant' }] } ] });
// 4) عضوية VIP: باقات ومزايا مربوطة بعناصر الكتالوج
await call('/api/admin/vip-membership/config', 'POST', { reason: 'إعداد اختبار محلي R52', key: key(), config: { enabled: true,
  packages: [{ id: 'vip-month', name: 'VIP شهري', points: 5000, durationDays: 30, price: { cur: 'gems', amount: 300 }, approved: true, enabled: true },
    { id: 'vip-season', name: 'VIP موسمي', points: 20000, durationDays: 90, price: { cur: 'gems', amount: 900 }, approved: true, enabled: true }],
  benefits: [{ id: 'vip-frame-gold', name: 'إطار الصورة الرمزية الحصري', description: 'إطار ذهبي حصري لأعضاء VIP.', level: 1, artwork: '', itemId: 'ref-p-frame-10', requiresActive: true },
    { id: 'vip-frame-royal', name: 'إطار بطاقة الملف الحصرية', description: 'إطار ملكي يظهر على بطاقة ملفك.', level: 2, artwork: '', itemId: 'ref-p-frame-11', requiresActive: true },
    { id: 'vip-frame-diamond', name: 'إطار الماس', description: 'إطار الماس لكبار الأعضاء.', level: 13, artwork: '', itemId: 'ref-p-frame-13', requiresActive: true }],
  policy: { renewal: 'preserve-active-expiry', expiry: 'retain-lifetime-xp', warningsDays: [7, 1] } } });
// 5) نقاط لحساب الاختبار (منح إداري محلي) — VIP9 تقريباً مثل فيديو المرجع، ونوبل N2
if (PLAYER) {
  await call(`/api/admin/progression/${PLAYER}/grant`, 'POST', { system: 'vip', points: 186844, ref: 'r52-seed-vip', reason: 'اختبار محلي R52' });
  await call(`/api/admin/progression/${PLAYER}/grant`, 'POST', { system: 'noble', points: 25285, ref: 'r52-seed-noble', reason: 'اختبار محلي R52' });
}
console.log('seeded');
