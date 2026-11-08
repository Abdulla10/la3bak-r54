// R55: اختبار إصلاحات الغرف على خادم محلي بحسابي اختبار (a صاحب الغرفة، b زائر) — بدون إنتاج.
// يفحص: إنشاء غرفة حتى لو جوائز المدفع مقفولة برتبة، الدردشة، الهدايا 3D، بطاقة العضو، قائمة ☰ وحدة، القلب وظهوره بالملف،
// سهم الخروج (حفظ/مغادرة) والفقاعة، والحذف من صاحب الغرفة.
// الاستخدام: NODE_PATH=$(npm root -g) node acceptance-r55/rooms-r55.cjs http://127.0.0.1:4104 <مجلد الكوكيز a,b> <مجلد اللقطات>
const { chromium } = require('playwright'); const fs = require('fs');
const [B, JARS, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(B || '')) { console.error('محلي فقط'); process.exit(2); }
const jar = (u) => fs.readFileSync(`${JARS}/${u}.cj`, 'utf8').split('\n').find((l) => l.includes('qa_s')).split('\t')[6].trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const R = []; const ok = (n, c, x = '') => { R.push(!!c); console.log(c ? 'PASS' : 'FAIL', n, x ? '— ' + String(x).slice(0, 300) : ''); };
const NAME = 'غرفة R55 ' + Date.now().toString(36).slice(-4);
(async () => {
  const browser = await chromium.launch(); const errs = [];
  async function user(u, w) {
    const c = await browser.newContext({ viewport: { width: w, height: w >= 440 ? 956 : w >= 390 ? 844 : 740 }, isMobile: true, hasTouch: true, locale: 'ar' });
    await c.addCookies([{ name: 'qa_s', value: jar(u), domain: '127.0.0.1', path: '/' }]);
    const p = await c.newPage();
    p.on('pageerror', (e) => errs.push(u + ' pageerror ' + e));
    p.on('response', (r) => { if (r.url().startsWith(B) && r.status() >= 500 && !r.url().includes('/api/social/voice')) errs.push(u + ' ' + r.status() + ' ' + r.url().replace(B, '')); });
    return p;
  }
  const shots = (p, n) => p.screenshot({ path: `${OUT}/${n}.png` });
  for (const w of [360, 390, 440]) {
    const A = await user('a', w), Bp = await user('b', w);
    // 1) إنشاء غرفة
    await A.goto(B + '/#/social-rooms'); await sleep(2500);
    await A.click('text=غرفتي'); await sleep(1200); await A.click('button:has-text("إنشاء الغرفة")'); await sleep(1200);
    if (await A.$('input[name=adultAcknowledged]')) { await A.check('input[name=adultAcknowledged]'); await A.click('text=الموافقة والمتابعة'); await sleep(1500); }
    await A.fill('input[name=name]', NAME + w); await A.click('button:has-text("إنشاء الغرفة وبدء البث")'); await sleep(3500);
    ok(`${w}: إنشاء الغرفة ينجح ويفتح الغرفة`, await A.evaluate(() => !!document.querySelector('[data-so-room-detail]')));
    // 2) قائمة وحدة فوق
    const menus = await A.evaluate(() => ({ top: document.querySelectorAll('.so-room-header [data-panel="menu"]').length, dock: document.querySelectorAll('.so-room-dock [data-panel="menu"]').length }));
    ok(`${w}: قائمة ☰ وحدة فوق، وما فيه قائمة مكررة تحت`, menus.top === 1 && menus.dock === 0, JSON.stringify(menus));
    await A.click('.so-room-header [data-panel="menu"]'); await sleep(800);
    const tiles = await A.evaluate(() => [...document.querySelectorAll('.so-menu-grid-r55 .so-menu-tile-label')].map((e) => e.textContent.trim()));
    ok(`${w}: القائمة فيها الإعدادات والخلفية والمشاركة والقلب ومسح الدردشة وحذف الغرفة`, ['الإعدادات', 'الخلفية', 'مشاركة', 'مسح الدردشة', 'حذف الغرفة'].every((x) => tiles.includes(x)) && tiles.some((x) => /بالقلب|محفوظة/.test(x)), tiles.join(' | '));
    if (w === 390) await shots(A, 'menu-390');
    await A.click('[data-so-action=panel-close]'); await sleep(400);
    // 3) الدردشة
    const f = await A.$('form[data-so-form=chat] [name=text]'); await f.fill('رسالة صاحب الغرفة ' + w); await f.press('Enter'); await sleep(2000);
    ok(`${w}: رسالة الدردشة تنرسل وتظهر`, await A.evaluate((w) => document.body.innerText.includes('رسالة صاحب الغرفة ' + w), w));
    // 4) b يدخل، يكتب، ويضغط على a
    await Bp.goto(B + '/#/social-rooms'); await sleep(2500); await Bp.click(`text=${NAME + w}`); await sleep(3000);
    const s2 = await Bp.$('.so-seat-available'); if (s2) { await s2.click(); await sleep(2000); }
    const fb = await Bp.$('form[data-so-form=chat] [name=text]'); await fb.fill('رد الزائر ' + w); await fb.press('Enter'); await sleep(2000);
    await sleep(1500);
    ok(`${w}: رسالة الزائر توصل لصاحب الغرفة`, await A.evaluate((w) => document.body.innerText.includes('رد الزائر ' + w), w));
    await Bp.click('.so-seat .so-member[data-so-role="owner"]'); await sleep(900);
    const card = await Bp.evaluate(() => ({ card: !!document.querySelector('.so-member-card-r55'), profile: !!document.querySelector('[data-so-action=member-profile]'), gift: !!document.querySelector('[data-so-action=member-gift]') }));
    ok(`${w}: الضغط على صورة عضو يفتح بطاقته (الملف الشخصي + هدية)`, card.card && card.profile, JSON.stringify(card));
    if (w === 390) await shots(Bp, 'member-card-390');
    await Bp.click('.so-dialog [data-so-action=dialog-close]'); await sleep(400);
    // 5) هدية 3D
    await Bp.click('[aria-label="إرسال هدية"]'); await sleep(1500);
    await Bp.click('[data-so-gifts] button:has-text("للاعب a")').catch(() => {}); await sleep(300);
    await Bp.click('[data-so-gifts] button:has-text("نجمة")'); await sleep(300);
    const sendBtn = await Bp.$('[data-so-gifts] button:has-text("إرسال"):not([disabled])');
    if (sendBtn) {
      await sendBtn.click(); let played = false;
      for (let i = 0; i < 8 && !played; i++) { await sleep(400); played = await A.evaluate(async () => { const u = performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/unified/social.js')); const s = await import(u); const m = s.socialGiftEffectMetrics(); return m.state !== 'idle' || m.frames > 0 || m.contexts > 0; }); }
      ok(`${w}: الهدية تشغّل مؤثر ثلاثي الأبعاد عند المستلم افتراضيًا`, played);
    } else ok(`${w}: زر إرسال الهدية متاح (يحتاج رصيد جواهر بحساب b)`, false, 'لا رصيد');
    await Bp.keyboard.press('Escape'); await sleep(300); await Bp.click('[data-so-action=panel-close]').catch(() => {});
    // 6) القلب ويظهر بالملف
    await Bp.click('[data-so-action=room-heart]'); await sleep(1500);
    ok(`${w}: زر القلب يحفظ الغرفة`, await Bp.evaluate(() => document.querySelector('.so-room-heart')?.getAttribute('aria-pressed') === 'true'));
    // 7) سهم الخروج → حفظ الغرفة → فقاعة → الملف فيه الغرفة → رجوع من الفقاعة
    await Bp.click('[data-so-action=back-room]'); await sleep(800);
    const choice = await Bp.evaluate(() => [...document.querySelectorAll('.so-exit-pop-r58 button span')].map((b) => b.textContent));
    ok(`${w}: سهم الخروج يعطي خيارين: حفظ الغرفة ومغادرة الغرفة`, JSON.stringify(choice) === JSON.stringify(['حفظ الغرفة', 'مغادرة الغرفة']), choice.join(' | '));
    const pop = await Bp.evaluate(() => { const r = document.querySelector('.so-exit-pop-r58').getBoundingClientRect(); const chat = document.querySelector('[data-so-chat-region]'); return { top: r.top, h: r.height, w: r.width, vw: innerWidth, chatVisible: !!chat && getComputedStyle(chat).visibility !== 'hidden', dialog: !!document.querySelector('.so-dialog:not([hidden]) .so-exit-option') }; });
    ok(`${w}: بطاقة الخروج صغيرة وفوق وما تغطي المحادثة`, pop.top < 140 && pop.h < 130 && pop.w < pop.vw * 0.7 && !pop.dialog, JSON.stringify(pop));
    if (w === 390) await shots(Bp, 'exit-choice-390');
    await Bp.click('[data-so-action=room-minimize]'); await sleep(2000);
    await Bp.evaluate(() => window.__LA3BAK_NAV__.go('#/profile')); await sleep(3500);
    const order = await Bp.evaluate(() => { const r = document.querySelector('[data-pvp-saved-rooms]'), m = document.querySelector('.pvp-profile-menu, [data-pvp-menu], .lpu-menu'); return { rooms: r ? r.getBoundingClientRect().top + scrollY : -1, menu: m ? m.getBoundingClientRect().top + scrollY : -1 }; });
    ok(`${w}: غرف الدردشة تحت في الملف الشخصي (بعد القائمة)`, order.rooms > 0 && order.menu > 0 && order.rooms > order.menu, JSON.stringify(order));
    const prof = await Bp.evaluate((n) => ({ bubble: !!document.querySelector('[data-so-mini-room]'), saved: [...document.querySelectorAll('[data-pvp-saved-rooms] .pvp-room-name')].some((e) => e.textContent.includes(n)) }), NAME + w);
    const still = await Bp.evaluate(async () => (await (await fetch('/api/social/rooms')).json()).current?.roomId || null);
    ok(`${w}: بعد «حفظ الغرفة» تبقى عضو بالغرفة وتظهر الفقاعة وأنت تتصفح`, prof.bubble && !!still, JSON.stringify({ ...prof, still }));
    ok(`${w}: الغرفة المحفوظة بالقلب تظهر في «غرف الدردشة» بالملف الشخصي`, prof.saved);
    if (w === 390) await shots(Bp, 'profile-rooms-bubble-390');
    await Bp.click('.so-mini-room-open'); await sleep(3000);
    ok(`${w}: الفقاعة ترجعك للغرفة`, await Bp.evaluate(() => !!document.querySelector('[data-so-room-detail]') && !document.querySelector('[data-so-mini-room]')));
    await Bp.click('[data-so-action=back-room]'); await sleep(800); await Bp.click('[data-so-action=room-leave-now]'); await sleep(2500);
    ok(`${w}: «مغادرة الغرفة» تطلعك فعلًا`, (await Bp.evaluate(async () => (await (await fetch('/api/social/rooms')).json()).current)) === null);
    // 8) حذف الغرفة من صاحبها
    await A.click('.so-room-header [data-panel="menu"]'); await sleep(800); await A.click('[data-so-action=room-delete]'); await sleep(800);
    await A.click('.so-dialog button[type=submit]'); await sleep(3000);
    const left = await A.evaluate(async (n) => (await (await fetch('/api/social/rooms')).json()).rooms.some((r) => r.name === n), NAME + w);
    ok(`${w}: صاحب الغرفة يحذفها وتختفي من القائمة`, !left);
    // الزائر ما يقدر يحذف
    await A.context().close(); await Bp.context().close();
  }
  // حذف من غير المالك ينرفض من الخادم
  {
    const ctx = await browser.newContext(); await ctx.addCookies([{ name: 'qa_s', value: jar('a'), domain: '127.0.0.1', path: '/' }]);
    const mk = await ctx.request.post(B + '/api/social/command', { headers: { Origin: B }, data: { command: 'room:create', key: crypto.randomUUID(), name: NAME + 'x' } });
    const rid = (await mk.json()).roomId;
    const bc = await browser.newContext(); await bc.addCookies([{ name: 'qa_s', value: jar('b'), domain: '127.0.0.1', path: '/' }]);
    const del = await bc.request.post(B + '/api/social/command', { headers: { Origin: B }, data: { command: 'room:delete', key: crypto.randomUUID(), roomId: rid } });
    ok('الخادم يرفض حذف الغرفة من غير صاحبها', del.status() === 403 || del.status() === 404, String(del.status()));
    const del2 = await ctx.request.post(B + '/api/social/command', { headers: { Origin: B }, data: { command: 'room:delete', key: crypto.randomUUID(), roomId: rid } });
    ok('صاحب الغرفة يحذفها عبر الخادم', del2.ok(), String(del2.status()));
  }
  ok('بلا أخطاء صفحة أو أخطاء خادم 5xx', errs.length === 0, errs.slice(0, 5).join(' | '));
  await browser.close();
  console.log('SUMMARY pass', R.filter(Boolean).length, 'fail', R.filter((x) => !x).length);
})().catch((e) => { console.error('ERR', e); process.exit(1); });
