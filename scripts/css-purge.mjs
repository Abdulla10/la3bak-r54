/*
 * R71: يشيل قواعد التنسيق الميتة من الحزمة: أي قاعدة تحتاج «كلاس» ما ينذكر بأي مكان بالكود (public و src) — لا كامل ولا كبداية اسم يُركَّب.
 * آمن: الكلاسات داخل :not() / :is() / :where() ما تنحسب، والقواعد الخاصة (@keyframes و @font-face) تبقى كما هي.
 * CSS_PURGE=0 يطفيه.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const walk = (d, out = []) => { let list = []; try { list = readdirSync(d); } catch { return out; } for (const f of list) { const p = path.join(d, f); const s = statSync(p); if (s.isDirectory()) { if (!['b', 'node_modules'].includes(f)) walk(p, out); } else if (/\.(js|mjs|html|ts|json|webmanifest)$/.test(f)) out.push(p); } return out; };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function splitTop(s) { const out = []; let d = 0, st = 0, q = null; for (let i = 0; i < s.length; i++) { const c = s[i]; if (q) { if (c === q && s[i - 1] !== '\\') q = null; continue; } if (c === '"' || c === "'") q = c; else if (c === '(' || c === '[') d++; else if (c === ')' || c === ']') d--; else if (c === ',' && d === 0) { out.push(s.slice(st, i)); st = i + 1; } } out.push(s.slice(st)); return out; }
function topClasses(sel) { let depth = 0; const out = []; for (let i = 0; i < sel.length; i++) { const ch = sel[i]; if (ch === '(' || ch === '[') depth++; else if (ch === ')' || ch === ']') depth--; else if (depth === 0 && ch === '.') { const m = /^\.((?:\\.|[\w-])+)/.exec(sel.slice(i)); if (m) { out.push(m[1].replace(/\\/g, '')); i += m[0].length - 1; } } } return out; }

export function purgeCss(css, roots) {
  const corpus = roots.flatMap((r) => walk(r)).map((f) => readFileSync(f, 'utf8')).join('\n');
  const cache = new Map();
  const alive = (cls) => {
    if (cache.has(cls)) return cache.get(cls);
    let ok = corpus.includes(cls);
    if (!ok) { const parts = cls.split(/(?<=[-_])/); let pre = ''; for (let i = 0; i < parts.length - 1 && !ok; i++) { pre += parts[i]; if (pre.length >= 2 && new RegExp(esc(pre) + '(\\$\\{|[\'"`]\\s*\\+)').test(corpus)) ok = true; } }
    cache.set(cls, ok); return ok;
  };
  let removed = 0;
  const proc = (text) => {
    let out = '', i = 0;
    while (i < text.length) {
      const ob = text.indexOf('{', i); if (ob < 0) { out += text.slice(i); break; }
      const head = text.slice(i, ob); let d = 1, j = ob + 1, q = null;
      for (; j < text.length && d; j++) { const c = text[j]; if (q) { if (c === q && text[j - 1] !== '\\') q = null; continue; } if (c === '"' || c === "'") q = c; else if (c === '{') d++; else if (c === '}') d--; }
      const body = text.slice(ob + 1, j - 1), h = head.trim();
      if (/^@(media|supports|layer|container)\b/.test(h)) { const inner = proc(body); if (inner.trim()) out += h + '{' + inner + '}'; }
      else if (h.startsWith('@')) out += head + '{' + body + '}';
      else { const sels = splitTop(h).filter((s) => { if (topClasses(s).some((c) => !alive(c))) { removed++; return false; } return true; }); if (sels.length) out += sels.join(',') + '{' + body + '}'; }
      i = j;
    }
    return out;
  };
  const out = proc(css);
  return { css: out, removed };
}
