// R58t: مدفع الغرفة بالمراحل الخمس (رسومات المالك) — هدايا حقيقية عبر الواجهة، والجوائز من الخادم. خادم محلي فقط.
// الاستخدام: ADMIN_TOKEN=... NODE_PATH=$(npm root -g) node acceptance-r58/cannon-r58.cjs http://127.0.0.1:4104 <مجلد الكوكيز> <مجلد اللقطات>
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
(async () => {
  const A = jar('a'), Bt = jar('b');
  const mk = await cmd(A, { command: 'room:create', name: 'غرفة المدفع ' + Date.now().toString(36).slice(-3) }); const id = mk.roomId;
  let room = await detail(A, id); const c0 = room.cannon;
  ok('الغرفة الجديدة فيها مدفع بخمس مراحل (النسخة الجديدة)', c0 && c0.version === 'room-gems-r58-v2' && c0.stages.length === 5 && c0.currentStage === 1, JSON.stringify(c0 && { v: c0.version, n: c0.stages.length }));
  ok('الأهداف تتصاعد: 500 ألف ← 25 مليون', JSON.stringify(c0.stages.map((s) => s.goal)) === JSON.stringify([500000, 1500000, 4000000, 10000000, 25000000]));
  ok('كل مرحلة جائزتها إطار وخلفية من مجموعة المالك', c0.stages.every((s) => /^art-f2-\d\d$/.test(s.rewards?.frame?.id || '') && /^art-pb-\d\d$/.test(s.rewards?.background?.id || '')), JSON.stringify(c0.stages.map((s) => [s.rewards?.frame?.id, s.rewards?.background?.id])));
  const art = await Promise.all([1, 2, 3, 4, 5].map(async (n) => (await fetch(`${B}/assets/art58/cannon/c${n}.webp`)).status));
  ok('رسمة لكل مرحلة (5 مدافع)', art.every((s) => s === 200), art.join(','));
  await grant(Bt, 800_000);
  const br = await chromium.launch(); const actx = await br.newContext({ viewport: { width: 390, height: 844 } }); await actx.addCookies([{ name: 'qa_s', value: A, url: B }]);
  const bctx = await br.newContext({ viewport: { width: 390, height: 844 } }); await bctx.addCookies([{ name: 'qa_s', value: Bt, url: B }]);
  const p = await actx.newPage(), bp = await bctx.newPage(); const errs = []; for (const x of [p, bp]) x.on('pageerror', (e) => errs.push(e.message));
  const frames = []; p.on('console', (m) => { if (m.text().includes('[cn58]')) frames.push(m.text().slice(0, 400)); }); p.on('websocket', (w) => w.on('framereceived', (f) => { const t = String(f.payload || ''); if (t.includes('social:cannon')) frames.push(t.slice(0, 400)); }));
  await p.goto(B + '/#/social-room/' + id); await sleep(3000);
  const shortcutImg = await p.evaluate(() => document.querySelector('.so-cannon-shortcut img.cn58-art')?.getAttribute('src') || null);
  ok('زر المدفع بالغرفة يعرض رسمة المرحلة 1', /\/art58\/cannon\/c1\.webp/.test(shortcutImg || ''), shortcutImg);
  await p.click('.so-cannon-shortcut'); await sleep(1200);
  const panel = await p.evaluate(() => ({ levels: document.querySelectorAll('.so-cannon-levels button').length, hero: document.querySelector('.so-cannon-hero img.cn58-art')?.getAttribute('src'), rewards: document.querySelectorAll('.so-cannon-reward img').length }));
  ok('لوحة المدفع: 5 مستويات + رسمة المرحلة + صور الجوائز', panel.levels === 5 && /c1\.webp/.test(panel.hero || '') && panel.rewards >= 2, JSON.stringify(panel));
  await p.screenshot({ path: `${OUT}/cannon-panel-1.png` });
  await p.evaluate(() => document.querySelector('.so-cannon-levels button[data-stage="5"]')?.click()); await sleep(900);
  ok('التنقل للمستوى 5 يعرض مدفعه', await p.evaluate(() => /c5\.webp/.test(document.querySelector('.so-cannon-hero img.cn58-art')?.getAttribute('src') || '')));
  await p.screenshot({ path: `${OUT}/cannon-panel-5.png` });
  await p.reload(); await sleep(3000);
  // المقاعد ثم الهدية: 7 صواريخ (700 ألف جوهرة) تعبّي المرحلة الأولى
  await bp.goto(B + '/#/social-room/' + id); await sleep(3500);
  const seat = await p.$('.so-seat-available'); if (seat) { await seat.click(); await sleep(1500); }
  const s2 = await bp.$('.so-seat-available'); if (s2) { await s2.click(); await sleep(1500); }
  await bp.click('[aria-label="إرسال هدية"]'); await sleep(1500);
  await bp.click('[data-so-gifts] button:has-text("للاعب a")').catch(() => {}); await sleep(300);
  await bp.click('[data-so-gifts] button:has-text("صاروخ فضائي")'); await sleep(400);
  for (const q of await bp.$$('[data-so-gifts] button')) { if ((await q.textContent()).trim() === '7') { await q.click(); break; } } await sleep(800);
  const send = await bp.$('[data-so-gifts] button:has-text("إرسال"):not([disabled])'); if (send) { await send.click(); await sleep(1500); }
  const conf = await bp.$('[data-so-gifts] button:has-text("تأكيد"):not([disabled]), [data-so-gifts] [data-so-gift-action="confirm"]'); if (conf) { await conf.click(); await sleep(1500); }
  let blast = false; for (let i = 0; i < 24 && !blast; i++) { await sleep(250); blast = await p.evaluate(() => !!document.querySelector('.cn58-blast')); }
  await sleep(450); await p.screenshot({ path: `${OUT}/cannon-blast.png` });
  ok('انفجار المدفع ظهر لصاحب الغرفة (2D برسمة المالك)', blast);
  room = await detail(A, id); const c1 = room.cannon;
  ok('طاقة المدفع = قيمة الهدايا (700 ألف)', c1.totalEnergy === 700000, String(c1.totalEnergy));
  const st1 = c1.stages.find((s) => s.stage === 1);
  ok('المرحلة 1 اكتملت وانمنحت الجوائز', st1.status === 'awarded' && st1.reward && [...st1.reward.addedItems, ...st1.reward.alreadyOwned].sort().join() === [st1.rewards.frame.id, st1.rewards.background.id].sort().join(), JSON.stringify(st1.reward));
  ok('الفائض ينتقل للمرحلة 2 (200 ألف من 1.5 مليون)', c1.currentStage === 2 && c1.progress === 200000, JSON.stringify({ s: c1.currentStage, p: c1.progress }));
  const own = await new Promise((res) => { const ws = new (require('ws'))(B.replace('http', 'ws') + '/ws', { headers: { Cookie: 'qa_s=' + A, Origin: B } }); ws.on('open', () => ws.send(JSON.stringify({ id: 1, t: 'shop:get' }))); ws.on('message', (d) => { const m = JSON.parse(d); if (m.r === 1) { res(m.owned); ws.close(); } }); });
  ok('صاحب الغرفة صار يملك إطار وخلفية المرحلة 1', own.includes(st1.rewards.frame.id) && own.includes(st1.rewards.background.id));
  ok('ما فيه أخطاء صفحة', errs.length === 0, errs.join(' | '));
  await cmd(A, { command: 'room:delete', roomId: id });
  await br.close(); console.log(`\nSUMMARY pass ${R.filter(Boolean).length} fail ${R.filter((x) => !x).length}`); process.exit(R.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
