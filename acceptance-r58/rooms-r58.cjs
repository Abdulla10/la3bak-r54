// R58: أيدي الغرفة 8 أرقام، أيدي غرفة مميز، ليفل الغرفة من الهدايا، الإعلانات (10) والمراجعة التلقائية — خادم محلي فقط.
// الاستخدام: ADMIN_TOKEN=... NODE_PATH=$(npm root -g) node acceptance-r58/rooms-r58.cjs http://127.0.0.1:4104 <مجلد الكوكيز> <مجلد اللقطات>
const { chromium } = require('playwright'); const fs = require('fs'); const { randomUUID } = require('crypto');
const [B, JARS, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(B || '')) { console.error('محلي فقط'); process.exit(2); }
const jar = (u) => fs.readFileSync(`${JARS}/${u}.cj`, 'utf8').split('\n').find((l) => l.includes('qa_s')).split('\t')[6].trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const R = []; const ok = (n, c, x = '') => { R.push(!!c); console.log(c ? 'PASS' : 'FAIL', n, x ? '— ' + String(x).slice(0, 300) : ''); };
const H = (t) => ({ cookie: 'qa_s=' + t, Origin: B, 'Content-Type': 'application/json' });
const cmd = async (t, body) => { const r = await fetch(B + '/api/social/command', { method: 'POST', headers: H(t), body: JSON.stringify({ key: randomUUID(), ...body }) }); return { status: r.status, j: await r.json().catch(() => ({})) }; };
const detail = async (t, id) => (await (await fetch(B + '/api/social/rooms/' + id, { headers: H(t) })).json()).room;
(async () => {
  const A = jar('a'), Bt = jar('b');
  await cmd(A, { command: 'prefs:update', adultAcknowledged: true });
  // مراجعة تلقائية لاسم الغرفة
  const bad1 = await cmd(A, { command: 'room:create', name: 'تواصل 0501234567' });
  ok('اسم غرفة فيه رقم جوال ينرفض فورًا', bad1.status === 422 && bad1.j.error === 'moderation_contact', JSON.stringify(bad1));
  const bad2 = await cmd(A, { command: 'room:create', name: 'غرفة الإدارة الرسمية admin' });
  ok('اسم يوحي بالإدارة ينرفض', bad2.status === 422 && bad2.j.error === 'moderation_impersonation', JSON.stringify(bad2));
  const mk = await cmd(A, { command: 'room:create', name: 'غرفة R58 ' + Date.now().toString(36).slice(-4) });
  ok('اسم سليم ينقبل فورًا (بدون انتظار موافقة يدوية)', mk.status === 200 && mk.j.roomId, JSON.stringify(mk));
  const id = mk.j.roomId; let room = await detail(A, id);
  ok('للغرفة أيدي من 8 أرقام', /^[1-9][0-9]{7}$/.test(room.code || ''), room.code);
  ok('ليفل الغرفة يبدأ من 1', room.level === 1 && room.support === 0, JSON.stringify({ l: room.level, s: room.support }));
  // الإعلانات
  const ads = Array.from({ length: 10 }, (_, i) => `إعلان رقم ${i + 1} — أهلًا بالجميع`);
  const a1 = await cmd(A, { command: 'room:ads', roomId: id, ads });
  room = await detail(A, id);
  ok('10 إعلانات تنحفظ', a1.status === 200 && room.ads.length === 10, JSON.stringify(a1));
  const a2 = await cmd(A, { command: 'room:ads', roomId: id, ads: [...ads, 'الحادي عشر'] });
  ok('أكثر من 10 إعلانات ينرفض', a2.status >= 400, String(a2.status));
  const a3 = await cmd(A, { command: 'room:ads', roomId: id, ads: ['زورونا على www.example.com'] });
  ok('إعلان فيه رابط ينرفض', a3.status === 422 && a3.j.error === 'moderation_link', JSON.stringify(a3));
  const a4 = await cmd(A, { command: 'room:ads', roomId: id, ads: ['يا شرموطه'] });
  ok('إعلان فيه كلام مسيء ينرفض', a4.status === 422, JSON.stringify(a4));
  const a5 = await cmd(Bt, { command: 'room:ads', roomId: id, ads: ['اعلان من غريب'] });
  ok('غير المخوّل ما يقدر يغيّر الإعلانات', a5.status >= 400, String(a5.status));
  // اسم الملف الشخصي
  const nm = await fetch(B + '/api/account', { method: 'PATCH', headers: H(Bt), body: JSON.stringify({ name: 'الدعم الفني' }) });
  ok('اسم ملف شخصي ينتحل الإدارة ينرفض', nm.status === 400, String(nm.status));
  // أيدي غرفة مميز: شراء ثم تطبيق
  const me = await (await fetch(B + '/api/me', { headers: H(A) })).json();
  // أيدي الغرفة من 45 مليون جوهرة: الإدارة تمنح مليون كحد أقصى بالعملية، فنقسم الرصيد التجريبي (محلي فقط)
  for (let i = 0; i < 46; i++) await fetch(B + `/api/admin/players/${me.user.id}/adjust`, { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.ADMIN_TOKEN, 'x-admin': '1', Origin: B, 'Content-Type': 'application/json' }, body: JSON.stringify({ cur: 'gems', delta: 1_000_000, reason: 'رصيد اختبار محلي R58', key: 'r58-' + randomUUID().slice(0, 12) }) });
  const meB = await (await fetch(B + '/api/me', { headers: H(Bt) })).json();
  await fetch(B + `/api/admin/players/${meB.user.id}/adjust`, { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.ADMIN_TOKEN, 'x-admin': '1', Origin: B, 'Content-Type': 'application/json' }, body: JSON.stringify({ cur: 'gems', delta: 10000, reason: 'رصيد اختبار محلي R58', key: 'r58b-' + randomUUID().slice(0, 12) }) });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ar' });
  await ctx.addCookies([{ name: 'qa_s', value: A, domain: '127.0.0.1', path: '/' }]);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '/#/shop'); await sleep(3500);
  await p.click('[data-act=shop-tab][data-v="room-id"]'); await sleep(1200);
  const rids = await p.evaluate(() => document.querySelectorAll('.r23-product[data-slot="room-id"]').length);
  ok('قسم «أيدي الغرف» بالمتجر فيه أرقام', rids >= 10, String(rids));
  await p.screenshot({ path: `${OUT}/store-room-ids-390.png` });
  const ws = await p.evaluate(async () => { const res = await fetch('/api/room-ids/mine'); return res.json(); });
  // الشراء عبر WebSocket الصفحة نفسها (نفس مسار زر الشراء)
  const bought = await p.evaluate(async () => new Promise((resolve) => { const w = new WebSocket(location.origin.replace('http', 'ws') + '/ws'); w.onopen = () => w.send(JSON.stringify({ id: 1, t: 'shop:get' })); w.onmessage = (e) => { const m = JSON.parse(e.data); if (m.r === 1) { const it = m.items.find((i) => i.slot === 'room-id' && i.price <= 45_000_000 && !m.owned.includes(i.id)); if (!it) { resolve({ ok: false, error: 'no_room_id_item' }); w.close(); return; } w.send(JSON.stringify({ id: 2, t: 'shop:buy', item: it.id, key: crypto.randomUUID() })); } if (m.r === 2) { resolve({ ok: m.ok, owned: m.owned?.filter((x) => x.startsWith('rid-')), error: m.error }); w.close(); } }; }));
  ok('شراء أيدي غرفة مميز', bought.ok && bought.owned.length >= 1, JSON.stringify(bought));
  const mine = await (await fetch(B + '/api/room-ids/mine', { headers: H(A) })).json();
  // نجرب الأرقام المملوكة لين نلقى واحد مو مطبّق على غرفة ثانية (من تشغيلات سابقة)
  let v = { status: 0 }, pick = mine.items[0]; for (const it of mine.items) { v = await cmd(A, { command: 'room:vanity', roomId: id, itemId: it.id }); if (v.status === 200) { pick = it; break; } }
  room = await detail(A, id);
  ok('صاحب الغرفة يطبّق الأيدي المميز وتصير هي رقم الغرفة', v.status === 200 && room.code === pick.code && room.vanity === true, JSON.stringify({ s: v.status, code: room.code }));
  const vb = await cmd(Bt, { command: 'room:vanity', roomId: id, itemId: mine.items[0].id });
  ok('غير المالك ما يقدر يغيّر أيدي الغرفة', vb.status === 403, String(vb.status));
  // البحث بالأيدي يلقى الغرفة
  await p.goto(B + '/#/social-rooms'); await sleep(2500);
  await p.click('[data-so-action="directory-search"]'); await sleep(400);
  await p.fill('[data-so-directory-query]', room.code); await sleep(800);
  ok('البحث برقم الغرفة يلقاها', await p.evaluate((n) => document.body.innerText.includes(n), room.name));
  // الغرفة: الإعلانات المتحركة + ليفل + الرقم
  await p.goto(B + '/#/social-room/' + id); await sleep(3500);
  const hdr = await p.evaluate(() => ({ ads: document.querySelectorAll('.so-ads-track span').length, id: document.querySelector('.so-room-id')?.textContent, lv: document.querySelector('.so-room-header .rl-chip')?.textContent }));
  ok('رأس الغرفة يعرض الرقم والليفل والإعلانات المتحركة', hdr.ads >= 10 && hdr.id.includes(room.code) && /Lv 1/.test(hdr.lv), JSON.stringify(hdr));
  await p.screenshot({ path: `${OUT}/room-header-390.png` });
  // ليفل الغرفة يرتفع بالهدايا: b يدخل ويرسل هدية لـ a
  const bctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ar' });
  await bctx.addCookies([{ name: 'qa_s', value: Bt, domain: '127.0.0.1', path: '/' }]);
  const bp = await bctx.newPage();
  await bp.goto(B + '/#/social-room/' + id); await sleep(3500);
  const seat = await p.$('.so-seat-available'); if (seat) { await seat.click(); await sleep(1500); }
  const s2 = await bp.$('.so-seat-available'); if (s2) { await s2.click(); await sleep(1500); }
  await bp.click('[aria-label="إرسال هدية"]'); await sleep(1500);
  await bp.click('[data-so-gifts] button:has-text("للاعب a")').catch(() => {}); await sleep(300);
  await bp.click('[data-so-gifts] button:has-text("وردة")'); await sleep(300);
  // كمية 77 وردة (7,700 جوهرة) عشان نوصل الرتبة الذهبية بالشهر
  const q77 = await bp.$$('[data-so-gifts] button'); for (const q of q77) { if ((await q.textContent()).trim() === '77') { await q.click(); break; } } await sleep(300);
  const send = await bp.$('[data-so-gifts] button:has-text("إرسال"):not([disabled])');
  if (send) { await send.click(); await sleep(2500); }
  room = await detail(A, id);
  ok('دعم الغرفة يزيد بقيمة الهدية', room.support >= 100, String(room.support));
  // R58c: رتبة الغرفة الشهرية
  ok('نقاط رتبة الشهر = قيمة الهدايا، والرتبة ذهبية', room.rank && room.rank.pts === room.support && room.rank.tier === 'gold' && /^\d{4}-\d{2}$/.test(room.rank.month), JSON.stringify(room.rank));
  ok('أداة بيانات الغرفة للمالك فقط', room.rankStats && room.rankStats.gifts >= 1 && room.rankStats.top.length >= 1 && (await detail(Bt, id)).rankStats === null, JSON.stringify(room.rankStats).slice(0, 200));
  for (const w of [360, 390, 440]) {
    await p.setViewportSize({ width: w, height: 844 });
    await p.goto(B + '/#/social-room/' + id); await sleep(3500);
    const chip = await p.$('.so-room-header .rr-chip-gold');
    ok(`${w}: شارة رتبة الغرفة برأس الغرفة`, !!chip);
    await p.click('.so-room-header [data-so-action="rank-open"]'); await sleep(900);
    const pg = await p.evaluate(() => { const r = document.querySelector('.rr-page'); if (!r) return null; return { tier: r.dataset.rrTier, perks: r.querySelectorAll('.rr-perk').length, open: r.querySelectorAll('.rr-perk:not(.is-locked)').length, title: r.querySelector('.rr-hero h2')?.textContent, stats: !!r.querySelector('.rr-stats'), overflow: document.documentElement.scrollWidth > innerWidth + 1 }; });
    ok(`${w}: صفحة رتبة الغرفة: ذهبية، 10 امتيازات، 3 مفتوحة، وبيانات الغرفة`, pg && pg.tier === 'gold' && pg.perks === 10 && pg.open === 3 && pg.title === 'ذهبية' && pg.stats && !pg.overflow, JSON.stringify(pg));
    await p.screenshot({ path: `${OUT}/room-rank-${w}.png` });
    await p.click('.rr-stop:has-text("أسطورية")'); await sleep(500);
    const lg = await p.evaluate(() => ({ t: document.querySelector('.rr-hero h2')?.textContent, open: document.querySelectorAll('.rr-perk:not(.is-locked)').length }));
    ok(`${w}: تقليب الرتب: الأسطورية فيها 10 امتيازات`, lg.t === 'أسطورية' && lg.open === 10, JSON.stringify(lg));
    if (w === 390) await p.screenshot({ path: `${OUT}/room-rank-legend-390.png` });
    await p.click('[data-so-action="rank-tab"][data-id="monthly"]'); await sleep(400);
    ok(`${w}: تبويب المكافأة الشهرية فيه جدول الرتب الخمس`, await p.evaluate(() => document.querySelectorAll('.rr-monthly tbody tr').length === 5));
    if (w === 390) await p.screenshot({ path: `${OUT}/room-rank-monthly-390.png` });
    await p.click('[data-so-action="rank-close"]'); await sleep(500);
    ok(`${w}: زر الرجوع يسكّر صفحة الرتبة ويرجع للغرفة`, await p.evaluate(() => !document.querySelector('.rr-page') && !!document.querySelector('.so-room-header')));
  }
  await p.setViewportSize({ width: 390, height: 844 });
  // أيقونة الهدية بالشريط: نتأكد إن الرسمة تتلوّن (مو مربع أسود) لما يكون عضوين بالغرفة
  const giftIcon = await bp.evaluate(() => { const svg = document.querySelector('[aria-label="إرسال هدية"] svg'); if (!svg) return null; const ids = [...svg.querySelectorAll('[id]')].map((e) => e.id); return { ids, unique: ids.every((i) => document.querySelectorAll('#' + CSS.escape(i)).length === 1) }; });
  ok('أيقونة الهدية بالشريط: معرّفات تدرّج فريدة (ما تطلع مربع أسود)', giftIcon && giftIcon.ids.length === 3 && giftIcon.unique, JSON.stringify(giftIcon));
  const gb = await bp.$('[aria-label="إرسال هدية"]'); if (gb) await gb.screenshot({ path: `${OUT}/gift-icon.png` });
  // قائمة الغرف: شارة الرتبة على بطاقة الغرفة
  await p.goto(B + '/#/social-rooms'); await sleep(3000);
  ok('بطاقة الغرفة بالقائمة تعرض شارة الرتبة', await p.evaluate((rid) => !!document.querySelector(`[data-so-directory-room="${rid}"] .rr-chip-gold`), id));
  // حذف
  await cmd(A, { command: 'room:delete', roomId: id });
  ok('بلا أخطاء صفحة', errs.length === 0, errs.join(' | '));
  await browser.close();
  console.log('SUMMARY pass', R.filter(Boolean).length, 'fail', R.filter((x) => !x).length);
})().catch((e) => { console.error('ERR', e); process.exit(1); });
