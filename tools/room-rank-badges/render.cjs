const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = '/home/claude/r50/work/public', OUT = process.argv[2], kinds = process.argv[3].split(',');
const srv = http.createServer((q, s) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { s.statusCode = 404; return s.end(); } s.setHeader('content-type', f.endsWith('.html') ? 'text/html' : f.endsWith('js') || f.endsWith('mjs') ? 'text/javascript' : 'application/octet-stream'); s.end(d); }); }).listen(4198, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 640, height: 640 } });
  p.on('pageerror', (e) => console.log('ERR', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.log('CERR', m.text()); });
  await p.goto('http://127.0.0.1:4198/__badge-lab.html?' + Date.now()); await p.waitForFunction(() => window.ready);
  for (const k of kinds) { const url = await p.evaluate((k) => window.renderBadge(k), k); fs.writeFileSync(`${OUT}/badge-${k}.png`, Buffer.from(url.split(',')[1], 'base64')); console.log('ok', k); }
  await b.close(); srv.close();
});
