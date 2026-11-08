// R56: اختبار سلّم امتيازات VIP (1..15) ونوبل (N1..N9) على خادم محلي — بدون إنتاج وبدون عملات.
// الاستخدام: NODE_PATH=$(npm root -g) node acceptance-r56/vip-noble-r56.cjs http://127.0.0.1:4104 <مجلد الكوكيز> <مجلد اللقطات>
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const [B, JARS, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(B || '')) { console.error('محلي فقط'); process.exit(2); }
const jar = (u) => fs.readFileSync(`${JARS}/${u}.cj`, 'utf8').split('\n').find((l) => l.includes('qa_s')).split('\t')[6].trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const R = []; const ok = (n, c, x = '') => { R.push(!!c); console.log(c ? 'PASS' : 'FAIL', n, x ? '— ' + String(x).slice(0, 300) : ''); };
(async () => {
  const { effectStyle } = await import(path.resolve(__dirname, '../public/rank-perks-r56.js'));
  ok('المؤثرات تتدرج: VIP1 فضي، VIP8 بنفسجي، VIP15 أسطوري، N9 إمبراطوري يتفوق', effectStyle({ vip: 1 }).name === 'vip-silver' && effectStyle({ vip: 8 }).bubble === 'vip-purple' && effectStyle({ vip: 15 }).aura === 'vip-legend' && effectStyle({ vip: 15, noble: 9 }).name === 'nb-imperial' && !effectStyle({ vip: 0, noble: 0 }).name);
  const browser = await chromium.launch();
  const api = await browser.newContext(); await api.addCookies([{ name: 'qa_s', value: jar('a'), domain: '127.0.0.1', path: '/' }]);
  const rv = await (await api.request.get(B + '/api/rank-vip')).json();
  const pol = rv.rewards.policies; const byId = Object.fromEntries(pol.map((p) => [p.id, p]));
  const vipLevels = new Set(pol.filter((p) => p.system === 'vip').map((p) => p.rank)), nobleLevels = new Set(pol.filter((p) => p.system === 'noble').map((p) => p.rank));
  ok('مكافآت الرتب فيها مقتنيات لمستويات VIP العليا (4،6،7،9،10،12،13،14،15)', [4, 6, 7, 9, 10, 12, 13, 14, 15].every((r) => vipLevels.has(r)), [...vipLevels].join(','));
  ok('مكافآت نوبل موجودة لكل N4..N9', [4, 5, 6, 7, 8, 9].every((r) => nobleLevels.has(r)), [...nobleLevels].join(','));
  ok('السلّم الافتراضي ما فيه عملات ولا جواهر', pol.filter((p) => p.builtIn).every((p) => p.rewards.every((r) => r.type === 'item')));
  // الاستلام
  const target = pol.find((p) => p.builtIn && p.system === 'vip' && p.claimable);
  if (target) {
    const c = await api.request.post(B + `/api/rank-rewards/${target.id}/claim`, { headers: { Origin: B }, data: { fingerprint: target.fingerprint } });
    const cj = await c.json();
    ok(`استلام ${target.id} ينجح`, c.ok() && cj.status === 'claimed', JSON.stringify(cj));
    const again = await (await api.request.post(B + `/api/rank-rewards/${target.id}/claim`, { headers: { Origin: B }, data: {} })).json();
    ok('الاستلام مرة ثانية ما يعطي مرتين', again.dup === true, JSON.stringify(again));
  } else ok('فيه مستوى VIP جاهز للاستلام لحساب الاختبار', !!pol.find((p) => p.builtIn && p.system === 'vip' && p.status === 'claimed'), 'كل المستلم سابقًا');
  const locked = pol.find((p) => p.builtIn && p.system === 'vip' && !p.eligible);
  if (locked) { const r = await api.request.post(B + `/api/rank-rewards/${locked.id}/claim`, { headers: { Origin: B }, data: {} }); ok(`ما تقدر تستلم ${locked.id} قبل توصله`, !r.ok() || (await r.json()).status !== 'claimed'); }
  // الصفحات
  for (const w of [360, 390, 440]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 860 }, isMobile: true, hasTouch: true, locale: 'ar' });
    await ctx.addCookies([{ name: 'qa_s', value: jar('a'), domain: '127.0.0.1', path: '/' }]);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(B + '/#/vip'); await sleep(4000);
    const levels = await p.evaluate(() => [...document.querySelectorAll('[data-vn-action=perk]')].map((c) => (c.innerText.match(/VIP(\d+)/) || [])[1]).filter(Boolean).map(Number));
    const covered = new Set(levels);
    ok(`${w}: صفحة VIP فيها امتياز لكل مستوى من 1 إلى 15`, Array.from({ length: 15 }, (_, i) => i + 1).every((l) => covered.has(l)), [...covered].sort((a, b) => a - b).join(','));
    ok(`${w}: صفحة VIP بلا تمرير أفقي`, await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
    if (w === 390) { await p.screenshot({ path: `${OUT}/vip-390.png` }); await p.evaluate(() => scrollTo(0, 99999)); await sleep(500); await p.screenshot({ path: `${OUT}/vip-top-levels-390.png` }); }
    await p.goto(B + '/#/ranks'); await sleep(3500);
    const counts = [];
    for (let n = 1; n <= 9; n++) {
      const btn = await p.$(`xpath=//button[normalize-space(.)='N${n}']`); if (btn) { await btn.click(); await sleep(350); }
      counts.push(await p.evaluate(() => document.querySelectorAll('.vn-grid > *, [data-vn-action=perk]').length));
    }
    ok(`${w}: كل رتبة نوبل N1..N9 فيها امتيازين أو أكثر`, counts.every((c) => c >= 2), counts.join(','));
    const img = await p.evaluate(() => { const i = document.querySelector('.vn-rank-art'); return i ? i.complete && i.naturalWidth > 0 : false; });
    ok(`${w}: شارة N9 لها صورة`, img);
    if (w === 390) await p.screenshot({ path: `${OUT}/noble-n9-390.png` });
    ok(`${w}: بلا أخطاء صفحة`, errs.length === 0, errs.join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log('SUMMARY pass', R.filter(Boolean).length, 'fail', R.filter((x) => !x).length);
})().catch((e) => { console.error('ERR', e); process.exit(1); });
