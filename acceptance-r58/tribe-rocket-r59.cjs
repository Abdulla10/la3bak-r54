// R59: صاروخ القبيلة وكنز القبيلة — الهيبة من هدايا حقيقية، الصاروخ كل 3 مليون، المهام، الصناديق، المتجر وحقيبة الوقود. خادم محلي فقط.
// الاستخدام: ADMIN_TOKEN=... NODE_PATH=$(npm root -g) node acceptance-r58/tribe-rocket-r59.cjs http://127.0.0.1:4104 <مجلد الكوكيز> <مجلد اللقطات>
const { chromium } = require('playwright'); const fs = require('fs'); const { randomUUID } = require('crypto');
const [B, JARS, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(B || '')) { console.error('محلي فقط'); process.exit(2); }
const jar = (u) => fs.readFileSync(`${JARS}/${u}.cj`, 'utf8').split('\n').find((l) => l.includes('qa_s')).split('\t')[6].trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const R = []; const ok = (n, c, x = '') => { R.push(!!c); console.log(c ? 'PASS' : 'FAIL', n, x ? '— ' + String(x).slice(0, 300) : ''); };
const H = (t) => ({ cookie: 'qa_s=' + t, Origin: B, 'Content-Type': 'application/json' });
const cmd = async (t, body) => (await (await fetch(B + '/api/social/command', { method: 'POST', headers: H(t), body: JSON.stringify({ key: randomUUID(), ...body }) })).json());
const detail = async (t, id) => (await (await fetch(B + '/api/social/rooms/' + id, { headers: H(t) })).json()).room;
const grant = async (t, amount) => { const me = await (await fetch(B + '/api/me', { headers: H(t) })).json(); for (let left = amount; left > 0; left -= 1_000_000) await fetch(B + `/api/admin/players/${me.user.id}/adjust`, { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.ADMIN_TOKEN, 'x-admin': '1', Origin: B, 'Content-Type': 'application/json' }, body: JSON.stringify({ cur: 'gems', delta: Math.min(left, 1_000_000), reason: 'رصيد اختبار محلي للمدفع', key: 'cn-' + randomUUID().slice(0, 12) }) }); };

