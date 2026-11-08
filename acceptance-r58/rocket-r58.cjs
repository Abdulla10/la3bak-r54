// R58u: صاروخ الغرفة اليومي — هدايا حقيقية عبر الواجهة، إطلاق، وعملات للحاضرين وأكبر داعم. خادم محلي فقط.
// الاستخدام: ADMIN_TOKEN=... NODE_PATH=$(npm root -g) node acceptance-r58/rocket-r58.cjs http://127.0.0.1:4104 <مجلد الكوكيز> <مجلد اللقطات>
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
(async () => {
  const A = jar('a'), Bt = jar('b');
  const mk = await cmd(A, { command: 'room:create', name: 'غرفة الصاروخ ' + Date.now().toString(36).slice(-3) }); const id = mk.roomId;
  let room = await detail(A, id); let rk = room.rocket;
  ok('الغرفة فيها صاروخ يومي بثلاث مراحل يبدأ من صفر', rk && rk.stages.length === 3 && rk.stage === 1 && rk.pts === 0 && !rk.finished, JSON.stringify(rk && { s: rk.stage, p: rk.pts }));
  ok('أهداف المراحل 50 ألف ثم 150 ألف ثم 400 ألف', JSON.stringify(rk.stages.map((s) => s.goal)) === '[50000,150000,400000]');
  const art = await Promise.all([1, 2, 3].map(async (n) => (await fetch(`${B}/assets/art58/rocket/k${n}.webp`)).status)); ok('رسمة لكل مرحلة (3 صواريخ)', art.every((x) => x === 200));
  await grant(Bt, 900_000);
  const la0 = await ledger(A), lb0 = await ledger(Bt);
  const br = await chromium.launch(); const actx = await br.newContext({ viewport: { width: 390, height: 844 } }); await actx.addCookies([{ name: 'qa_s', value: A, url: B }]);
  const bctx = await br.newContext({ viewport: { width: 390, height: 844 } }); await bctx.addCookies([{ name: 'qa_s', value: Bt, url: B }]);
  const p = await actx.newPage(), bp = await bctx.newPage(); const errs = []; for (const x of [p, bp]) x.on('pageerror', (e) => errs.push(e.message));
  await p.goto(B + '/#/social-room/' + id); await sleep(3000);
  ok('زر الصاروخ بالغرفة جنب المدفع', await p.evaluate(() => !!document.querySelector('.rk58-shortcut img.rk58-art')));
  await p.evaluate(() => document.querySelector('.rk58-shortcut')?.click()); await sleep(1200);
  const pn = await p.evaluate(() => ({ stages: document.querySelectorAll('.rk58-stages li').length, hero: !!document.querySelector('.rk58-hero img') }));
  ok('لوحة الصاروخ: 3 مراحل + رسمة', pn.stages === 3 && pn.hero, JSON.stringify(pn)); await p.screenshot({ path: `${OUT}/rocket-panel-0.png` });
  await p.reload(); await sleep(3000);
  await bp.goto(B + '/#/social-room/' + id); await sleep(3500);
  const seat = await p.$('.so-seat-available'); if (seat) { await seat.click(); await sleep(1500); }
  const s2 = await bp.$('.so-seat-available'); if (s2) { await s2.click(); await sleep(1500); }
  // صاروخ هدية واحد (100 ألف) يطلق المرحلة 1 (50 ألف)
  await sendRockets(bp, 1);
  let launched = false; for (let i = 0; i < 24 && !launched; i++) { await sleep(250); launched = await p.evaluate(() => !!document.querySelector('.rk58-launch')); }
  await sleep(1700); await p.screenshot({ path: `${OUT}/rocket-launch.png` });
  ok('حركة الإطلاق ظهرت للحاضرين', launched);
  room = await detail(A, id); rk = room.rocket;
  ok('طاقة اليوم 100 ألف والمرحلة 1 انطلقت', rk.pts === 100000 && rk.stages[0].launched && rk.stage === 2 && rk.progress === 50000, JSON.stringify({ p: rk.pts, s: rk.stage, pr: rk.progress }));
  ok('أكبر داعم اليوم يطلع بالقائمة', rk.top.length === 1 && rk.top[0].pts === 100000, JSON.stringify(rk.top));
  const la1 = await ledger(A), lb1 = await ledger(Bt);
  ok('الحاضرين (صاحب الغرفة) ياخذ 200 عملة', rocketCoins(la1, 1, 'crowd') - rocketCoins(la0, 1, 'crowd') === 200, rocketCoins(la1, 1, 'crowd'));
  ok('المرسل ياخذ 200 + مكافأة أكبر داعم 1,000', rocketCoins(lb1, 1, 'crowd') - rocketCoins(lb0, 1, 'crowd') === 200 && rocketCoins(lb1, 1, 'top') - rocketCoins(lb0, 1, 'top') === 1000, JSON.stringify([rocketCoins(lb1, 1, 'crowd'), rocketCoins(lb1, 1, 'top')]));
  // 7 صواريخ (700 ألف): المرحلتين 2 و3
  await sleep(5000); await sendRockets(bp, 7); await sleep(3000);
  room = await detail(A, id); rk = room.rocket;
  ok('المرحلتين 2 و3 انطلقت والصاروخ خلص لليوم', rk.pts === 800000 && rk.finished && rk.stages.every((s) => s.launched), JSON.stringify({ p: rk.pts, f: rk.finished }));
  const la2 = await ledger(A);
  ok('جوائز المرحلتين 2 و3 وصلت (500 + 1,500)', rocketCoins(la2, 2, 'crowd') - rocketCoins(la1, 2, 'crowd') === 500 && rocketCoins(la2, 3, 'crowd') - rocketCoins(la1, 3, 'crowd') === 1500);
  // نفس الهدايا مرة ثانية ما تطلق ولا تمنح شي (اليوم خلص)
  await sleep(5000); await sendRockets(bp, 1); await sleep(2000);
  const la3 = await ledger(A); room = await detail(A, id);
  ok('بعد ما يخلص اليوم ما ينمنح شي زيادة', ['1', '2', '3'].every((s) => rocketCoins(la3, +s, 'crowd') === rocketCoins(la2, +s, 'crowd')) && room.rocket.pts === 900000);
  await p.evaluate(() => document.querySelector('.rk58-shortcut')?.click()); await sleep(1200); await p.screenshot({ path: `${OUT}/rocket-panel-done.png` });
  ok('ما فيه أخطاء صفحة', errs.length === 0, errs.join(' | '));
  await cmd(A, { command: 'room:delete', roomId: id });
  await br.close(); console.log(`\nSUMMARY pass ${R.filter(Boolean).length} fail ${R.filter((x) => !x).length}`); process.exit(R.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
