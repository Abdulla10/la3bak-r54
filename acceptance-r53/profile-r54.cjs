// R53: اختبار قائمة «الخاص بي» بعد التطوير على خادم محلي بحسابات اختبار (بدون إنتاج).
// يفحص: ترتيب القائمة حسب المرجع + أقسام LA3BAK كلها، قيم الحالة (VIP/نوبل/زوار جدد) من الخادم، بطاقة العائلة،
// فتح كل خيار (لا صفحات فارغة ولا «غير موجودة»)، الرجوع للملف مع موضع التمرير، رجوع المتصفح،
// «من الذي رآني» و«ادعُ الأصدقاء» ببيانات حقيقية وبدون تسرب بيانات حساب آخر، وخلو الكونسول والشبكة من الأخطاء.
// الاستخدام: NODE_PATH=$(npm root -g) node acceptance-r53/profile-r53.cjs http://127.0.0.1:4104 <مجلد ملفات الكوكي a,b,c> <مجلد اللقطات>
const { chromium } = require('playwright'); const fs = require('node:fs');
const [B, JARS, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const R = []; const ok = (n, c, x = '') => { R.push(!!c); console.log(c ? 'PASS' : 'FAIL', n, x ? '— ' + String(x).slice(0, 300) : ''); };
const jar = (u) => fs.readFileSync(`${JARS}/${u}.cj`, 'utf8').split('\n').find((l) => l.includes('qa_s')).split('\t')[6].trim();
// R54: الأصدقاء والعائلة والهدايا والدعوات والمظهر والإنجازات والمستوى والمكافآت والمهام صارت داخل قسم واحد «أصدقائي وتقدّمي»
const EXPECTED = ['من الذي رآني', 'منشوراتي', 'محفظتي', 'مركز العروض', 'VIP', 'ترتيب الرتبة', 'نوبل', 'المركز التجاري', 'أصدقائي وتقدّمي', 'الإعدادات'];
const HUB = ['الأصدقاء', 'العائلة والارتباط الافتراضي', 'الهدايا المستلمة', 'الهدايا المرسلة', 'ادعُ الأصدقاء', 'المظهر والمقتنيات', 'الشارات والألقاب والإنجازات', 'المستوى والخبرة', 'مكافآت الرتب', 'المهام'];
const visibleLabels = (p) => p.evaluate(() => [...document.querySelectorAll('[data-pvp-profile-list] .pvp-menu-label')].filter((e) => e.offsetParent).map((e) => e.childNodes[0].textContent.trim()));
const SETTINGS_LINKS = [['#/verification', 'توثيق الحساب'], ['#/support', 'المساعدة والدعم'], ['#/privacy', 'سياسة الخصوصية'], ['#/terms', 'الشروط والأحكام']];
async function ctxFor(browser, user, w) {
  const c = await browser.newContext({ viewport: { width: w, height: w >= 440 ? 956 : w >= 390 ? 844 : 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ar' });
  await c.addCookies([{ name: 'qa_s', value: jar(user), domain: '127.0.0.1', path: '/' }]);
  const p = await c.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror ' + e)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  p.on('response', (r) => { if (r.url().startsWith(B) && r.status() >= 400 && !/\/api\/me$/.test(r.url())) errs.push(r.status() + ' ' + r.url().replace(B, '')); });
  return { c, p, errs };
}
const route = (p) => p.evaluate(() => window.__LA3BAK_NAV__.hash);
const settle = async (p, want) => { const t = Date.now(); while (Date.now() - t < 8000) { if ((await route(p)) === want && await p.evaluate(() => !!document.body.dataset.page)) break; await sleep(120); } await sleep(700); };
(async () => {
  const browser = await chromium.launch();
  for (const w of [360, 390, 440]) {
    // زائر جديد حقيقي (حساب اختبار جديد يفتح ملف A العام) عشان تظهر علامة «جديد»
    { const v = await browser.newContext(); const s1 = await v.request.post(B + '/api/session', { data: { name: 'زائر ' + w }, headers: { Origin: B } }); if (!s1.ok()) throw Error('session');
      const aPub = (await (await (await browser.newContext({})).request.get(B + '/api/community/me', { headers: { cookie: 'qa_s=' + jar('a') } })).json()).pub;
      await v.request.get(B + '/api/community/user/' + aPub); await v.close(); }
    const { c, p, errs } = await ctxFor(browser, 'a', w);
    await p.goto(B + '/#/profile'); await settle(p, '#/profile'); await sleep(1500);
    await p.evaluate(() => { try { sessionStorage.removeItem('la3bak:profile-hub'); } catch {} });
    const labels = await visibleLabels(p);
    ok(`${w}: الملف الشخصي فيه ${EXPECTED.length} خيارات بس والقسم مسكّر`, JSON.stringify(labels) === JSON.stringify(EXPECTED) && await p.evaluate(() => document.querySelector('[data-pvp-hub-toggle]').getAttribute('aria-expanded') === 'false'), labels.join(' | '));
    if (w === 390) await p.screenshot({ path: `${OUT}/profile-collapsed-390.png`, fullPage: true });
    await p.click('[data-pvp-hub-toggle]'); await sleep(400);
    const opened = await visibleLabels(p);
    const want = [...EXPECTED.slice(0, 9), ...HUB, 'الإعدادات'];
    ok(`${w}: فتح «أصدقائي وتقدّمي» يعرض العشرة كلها بالترتيب`, JSON.stringify(opened) === JSON.stringify(want) && await p.evaluate(() => document.querySelector('[data-pvp-hub-toggle]').getAttribute('aria-expanded') === 'true'), opened.join(' | '));
    const vals = await p.evaluate(() => ({ vip: document.querySelector('[data-pvp-rank-value="vip"]')?.textContent, noble: document.querySelector('[data-pvp-rank-value="noble"]')?.textContent, visitors: document.querySelector('[data-pvp-visitors-value]')?.textContent, family: document.querySelector('[data-pvp-family-card] b')?.textContent, groups: document.querySelectorAll('.pvp-menu-r53 .pvp-menu-group').length }));
    ok(`${w}: قيم الحالة من الخادم (VIP 9، N2، زوار جدد) وبطاقة العائلة و4 مجموعات`, vals.vip === 'VIP 9' && vals.noble === 'N2' && /جديد/.test(vals.visitors || '') && vals.family === 'عائلة الاختبار' && vals.groups === 4, JSON.stringify(vals));
    ok(`${w}: بلا تمرير أفقي بالملف`, await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
    if (w === 390) await p.screenshot({ path: `${OUT}/after-profile-390.png`, fullPage: true });
    // كل خيار بصفحة: يفتح، ما هو فارغ ولا «غير موجودة»، والرجوع للملف بنفس موضع التمرير
    const hrefs = await p.evaluate(() => [...document.querySelectorAll('[data-pvp-profile-list] a.pvp-menu-row[href^="#/"]')].map((a) => a.getAttribute('href')));
    const bad = []; const scrollBad = [];
    for (const h of hrefs) {
      await p.evaluate((h) => document.querySelector(`[data-pvp-profile-list] a[href="${h}"]`).scrollIntoView({ block: 'center' }), h); await sleep(250);
      const y0 = await p.evaluate(() => Math.round(scrollY));
      await p.click(`[data-pvp-profile-list] a[href="${h}"]`); await settle(p, h); await sleep(600);
      const st = await p.evaluate(() => { const v = document.querySelector('#view') || document.body; const t = (v.innerText || '').trim(); return { len: t.length, nf: /غير موجود|مب موجودة|الصفحة المطلوبة غير/.test(t), page: document.body.dataset.page }; });
      if (!st.len || st.nf || (await route(p)) !== h) bad.push(`${h}:${JSON.stringify(st)}`);
      if (w === 390) await p.screenshot({ path: `${OUT}/page-${h.replace(/[#/]/g, '_')}-390.png` });
      await p.click('.lb-route-back:visible, .vn-back, #back:not([hidden])'); await settle(p, '#/profile'); await sleep(500);
      const y1 = await p.evaluate(() => Math.round(scrollY));
      if ((await route(p)) !== '#/profile') bad.push(`${h}: الرجوع وصل ${await route(p)}`);
      else if (Math.abs(y1 - y0) > 60) scrollBad.push(`${h}:${y0}→${y1}`);
    }
    ok(`${w}: كل خيارات الصفحات (${hrefs.length}) تفتح بمحتوى والرجوع يرجّع للملف`, bad.length === 0, bad.join(' ; '));
    ok(`${w}: موضع التمرير بالملف محفوظ بعد الرجوع من كل خيار`, scrollBad.length === 0, scrollBad.join(' ; '));
    // خيارات بأزرار داخل الملف
    const acts = [['edit-appearance', '.pvp-editor, [role="dialog"]'], ['tab', '.pvp-editor, [role="dialog"]'], ['rank-system', '#pvp-rank-overview, .pvp-rank-overview']];
    for (const [a, sel] of acts) {
      await p.evaluate(() => scrollTo(0, 0)); await sleep(200);
      await p.click(`[data-pvp-profile-list] [data-pvp="${a}"]`); await sleep(900);
      const opened = await p.evaluate((sel) => !!document.querySelector(sel), sel);
      ok(`${w}: خيار «${a}» يفتح قسمه`, opened);
      await p.keyboard.press('Escape'); await sleep(300);
      const close = await p.$('[data-pvp="collection-close"].pvp-icon-button, [data-pvp="editor-close"], [data-pvp="rank-close"], [data-pvp="cancel"]');
      if (close) { await close.click().catch(() => {}); await sleep(400); }
      if ((await route(p)) !== '#/profile') { await p.evaluate(() => window.__LA3BAK_NAV__.go('#/profile')); await settle(p, '#/profile'); }
    }
    for (const dir of ['incoming', 'outgoing']) {
      await p.evaluate(() => scrollTo(0, 0)); await sleep(200);
      await p.click(`[data-pvp-profile-list] [data-pvp-gift-log="${dir}"]`); await sleep(1200);
      ok(`${w}: «${dir === 'incoming' ? 'الهدايا المستلمة' : 'الهدايا المرسلة'}» يفتح سجل الهدايا`, await p.evaluate(() => !!document.querySelector('.pvp-gift-log, [data-pvp-gift-log-panel], .gift-log')) || (await route(p)) !== '#/profile', await route(p));
      if ((await route(p)) !== '#/profile') { await p.goBack(); await settle(p, '#/profile'); ok(`${w}: رجوع المتصفح من سجل الهدايا → الملف`, (await route(p)) === '#/profile', await route(p)); }
    }
    await p.click('[data-pvp-profile-list] [data-pvp="self-posts"]'); await sleep(1500);
    ok(`${w}: «منشوراتي» يفتح صفحتك بالمجتمع`, /^#\/u\//.test(await route(p)), await route(p));
    await p.goBack(); await settle(p, '#/profile');
    ok(`${w}: رجوع المتصفح من «منشوراتي» → الملف`, (await route(p)) === '#/profile', await route(p));
    // R53b: الرسائل مو بالملف، موجودة بالشريط السفلي
    ok(`${w}: «الرسائل» انشالت من الملف وباقية بالشريط السفلي`, await p.evaluate(() => !document.querySelector('[data-pvp-profile-list] a[href="#/messages"]') && !!document.querySelector('.lb-bottom a[href="#/messages"], nav a[href="#/messages"]')));
    // R53b: داخل الإعدادات: توثيق الحساب + المساعدة والدعم + سياسة الخصوصية + الشروط والأحكام + تسجيل الخروج
    await p.click('[data-pvp-profile-list] a[href="#/settings"]'); await settle(p, '#/settings'); await sleep(800);
    const st = await p.evaluate((L) => ({ links: L.map(([h, t]) => [...document.querySelectorAll(`[data-lb-page="settings"] a[href="${h}"]`)].some((a) => a.textContent.includes(t))), logout: !!document.querySelector('[data-lb-page="settings"] [data-act="auth-logout"]') }), SETTINGS_LINKS);
    ok(`${w}: الإعدادات فيها توثيق الحساب والمساعدة والدعم والخصوصية والشروط وتسجيل الخروج`, st.links.every(Boolean) && st.logout, JSON.stringify(st));
    if (w === 390) await p.screenshot({ path: `${OUT}/settings-390.png`, fullPage: true });
    const stBad = [];
    for (const [h] of SETTINGS_LINKS) {
      await p.evaluate((h) => document.querySelector(`[data-lb-page="settings"] a[href="${h}"]`).scrollIntoView({ block: 'center' }), h); await sleep(200);
      await p.click(`[data-lb-page="settings"] a[href="${h}"]`); await settle(p, h);
      const len = await p.evaluate(() => ((document.querySelector('#view') || document.body).innerText || '').trim().length);
      await p.click('.lb-route-back:visible, #back:not([hidden])'); await settle(p, '#/settings');
      if (!len || (await route(p)) !== '#/settings') stBad.push(h + ' → ' + (await route(p)));
    }
    ok(`${w}: كل رابط بالإعدادات يفتح ورجوعه للإعدادات`, stBad.length === 0, stBad.join(' ; '));
    await p.click('.lb-route-back:visible, #back:not([hidden])'); await settle(p, '#/profile');
    ok(`${w}: الإعدادات → رجوع → الملف`, (await route(p)) === '#/profile', await route(p));
    // من الذي رآني
    await p.click('[data-pvp-profile-list] a[href="#/visitors"]'); await settle(p, '#/visitors'); await sleep(800);
    const v = await p.evaluate(() => ({ rows: [...document.querySelectorAll('.ps-row b')].map((b) => b.textContent), total: document.querySelector('.ps-stats b')?.textContent }));
    ok(`${w}: «من الذي رآني» يعرض زوارك الحقيقيين (C باسمه لأنه مفعّل «إظهار نشاطي»، والباقي «زائر مخفي»)`, Number(v.total) === v.rows.length && v.rows.length >= 3 && v.rows.includes('لاعب c') && v.rows.includes('زائر مخفي'), JSON.stringify(v));
    if (w === 390) await p.screenshot({ path: `${OUT}/visitors-390.png` });
    await p.goBack(); await settle(p, '#/profile');
    ok(`${w}: رجوع المتصفح من «من الذي رآني» → الملف`, (await route(p)) === '#/profile');
    ok(`${w}: بعد فتح الصفحة تنمسح علامة «جديد» من القائمة`, await p.evaluate(() => !document.querySelector('[data-pvp-visitors-value]')) );
    // ادعُ الأصدقاء
    await p.click('[data-pvp-profile-list] a[href="#/invite"]'); await settle(p, '#/invite'); await sleep(800);
    const inv = await p.evaluate(() => ({ link: document.querySelector('[data-ps-link]')?.value || '', joined: document.querySelectorAll('.ps-row').length }));
    ok(`${w}: «ادعُ الأصدقاء» يعرض رابط دعوتك برقمك العام`, /\/#\/invite\/[A-Za-z0-9_-]{16}$/.test(inv.link), inv.link);
    if (w === 390) await p.screenshot({ path: `${OUT}/invite-390.png` });
    ok(`${w}: بلا أخطاء كونسول/شبكة`, errs.length === 0, errs.slice(0, 5).join(' | '));
    await c.close();
  }
  // عزل البيانات: حساب B ما يشوف زوار A ولا عائلته
  {
    const { c, p, errs } = await ctxFor(browser, 'b', 390);
    await p.goto(B + '/#/visitors'); await settle(p, '#/visitors'); await sleep(1000);
    const t = await p.evaluate(() => document.querySelector('.ps-stats b')?.textContent);
    ok('عزل: حساب B يشوف زواره هو (0) مو زوار A', t === '0', t);
    await p.goto(B + '/#/profile'); await settle(p, '#/profile'); await sleep(1500);
    ok('عزل: حساب B ما تطلع له بطاقة عائلة A', await p.evaluate(() => !document.querySelector('[data-pvp-family-card]')));
    // دعوة: حساب جديد D يفتح رابط دعوة B ويأكد
    await c.close();
    const d = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar' });
    const r = await d.request.post(B + '/api/session', { data: { name: 'لاعب جديد d' }, headers: { Origin: B } }); ok('إنشاء حساب اختبار جديد D', r.ok());
    const pb = await (await d.request.get(B + '/api/profile/invites', { headers: { cookie: '' } })).json().catch(() => null);
    const bc = await browser.newContext(); await bc.addCookies([{ name: 'qa_s', value: jar('b'), domain: '127.0.0.1', path: '/' }]);
    const bCode = (await (await bc.request.get(B + '/api/profile/invites')).json()).code;
    const dp = await d.newPage(); const derr = []; dp.on('pageerror', (e) => derr.push(String(e)));
    await dp.goto(B + '/#/invite/' + bCode); await sleep(2500);
    const claimBtn = await dp.$('[data-ps-claim]');
    ok('D: رابط دعوة B يعرض «تأكيد الانضمام عبر الدعوة»', !!claimBtn);
    if (claimBtn) { await claimBtn.click(); await sleep(1500); }
    const after = (await (await bc.request.get(B + '/api/profile/invites')).json());
    ok('B: يشوف D ضمن «انضموا عن طريقك» (بدون أي عملات)', after.joined.some((u) => u.name === 'لاعب جديد d') && after.rewards === null, JSON.stringify(after).slice(0, 200));
    const bw = await (await bc.request.get(B + '/api/wallet').catch(() => null))?.json?.().catch(() => null);
    ok('D: بلا أخطاء صفحة', derr.length === 0, derr.join(' | '));
    void pb; void bw; await d.close(); await bc.close();
  }
  await browser.close();
  console.log('SUMMARY pass', R.filter(Boolean).length, 'fail', R.filter((x) => !x).length);
})().catch((e) => { console.error('ERR', e); process.exit(1); });
