// R58v: قائمة داعمين الغرفة (اليوم/الأسبوع/الشهر/الكل) — هدايا حقيقية عبر الواجهة. خادم محلي فقط.
// الاستخدام: ADMIN_TOKEN=... NODE_PATH=$(npm root -g) node acceptance-r58/supporters-r58.cjs http://127.0.0.1:4104 <مجلد الكوكيز> <مجلد اللقطات>
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
let GIFT = 'صاروخ فضائي';
async function sendRockets(bp, qty) {
  await bp.click('[aria-label="إرسال هدية"]'); await sleep(1500);
  await bp.click('[data-so-gifts] button:has-text("للاعب a")').catch(() => {}); await sleep(300);
  await bp.click(`[data-so-gifts] button:has-text("${GIFT}")`); await sleep(400);
  await bp.locator('[data-so-gifts] button', { hasText: new RegExp('^\\s*' + qty + '\\s*$') }).first().click({ timeout: 5000 }).catch(() => {}); await sleep(800);
  const send = await bp.$('[data-so-gifts] button:has-text("إرسال"):not([disabled])'); if (send) { await send.click(); await sleep(1500); }
  const conf = await bp.$('[data-so-gifts] button:has-text("تأكيد"):not([disabled]), [data-so-gifts] [data-so-gift-action="confirm"]'); if (conf) { await conf.click(); await sleep(1500); }
  await bp.keyboard.press('Escape').catch(() => {}); await sleep(500);
}

(async () => {
  const A = jar('a'), Bt = jar('b'), C = jar('c');
  const mk = await cmd(A, { command: 'room:create', name: 'غرفة الداعمين ' + Date.now().toString(36).slice(-3) }); const id = mk.roomId;
  let room = await detail(A, id);
  ok('الغرفة الجديدة: قائمة الداعمين فاضية بالفترات الأربع', room.supporters && ['day', 'week', 'month', 'all'].every((k) => Array.isArray(room.supporters[k]) && room.supporters[k].length === 0), JSON.stringify(room.supporters));
  await grant(Bt, 300_000); await grant(C, 300_000);
  const br = await chromium.launch(); const mkp = async (t) => { const x = await br.newContext({ viewport: { width: 390, height: 844 } }); await x.addCookies([{ name: 'qa_s', value: t, url: B }]); return x.newPage(); };
  const p = await mkp(A), bp = await mkp(Bt), cp = await mkp(C); const errs = []; for (const x of [p, bp, cp]) x.on('pageerror', (e) => errs.push(e.message));
  await p.goto(B + '/#/social-room/' + id); await sleep(3000); const seat = await p.$('.so-seat-available'); if (seat) { await seat.click(); await sleep(1500); }
  await bp.goto(B + '/#/social-room/' + id); await sleep(3000); const s2 = await bp.$('.so-seat-available'); if (s2) { await s2.click(); await sleep(1500); }
  await cp.goto(B + '/#/social-room/' + id); await sleep(3000); const s3 = await cp.$('.so-seat-available'); if (s3) { await s3.click(); await sleep(1500); }
  GIFT = 'صاروخ فضائي'; await sendRockets(bp, 1); await sleep(1500);
  GIFT = 'تنين أسطوري'; await sendRockets(cp, 1); await sleep(1500);
  room = await detail(A, id); const s = room.supporters;
  const names = (k) => s[k].map((x) => x.name + ':' + x.pts).join(',');
  ok('اليوم: لاعب b أول (100 ألف) ولاعب c ثاني (50 ألف)', s.day.length === 2 && s.day[0].name === 'لاعب b' && s.day[0].pts === 100000 && s.day[1].name === 'لاعب c' && s.day[1].pts === 50000, names('day'));
  ok('نفس الترتيب بالأسبوع والشهر وكل الوقت', ['week', 'month', 'all'].every((k) => names(k) === names('day')), ['week', 'month', 'all'].map(names).join(' | '));
  ok('القائمة ما تكشف المعرّف الداخلي (المعرّف العام بس)', s.day.every((x) => !/^[0-9a-f]{8}-/.test(x.id)));
  await p.reload(); await sleep(3000);
  ok('زر الداعمين بالغرفة يعرض صور أكبر الداعمين', await p.evaluate(() => document.querySelectorAll('.sup58-shortcut .sup58-faces > span').length === 2));
  await p.evaluate(() => document.querySelector('.sup58-shortcut')?.click()); await sleep(1200);
  const pn = await p.evaluate(() => ({ tabs: document.querySelectorAll('.sup58-tabs button').length, rows: document.querySelectorAll('.sup58-list li').length, first: document.querySelector('.sup58-list li b')?.textContent }));
  ok('لوحة الداعمين: 4 تبويبات وصفين وأول واحد لاعب b', pn.tabs === 4 && pn.rows === 2 && pn.first === 'لاعب b', JSON.stringify(pn));
  await p.screenshot({ path: `${OUT}/supporters-day.png` });
  await p.evaluate(() => document.querySelector('.sup58-tabs button[data-tab="all"]')?.click()); await sleep(700);
  ok('تبويب «الكل» يشتغل', await p.evaluate(() => document.querySelector('.sup58-tabs button[data-tab="all"]')?.getAttribute('aria-selected') === 'true' && document.querySelectorAll('.sup58-list li').length === 2));
  ok('ما فيه أخطاء صفحة', errs.length === 0, errs.join(' | '));
  await cmd(A, { command: 'room:delete', roomId: id });
  await br.close(); console.log(`\nSUMMARY pass ${R.filter(Boolean).length} fail ${R.filter((x) => !x).length}`); process.exit(R.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
