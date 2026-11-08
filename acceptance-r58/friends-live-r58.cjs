// R58f: شريط «أصدقائي» مثل انستغرام — الصديق اللي داخل غرفة يطلع عليه «في غرفة»، والضغط يدخلك نفس الغرفة مباشرة. خادم محلي فقط.
// الاستخدام: NODE_PATH=$(npm root -g) node acceptance-r58/friends-live-r58.cjs http://127.0.0.1:4104 <مجلد الكوكيز> <مجلد اللقطات>
// ملاحظة: تنبيه «دخل الموقع» يطلع مرة كل 10 دقايق لنفس الشخص — شغّل الاختبار بعد إعادة تشغيل الخادم المحلي.
const { chromium } = require('playwright'); const fs = require('fs'); const { randomUUID } = require('crypto');
const [B, JARS, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(B || '')) { console.error('محلي فقط'); process.exit(2); }
const jar = (u) => fs.readFileSync(`${JARS}/${u}.cj`, 'utf8').split('\n').find((l) => l.includes('qa_s')).split('\t')[6].trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const R = []; const ok = (n, c, x = '') => { R.push(!!c); console.log(c ? 'PASS' : 'FAIL', n, x ? '— ' + String(x).slice(0, 300) : ''); };
const H = (t) => ({ cookie: 'qa_s=' + t, Origin: B, 'Content-Type': 'application/json' });
const j = async (t, path, opt = {}) => { const r = await fetch(B + path, { ...opt, headers: H(t) }); return { status: r.status, j: await r.json().catch(() => ({})) }; };
(async () => {
  const A = jar('a'), Bt = jar('b');
  // صداقة a و b (إذا مو موجودة)
  let fr = await j(A, '/api/social-private/friends');
  if (!fr.j.list?.some((l) => l.user?.name === 'لاعب b')) {
    const s = await j(A, '/api/social-private/search?q=' + encodeURIComponent('لاعب b')); const pub = (s.j.list || s.j.results || []).find((p) => p.name === 'لاعب b')?.pub;
    if (pub) await j(A, '/api/social-private/friend-requests', { method: 'POST', body: JSON.stringify({ to: pub, key: randomUUID() }) });
    const rq = await j(Bt, '/api/social-private/friend-requests?direction=incoming'); const req = (rq.j.list || []).find((l) => l.user?.name === 'لاعب a');
    if (req) await j(Bt, `/api/social-private/friend-requests/${req.id}/accept`, { method: 'POST', body: JSON.stringify({ key: randomUUID() }) });
    fr = await j(A, '/api/social-private/friends');
  }
  // b يظهر تواجده (اختيار صريح) — نجرب بعدين لما يقفله
  await j(Bt, '/api/account-tools/settings', { method: 'PATCH', body: JSON.stringify({ showPresence: true }) });
  ok('a و b أصدقاء', fr.j.list?.some((l) => l.user?.name === 'لاعب b'), JSON.stringify(fr.j).slice(0, 200));
  // a يطلع من أي غرفة، b يسوي غرفة ويدخلها
  const cur = (await j(A, '/api/social/rooms')).j.current; if (cur?.roomId) await j(A, '/api/social/command', { method: 'POST', body: JSON.stringify({ command: 'room:leave', roomId: cur.roomId, key: randomUUID() }) });
  await j(Bt, '/api/social/command', { method: 'POST', body: JSON.stringify({ command: 'prefs:update', adultAcknowledged: true, key: randomUUID() }) });
  const bc = (await j(Bt, '/api/social/rooms')).j.current; if (bc?.roomId) await j(Bt, '/api/social/command', { method: 'POST', body: JSON.stringify({ command: 'room:leave', roomId: bc.roomId, key: randomUUID() }) });
  const mk = await j(Bt, '/api/social/command', { method: 'POST', body: JSON.stringify({ command: 'room:create', name: 'غرفة صديقك ' + Date.now().toString(36).slice(-4), key: randomUUID() }) });
  const roomId = mk.j.roomId; ok('b سوّى غرفة وهو داخلها', !!roomId, JSON.stringify(mk.j).slice(0, 150));
  const live = await j(A, '/api/friends/live');
  const bLive = live.j.list?.find((f) => f.name === 'لاعب b');
  ok('API: b يطلع «في غرفة» بنفس الغرفة', bLive?.room?.id === roomId, JSON.stringify(bLive));
  const browser = await chromium.launch();
  for (const w of [360, 390, 440]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 844 }, isMobile: true, hasTouch: true, locale: 'ar' });
    await ctx.addCookies([{ name: 'qa_s', value: A, domain: '127.0.0.1', path: '/' }]);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(B + '/#/'); await sleep(4000);
    const strip = await p.evaluate(() => { const s = document.querySelector('.fl-strip'); if (!s) return null; const it = s.querySelector('.fl-item.is-live'); return { live: !!it, name: it?.querySelector('b')?.textContent, badge: it?.querySelector('.fl-badge')?.textContent, overflow: document.documentElement.scrollWidth > innerWidth + 1 }; });
    ok(`${w}: الرئيسية فيها شريط الأصدقاء، وb عليه «في غرفة»`, strip && strip.live && strip.name === 'لاعب b' && strip.badge === 'في غرفة' && !strip.overflow, JSON.stringify(strip));
    if (w === 390) await p.screenshot({ path: `${OUT}/friends-home-390.png` });
    await p.click('.fl-item.is-live'); await sleep(4500);
    const inRoom = await p.evaluate(() => ({ hash: location.href, header: document.querySelector('.so-room-header h1')?.textContent }));
    const now = (await j(A, '/api/social/rooms')).j.current;
    ok(`${w}: الضغط على b يدخلك غرفته مباشرة (منضم فعليًا)`, now?.roomId === roomId && String(inRoom.header || '').startsWith('غرفة صديقك'), JSON.stringify({ ...inRoom, current: now?.roomId }));
    if (w === 390) await p.screenshot({ path: `${OUT}/friends-joined-390.png` });
    await j(A, '/api/social/command', { method: 'POST', body: JSON.stringify({ command: 'room:leave', roomId, key: randomUUID() }) });
    await p.goto(B + '/#/social-rooms'); await sleep(3500);
    ok(`${w}: صفحة الغرف فيها نفس الشريط`, await p.evaluate(() => !!document.querySelector('.so-directory-r30 .fl-strip .fl-item.is-live')));
    if (w === 390) await p.screenshot({ path: `${OUT}/friends-rooms-390.png` });
    ok(`${w}: بلا أخطاء صفحة`, errs.length === 0, errs.join(' | '));
    await ctx.close();
  }
  // الخصوصية: إذا b قفّل «إظهار التواجد» ما يطلع في غرفة
  const put = await j(Bt, '/api/account-tools/settings', { method: 'PATCH', body: JSON.stringify({ showPresence: false }) });
  const hid = (await j(A, '/api/friends/live')).j.list?.find((f) => f.name === 'لاعب b');
  ok('خصوصية: لو b مخفي تواجده، ما يطلع إنه في غرفة', put.status < 300 ? hid && !hid.room : true, JSON.stringify({ put: put.status, hid }));
  await j(Bt, '/api/account-tools/settings', { method: 'PATCH', body: JSON.stringify({ showPresence: true }) });
  await j(Bt, '/api/social/command', { method: 'POST', body: JSON.stringify({ command: 'room:delete', roomId, key: randomUUID() }) });
  // R58f: تنبيهات: صاحبك دخل الموقع / دخل غرفة
  { const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ar' }); await ctxA.addCookies([{ name: 'qa_s', value: A, domain: '127.0.0.1', path: '/' }]);
    const pa = await ctxA.newPage(); await pa.goto(B + '/#/'); await sleep(3500);
    const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 } }); await ctxB.addCookies([{ name: 'qa_s', value: Bt, domain: '127.0.0.1', path: '/' }]);
    const pb = await ctxB.newPage(); await pb.goto(B + '/#/'); await sleep(3000);
    const t1 = await pa.evaluate(() => [...document.querySelectorAll('.fl-toast')].map((t) => t.textContent).join(' | '));
    ok('تنبيه: «صاحبك لاعب b دخل الموقع» يطلع عند a', /صاحبك\s*لاعب b\s*دخل الموقع/.test(t1), t1);
    await pa.screenshot({ path: `${OUT}/toast-online-390.png` });
    const mk2 = await j(Bt, '/api/social/command', { method: 'POST', body: JSON.stringify({ command: 'room:create', name: 'سهرة الأصدقاء ' + Date.now().toString(36).slice(-4), key: randomUUID() }) });
    await sleep(1500);
    const t2 = await pa.evaluate(() => { const t = document.querySelector('.fl-toast.is-room'); return t ? { text: t.textContent, btn: !!t.querySelector('[data-fl-room]') } : null; });
    ok('تنبيه: «لاعب b دخل غرفة …» مع زر «ادخل معه»', t2 && /لاعب b\s*دخل غرفة\s*سهرة الأصدقاء/.test(t2.text) && t2.btn, JSON.stringify(t2));
    await pa.screenshot({ path: `${OUT}/toast-room-390.png` });
    if (t2?.btn) { await pa.click('.fl-toast.is-room [data-fl-room]'); await sleep(4000); const now = (await j(A, '/api/social/rooms')).j.current; ok('زر «ادخل معه» يدخلك الغرفة', now?.roomId === mk2.j.roomId, JSON.stringify({ now: now?.roomId, want: mk2.j.roomId })); await j(A, '/api/social/command', { method: 'POST', body: JSON.stringify({ command: 'room:leave', roomId: mk2.j.roomId, key: randomUUID() }) }); }
    await j(Bt, '/api/social/command', { method: 'POST', body: JSON.stringify({ command: 'room:delete', roomId: mk2.j.roomId, key: randomUUID() }) });
    await ctxA.close(); await ctxB.close(); }
  await browser.close();
  console.log('SUMMARY pass', R.filter(Boolean).length, 'fail', R.filter((x) => !x).length);
})().catch((e) => { console.error('ERR', e); process.exit(1); });
