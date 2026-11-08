// R58x: القبائل — شرط ليفل الغرفة 10، الإنشاء، الانضمام، النقاط من الهدايا، الترتيب، الطرد والخروج والحل. خادم محلي فقط.
// الاستخدام: ADMIN_TOKEN=... NODE_PATH=$(npm root -g) node acceptance-r58/tribes-r58.cjs http://127.0.0.1:4104 <مجلد الكوكيز> <مجلد اللقطات>
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
const rocketCoins = (l, stage, kind) => l.filter((e) => e.reason === (kind === 'top' ? `صاروخ الغرفة: أكبر داعم بالمرحلة ${stage}` : `صاروخ الغرفة: المرحلة ${stage}`)).reduce((n, e) => n + e.delta, 0);
async function sendRockets(bp, qty) {
  await bp.click('[aria-label="إرسال هدية"]'); await sleep(1500);
  await bp.click('[data-so-gifts] button:has-text("للاعب a")').catch(() => {}); await sleep(300);
  await bp.click('[data-so-gifts] button:has-text("صاروخ فضائي")'); await sleep(400);
  for (const q of await bp.$$('[data-so-gifts] button')) { if ((await q.textContent()).trim() === String(qty)) { await q.click(); break; } } await sleep(800);
  const send = await bp.$('[data-so-gifts] button:has-text("إرسال"):not([disabled])'); if (send) { await send.click(); await sleep(1500); }
  const conf = await bp.$('[data-so-gifts] button:has-text("تأكيد"):not([disabled]), [data-so-gifts] [data-so-gift-action="confirm"]'); if (conf) { await conf.click(); await sleep(1500); }
  await bp.keyboard.press('Escape').catch(() => {}); await sleep(500);
}

