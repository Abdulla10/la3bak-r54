// ملاحظة: Chromium بدون GPU يرسم حركة الهدية ثلاثية الأبعاد ببطء، فالانتظار هني أطول من الجهاز الحقيقي.
// R59: إرسال الهدية مثل الفيديو — فوري بدون بطاقة تأكيد، Combo يعيد الإرسال، الشريط الجانبي «×N»، وسطر الدردشة. هدايا حقيقية. خادم محلي فقط.
// الاستخدام: ADMIN_TOKEN=... NODE_PATH=$(npm root -g) node acceptance-r58/gifts-r59.cjs http://127.0.0.1:4104 <مجلد الكوكيز> <مجلد اللقطات>
const { chromium } = require('playwright'); const fs = require('fs'); const { randomUUID } = require('crypto');
const [B, JARS, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(B || '')) { console.error('محلي فقط'); process.exit(2); }
const jar = (u) => fs.readFileSync(`${JARS}/${u}.cj`, 'utf8').split('\n').find((l) => l.includes('qa_s')).split('\t')[6].trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const R = []; const ok = (n, c, x = '') => { R.push(!!c); console.log(c ? 'PASS' : 'FAIL', n, x ? '— ' + String(x).slice(0, 300) : ''); };
const H = (t) => ({ cookie: 'qa_s=' + t, Origin: B, 'Content-Type': 'application/json' });
const cmd = async (t, body) => (await (await fetch(B + '/api/social/command', { method: 'POST', headers: H(t), body: JSON.stringify({ key: randomUUID(), ...body }) })).json());
const grant = async (t, amount) => { const me = await (await fetch(B + '/api/me', { headers: H(t) })).json(); await fetch(B + `/api/admin/players/${me.user.id}/adjust`, { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.ADMIN_TOKEN, 'x-admin': '1', Origin: B, 'Content-Type': 'application/json' }, body: JSON.stringify({ cur: 'gems', delta: amount, reason: 'رصيد اختبار محلي للهدايا', key: 'g59-' + randomUUID().slice(0, 12) }) }); };
const gems = async (t) => (await (await fetch(B + '/api/me', { headers: H(t) })).json()).gems ?? (await (await fetch(B + '/api/account', { headers: H(t) })).json().catch(() => ({}))).gems;
const shop = (t) => new Promise((res) => { const ws = new (require('ws'))(B.replace('http', 'ws') + '/ws', { headers: { Cookie: 'qa_s=' + t, Origin: B } }); ws.on('open', () => ws.send(JSON.stringify({ id: 1, t: 'shop:get' }))); ws.on('message', (d) => { const m = JSON.parse(d); if (m.r === 1) { res(m); ws.close(); } }); });
(async () => {
  const A = jar('a'), Bt = jar('b');
  const mk = await cmd(A, { command: 'room:create', name: 'هدايا R59 ' + Date.now().toString(36).slice(-3) }); const id = mk.roomId;
  await grant(Bt, 300_000);
  const br = await chromium.launch(); const pages = []; const errs = [];
  for (const t of [A, Bt]) { const ctx = await br.newContext({ viewport: { width: 390, height: 844 } }); await ctx.addCookies([{ name: 'qa_s', value: t, url: B }]); const pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(e.message)); pages.push(pg); }
  const [p, bp] = pages;
  for (const pg of pages) { await pg.goto(B + '/#/social-room/' + id); await sleep(3000); const seat = await pg.$('.so-seat-available'); if (seat) { await seat.click(); await sleep(1500); } }
  const T0 = Date.now() - 1000;
  await bp.click('[aria-label="إرسال هدية"]'); await sleep(1500);
  const dark = await bp.evaluate(() => getComputedStyle(document.querySelector('.so-room-panel[data-so-panel="gifts"]')).backgroundColor);
  ok('لوحة الهدايا داكنة مثل الفيديو', dark === 'rgb(20, 22, 37)', dark);
  ok('الكميات 1 و7 و77 و777 + كمية مخصصة', await bp.evaluate(() => ['1', '7', '77', '777'].every((q) => [...document.querySelectorAll('.so-gift-quantities button')].some((b) => b.textContent.trim() === q)) && !!document.querySelector('#so-gift-custom-toggle')));
  await bp.click('[data-so-gifts] button:has-text("للاعب a")').catch(() => {}); await sleep(300);
  await bp.click('[data-so-gifts] button:has-text("تنين أسطوري")'); await sleep(800);
  ok('ضغطة على الهدية تطلع زر «إرسال» على الهدية نفسها', await bp.evaluate(() => !!document.querySelector('.so-gift-card.is-picked .so-gift-send-inline')));
  await bp.click('.so-gift-card.is-picked .so-gift-send-inline');
  let combo = false, confirm = false; for (let i = 0; i < 25 && !combo; i++) { await sleep(150); combo = await bp.evaluate(() => !!document.querySelector('.g59-combo')); confirm = confirm || await bp.evaluate(() => !!document.querySelector('.so-gift-confirm')); }
  ok('الإرسال فوري بدون بطاقة تأكيد (هدية 50,000)', !confirm);
  ok('اللوحة تتسكر وزر Combo يطلع', combo && await bp.evaluate(() => !document.querySelector('[data-so-gifts]')));
  await bp.click('.g59-combo', { timeout: 8000 }).catch(() => {}); let x2 = false; for (let i = 0; i < 160 && !x2; i++) { await sleep(150); x2 = await bp.evaluate(() => document.querySelector('.g59-combo small')?.textContent === '×2'); }
  ok('عداد Combo صار ×2 بعد الضغط', x2); await bp.screenshot({ path: `${OUT}/g59-combo.png` });
  await sleep(1500); const l = (await shop(Bt)).ledger.filter((e) => e.cur === 'gems' && (e.ts ?? 0) >= T0 && e.delta === -50000);
  ok('الإرسال الأول وCombo: خصمين بقيمة الهدية بالضبط (50,000 لكل وحدة) بسجل المحفظة', l.length === 2, l.length);
  ok('الشريط الجانبي «×» طلع للحاضرين (صاحب الغرفة)', await p.evaluate(() => [...document.querySelectorAll('.g59-slide')].length >= 1 || !!document.querySelector('.g59-slides')));
  ok('سطر الهدية بالدردشة «أرسل … إلى»', await p.evaluate(() => [...document.querySelectorAll('.so-pk-gift-event summary')].some((s) => /أرسل تنين أسطوري ×1 إلى/.test(s.textContent))));
  await p.screenshot({ path: `${OUT}/g59-receiver.png` });
  ok('ما فيه أخطاء صفحة', errs.length === 0, errs.join(' | '));
  await cmd(A, { command: 'room:delete', roomId: id });
  await br.close(); console.log(`\nSUMMARY pass ${R.filter(Boolean).length} fail ${R.filter((x) => !x).length}`); process.exit(R.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
