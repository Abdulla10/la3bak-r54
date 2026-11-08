// R58y: صاروخ الغرفة — رحلة 7 كواكب بالبترول. هدايا حقيقية عبر الواجهة من 3 حسابات، جواهر وهدايا للأوائل الثلاثة، وهدية حظ. خادم محلي فقط.
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
const grant = async (t, amount) => { const me = await (await fetch(B + '/api/me', { headers: H(t) })).json(); for (let left = amount; left > 0; left -= 1_000_000) await fetch(B + `/api/admin/players/${me.user.id}/adjust`, { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.ADMIN_TOKEN, 'x-admin': '1', Origin: B, 'Content-Type': 'application/json' }, body: JSON.stringify({ cur: 'gems', delta: Math.min(left, 1_000_000), reason: 'رصيد اختبار محلي للصاروخ', key: 'rk-' + randomUUID().slice(0, 12) }) }); };
const shop = (t) => new Promise((res) => { const ws = new (require('ws'))(B.replace('http', 'ws') + '/ws', { headers: { Cookie: 'qa_s=' + t, Origin: B } }); ws.on('open', () => ws.send(JSON.stringify({ id: 1, t: 'shop:get' }))); ws.on('message', (d) => { const m = JSON.parse(d); if (m.r === 1) { res(m); ws.close(); } }); });
const P = ['القمر', 'الكريستال', 'اللهب', 'الزمرد', 'مجرة الملوك', 'بوابة المجرات', 'الأكوان المتعددة'];
const T0 = Date.now();
const gems = (l, planet, rank) => (l || []).filter((e) => e.cur === 'gems' && (e.ts ?? 0) >= T0 - 1000 && e.reason === `صاروخ الغرفة: كوكب ${P[planet - 1]} — المركز ${rank}`).reduce((n, e) => n + e.delta, 0);
async function sendRockets(pg, qty) {
  await pg.click('[aria-label="إرسال هدية"]'); await sleep(1500);
  await pg.click('[data-so-gifts] button:has-text("للاعب a")').catch(() => {}); await sleep(300);
  await pg.click('[data-so-gifts] button:has-text("صاروخ فضائي")'); await sleep(400);
  await pg.locator('[data-so-gifts] button', { hasText: new RegExp('^\\s*' + qty + '\\s*$') }).first().click({ timeout: 5000 }).catch(() => {}); await sleep(800);
  const send = await pg.$('[data-so-gifts] button:has-text("إرسال"):not([disabled])'); if (send) { await send.click(); await sleep(1500); }
  const conf = await pg.$('[data-so-gifts] button:has-text("تأكيد"):not([disabled]), [data-so-gifts] [data-so-gift-action="confirm"]'); if (conf) { await conf.click(); await sleep(1500); }
  await pg.keyboard.press('Escape').catch(() => {}); await sleep(500);
}
(async () => {
  const A = jar('a'), Bt = jar('b'), Ct = jar('c');
  const mk = await cmd(A, { command: 'room:create', name: 'رحلة الصاروخ ' + Date.now().toString(36).slice(-3) }); const id = mk.roomId;
  let room = await detail(A, id); let rk = room.rocket;
  ok('الغرفة فيها رحلة صاروخ بـ7 كواكب تبدأ من صفر', rk && rk.v === 2 && rk.stages.length === 7 && rk.stage === 1 && rk.pts === 0 && !rk.finished, JSON.stringify(rk && { v: rk.v, s: rk.stage, p: rk.pts }));
  ok('بترول الكواكب 10 آلاف، 25 ألف، 50 ألف، 100 ألف، 250 ألف، 500 ألف، مليون', JSON.stringify(rk.stages.map((s) => s.goal)) === '[10000,25000,50000,100000,250000,500000,1000000]');
  ok('أسماء الكواكب بالترتيب', JSON.stringify(rk.stages.map((s) => s.name)) === JSON.stringify(P));
  ok('جوايز الأول/الثاني/الثالث (مجرة الملوك 50/25/12.5 ألف، الأكوان 200/100/50 ألف)', JSON.stringify(rk.stages[4].prizes) === '[50000,25000,12500]' && JSON.stringify(rk.stages[6].prizes) === '[200000,100000,50000]');
  ok('هدايا الكواكب من قطع المتجر: 4 لكل كوكب و5 للأكوان (الأول ياخذ قطعتين)', rk.stages.slice(0, 6).every((s) => s.gifts.flat().length === 3 && s.luck) && rk.stages[6].gifts[0].map((g) => g.id).join('+') === 'art-mf-18+souv-03' && rk.stages.every((s) => [...s.gifts.flat(), s.luck].every((g) => /^\/assets\/art58\//.test(g.art))));
  const art = await Promise.all([...[1, 2, 3, 4, 5, 6, 7].map((n) => `/assets/art58/planets/pl${n}.webp`), '/assets/art58/rocket/ship.webp', ...rk.stages.flatMap((s) => [...s.gifts.flat(), s.luck].map((g) => g.art))].map(async (u) => (await fetch(B + u)).status));
  ok('رسمات الكواكب السبعة والصاروخ وهدايا الكواكب', art.every((x) => x === 200), art.join(','));
  const sa = await shop(A); const storeIds = new Set((sa.items || []).filter((i) => i.status !== 'hidden').map((i) => i.id)); ok('كل هدايا الكواكب قطع موجودة بالمتجر', rk.stages.every((s) => [...s.gifts.flat(), s.luck].every((g) => storeIds.has(g.id))));
  await grant(Bt, 1_600_000); await grant(Ct, 800_000);
  const br = await chromium.launch(); const pages = []; const errs = [];
  for (const t of [A, Bt, Ct]) { const ctx = await br.newContext({ viewport: { width: 390, height: 844 } }); await ctx.addCookies([{ name: 'qa_s', value: t, url: B }]); const pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(e.message)); pages.push(pg); }
  const [p, bp, cp] = pages;
  for (const pg of pages) { await pg.goto(B + '/#/social-room/' + id); await sleep(3000); const seat = await pg.$('.so-seat-available'); if (seat) { await seat.click(); await sleep(1500); } }
  ok('زر الصاروخ بالغرفة', await p.evaluate(() => !!document.querySelector('.rk58-shortcut img.rk58-ship')));
  await p.evaluate(() => document.querySelector('.rk58-shortcut')?.click()); await sleep(1200);
  const pn = await p.evaluate(() => ({ planets: document.querySelectorAll('.rk58-planets > li').length, prizes: document.querySelectorAll('.rk58-planets .rk58-prize').length, hero: !!document.querySelector('.rk58-hero img.is-target') }));
  ok('لوحة الصاروخ: 7 كواكب، 4 جوايز لكل كوكب، والوجهة الحالية', pn.planets === 7 && pn.prizes === 28 && pn.hero, JSON.stringify(pn)); await p.screenshot({ path: `${OUT}/rocket-panel-0.png` });
  await p.keyboard.press('Escape').catch(() => {}); await sleep(500);
  // ب: صاروخ واحد (100 ألف) يوصل القمر والكريستال واللهب (85 ألف)
  const lb0 = (await shop(Bt)).ledger;
  await sendRockets(bp, 1);
  let launched = false; for (let i = 0; i < 24 && !launched; i++) { await sleep(250); launched = await p.evaluate(() => !!document.querySelector('.rk58-launch')); }
  await sleep(2600); await p.screenshot({ path: `${OUT}/rocket-launch.png` });
  ok('حركة الوصول للكوكب ظهرت للحاضرين', launched);
  room = await detail(A, id); rk = room.rocket;
  ok('100 ألف بترول: وصل 3 كواكب والوجهة الزمرد', rk.pts === 100000 && rk.reached === 3 && rk.stage === 4 && rk.progress === 15000, JSON.stringify({ p: rk.pts, r: rk.reached, s: rk.stage, pr: rk.progress }));
  let sb = await shop(Bt);
  ok('ب الأول بالكواكب الثلاثة: 2,000 + 5,000 + 10,000 💎', [1, 2, 3].map((n) => gems(sb.ledger, n, 1) - gems(lb0, n, 1)).join(',') === '2000,5000,10000', [1, 2, 3].map((n) => gems(sb.ledger, n, 1)).join(','));
  ok('ب ياخذ قطع المركز الأول: الهلال، إطار مايك كريستال الملوك، لوحة اللهب', ['souv-12', 'art-mf-02', 'art-bd-13'].every((x) => sb.owned.includes(x)));
  let rv = (await detail(A, id)).rocket; ok('ما فيه هدية حظ لأحد قعد أقل من 3 دقايق، والفايزين يطلعون باللوحة', rv.stages.slice(0, 3).every((s) => s.won && s.won.luck === null && s.won.winners.length === 1 && s.won.winners[0].name === 'لاعب b'), JSON.stringify(rv.stages[0].won));
  // ننطر 3 دقايق عشان أ يصير مؤهل لهدية الحظ
  console.log('… انتظار 3 دقايق لشرط هدية الحظ'); for (let i = 0; i < 19; i++) { await sleep(10_000); await p.mouse.move(10 + i, 10); }
  // ج: 7 صواريخ (700 ألف) → المجموع 800 ألف: الزمرد (185 ألف) ومجرة الملوك (435 ألف). ج الأول وب الثاني
  const lc0 = (await shop(Ct)).ledger; await sendRockets(cp, 7); await sleep(3000);
  room = await detail(A, id); rk = room.rocket; const sc = await shop(Ct); sb = await shop(Bt); const sa2 = await shop(A);
  ok('800 ألف: وصل مجرة الملوك (5 كواكب)', rk.pts === 800000 && rk.reached === 5, JSON.stringify({ p: rk.pts, r: rk.reached }));
  ok('ج الأول: الزمرد 20,000 ومجرة الملوك 50,000 💎', gems(sc.ledger, 4, 1) - gems(lc0, 4, 1) === 20000 && gems(sc.ledger, 5, 1) - gems(lc0, 5, 1) === 50000);
  ok('ب الثاني: الزمرد 10,000 ومجرة الملوك 25,000 💎 + خلفية شلال الساكورا وإطار التاج البنفسجي', gems(sb.ledger, 4, 2) === 10000 && gems(sb.ledger, 5, 2) === 25000 && sb.owned.includes('art-pb-04') && sb.owned.includes('art-f2-13'));
  ok('ج ياخذ إطار مايك زهرة اللوتس وإطار مايك الأسد الذهبي', sc.owned.includes('art-mf-30') && sc.owned.includes('art-mf-15'));
  rv = (await detail(A, id)).rocket; ok('هدية الحظ راحت لـ أ (حاضر 3 دقايق ومو من الأوائل): النخلة ولوحة التاج الملكي', rv.stages[3].won?.luck === 'لاعب a' && rv.stages[4].won?.luck === 'لاعب a' && sa2.owned.includes('souv-14') && sa2.owned.includes('art-bd-17'), JSON.stringify(rv.stages[3].won));
  // ب: 7 + 7 صواريخ → 2.2 مليون: بوابة المجرات والأكوان المتعددة. ب الأول (1.5 مليون) وج الثاني (700 ألف)
  await sleep(4000); await sendRockets(bp, 7); await sleep(4000); await sendRockets(bp, 7); await sleep(3000);
  room = await detail(A, id); rk = room.rocket; sb = await shop(Bt); const sc2 = await shop(Ct);
  ok('2.2 مليون: وصل الأكوان المتعددة والرحلة خلصت', rk.pts === 2200000 && rk.reached === 7 && rk.finished, JSON.stringify({ p: rk.pts, r: rk.reached }));
  ok('ب الأول بالأكوان: 200,000 💎 (على منحتين) + إطار مايك تنين البنفسج والتاج الملكي', gems(sb.ledger, 7, 1) === 200000 && sb.owned.includes('art-mf-18') && sb.owned.includes('souv-03'), gems(sb.ledger, 7, 1));
  ok('ج الثاني بالأكوان: 100,000 💎 + العنقاء', gems(sc2.ledger, 7, 2) === 100000 && sc2.owned.includes('souv-09'));
  ok('ب الأول ببوابة المجرات: 100,000 💎 + إطار مايك البوابة الذهبية', gems(sb.ledger, 6, 1) === 100000 && sb.owned.includes('art-mf-36'));
  ok('ما فيه مركز ثالث لأن اللي عبّوا اثنين بس', [1, 2, 3, 4, 5, 6, 7].every((n) => gems(sb.ledger, n, 3) === 0 && gems(sc2.ledger, n, 3) === 0));
  // بعد آخر كوكب ما ينمنح شي زيادة
  await sleep(4000); const before = JSON.stringify((await shop(Ct)).owned); await sendRockets(cp, 1); await sleep(2500);
  room = await detail(A, id); const after = JSON.stringify((await shop(Ct)).owned);
  ok('بعد آخر كوكب ما ينمنح شي زيادة', room.rocket.pts === 2300000 && before === after);
  await p.evaluate(() => document.querySelector('.rk58-shortcut')?.click()); await sleep(1200); await p.screenshot({ path: `${OUT}/rocket-panel-done.png`, fullPage: false });
  // الهدايا تطلع برف التذكارات بملف ب
  await bp.goto(B + '/#/profile'); await sleep(3500); const onMain = await bp.evaluate(() => !!document.querySelector('[data-souv-shelf]'));
  await bp.evaluate(() => document.querySelector('[data-pvp-bag]')?.click()); let shelf = 0; for (let i = 0; i < 10 && !shelf; i++) { await sleep(500); shelf = await bp.evaluate(() => [...document.querySelectorAll('.pvp-editor [data-souv-shelf] figure img')].filter((i) => /\/souv\/s(03|09|12)\.webp/.test(i.src)).length); }
  await sleep(600);
  ok('التذكارات مو بالصفحة الرئيسية للملف، وتطلع داخل «حقيبتي»', !onMain && shelf >= 1, JSON.stringify({ onMain, shelf })); await bp.screenshot({ path: `${OUT}/rocket-shelf.png` });
  ok('ما فيه أخطاء صفحة', errs.length === 0, errs.join(' | '));
  await cmd(A, { command: 'room:delete', roomId: id });
  await br.close(); console.log(`\nSUMMARY pass ${R.filter(Boolean).length} fail ${R.filter((x) => !x).length}`); process.exit(R.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
