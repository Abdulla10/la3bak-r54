// لقطات سريعة لملفي (للمراجعة البصرية). الاستخدام: node quickshot.cjs BASE COOKIEJAR OUT WIDTH
const { chromium } = require('playwright'); const fs = require('node:fs');
const [B, JAR, OUT, W = '390'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const ck = fs.readFileSync(JAR, 'utf8').split('\n').find((l) => l.includes('qa_s')).split('\t');
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: +W, height: 900 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ar' });
  await c.addCookies([{ name: 'qa_s', value: ck[6].trim(), domain: '127.0.0.1', path: '/' }]);
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '/#/profile'); await p.waitForTimeout(3500);
  await p.screenshot({ path: `${OUT}/profile-${W}-full.png`, fullPage: true });
  for (const r of ['visitors', 'invite']) { await p.evaluate((r) => window.__LA3BAK_NAV__.go('#/' + r), r); await p.waitForTimeout(1800); await p.screenshot({ path: `${OUT}/${r}-${W}.png` }); }
  console.log('errs', errs.join(' | ')); await b.close();
})();
