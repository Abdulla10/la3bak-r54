// R51: فحص زر الرجوع والتنقل (واجهة الموقع + زر المتصفح) على حساب اختبار معزول وخادم محلي.
// الاستخدام: NODE_PATH=$(npm root -g) node acceptance-r51/back-nav.cjs http://127.0.0.1:4100 <مجلد اللقطات> [mobile|desktop|both]
const { chromium } = require('playwright');
const fs = require('node:fs');
const [B, OUT = '/tmp/back-nav', MODE = 'both'] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const R = []; const ok = (n, c, x = '') => { R.push(!!c); console.log(c ? 'PASS' : 'FAIL', n, x ? '— ' + x : ''); };
const route = (p) => p.evaluate(() => (window.__LA3BAK_NAV__ || location).hash);
const page_ = (p) => p.evaluate(() => document.body.dataset.page || '');
const until = async (fn, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await fn()) return true; } catch {} await sleep(120); } return false; };
const settle = async (p, want) => { await until(async () => (await route(p)) === want && (await page_(p)) !== ''); await sleep(500); };

async function run(label, opts) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...opts, locale: 'ar' });
  const r = await ctx.request.post(B + '/api/session', { data: { name: 'فاحص التنقل' }, headers: { Origin: B } });
  ok(`${label}: جلسة اختبار معزولة`, r.ok(), String(r.status()));
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL_CONNECTION_FAILED/.test(m.text())) errs.push(m.text()); });
  // موارد خارجية (خطوط/CDN) محجوبة بشبكة بيئة الاختبار: نسجّلها منفصلة ولا نخلطها بأخطاء الموقع
  const ext = new Set(); p.on('requestfailed', (q) => { if (!q.url().startsWith(B)) ext.add(new URL(q.url()).host); else errs.push('failed ' + q.url()); });
  p.on('response', (res) => { if (res.status() >= 400 && res.url().startsWith(B) && !/\/api\/(account|me)/.test(res.url())) errs.push(res.status() + ' ' + res.url()); });
  // لو فشلت خطوة سابقة ورجعنا لمكان غلط، نرجع للملف عشان كل حالة تنفحص لحالها
  const ensure = async (h) => { if ((await route(p)) !== h) { await p.evaluate((h) => window.__LA3BAK_NAV__.go(h), h); await settle(p, h); } };
  const back = async () => { const b = await p.$('.lb-route-back:visible, #back:not([hidden])'); if (b) await b.click(); else await sleep(300); };
  // من قائمة «ملفي» نفسها (مو القائمة الجانبية المخفية)
  const clickRoute = async (href) => { const inList = await p.$(`[data-pvp-profile-list] a[href="${href}"]`); if (inList) await inList.click(); else await p.click(`main a[href="${href}"]:visible`); };

  // 1) الملف → VIP → رجوع (الواجهة) → الملف
  await p.goto(B + '/#/profile'); await settle(p, '#/profile');
  await p.evaluate(() => window.scrollTo(0, 400)); await sleep(300);
  const y0 = await p.evaluate(() => Math.round(window.scrollY));
  await clickRoute('#/vip'); await settle(p, '#/vip');
  ok(`${label}: الملف → VIP`, (await route(p)) === '#/vip');
  await p.screenshot({ path: `${OUT}/${label}-vip.png` });
  await back(); await settle(p, '#/profile');
  ok(`${label}: رجوع من VIP (زر الموقع) → الملف الشخصي`, (await route(p)) === '#/profile', await route(p));
  const y1 = await p.evaluate(() => Math.round(window.scrollY));
  ok(`${label}: موضع التمرير بالملف محفوظ بعد الرجوع`, Math.abs(y1 - y0) <= 40, `${y0} → ${y1}`);

  await ensure('#/profile');
  // 2) الملف → NOBLE → رجوع (الواجهة) → الملف
  await clickRoute('#/ranks'); await settle(p, '#/ranks');
  ok(`${label}: الملف → NOBLE`, (await route(p)) === '#/ranks');
  await back(); await settle(p, '#/profile');
  ok(`${label}: رجوع من NOBLE (زر الموقع) → الملف الشخصي`, (await route(p)) === '#/profile', await route(p));

  await ensure('#/profile');
  // 3) زر المتصفح
  await clickRoute('#/vip'); await settle(p, '#/vip');
  await p.goBack(); await settle(p, '#/profile');
  ok(`${label}: رجوع المتصفح من VIP → الملف`, (await route(p)) === '#/profile', await route(p));
  await p.goForward(); await settle(p, '#/vip');
  ok(`${label}: تقدّم المتصفح → VIP`, (await route(p)) === '#/vip', await route(p));
  await p.goBack(); await settle(p, '#/profile');
  await clickRoute('#/ranks'); await settle(p, '#/ranks');
  await p.goBack(); await settle(p, '#/profile');
  ok(`${label}: رجوع المتصفح من NOBLE → الملف`, (await route(p)) === '#/profile', await route(p));

  await ensure('#/profile');
  // 4) صفحة فرعية داخل NOBLE (R52: تفاصيل امتياز N4 ← «عرض في المتجر») ورجوع → NOBLE
  await clickRoute('#/ranks'); await settle(p, '#/ranks');
  // R58e: السيارات (اللي كانت عنصر متجر بـ N4) انشالت؛ ندوّر بكل مستويات نوبل على امتياز فيه رابط «عرض في المتجر»
  let sub = null;
  for (let tier = 1; tier <= 9 && !sub; tier++) {
    await p.click(`.nx-tabs button[data-lbr-tier="${tier}"]`).catch(() => {}); await sleep(400);
    const cards = (await p.$$('.nx-perk')).length;
    for (let k = 0; k < cards; k++) {
      await p.locator('.nx-perk').nth(k).click().catch(() => {}); await sleep(450);
      sub = await p.$('.vn-sheet a[href="#/shop"]'); if (sub) break;
      await p.click('.vn-sheet [data-vn-action="close"]').catch(() => {}); await sleep(250);
    }
  }
  if (sub) {
    await sub.click(); await settle(p, '#/shop');
    await back(); await settle(p, '#/ranks');
    ok(`${label}: الملف → NOBLE → صفحة فرعية (المتجر) → رجوع → NOBLE`, (await route(p)) === '#/ranks', await route(p));
    await back(); await settle(p, '#/profile');
    ok(`${label}: …ثم رجوع ثاني → الملف`, (await route(p)) === '#/profile', await route(p));
  } else console.log(`SKIP ${label}: ما فيه بالبيانات المحلية عنصر متجر مربوط برتبة نوبل (كانت السيارة بـ N4 وانشالت) — خطوة الرابط الفرعي ما تنطبق`);

  await ensure('#/profile');
  // 5) صفحة فرعية داخل VIP (R52: تفاصيل امتياز ← رابطه، مثل «مكافآت الرتب» أو «المتجر») ورجوع → VIP
  await clickRoute('#/vip'); await settle(p, '#/vip');
  let h = null;
  const count = await p.evaluate(() => document.querySelectorAll('.vx-perk').length);
  for (let i = 0; i < count && !h; i++) {
    await p.click(`.vx-perk >> nth=${i}`); await sleep(300);
    h = await p.evaluate(() => document.querySelector('.vn-sheet a[href^="#/"]')?.getAttribute('href') ?? null);
    if (!h) { await p.keyboard.press('Escape'); await sleep(200); }
  }
  if (h) {
    await p.click(`.vn-sheet a[href="${h}"]`); await settle(p, h);
    await back(); await settle(p, '#/vip');
    ok(`${label}: الملف → VIP → صفحة فرعية (${h}) → رجوع → VIP`, (await route(p)) === '#/vip', await route(p));
  } else ok(`${label}: VIP فيها امتياز برابط صفحة فرعية`, false, 'يحتاج إعداد الاختبار المحلي seed-local');
  await back(); await settle(p, '#/profile');
  ok(`${label}: VIP → رجوع → الملف`, (await route(p)) === '#/profile', await route(p));

  // 6) فتح مباشر بدون المرور بالملف: رجوع منطقي وآمن (الملف) وبدون حلقة
  for (const direct of ['#/vip', '#/ranks']) {
    const p2 = await ctx.newPage();
    await p2.goto(B + '/' + direct); await settle(p2, direct);
    await p2.click('.lb-route-back:visible'); await settle(p2, '#/profile');
    ok(`${label}: فتح ${direct} مباشرة ثم رجوع → الملف (مو الرئيسية)`, (await route(p2)) === '#/profile', await route(p2));
    // رجوع من الملف بعدها ما يرجعك لـ VIP/NOBLE (ما فيه حلقة)
    const len = await p2.evaluate(() => history.length);
    await p2.click('.lb-route-back, #back:not([hidden])').catch(() => {}); await sleep(900);
    const after = await route(p2);
    ok(`${label}: بعدها رجوع من الملف ما يرجّع لـ ${direct} (بدون حلقة)`, after !== direct, `${after} (history.length=${len})`);
    await p2.close();
  }

  // 7) تكرار: ضغط رابط الصفحة الحالية ما يضيف سجل، والتنقل ذهاب/إياب ما يتراكم
  await p.goto(B + '/#/profile'); await settle(p, '#/profile');
  const h0 = await p.evaluate(() => history.length);
  await clickRoute('#/vip'); await settle(p, '#/vip');
  await p.evaluate(() => window.__LA3BAK_NAV__.go('#/vip')); await sleep(300);
  const h1 = await p.evaluate(() => history.length);
  ok(`${label}: نفس الصفحة مرتين ما تكرر السجل`, h1 - h0 === 1, `${h0} → ${h1}`);
  for (let i = 0; i < 3; i++) { await back(); await settle(p, '#/profile'); await clickRoute('#/vip'); await settle(p, '#/vip'); }
  await back(); await settle(p, '#/profile');
  await p.goBack(); await sleep(900);
  ok(`${label}: بعد ذهاب/إياب متكرر، رجوع المتصفح من الملف ما يرجّع لـ VIP`, (await route(p)) !== '#/vip', await route(p));

  // 8) رابط للصفحة اللي جينا منها مباشرة = رجوع وما يكدّس السجل (رابط مُحقن يحاكي أي رابط داخلي للملف)
  await ensure('#/profile'); await clickRoute('#/ranks'); await settle(p, '#/ranks');
  const hA = await p.evaluate(() => history.length);
  await p.evaluate(() => { const a = document.createElement('a'); a.href = '#/profile'; a.id = 'r51-probe'; a.textContent = 'x'; a.style.cssText = 'position:fixed;top:200px;left:10px;z-index:99;padding:10px;background:#fff'; document.body.append(a); });
  await p.click('#r51-probe'); await settle(p, '#/profile');
  const st = await p.evaluate(() => ({ len: history.length, can: window.__LA3BAK_NAV__.canGoBack }));
  ok(`${label}: NOBLE → رابط للملف اللي جينا منه ما يكدّس السجل`, (await route(p)) === '#/profile' && st.len === hA, JSON.stringify({ hA, ...st }));
  await p.evaluate(() => document.getElementById('r51-probe')?.remove());
  // 9) مسارات عامة: الرئيسية → الألعاب → لعبة → رجوع → الألعاب → رجوع → الرئيسية
  await p.evaluate(() => window.__LA3BAK_NAV__.go('#/')); await settle(p, '#/');
  await p.click('.lb-bottom a[href="#/"]').catch(() => {});
  await p.evaluate(() => window.__LA3BAK_NAV__.go('#/games')); await settle(p, '#/games');
  await p.evaluate(() => window.scrollTo(0, 600)); await sleep(300);
  const gy = await p.evaluate(() => Math.round(window.scrollY));
  await p.evaluate(() => window.__LA3BAK_NAV__.go('#/game/uno')); await settle(p, '#/game/uno');
  await back(); await settle(p, '#/games');
  const gy2 = await p.evaluate(() => Math.round(window.scrollY));
  ok(`${label}: لعبة → رجوع → قائمة الألعاب مع موضع التمرير`, (await route(p)) === '#/games' && Math.abs(gy2 - gy) <= 40, `${gy} → ${gy2}`);
  await back(); await settle(p, '#/');
  ok(`${label}: الألعاب → رجوع → الرئيسية`, (await route(p)) === '#/', await route(p));
  // 10) تحديث الصفحة (reload) داخل VIP ثم رجوع → الملف (السجل باقٍ بعد التحديث)
  await p.evaluate(() => window.__LA3BAK_NAV__.go('#/profile')); await settle(p, '#/profile');
  await clickRoute('#/vip'); await settle(p, '#/vip');
  await p.reload(); await settle(p, '#/vip');
  await back(); await settle(p, '#/profile');
  ok(`${label}: VIP → تحديث الصفحة → رجوع → الملف`, (await route(p)) === '#/profile', await route(p));
  ok(`${label}: بلا أخطاء كونسول/شبكة`, errs.length === 0, errs.slice(0, 6).join(' | '));
  if (ext.size) console.log('INFO', label, 'موارد خارجية ما وصلت من بيئة الاختبار:', [...ext].join(', '));
  await browser.close();
}
(async () => {
  if (MODE !== 'desktop') await run('جوال-390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  if (MODE !== 'mobile') await run('كمبيوتر-1366', { viewport: { width: 1366, height: 900 } });
  console.log('SUMMARY pass', R.filter(Boolean).length, 'fail', R.filter((x) => !x).length);
})().catch((e) => { console.error('ERR', e); process.exit(1); });
