// R69zv: يدمج ملفات الواجهة (أكثر من 190 ملف) في ملفين: كود واحد وتنسيق واحد، مصغّرين.
// الناتج في public/b/ — والسيرفر يقدّم النسخة المدموجة تلقائياً لو كانت مبنية من نفس صفحات HTML الحالية.
// تشغيل: node scripts/bundle-client.mjs   (ينضاف تلقائياً مع npm run build)
import { build, transform } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'public'), OUT = path.join(PUB, 'b');
const PAGES = ['index.html', 'preview.html'].filter((p) => existsSync(path.join(PUB, p)));
const sha = (s) => createHash('sha256').update(s).digest('hex');
const local = (href) => href && href.startsWith('/') && !href.startsWith('//');
const fileOf = (href) => path.join(PUB, decodeURIComponent(href.split('?')[0].split('#')[0]));

/** يدمج ملفات CSS بالترتيب، ويحوّل روابط الصور لروابط كاملة، ويدخّل @import */
function cssOf(file, seen = new Set()) {
  if (seen.has(file)) return ''; seen.add(file); noteInput(file);
  const dir = '/' + path.relative(PUB, path.dirname(file)).split(path.sep).join('/');
  let css = readFileSync(file, 'utf8');
  css = css.replace(/@import\s+(?:url\()?\s*["']?([^"')]+)["']?\s*\)?\s*;/g, (m, p) => { if (/^(https?:)?\/\//.test(p)) return m; const f = p.startsWith('/') ? fileOf(p) : path.resolve(path.dirname(file), p.split('?')[0]); return existsSync(f) ? cssOf(f, seen) : m; });
  css = css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/g, (m, q, u) => { if (/^(data:|https?:|\/|#|about:)/.test(u)) return m; return `url(${q}${path.posix.normalize(dir + '/' + u)}${q})`; });
  return `/* ${path.relative(PUB, file)} */\n${css}\n`;
}

const stripQuery = { name: 'strip-query', setup(b) {
  const abs = (p) => p.startsWith(ROOT + path.sep) ? p : path.join(PUB, p);
  b.onResolve({ filter: /\?/ }, (a) => { const p = a.path.split('?')[0]; return { path: p.startsWith('/') ? abs(p) : path.resolve(a.resolveDir, p) }; });
  b.onResolve({ filter: /^\/[^/]/ }, (a) => (a.kind === 'entry-point' || a.path.startsWith(ROOT + path.sep) ? undefined : { path: path.join(PUB, a.path) }));
} };

rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true });
const manifest = { v: 1, builtAt: new Date().toISOString(), pages: {}, inputs: {} };
const noteInput = (f) => { const rel = path.relative(PUB, f).split(path.sep).join('/'); if (rel.startsWith('..') || manifest.inputs[rel]) return; manifest.inputs[rel] = createHash('sha1').update(readFileSync(f)).digest('hex').slice(0, 16); };
const jsCache = new Map();
for (const page of PAGES) {
  const html = readFileSync(path.join(PUB, page), 'utf8');
  const styles = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/g)].map((m) => [m[0], (m[0].match(/href=["']([^"']+)["']/) || [])[1]]).filter(([, h]) => local(h) && existsSync(fileOf(h)));
  const mods = [...html.matchAll(/<script\b[^>]*type=["']module["'][^>]*>\s*<\/script>/g)].map((m) => [m[0], (m[0].match(/src=["']([^"']+)["']/) || [])[1]]).filter(([, s]) => local(s) && existsSync(fileOf(s)));
  // الكود: مدخل واحد يستورد كل الملفات بنفس الترتيب
  const key = mods.map(([, s]) => s.split('?')[0]).join('|');
  let jsName = jsCache.get(key);
  if (!jsName) {
    const entry = path.join(OUT, `.entry-${sha(key).slice(0, 8)}.js`);
    writeFileSync(entry, mods.map(([, s]) => `import ${JSON.stringify(fileOf(s))};`).join('\n') + '\n');
    const r = await build({ entryPoints: [entry], bundle: true, format: 'esm', splitting: true, minify: true, target: ['es2020', 'safari15'], outdir: OUT, entryNames: 'app-[hash]', chunkNames: 'c-[hash]', plugins: [stripQuery], metafile: true, logLevel: 'error', legalComments: 'none', charset: 'utf8' });
    rmSync(entry);
    for (const inp of Object.keys(r.metafile.inputs)) { const f = path.resolve(ROOT, inp.split('?')[0]); if (existsSync(f) && f.startsWith(PUB)) noteInput(f); }
    jsName = Object.keys(r.metafile.outputs).find((o) => /app-[^/]+\.js$/.test(o)).split('/').pop();
    jsCache.set(key, jsName);
  }
  // التنسيق: ملف واحد
  let css = ''; for (const [, h] of styles) css += cssOf(fileOf(h));
  const min = (await transform(css, { loader: 'css', minify: true, target: ['safari15'], legalComments: 'none', charset: 'utf8' })).code;
  const cssName = `app-${sha(min).slice(0, 10)}.css`; writeFileSync(path.join(OUT, cssName), min);
  // الصفحة: نشيل الروابط القديمة ونحط الملفين
  let out = html; let first = true;
  for (const [tag] of styles) { out = out.replace(tag, first ? `<link rel="stylesheet" href="/b/${cssName}">` : ''); first = false; }
  first = true;
  for (const [tag] of mods) { out = out.replace(tag, first ? `<script type="module" src="/b/${jsName}"></script>` : ''); first = false; }
  out = out.replace(/<link\b[^>]*rel=["']modulepreload["'][^>]*>\s*/g, '').replace('</head>', `<link rel="modulepreload" href="/b/${jsName}"></head>`);
  out = out.replace(/\n\s*\n+/g, '\n');
  writeFileSync(path.join(OUT, page), out);
  manifest.pages[page] = { src: sha(html), js: jsName, css: cssName, styles: styles.length, modules: mods.length };
}
writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
const files = readdirSync(OUT); let bytes = 0; for (const f of files) bytes += readFileSync(path.join(OUT, f)).length;
console.log(`[bundle] ${PAGES.join(', ')} → ${files.length} files, ${(bytes / 1024).toFixed(0)} KB`, JSON.stringify(Object.fromEntries(Object.entries(manifest.pages).map(([k, v]) => [k, `${v.modules} js + ${v.styles} css`]))));
