// R58w: CP فوق «الارتباط الافتراضي» (R47): الطلب من ملف اللاعب، القبول، النقاط من الهدايا، البطاقة. خادم محلي فقط.
// الاستخدام: ADMIN_TOKEN=... NODE_PATH=$(npm root -g) node acceptance-r58/cp-r58.cjs http://127.0.0.1:4104 <مجلد الكوكيز> <مجلد اللقطات>
const { chromium } = require('playwright'); const fs = require('fs'); const { randomUUID } = require('crypto'); const WS = require('ws');
const [B, JARS, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(B || '')) { console.error('محلي فقط'); process.exit(2); }
const jar = (u) => fs.readFileSync(`${JARS}/${u}.cj`, 'utf8').split('\n').find((l) => l.includes('qa_s')).split('\t')[6].trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const R = []; const ok = (n, c, x = '') => { R.push(!!c); console.log(c ? 'PASS' : 'FAIL', n, x ? '— ' + String(x).slice(0, 300) : ''); };
const H = (t) => ({ cookie: 'qa_s=' + t, Origin: B, 'Content-Type': 'application/json' });
const get = async (t, u) => (await fetch(B + u, { headers: H(t) })).json();
const post = async (t, u, body) => (await fetch(B + u, { method: 'POST', headers: H(t), body: JSON.stringify(body) })).json().catch(() => ({}));
const fam = (t, body) => post(t, '/api/social-private/family', { key: 'cp-' + randomUUID(), ...body });
const wsReq = (t, msgs) => new Promise((res) => { const w = new WS(B.replace('http', 'ws') + '/ws', { headers: { Cookie: 'qa_s=' + t, Origin: B } }); const out = []; let i = 0; const nx = () => { if (i < msgs.length) w.send(JSON.stringify({ id: 100 + i, ...msgs[i++] })); else { w.close(); res(out); } }; w.on('open', nx); w.on('message', (d) => { const m = JSON.parse(d); if (m.r >= 100) { out.push(m); nx(); } }); });
const grant = async (t, amount) => { const me = await get(t, '/api/me'); for (let left = amount; left > 0; left -= 1_000_000) await fetch(B + `/api/admin/players/${me.user.id}/adjust`, { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.ADMIN_TOKEN, 'x-admin': '1', Origin: B, 'Content-Type': 'application/json' }, body: JSON.stringify({ cur: 'gems', delta: Math.min(left, 1_000_000), reason: 'رصيد اختبار محلي CP', key: 'cp-' + randomUUID().slice(0, 12) }) }); };
(async () => {
  const A = jar('a'), Bt = jar('b');
  // تجهيز: الطرفين 18+ (محلي)، وما بينهم ارتباط سابق
  for (const t of [A, Bt]) await fetch(B + '/api/account', { method: 'PATCH', headers: H(t), body: JSON.stringify({ birthDate: '1995-05-05' }) });
  for (const t of [A, Bt]) { const s = await get(t, '/api/social-private/family'); if (s.couple?.id) await fam(t, { action: 'couple-dissolve', id: s.couple.id }); for (const r of s.coupleRequests || []) await fam(t, { action: r.direction === 'incoming' ? 'couple-reject' : 'couple-cancel', id: r.id }); }
  const meA = await get(A, '/api/cp/me'), meB = await get(Bt, '/api/cp/me');
  ok('الطرفين 18+ وما عندهم CP', meA.adult && meB.adult && !meA.cp && !meB.cp, JSON.stringify([meA, meB]).slice(0, 200));
  const friends = await get(A, '/api/friends/live'); const pubB = friends.list.find((f) => f.name === 'لاعب b')?.id;
  ok('لاعب b صديق للاعب a (المعرّف العام)', !!pubB, pubB);
  const br = await chromium.launch(); const mk = async (t) => { const x = await br.newContext({ viewport: { width: 390, height: 844 } }); await x.addCookies([{ name: 'qa_s', value: t, url: B }]); return x.newPage(); };
  const p = await mk(A), bp = await mk(Bt); const errs = []; for (const x of [p, bp]) x.on('pageerror', (e) => errs.push(e.message));
  await p.goto(B + '/#/profile'); await sleep(3000);
  ok('بملفك: بطاقة «ما عندك CP للحين»', await p.evaluate(() => /ما عندك CP/.test(document.querySelector('[data-cp-me] .cp58-card')?.textContent || '')));
  await p.goto(B + '/#/u/' + pubB); await sleep(3500);
  const askBtn = await p.$('[data-cp-ask]'); ok('بملف الصديق: زر «اطلب CP»', !!askBtn);
  await p.screenshot({ path: `${OUT}/cp-ask.png` });
  if (askBtn) { await askBtn.click(); await sleep(1500); }
  ok('الطلب انرسل', await p.evaluate(() => /انرسل الطلب/.test(document.querySelector('.cp58-msg')?.textContent || '')), await p.evaluate(() => document.querySelector('.cp58-msg')?.textContent));
  const sB = await get(Bt, '/api/social-private/family'); const inc = (sB.coupleRequests || []).find((r) => r.direction === 'incoming');
  ok('الطلب وصل للطرف الثاني بنظام الارتباط الموجود', !!inc, JSON.stringify(sB.coupleRequests));
  const acc = await fam(Bt, { action: 'couple-accept', id: inc.id }); ok('القبول ينجح', acc.ok !== false && !acc.error, JSON.stringify(acc).slice(0, 200));
  let cA = await get(A, '/api/cp/me'); ok('صاروا CP: يوم 1، Lv1، صفر نقطة', cA.cp && cA.cp.partner?.name === 'لاعب b' && cA.cp.days === 1 && cA.cp.level === 1 && cA.cp.pts === 0, JSON.stringify(cA.cp));
  // ما يظهر للناس قبل ما يوافق الطرفين على الظهور
  let pubView = await get(Bt, '/api/cp/of/' + (await get(A, '/api/me')).user?.pub || ''); 
  const pubA = (await get(Bt, '/api/friends/live')).list.find((f) => f.name === 'لاعب a')?.id;
  pubView = await get(Bt, '/api/cp/of/' + pubA); ok('قبل موافقة الطرفين على الظهور: العلاقة مخفية بملف اللاعب', pubView.ok && pubView.cp === null, JSON.stringify(pubView));
  const sA2 = await get(A, '/api/social-private/family'); const sB2 = await get(Bt, '/api/social-private/family');
  await fam(A, { action: 'couple-exposure', id: sA2.couple.id, enabled: true }); await fam(Bt, { action: 'couple-exposure', id: sB2.couple.id, enabled: true });
  pubView = await get(Bt, '/api/cp/of/' + pubA); ok('بعد موافقة الطرفين: تظهر بملف اللاعب', pubView.cp && pubView.cp.partner?.name === 'لاعب b', JSON.stringify(pubView).slice(0, 200));
  // هدية مباشرة من b إلى a: تنين أسطوري (50 ألف جوهرة) ← نقاط CP
  await grant(Bt, 60_000);
  const list = (await wsReq(Bt, [{ t: 'gift:list' }, { t: 'gift:find', q: 'لاعب a' }]));
  const g = list[0].gifts.find((x) => x.id === 'dragon'); const toId = list[1].players.find((x) => x.name === 'لاعب a')?.id;
  const sent = (await wsReq(Bt, [{ t: 'gift:send', to: toId, gift: 'dragon', qty: 1, seen: g.price, seenPolicy: list[0].policy.id, confirm: true, key: randomUUID() }]))[0];
  ok('الهدية انرسلت', sent.ok, sent.error);
  await sleep(500); cA = await get(A, '/api/cp/me'); const cB = await get(Bt, '/api/cp/me');
  ok('نقاط CP = قيمة الهدية (50 ألف) والمستوى صار 3', cA.cp.pts === 50000 && cA.cp.level === 3 && cB.cp.pts === 50000, JSON.stringify([cA.cp.pts, cA.cp.level, cB.cp.pts]));
  await p.goto(B + '/#/profile'); await sleep(3000);
  const cardTxt = await p.evaluate(() => document.querySelector('[data-cp-me] .cp58-card')?.textContent || '');
  ok('بطاقة CP بملفك: الشريك والمستوى والنقاط', /لاعب b/.test(cardTxt) && /Lv3/.test(cardTxt) && /50,000/.test(cardTxt), cardTxt.slice(0, 160));
  const cardEl = await p.$('[data-cp-me] .cp58-card'); if (cardEl) { await cardEl.scrollIntoViewIfNeeded(); await sleep(300); } await p.screenshot({ path: `${OUT}/cp-profile.png` });
  await bp.goto(B + '/#/u/' + pubA); await sleep(3500); const pc = await bp.$('[data-cp-of] .cp58-card'); if (pc) { await pc.scrollIntoViewIfNeeded(); await sleep(300); }
  ok('بملف لاعب a عند غيره: بطاقة CP تظهر', !!pc); await bp.screenshot({ path: `${OUT}/cp-public.png` });
  // الإنهاء
  const sA3 = await get(A, '/api/social-private/family'); const end = await fam(A, { action: 'couple-dissolve', id: sA3.couple.id });
  cA = await get(A, '/api/cp/me'); ok('أي طرف ينهي العلاقة وتنمسح بطاقة CP', end.ok !== false && !end.error && cA.cp === null, JSON.stringify(end).slice(0, 150));
  ok('ما فيه أخطاء صفحة', errs.length === 0, errs.join(' | '));
  await br.close(); console.log(`\nSUMMARY pass ${R.filter(Boolean).length} fail ${R.filter((x) => !x).length}`); process.exit(R.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
