// R59: مدفع الغرفة الجديد — 3 مستويات، الأوائل الثلاثة نفس الجوايز + «للأول بس»، انتقال تلقائي، الانفجار. هدايا حقيقية من الواجهة. خادم محلي فقط.
// الاستخدام: ADMIN_TOKEN=... NODE_PATH=$(npm root -g) node acceptance-r58/cannon-r59.cjs http://127.0.0.1:4104 <مجلد الكوكيز> <مجلد اللقطات>
const { chromium } = require('playwright'); const fs = require('fs'); const { randomUUID } = require('crypto');
const [B, JARS, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(B || '')) { console.error('محلي فقط'); process.exit(2); }
const jar = (u) => fs.readFileSync(`${JARS}/${u}.cj`, 'utf8').split('\n').find((l) => l.includes('qa_s')).split('\t')[6].trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const R = []; const ok = (n, c, x = '') => { R.push(!!c); console.log(c ? 'PASS' : 'FAIL', n, x ? '— ' + String(x).slice(0, 300) : ''); };
const H = (t) => ({ cookie: 'qa_s=' + t, Origin: B, 'Content-Type': 'application/json' });
const cmd = async (t, body) => (await (await fetch(B + '/api/social/command', { method: 'POST', headers: H(t), body: JSON.stringify({ key: randomUUID(), ...body }) })).json());
const detail = async (t, id) => (await (await fetch(B + '/api/social/rooms/' + id, { headers: H(t) })).json()).room;
const grant = async (t, amount) => { const me = await (await fetch(B + '/api/me', { headers: H(t) })).json(); for (let left = amount; left > 0; left -= 1_000_000) await fetch(B + `/api/admin/players/${me.user.id}/adjust`, { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.ADMIN_TOKEN, 'x-admin': '1', Origin: B, 'Content-Type': 'application/json' }, body: JSON.stringify({ cur: 'gems', delta: Math.min(left, 1_000_000), reason: 'رصيد اختبار محلي للمدفع', key: 'c59-' + randomUUID().slice(0, 12) }) }); };
const shop = (t) => new Promise((res) => { const ws = new (require('ws'))(B.replace('http', 'ws') + '/ws', { headers: { Cookie: 'qa_s=' + t, Origin: B } }); ws.on('open', () => ws.send(JSON.stringify({ id: 1, t: 'shop:get' }))); ws.on('message', (d) => { const m = JSON.parse(d); if (m.r === 1) { res(m); ws.close(); } }); });
const T0 = Date.now();
const coins = (l, lv) => (l || []).filter((e) => e.cur === 'coins' && (e.ts ?? 0) >= T0 - 1000 && e.reason === `مدفع الغرفة: انفجار المستوى ${lv}`).reduce((n, e) => n + e.delta, 0);
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
  const mk = await cmd(A, { command: 'room:create', name: 'مدفع جديد ' + Date.now().toString(36).slice(-3) }); const id = mk.roomId;
  let room = await detail(A, id); let c = room.cannon3;
  ok('الغرفة فيها المدفع الجديد: المستوى 1 من صفر', c && c.v === 3 && c.level === 1 && c.pts === 0 && c.round === 1, JSON.stringify(c && { l: c.level, p: c.pts }));
  ok('الأهداف 816,700 ثم 4,500,000 ثم 14,000,000', JSON.stringify(c.levels.map((l) => l.goal)) === '[816700,4500000,14000000]');
  ok('ترتيب المدافع: الأخضر ثم الأحمر ثم البنفسجي', JSON.stringify(c.levels.map((l) => l.color)) === '["green","red","purple"]');
  ok('حوض الجوايز: «للأول بس» إطار مايك + إطار وشارة وعملات (والثاني والثالث فيهم إطار مايك مكان الموجة الصوتية)', c.levels.every((l) => l.top1.slot === 'mic-frame' && l.items.some((i) => i.slot === 'frame') && l.items.some((i) => i.slot === 'badge') && l.coins > 0) && c.levels.slice(1).every((l) => l.items.some((i) => i.slot === 'mic-frame')));
  const art = await Promise.all([1, 2, 3].map(async (n) => (await fetch(`${B}/assets/art58/cannon/v${n}.webp`)).status)); ok('رسمات المدافع الثلاثة', art.every((x) => x === 200));
  const sa = await shop(A); const avail = new Set((sa.items || []).filter((i) => i.status === 'available').map((i) => i.id));
  ok('كل جوايز المدفع قطع موجودة بالمتجر', c.levels.every((l) => [l.top1, ...l.items].every((p) => avail.has(p.id))));
  await grant(Bt, 8_500_000); await grant(Ct, 800_000);
  const br = await chromium.launch(); const pages = []; const errs = [];
  for (const t of [A, Bt, Ct]) { const ctx = await br.newContext({ viewport: { width: 390, height: 844 } }); await ctx.addCookies([{ name: 'qa_s', value: t, url: B }]); const pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(e.message)); pages.push(pg); }
  const [p, bp, cp] = pages;
  for (const pg of pages) { await pg.goto(B + '/#/social-room/' + id); await sleep(3000); const seat = await pg.$('.so-seat-available'); if (seat) { await seat.click(); await sleep(1500); } }
  const sc = await p.evaluate(() => ({ c59: !!document.querySelector('.c59-shortcut img.c59-art'), rocket: !!document.querySelector('.rk58-shortcut'), old: !!document.querySelector('.so-cannon-shortcut:not(.c59-shortcut):not(.sup58-shortcut)') }));
  ok('زر المدفع الجديد بالغرفة، وما فيه زر صاروخ ولا المدفع القديم', sc.c59 && !sc.rocket && !sc.old, JSON.stringify(sc));
  await p.evaluate(() => document.querySelector('.c59-shortcut')?.click()); await sleep(1200);
  const pn = await p.evaluate(() => ({ lv: document.querySelector('.c59-lv')?.textContent, hero: !!document.querySelector('.c59-main img.is-hero'), sides: document.querySelectorAll('.c59-side img').length, prizes: document.querySelectorAll('.c59-pool .c59-prize').length, top1: !!document.querySelector('.c59-top1tag'), send: !!document.querySelector('.c59-send') }));
  ok('لوحة المدفع: LV1، المدفع بالنص، المستوى الجاي على الجنب، حوض الجوايز و«للأول بس» وزر إرسال هدية', pn.lv === 'LV1' && pn.hero && pn.sides === 1 && pn.prizes === 4 && pn.top1 && pn.send, JSON.stringify(pn));
  await p.screenshot({ path: `${OUT}/c59-panel-lv1.png` });
  await p.evaluate(() => document.querySelector('[data-so-action="c59-level"][data-level="3"]')?.click()); await sleep(500);
  ok('تقدر تتنقل للمستوى 3 وتشوف جوايزه', await p.evaluate(() => document.querySelector('.c59-lv')?.textContent === 'LV3' && !!document.querySelector('.c59-panel.c59-cpurple')));
  await p.screenshot({ path: `${OUT}/c59-panel-lv3.png` });
  await p.keyboard.press('Escape').catch(() => {}); await sleep(500);
  // ب: 7 صواريخ (700 ألف) → ما ينفجر
  await sendRockets(bp, 7); await sleep(2000);
  room = await detail(Bt, id); c = room.cannon3;
  ok('700 ألف: المدفع 1 ما انفجر، ومساهمة ب تطلع', c.level === 1 && c.pts === 700000 && c.mine === 700000, JSON.stringify({ l: c.level, p: c.pts, m: c.mine }));
  // ج: 7 صواريخ → يتعدى 816,700 فينفجر، والفائض ينتقل للمستوى 2
  const lb0 = (await shop(Bt)).ledger, lc0 = (await shop(Ct)).ledger;
  await sendRockets(cp, 7);
  let blasted = false; for (let i = 0; i < 30 && !blasted; i++) { await sleep(200); blasted = await p.evaluate(() => !!document.querySelector('.c59-blast')); }
  await sleep(2700); await p.screenshot({ path: `${OUT}/c59-blast.png` });
  ok('الانفجار ظهر للحاضرين (المدفع يكبر وينفجر وبطاقة الجوايز)', blasted);
  room = await detail(A, id); c = room.cannon3;
  ok('بعد الانفجار انتقل للمستوى 2 والفائض انحسب (583,300)', c.level === 2 && c.pts === 583300, JSON.stringify({ l: c.level, p: c.pts }));
  ok('المستوى 1 يبين اللي فجروه: ب الأول وج الثاني', c.levels[0].last?.winners?.map((w) => w.person.name + ':' + w.pts).join(',') === 'لاعب b:700000,لاعب c:116700', JSON.stringify(c.levels[0].last));
  const sb = await shop(Bt), scc = await shop(Ct), sa2 = await shop(A);
  ok('ب وج ياخذون نفس الجوايز: 30,000 عملة + إطار أجنحة البنفسج + شارة صقر', coins(sb.ledger, 1) === 30000 && coins(scc.ledger, 1) === 30000 && ['art-f2-17', 'badge-falcon'].every((x) => sb.owned.includes(x) && scc.owned.includes(x)), [coins(sb.ledger, 1), coins(scc.ledger, 1)].join(','));
  ok('«للأول بس» (إطار مايك سفينة البحّار) لـ ب بس', sb.owned.includes('art-mf-58'));
  ok('صاحب الغرفة (ما ساهم) ما ياخذ شي', coins(sa2.ledger, 1) === 0);
  await p.evaluate(() => document.querySelector('.c59-shortcut')?.click()); await sleep(900);
  await p.evaluate(() => document.querySelector('[data-so-action="c59-level"][data-level="1"]')?.click()); await sleep(500);
  const bl = await p.evaluate(() => ({ done: !!document.querySelector('.c59-badge-done'), rows: document.querySelectorAll('.c59-blasted li').length }));
  ok('لوحة المستوى 1 بعد الانفجار: «انفجر ✓» وصور اللي فجروه', bl.done && bl.rows === 2, JSON.stringify(bl)); await p.screenshot({ path: `${OUT}/c59-blasted-lv1.png` });
  await p.keyboard.press('Escape').catch(() => {}); await sleep(500);
  // ب: 6 مرات × 7 صواريخ (4.2 مليون) → ينفجر المستوى 2، ب الأول
  await sleep(6000); for (let k = 0; k < 6; k++) { await sendRockets(bp, 7); await sleep(1500); } await sleep(3000);
  room = await detail(A, id); c = room.cannon3; const sb2 = await shop(Bt), sc2 = await shop(Ct);
  ok('المستوى 2 انفجر والمدفع صار على المستوى 3 (البنفسجي)', c.level === 3 && c.pts === 283300, JSON.stringify({ l: c.level, p: c.pts }));
  ok('جوايز المستوى 2 لـ ب وج: 100,000 عملة + إطار مايك تنين الحمم + إطار غيوم الفضة + شارة تاج، و«للأول بس» أجنحة الذهب لـ ب', coins(sb2.ledger, 2) === 100000 && coins(sc2.ledger, 2) === 100000 && ['art-mf-46', 'art-f2-09', 'badge2-crown'].every((x) => sb2.owned.includes(x) && sc2.owned.includes(x)) && sb2.owned.includes('art-mf-45'));
  ok('ما فيه أخطاء صفحة', errs.length === 0, errs.join(' | '));
  await cmd(A, { command: 'room:delete', roomId: id });
  await br.close(); console.log(`\nSUMMARY pass ${R.filter(Boolean).length} fail ${R.filter((x) => !x).length}`); process.exit(R.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
