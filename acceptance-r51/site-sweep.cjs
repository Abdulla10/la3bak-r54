// R51: فحص شامل لكل مسارات الواجهة على خادم محلي وحساب اختبار معزول (بدون إنتاج، بدون دفع، بدون كتابة مالية).
// لكل مسار × (جوال 390، جوال 360، كمبيوتر 1366): يرسم؟ أخطاء صفحة/كونسول؟ طلبات فاشلة من نفس الموقع؟ تمرير أفقي؟ RTL؟ زر رجوع؟
// ويجمع كل الروابط الداخلية ويتأكد إن كل رابط يفتح صفحة معروفة (مو «غير موجود»)، ويفحص مسارات API للقراءة.
// الاستخدام: NODE_PATH=$(npm root -g) node acceptance-r51/site-sweep.cjs http://127.0.0.1:4100 <مجلد اللقطات>
const { chromium } = require('playwright'); const fs = require('node:fs');
const [B, OUT = '/tmp/site-sweep'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ROUTES = ['home', 'profile', 'account', 'rooms', 'social-rooms', 'social-room/aaaaaaaaaaaaaaaa', 'wallet', 'notifications', 'notifications-internal', 'messages', 'friends', 'leaderboard', 'games', 'settings', 'shop', 'shop/packs/coins', 'shop/packs/gems', 'payments', 'ranks', 'vip', 'game/uno', 'hub/ludo', 'room/ZZZZ', 'join', 'city', 'lobby', 'offline', 'daily', 'challenge', 'events', 'tournaments', 'support', 'contact', 'auction', 'family', 'missions', 'visitors', 'invite', 'invite/aaaaaaaaaaaaaaaa', 'verification', 'rank-rewards', 'about', 'privacy', 'terms', 'agreement', 'community', 'post/aaaaaaaaaaaaaaaa', 'u/aaaaaaaaaaaaaaaa', 'no-such-page'];
const VIEWS = [['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }], ['360', { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true }], ['1366', { viewport: { width: 1366, height: 900 } }]];
const issues = []; const links = new Map(); const info = [];
const note = (sev, where, msg) => { issues.push({ sev, where, msg }); };
(async () => {
  const browser = await chromium.launch();
  for (const [vw, opts] of VIEWS) {
    const ctx = await browser.newContext({ ...opts, locale: 'ar' });
    const r = await ctx.request.post(B + '/api/session', { data: { name: 'فاحص الموقع' }, headers: { Origin: B } });
    if (!r.ok()) note('blocker', vw, 'تعذّر إنشاء جلسة اختبار ' + r.status());
    const p = await ctx.newPage(); let errs = []; let net = [];
    p.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 200)));
    p.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL_CONNECTION_FAILED|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
    p.on('response', (res) => { if (res.url().startsWith(B) && res.status() >= 400) net.push(res.status() + ' ' + res.url().replace(B, '')); });
    p.on('requestfailed', (q) => { if (q.url().startsWith(B) && !/aborted/i.test(q.failure()?.errorText || '')) net.push('failed ' + q.url().replace(B, '') + ' ' + q.failure()?.errorText); });
    p.on('dialog', (d) => { errs.push('dialog: ' + d.message()); d.dismiss(); });
    await p.goto(B + '/#/'); await sleep(2500);
    for (const rt of ROUTES) {
      errs = []; net = [];
      const h = '#/' + (rt === 'home' ? '' : rt);
      await p.evaluate((h) => window.__LA3BAK_NAV__.go(h), h); await sleep(1600);
      const s = await p.evaluate(() => {
        const d = document.documentElement; const main = document.querySelector('#view') || document.body;
        const wide = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > d.clientWidth + 2 || r.left < -2) && getComputedStyle(e).position !== 'fixed' && !e.closest('[aria-hidden="true"],.lb-drawer,dialog:not([open])'); }).slice(0, 3).map((e) => (e.className && String(e.className).slice(0, 50)) || e.tagName);
        return {
          page: document.body.dataset.page || '', text: (main.innerText || '').trim().length,
          hx: d.scrollWidth > d.clientWidth + 1, wide,
          rtl: getComputedStyle(document.querySelector('.lb-content,#view,main') || document.body).direction,
          back: !!document.querySelector('.lb-route-back:not([hidden]), #back:not([hidden])'),
          notFound: /غير موجود|الصفحة المطلوبة غير|not found/i.test(main.innerText || ''),
          links: [...document.querySelectorAll('a[href^="#/"]')].filter((a) => !a.closest('.lb-drawer')).map((a) => a.getAttribute('href')),
          drawer: [...document.querySelectorAll('.lb-drawer a[href^="#/"]')].map((a) => a.getAttribute('href')),
          imgsBroken: [...document.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('src') && !i.getAttribute('src').startsWith('http')).map((i) => i.getAttribute('src')).slice(0, 3),
        };
      });
      const where = `${vw} ${h}`;
      if (!s.text) note('high', where, 'الصفحة فاضية');
      if (s.hx) note('medium', where, 'تمرير أفقي: ' + s.wide.join(', '));
      if (s.rtl !== 'rtl') note('low', where, 'اتجاه المحتوى ' + s.rtl);
      if (rt !== 'home' && !s.back) note('low', where, 'ما فيه زر رجوع ظاهر');
      if (s.imgsBroken.length) note('medium', where, 'صور ما حمّلت: ' + s.imgsBroken.join(', '));
      const expected404 = /aaaaaaaa|ZZZZ|no-such/.test(rt);
      const realNet = net.filter((n) => !(expected404 && /^40[34] \/api\//.test(n)));
      if (errs.length) note('high', where, errs.join(' | '));
      if (realNet.length) note('medium', where, 'طلبات فاشلة: ' + [...new Set(realNet)].slice(0, 5).join(' | '));
      if (vw === '390') { info.push(`${h} → page=${s.page} نص=${s.text} رجوع=${s.back ? 'نعم' : 'لا'}${s.notFound ? ' (رسالة غير موجود)' : ''}`); for (const l of [...s.links, ...s.drawer]) { if (!links.has(l)) links.set(l, h); } }
      if (vw === '390') await p.screenshot({ path: `${OUT}/${rt.replace(/\//g, '_') || 'home'}-390.png` });
    }
    // الروابط الداخلية المجمّعة
    if (vw === '390') {
      for (const [l, from] of links) {
        await p.evaluate((h) => window.__LA3BAK_NAV__.go(h), l); await sleep(700);
        const s = await p.evaluate(() => ({ page: document.body.dataset.page || '', nf: /غير موجود|الصفحة المطلوبة غير/.test((document.querySelector('#view') || document.body).innerText || '') }));
        if (!s.page || s.page === 'not-found' || s.nf) note('high', `رابط ${l} (من ${from})`, 'يفتح صفحة غير موجودة');
      }
      info.push('روابط داخلية فُحصت: ' + links.size);
    }
    // API قراءة فقط بنفس الجلسة
    if (vw === '390') {
      for (const a of ['/api/me', '/api/account', '/api/status', '/api/games', '/api/rankings', '/api/leaderboard', '/api/online', '/api/auth/config', '/api/rank-vip', '/api/rank-vip/standings', '/api/vip-membership', '/api/rank-rewards', '/api/missions', '/api/payments/packs', '/api/social/config', '/api/social/rooms', '/api/community/notifs', '/api/notifications-internal', '/api/support/tickets', '/api/auction', '/api/account-tools/settings', '/api/social-private/family', '/readyz', '/healthz']) {
        const res = await ctx.request.get(B + a); info.push(`API ${a} → ${res.status()}`);
        if (res.status() >= 500) note('high', 'API ' + a, 'خطأ خادم ' + res.status());
      }
    }
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(OUT + '/sweep.json', JSON.stringify({ issues, info }, null, 1));
  for (const i of info) console.log('INFO', i);
  const uniq = new Map(); for (const i of issues) { const k = i.sev + '|' + i.where.replace(/^\d+ /, '') + '|' + i.msg; if (!uniq.has(k)) uniq.set(k, []); uniq.get(k).push(i.where.split(' ')[0]); }
  for (const [k, v] of uniq) console.log('ISSUE', k.split('|')[0], `[${v.join(',')}]`, k.split('|').slice(1).join(' — ').slice(0, 400));
  console.log('SUMMARY issues', issues.length, 'unique', uniq.size);
})().catch((e) => { console.error('ERR', e); process.exit(1); });