const ledger = (t) => new Promise((res) => { const ws = new (require('ws'))(B.replace('http', 'ws') + '/ws', { headers: { Cookie: 'qa_s=' + t, Origin: B } }); ws.on('open', () => ws.send(JSON.stringify({ id: 1, t: 'shop:get' }))); ws.on('message', (d) => { const m = JSON.parse(d); if (m.r === 1) { res(m.ledger || []); ws.close(); } }); });
const shop = (t) => new Promise((res) => { const ws = new (require('ws'))(B.replace('http', 'ws') + '/ws', { headers: { Cookie: 'qa_s=' + t, Origin: B } }); ws.on('open', () => ws.send(JSON.stringify({ id: 1, t: 'shop:get' }))); ws.on('message', (d) => { const m = JSON.parse(d); if (m.r === 1) { res(m); ws.close(); } }); });
const post = async (t, u, b = {}) => (await fetch(B + u, { method: 'POST', headers: H(t), body: JSON.stringify(b) })).json().catch(() => ({}));
const get = async (t, u) => (await fetch(B + u, { headers: H(t) })).json();
async function sendRockets(pg, qty) {
  await pg.click('[aria-label="إرسال هدية"]'); await sleep(1500);
  await pg.click('[data-so-gifts] button:has-text("للاعب a")').catch(() => {}); await sleep(300);
  await pg.click('[data-so-gifts] button:has-text("صاروخ فضائي")'); await sleep(400);
  await pg.locator('[data-so-gifts] button', { hasText: new RegExp('^\\s*' + qty + '\\s*$') }).first().click({ timeout: 5000 }).catch(() => {}); await sleep(800);
  const send = await pg.$('[data-so-gifts] .so-gift-card.is-picked .so-gift-send-inline'); if (send) { await send.click(); await sleep(2500); }
  await pg.keyboard.press('Escape').catch(() => {}); await sleep(500);
}
(async () => {
  const A = jar('a'), Bt = jar('b'); const T0 = Date.now() - 1000;
  for (const t of [A, Bt]) { const m = await get(t, '/api/tribes/me'); if (m.tribe) await post(t, m.tribe.isLeader ? '/api/tribes/disband' : '/api/tribes/leave'); }
  const br = await chromium.launch(); const mk = async (t) => { const x = await br.newContext({ viewport: { width: 390, height: 844 } }); await x.addCookies([{ name: 'qa_s', value: t, url: B }]); const pg = await x.newPage(); pg.on('dialog', (d) => d.accept()); return pg; };
  const p = await mk(A), bp = await mk(Bt); const errs = []; for (const x of [p, bp]) x.on('pageerror', (e) => errs.push(e.message));
  let meA = await get(A, '/api/tribes/me'); let made = null;
  if (!meA.create.canCreate) {
    const r = await cmd(A, { command: 'room:create', name: 'غرفة القبيلة ' + Date.now().toString(36).slice(-3) }); made = r.roomId; await grant(Bt, 800_000);
    for (const pg of [p, bp]) { await pg.goto(B + '/#/social-room/' + made); await sleep(3000); const s = await pg.$('.so-seat-available'); if (s) { await s.click(); await sleep(1500); } }
    await sendRockets(bp, 7); await sleep(1500); meA = await get(A, '/api/tribes/me');
  }
  const c = await post(A, '/api/tribes/create', { name: 'صقور ' + Date.now().toString(36).slice(-4) }); const tid = c.tribe?.id ?? (await get(A, '/api/tribes/me')).tribe?.id;
  await post(Bt, `/api/tribes/${tid}/join`); const pubB = (await get(A, `/api/tribes/${tid}`)).tribe.requests[0]?.id; await post(A, `/api/tribes/${tid}/respond`, { user: pubB, accept: true });
  let tr = await get(Bt, '/api/tribes/treasure');
  ok('كنز القبيلة: صفر صواريخ، باقي 3,000,000 هيبة، الوجهة كوكب القمر', tr.ok && tr.rocket.count === 0 && tr.rocket.toNext === 3_000_000 && tr.rocket.nextPlanet.name === 'القمر', JSON.stringify(tr.rocket || tr));
  ok('5 مهام يومية، 4 صناديق وقود، ومتجر القبيلة (عملات وحقائب)', tr.tasks.length === 5 && tr.boxes.length === 4 && tr.shop.some((x) => x.kind === 'coins') && tr.shop.some((x) => x.kind === 'bag'));
  const room = tr.tribe.room; ok('غرفة القبيلة = غرفة القائد الأعلى ليفل', !!room && room.level >= 10, JSON.stringify(room));
  // الواجهة: صفحة القبيلة ثم «المهمة والمكافأة» ثم «سجّل»
  await bp.goto(B + '/#/profile'); await sleep(3000); await bp.click('[data-tr-open]'); await sleep(1500);
  const h = await bp.evaluate(() => ({ hero: !!document.querySelector('.tr59-hero img.is-hero'), pres: document.querySelectorAll('.tr59-pres div').length, task: !!document.querySelector('[data-tr="treasure"]'), room: !!document.querySelector('.tr59-room'), faces: document.querySelectorAll('.tr59-faces .tr58-face').length }));
  ok('صفحة القبيلة مثل الفيديو: الشعار، الهيبة اليومية والأسبوعية، «المهمة والمكافأة»، غرفة القبيلة، الأعضاء', h.hero && h.pres === 2 && h.task && h.room && h.faces === 2, JSON.stringify(h));
  await bp.screenshot({ path: `${OUT}/tribe-home.png` });
  await bp.click('[data-tr="treasure"]'); await sleep(1500);
  ok('صفحة كنز القبيلة: الصاروخ وعداده والتبويبات الثلاث', await bp.evaluate(() => !!document.querySelector('.tr59-rocket img.is-hero') && !!document.querySelector('.tr59-count') && document.querySelectorAll('.tr59-tabs button').length === 3));
  const pre = tr.me, preDone = tr.tasks.find((x) => x.id === 'checkin').done;
  if (!preDone) { await bp.click('[data-tr="task"][data-id="checkin"]'); await sleep(1500); }
  tr = await get(Bt, '/api/tribes/treasure'); const ci = preDone ? 0 : 5;
  ok('تسجيل الحضور: +5 وقود و+5 هيبة، ومكتوب «التحديث غدًا»' + (preDone ? ' (انسجل اليوم من تشغيل سابق)' : ''), tr.me.fuel === pre.fuel + ci && tr.me.dayPts === pre.dayPts + ci && tr.tasks.find((x) => x.id === 'checkin').done && tr.tribe.weekPts === ci, JSON.stringify(tr.me));
  const boxDone = tr.boxes[0].claimed;
  const again = await post(Bt, '/api/tribes/treasure/task', { id: 'checkin' }); ok('ما تقدر تسجل مرتين باليوم', again.ok === false && again.code === 'done');
  const inRoom = await (async () => { const r = await get(Bt, '/api/tribes/treasure'); return r; })();
  const stay = await post(Bt, '/api/tribes/treasure/task', { id: 'stay' }); ok('مهمة «ابقَ 5 دقايق»: الخادم يتحقق من الحضور بغرفة القبيلة (ترفض إذا أقل من 5 دقايق، أو تنحسب مرة وحدة باليوم)', (stay.ok === false && ['stay', 'done'].includes(stay.code)) || (stay.ok && stay.tasks.find((x) => x.id === 'stay').done), JSON.stringify(stay.code || 'ok'));
  const base = await get(Bt, '/api/tribes/treasure'); const f0 = base.me.fuel, w0 = base.tribe.weekPts;
  await bp.screenshot({ path: `${OUT}/tribe-treasure.png` });
  // هدايا حقيقية بغرفة القبيلة: 5 × 7 صواريخ = 3.5 مليون → صاروخ واحد
  await grant(Bt, 3_600_000); const sb0 = await shop(Bt);
  for (const pg of [p, bp]) { await pg.goto(B + '/#/social-room/' + room.id); await sleep(3000); const s = await pg.$('.so-seat-available'); if (s) { await s.click(); await sleep(1500); } }
  let launched = false; await p.evaluate(() => { window.__tl = ''; new MutationObserver(() => { const n = document.querySelector('.rk58-launch'); if (n && /صاروخ القبيلة/.test(n.textContent)) window.__tl = n.textContent; }).observe(document.body, { childList: true, subtree: true }); });
  for (let k = 0; k < 5; k++) { await sendRockets(bp, 7); await sleep(1200); }
  for (let i = 0; i < 30 && !launched; i++) { await sleep(200); launched = await p.evaluate(() => !!window.__tl); }
  await sleep(2500); await p.screenshot({ path: `${OUT}/tribe-launch.png` });
  tr = await get(Bt, '/api/tribes/treasure');
  ok('3.5 مليون هيبة (داخل غرفة القبيلة كاملة): انطلق صاروخ واحد والباقي صح', tr.rocket.count === 1 && tr.tribe.weekPts === w0 + 3_500_000 && tr.rocket.toNext === 6_000_000 - tr.tribe.weekPts, JSON.stringify({ c: tr.rocket.count, n: tr.rocket.toNext, w: tr.tribe.weekPts }));
  ok('الوقود من الهدايا: 16 لكل 200 جوهرة (+280,000) والثروة 1 لكل 100', tr.me.fuel === f0 + 280_000 && tr.tribe.wealth === 35_000, JSON.stringify({ f: tr.me.fuel, w: tr.tribe.wealth }));
  ok('إشعار «تم إطلاق صاروخ القبيلة» طلع لعضو القبيلة', launched);
  const sb1 = await shop(Bt); const g1 = sb1.ledger.filter((e) => e.cur === 'gems' && (e.ts ?? 0) >= T0 && /صاروخ القبيلة 1: كوكب القمر — المركز 1/.test(e.reason || '')).reduce((n, e) => n + e.delta, 0);
  ok('أكبر مساهم بالصاروخ ياخذ جوايز كوكب القمر: 2,000 جوهرة + تذكار الهلال', g1 === 2000 && sb1.owned.includes('souv-12'), g1);
  ok('الصاروخ يطلع بقائمة الإطلاقات باسم الفايز', tr.rocket.launches[0]?.winners?.[0]?.name === 'لاعب b');
  // الصندوق، المتجر، الحقيبة
  const bx = await post(Bt, '/api/tribes/treasure/box', { level: 1 }); const bf = boxDone ? 0 : 50; ok('صندوق Lv1 انفتح (هيبة القبيلة فوق مليون) واستلمه: +50 وقود' + (boxDone ? ' (استلمه هالأسبوع من تشغيل سابق)' : ''), boxDone ? bx.code === 'claimed' : bx.ok && bx.me.fuel === f0 + 280_050, JSON.stringify(bx.me || bx));
  const bx2 = await post(Bt, '/api/tribes/treasure/box', { level: 1 }); ok('ما يستلم نفس الصندوق مرتين بالأسبوع', bx2.ok === false && bx2.code === 'claimed');
  const bx3 = await post(Bt, '/api/tribes/treasure/box', { level: 2 }); ok('صندوق Lv2 مقفول (يحتاج 5 مليون)', bx3.ok === false && bx3.code === 'box');
  const by = await post(Bt, '/api/tribes/treasure/buy', { item: 'coins-3000' }); await sleep(500); const sb2 = await shop(Bt);
  const cc = sb2.ledger.filter((e) => e.cur === 'coins' && (e.ts ?? 0) >= T0 && e.reason === 'متجر القبيلة: عملات ذهبية').reduce((n, e) => n + e.delta, 0);
  ok('تبديل 3,000 وقود بـ3,000 عملة ذهبية (بسجل المحفظة)', by.ok && by.me.fuel === f0 + 277_000 + bf && cc === 3000, JSON.stringify({ f: by.me?.fuel, cc }));
  const bg = await post(Bt, '/api/tribes/treasure/buy', { item: 'bag-luck' }); ok('شراء حقيبة حظ الوقود (1,000 وقود) تنحط بحقيبة القبيلة', bg.ok && bg.me.bag['bag-luck'] === 1 && bg.me.fuel === f0 + 276_000 + bf);
  const fa0 = (await get(A, '/api/tribes/treasure')).me.fuel;
  const sd = await post(Bt, '/api/tribes/treasure/send-bag', { bag: 'bag-luck' }); const fa1 = (await get(A, '/api/tribes/treasure')).me.fuel;
  ok('إرسال الحقيبة: كل عضو ثاني ياخذ نصيبه (a أخذ 1,200)', sd.ok && fa1 - fa0 === 1200 && !sd.me.bag['bag-luck'], JSON.stringify({ fa0, fa1, s: sd.sent }));
  const poor = await post(A, '/api/tribes/treasure/buy', { item: 'coins-30000' }); ok('ما تقدر تشتري بوقود ما يكفي', poor.ok === false && poor.code === 'fuel');
  ok('ما فيه أخطاء صفحة', errs.length === 0, errs.join(' | '));
  await post(A, '/api/tribes/disband'); if (made) await cmd(A, { command: 'room:delete', roomId: made });
  await br.close(); console.log(`\nSUMMARY pass ${R.filter(Boolean).length} fail ${R.filter((x) => !x).length}`); process.exit(R.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
