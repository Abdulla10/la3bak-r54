// R52: لقطات VIP ونوبل للمقارنة مع فيديو المرجع (440×956 مثل آيفون المرجع، و390 و360) + فحوص وظيفية.
// الاستخدام: NODE_PATH=$(npm root -g) node acceptance-r52/shots.cjs http://127.0.0.1:4102 <ملف كوكي curl> <مجلد اللقطات>
const { chromium } = require('playwright'); const fs = require('node:fs');
const [B, JAR, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const R = []; const ok = (n, c, x = '') => { R.push(!!c); console.log(c ? 'PASS' : 'FAIL', n, x ? '— ' + x : ''); };
const cookie = fs.readFileSync(JAR, 'utf8').split('\n').find((l) => l.includes('qa_s')).split('\t');
const route = (p) => p.evaluate(() => window.__LA3BAK_NAV__.hash);
async function view(w, h, label) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ar' });
  await ctx.addCookies([{ name: 'qa_s', value: cookie[6].trim(), domain: '127.0.0.1', path: '/' }]);
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  p.on('response', (r) => { if (r.url().startsWith(B) && r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
  const noH = () => p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  await p.goto(B + '/#/profile'); await sleep(2500);
  // VIP من الملف
  await p.click('[data-pvp-profile-list] a[href="#/vip"]'); await sleep(2500);
  await p.screenshot({ path: `${OUT}/${label}-vip-top.png` });
  const v = await p.evaluate(() => ({
    title: document.querySelector('.vn-topbar h1')?.textContent, card: document.querySelector('.vx-card strong')?.textContent,
    exp: document.querySelector('.vx-exp-num')?.textContent, hint: document.querySelector('.vx-exp-hint')?.textContent,
    mine: document.querySelectorAll('.vx-section:nth-of-type(1) .vn-perk').length, perks: document.querySelectorAll('.vx-perk').length,
    heads: [...document.querySelectorAll('.vn-heading span')].map((e) => e.textContent), dock: !!document.querySelector('.vx-dock .vn-gold-btn'),
    shellTop: getComputedStyle(document.querySelector('.lb-topbar')).display, bottom: getComputedStyle(document.querySelector('.lb-bottom')).display,
    imgsBroken: [...document.querySelectorAll('.vn-page img')].filter((i) => i.complete && !i.naturalWidth).map((i) => i.src) }));
  ok(`${label}: VIP — العنوان والبطاقة والخبرة من الخادم`, v.title === 'VIP الخاص بي' && v.card === 'VIP9' && /186,844/.test(v.exp) && /313,156/.test(v.hint) && /VIP10/.test(v.hint), JSON.stringify(v).slice(0, 300));
  ok(`${label}: VIP — قسما «امتيازاتي» و«الامتيازات القادمة» بشبكة امتيازات`, v.heads.join('|') === 'امتيازاتي|الامتيازات القادمة' && v.perks >= 10, v.heads.join('|') + ' perks=' + v.perks);
  ok(`${label}: VIP — صفحة داخلية داكنة (بدون شريط الموقع) وشريط شحن ثابت`, v.shellTop === 'none' && v.bottom === 'none' && v.dock);
  ok(`${label}: VIP — الصور حمّلت`, v.imgsBroken.length === 0, v.imgsBroken.join(', '));
  ok(`${label}: VIP — بلا تمرير أفقي`, await noH());
  const sticky1 = await p.evaluate(() => document.querySelector('.vx-card').getBoundingClientRect().top);
  await p.evaluate(() => window.scrollTo(0, 700)); await sleep(500);
  const sticky2 = await p.evaluate(() => document.querySelector('.vx-card').getBoundingClientRect().top);
  ok(`${label}: VIP — البطاقة ثابتة أعلى الصفحة أثناء التمرير`, Math.abs(sticky1 - sticky2) < 4, `${sticky1} → ${sticky2}`);
  await p.screenshot({ path: `${OUT}/${label}-vip-scroll.png` });
  await p.evaluate(() => window.scrollTo(0, 99999)); await sleep(500);
  await p.screenshot({ path: `${OUT}/${label}-vip-bottom.png` });
  // ورقة امتياز
  await p.click('.vx-perk >> nth=1'); await sleep(500);
  const sheet = await p.evaluate(() => ({ t: document.querySelector('.vn-sheet h2')?.textContent, st: document.querySelector('.vn-state')?.textContent }));
  ok(`${label}: VIP — الضغط على امتياز يفتح تفاصيله`, !!sheet.t && !!sheet.st, JSON.stringify(sheet));
  await p.screenshot({ path: `${OUT}/${label}-vip-perk.png` });
  await p.keyboard.press('Escape'); await sleep(300);
  // اشحن الآن → الباقات من الخادم → معاينة الشروط
  await p.click('[data-vn-action="charge"]'); await sleep(500);
  const packs = await p.evaluate(() => [...document.querySelectorAll('.vx-pack b')].map((b) => b.textContent));
  ok(`${label}: VIP — «اشحن الآن» يعرض باقات VIP المعتمدة`, packs.length === 2, packs.join(','));
  await p.screenshot({ path: `${OUT}/${label}-vip-charge.png` });
  await p.click('[data-lbv-action="preview"][data-lbv-id="vip-month"]'); await sleep(1200);
  const dlg = await p.evaluate(() => !!document.querySelector('dialog.lbv-confirm[open]'));
  ok(`${label}: VIP — اختيار باقة يفتح تأكيد الشروط من الخادم (بدون شراء)`, dlg);
  await p.screenshot({ path: `${OUT}/${label}-vip-confirm.png` });
  if (dlg) { await p.click('[data-lbv-action="cancel"]'); await sleep(400); }
  await p.click('[data-vn-action="close"] >> nth=0').catch(() => {}); await sleep(300);
  // رجوع → الملف
  await p.click('.vn-back'); await sleep(1500);
  ok(`${label}: VIP — رجوع → الملف الشخصي`, (await route(p)) === '#/profile', await route(p));
  // نوبل
  await p.click('[data-pvp-profile-list] a[href="#/ranks"]'); await sleep(2500);
  await p.screenshot({ path: `${OUT}/${label}-noble-top.png` });
  const n = await p.evaluate(() => ({
    title: document.querySelector('.vn-topbar h1')?.textContent, tabs: [...document.querySelectorAll('.nx-switch button')].map((b) => b.textContent),
    chip: document.querySelector('.nx-chip')?.textContent, pts: document.querySelector('.nx-card-id strong')?.textContent, status: document.querySelector('.nx-status')?.textContent,
    levels: [...document.querySelectorAll('.nx-tabs button')].map((b) => b.textContent), on: document.querySelector('.nx-tabs .is-on')?.textContent,
    perks: [...document.querySelectorAll('.nx-perk b')].map((b) => b.textContent), rail: [...document.querySelectorAll('.nx-rail-vals span')].map((s) => s.textContent).join(' ') }));
  ok(`${label}: نوبل — «مركز نوبل» بتبويبي الخاص بي/الترتيب`, n.title === 'مركز نوبل' && n.tabs.join('|') === 'الخاص بي|الترتيب', JSON.stringify(n).slice(0, 200));
  ok(`${label}: نوبل — البطاقة: الرتبة N2 والنقاط والحالة والشريط من الخادم`, /N2/.test(n.chip) && /25,285/.test(n.pts) && /N3/.test(n.status) && n.rail === '0 10k 20k 40k 100k 200k 500k 1m 2m 4m', JSON.stringify(n).slice(0, 400));
  ok(`${label}: نوبل — اختيار الرتب N1 إلى N9 ومحدد على رتبتك`, n.levels.join(',') === 'N1,N2,N3,N4,N5,N6,N7,N8,N9' && n.on === 'N2', n.levels.join(',') + ' on=' + n.on);
  ok(`${label}: نوبل N2 — الشارة + مكافأة الرتبة + عنصر المتجر المشروط`, n.perks.length === 3 && n.perks[0] === 'شارة', n.perks.join(','));
  ok(`${label}: نوبل — بلا تمرير أفقي`, await noH());
  await p.click('.nx-tabs button >> text=N1'); await sleep(400);
  const n1 = await p.evaluate(() => [...document.querySelectorAll('.nx-perk b')].map((b) => b.textContent));
  ok(`${label}: نوبل N1 — شارة + إطار + عملات`, n1.length === 3, n1.join(','));
  await p.evaluate(() => window.scrollTo(0, 420)); await sleep(400);
  await p.screenshot({ path: `${OUT}/${label}-noble-n1.png` });
  await p.click('.nx-tabs button >> text=N7'); await sleep(400);
  await p.screenshot({ path: `${OUT}/${label}-noble-n7.png` });
  await p.click('.nx-tabs button >> text=N4'); await sleep(400);
  const n4 = await p.evaluate(() => ({ perks: [...document.querySelectorAll('.nx-perk b')].map((b) => b.textContent), play: !!document.querySelector('.nx-perk .vn-play') }));
  ok(`${label}: نوبل N4 — مركبة دخول (عنصر متجر حقيقي) بعلامة تشغيل`, n4.perks.includes('مركبة دخول') && n4.play, JSON.stringify(n4));
  await p.screenshot({ path: `${OUT}/${label}-noble-n4.png` });
  // تفاصيل امتياز → «عرض في المتجر» صفحة فرعية → رجوع → نوبل
  await p.click('.nx-perk >> text=مركبة دخول'); await sleep(500);
  await p.screenshot({ path: `${OUT}/${label}-noble-perk.png` });
  const link = await p.$('.vn-sheet a[href="#/shop"]');
  ok(`${label}: نوبل — تفاصيل العنصر فيها رابط المتجر`, !!link);
  if (link) { await link.click(); await sleep(1500); await p.click('.lb-route-back:visible'); await sleep(1800); ok(`${label}: نوبل → المتجر (صفحة فرعية) → رجوع → نوبل`, (await route(p)) === '#/ranks', await route(p)); }
  // المساعدة والسجل والترتيب
  await p.click('[data-vn-action="help"]'); await sleep(400);
  ok(`${label}: نوبل — ورقة «عن مركز نوبل» بالحدود التسع`, await p.evaluate(() => document.querySelectorAll('.nx-tiers li').length === 9));
  await p.screenshot({ path: `${OUT}/${label}-noble-help.png` });
  await p.keyboard.press('Escape'); await sleep(300);
  await p.click('[data-vn-action="history"]'); await sleep(400);
  ok(`${label}: نوبل — سجل النقاط من الخادم`, await p.evaluate(() => /25,285/.test(document.querySelector('.vn-sheet')?.innerText || '')));
  await p.keyboard.press('Escape'); await sleep(300);
  await p.click('.nx-switch button >> text=الترتيب'); await sleep(1500);
  ok(`${label}: نوبل — تبويب الترتيب يعرض اللاعبين`, await p.evaluate(() => document.querySelectorAll('.nx-board li').length >= 1));
  await p.screenshot({ path: `${OUT}/${label}-noble-ranking.png` });
  await p.click('.nx-switch button >> text=الخاص بي'); await sleep(400);
  await p.click('.vn-back'); await sleep(1500);
  ok(`${label}: نوبل — رجوع → الملف الشخصي`, (await route(p)) === '#/profile', await route(p));
  ok(`${label}: بلا أخطاء كونسول/شبكة`, errs.length === 0, errs.slice(0, 4).join(' | '));
  await browser.close();
}
(async () => {
  await view(440, 956, 'ref440');
  await view(390, 844, 'm390');
  await view(360, 740, 'm360');
  console.log('SUMMARY pass', R.filter(Boolean).length, 'fail', R.filter((x) => !x).length);
})().catch((e) => { console.error('ERR', e); process.exit(1); });