const post = async (t, u, b = {}) => (await fetch(B + u, { method: 'POST', headers: H(t), body: JSON.stringify(b) })).json().catch(() => ({}));
const get = async (t, u) => (await fetch(B + u, { headers: H(t) })).json();
(async () => {
  const A = jar('a'), Bt = jar('b');
  // تنظيف قبائل سابقة لحسابات الاختبار
  for (const t of [A, Bt]) { const m = await get(t, '/api/tribes/me'); if (m.tribe) await post(t, m.tribe.isLeader ? '/api/tribes/disband' : '/api/tribes/leave'); }
  const meB = await get(Bt, '/api/tribes/me');
  ok('بدون غرفة ليفل 10: الإنشاء مقفول', meB.ok && meB.create && meB.create.canCreate === false && meB.create.need === 10, JSON.stringify(meB.create));
  const cB = await post(Bt, '/api/tribes/create', { name: 'قبيلة ممنوعة' }); ok('الخادم يرفض الإنشاء بدون ليفل 10', cB.ok === false && cB.code === 'room_level', JSON.stringify(cB));
  // غرفة a توصل ليفل 10 بهدايا حقيقية (7 صواريخ = 700 ألف)
  let meA = await get(A, '/api/tribes/me'); let id = null;
  const br = await chromium.launch(); const mk = async (t) => { const x = await br.newContext({ viewport: { width: 390, height: 844 } }); await x.addCookies([{ name: 'qa_s', value: t, url: B }]); const pg = await x.newPage(); pg.on('dialog', (d) => d.accept()); return pg; };
  const p = await mk(A), bp = await mk(Bt); const errs = []; for (const x of [p, bp]) x.on('pageerror', (e) => errs.push(e.message));
  if (!meA.create.canCreate) {
    const r = await cmd(A, { command: 'room:create', name: 'غرفة القبيلة ' + Date.now().toString(36).slice(-3) }); id = r.roomId; await grant(Bt, 800_000);
    await p.goto(B + '/#/social-room/' + id); await sleep(3000); const s1 = await p.$('.so-seat-available'); if (s1) { await s1.click(); await sleep(1500); }
    await bp.goto(B + '/#/social-room/' + id); await sleep(3000); const s2 = await bp.$('.so-seat-available'); if (s2) { await s2.click(); await sleep(1500); }
    await sendRockets(bp, 7); await sleep(1500); meA = await get(A, '/api/tribes/me');
  }
  ok('غرفة a وصلت ليفل 10 فصار يقدر يفتح قبيلة', meA.create.roomLevel >= 10 && meA.create.canCreate, JSON.stringify(meA.create));
  const bad = await post(A, '/api/tribes/create', { name: 'تواصل 0501234567' }); ok('اسم فيه رقم جوال ينرفض', bad.ok === false, JSON.stringify(bad));
  // الإنشاء من الواجهة
  await p.goto(B + '/#/profile'); await sleep(3000);
  ok('بطاقة القبائل بملفك', await p.evaluate(() => /تقدر تفتح قبيلتك/.test(document.querySelector('[data-tribe-me]')?.textContent || '')));
  await p.click('[data-tr-open]'); await sleep(800); await p.click('[data-tr-tab="create"]'); await sleep(400);
  await p.fill('[data-tr-name]', 'فرسان الاختبار'); await p.click('[data-tr="create"]'); await sleep(1500);
  meA = await get(A, '/api/tribes/me'); const tid = meA.tribe?.id;
  ok('القبيلة انفتحت: Lv1، عضو واحد، القائد a', meA.tribe && meA.tribe.name === 'فرسان الاختبار' && meA.tribe.level === 1 && meA.tribe.members === 1 && meA.tribe.isLeader, JSON.stringify(meA.tribe).slice(0, 200));
  await p.screenshot({ path: `${OUT}/tribe-created.png` });
  const dup = await post(Bt, '/api/tribes/create', { name: 'فرسان الاختبار' }); ok('ما يقدر أحد ثاني ينشئ (شرط الليفل) ولا يتكرر الاسم', dup.ok === false);
  // b يطلب الانضمام، a يقبل من الواجهة
  const j = await post(Bt, `/api/tribes/${tid}/join`); ok('b يطلب الانضمام', j.ok, JSON.stringify(j));
  await sleep(800); await p.evaluate(() => document.querySelector('[data-tr-tab="mine"]')?.click()); await sleep(1500);
  const acc = await p.$('[data-tr="accept"]'); ok('القائد يشوف الطلب بقبيلته', !!acc); if (acc) { await acc.click(); await sleep(1500); }
  let t = (await get(A, `/api/tribes/${tid}`)).tribe; ok('b صار عضو (عضوين)', t.members === 2 && t.list.some((m) => m.name === 'لاعب b'), JSON.stringify(t.list.map((m) => m.name)));
  // هدية من b ترفع نقاط القبيلة والشهر
  if (id) { await sendRockets(bp, 1); await sleep(1500); }
  t = (await get(A, `/api/tribes/${tid}`)).tribe;
  ok('هدية العضو (100 ألف) ترفع نقاط القبيلة والشهر ونقاط العضو', t.pts === 100000 && t.monthPts === 100000 && t.list.find((m) => m.name === 'لاعب b')?.pts === 100000, JSON.stringify({ p: t.pts, m: t.monthPts }));
  const top = await get(Bt, '/api/tribes/top'); ok('القبيلة تطلع بترتيب القبائل', top.list.some((x) => x.id === tid && x.monthPts === 100000));
  await p.screenshot({ path: `${OUT}/tribe-detail.png` });
  // شارة القبيلة بملف b عند غيره
  const pubB = (await get(A, '/api/friends/live')).list.find((f) => f.name === 'لاعب b')?.id;
  await p.evaluate(() => document.querySelector('.tr58-sheet')?.remove()); await p.goto(B + '/#/u/' + pubB); await sleep(3500);
  ok('شارة القبيلة بملف العضو', await p.evaluate(() => /فرسان الاختبار/.test(document.querySelector('.tr58-of')?.textContent || '')));
  await p.screenshot({ path: `${OUT}/tribe-chip.png` });
  await p.click('.tr58-chip'); await sleep(1500); await p.evaluate(() => document.querySelector('[data-tr-tab="top"]')?.click()); await sleep(1500); await p.screenshot({ path: `${OUT}/tribe-top.png` });
  // الطرد ثم الحل
  const kk = await post(A, `/api/tribes/${tid}/kick`, { user: pubB }); t = (await get(A, `/api/tribes/${tid}`)).tribe; ok('القائد يطرد عضو', kk.ok && t.members === 1);
  const lv = await post(A, '/api/tribes/leave'); ok('القائد ما يقدر يطلع (يحل القبيلة بدالها)', lv.ok === false && lv.code === 'leader_leave');
  const ds = await post(A, '/api/tribes/disband'); ok('حل القبيلة', ds.ok && !(await get(A, '/api/tribes/me')).tribe);
  ok('ما فيه أخطاء صفحة', errs.length === 0, errs.join(' | '));
  if (id) await cmd(A, { command: 'room:delete', roomId: id });
  await br.close(); console.log(`\nSUMMARY pass ${R.filter(Boolean).length} fail ${R.filter((x) => !x).length}`); process.exit(R.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
