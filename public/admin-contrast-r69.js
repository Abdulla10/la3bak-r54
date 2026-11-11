/* R69zz4: لوحة التحكم داكنة بالكامل. بعض الأقسام القديمة (الرتب، المدفوعات، المزاد…) لها بطايق فاتحة وكلام رمادي ما يبين.
   هذا يمر على اللوحة ويحوّل أي خلفية فاتحة لداكنة وأي كلام غامق لفاتح — بدون ما نلمس ملفات الأقسام نفسها. */
const SKIP = new Set(['IMG', 'SVG', 'svg', 'CANVAS', 'VIDEO', 'PICTURE', 'PATH', 'path', 'OPTION', 'BR', 'HR', 'STYLE', 'SCRIPT']);
const FIELD = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
const rgb = (s) => { const m = String(s).match(/[\d.]+/g); return m ? { r: +m[0], g: +m[1], b: +m[2], a: m[3] === undefined ? 1 : +m[3] } : null; };
const lum = (c) => (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
const lightBg = (cs) => { const c = rgb(cs.backgroundColor); if (c && c.a > 0.35 && lum(c) > 0.72) return true; const im = cs.backgroundImage; if (im && im !== 'none' && im.includes('gradient')) { const cols = im.match(/rgba?\([^)]*\)/g) || []; return cols.length > 0 && cols.every((x) => { const k = rgb(x); return k && (k.a < 0.2 || lum(k) > 0.72); }) && cols.some((x) => { const k = rgb(x); return k && k.a >= 0.35; }); } return false; };
/** لون الخلفية الفعلي تحت العنصر (أول أب له خلفية) */
function bgLum(e) {
  for (let n = e; n && n.nodeType === 1; n = n.parentElement) {
    if (n.classList.contains('ad69-dk') || n.classList.contains('ad69-fld')) return 0.1;
    const cs = getComputedStyle(n), c = rgb(cs.backgroundColor);
    if (c && c.a > 0.35) return lum(c);
    const im = cs.backgroundImage; if (im && im !== 'none' && im.includes('gradient')) { const k = (im.match(/rgba?\([^)]*\)/g) || []).map(rgb).find((x) => x && x.a > 0.35); if (k) return lum(k); }
  }
  return 0.08; // خلفية اللوحة داكنة
}
function ensureStyle() {
  if (document.querySelector('style[data-ad69c]')) return;
  const st = document.createElement('style'); st.dataset.ad69c = '1';
  st.textContent = '.ad69-dk{background:linear-gradient(160deg,#27143f,#1c0e30)!important;color:#f4ecff!important;border-color:#ffffff26!important}'
    + '.ad69-dk.rv-secondary,button.ad69-dk{background:#2d1848!important}'
    + '.ad69-fld{background:#140a24!important;color:#fff!important;border-color:#ffffff33!important}.ad69-fld::placeholder{color:#b9a8d6!important}'
    + '.ad69-lt{color:#efe6ff!important}';
  document.head.appendChild(st);
}
function fix(root) {
  ensureStyle();
  const all = root.querySelectorAll('*');
  for (const e of all) {
    if (SKIP.has(e.tagName) || e.closest('[data-ad69-keep]')) continue;
    const cs = getComputedStyle(e);
    if (cs.display === 'none') continue;
    if (FIELD.has(e.tagName)) { if (lightBg(cs)) e.classList.add('ad69-fld'); continue; }
    if (!e.classList.contains('ad69-dk') && lightBg(cs)) e.classList.add('ad69-dk');
  }
  // بعد ما صارت الخلفيات داكنة: أي كلام غامق نخليه فاتح
  for (const e of all) {
    if (SKIP.has(e.tagName) || FIELD.has(e.tagName) || e.closest('[data-ad69-keep]')) continue;
    if (!e.firstChild || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(e); const c = rgb(cs.color); if (!c) continue;
    if (lum(c) < 0.45 && bgLum(e) < 0.4) e.classList.add('ad69-lt');
  }
}
/** يراقب اللوحة ويصلح الألوان كل ما تغيّر شي */
export function watchContrast(root) {
  if (!root || root.__ad69c) return; root.__ad69c = true;
  let t = 0; const run = () => { t = 0; try { fix(root); } catch { /* */ } };
  const later = () => { if (!t) t = setTimeout(run, 60); };
  new MutationObserver(later).observe(root, { childList: true, subtree: true });
  run(); setTimeout(run, 400); setTimeout(run, 1500);
}
