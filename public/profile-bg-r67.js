// R67aa: خلفية الملف الكاملة (زجاج غامق) — للخلفيات الأسطورية/الفخمة جدًا أو VIP 6+، وتنطفي من الإعدادات
let flat = null, flatAt = 0, busy = false, vipMin = 6;
try { fetch('/api/site-flags', { credentials: 'same-origin' }).then((r) => r.ok ? r.json() : null).then((j) => { if (j && Number.isSafeInteger(j.profileBgVip)) { vipMin = j.profileBgVip; sched(); } }).catch(() => {}); } catch {}
const H = document.documentElement;
async function flatSetting() {
  if (flat !== null && Date.now() - flatAt < 30000) return flat;
  try { const r = await fetch('/api/account-tools/settings', { credentials: 'same-origin' }); const j = r.ok ? await r.json() : null; flat = (j?.settings ?? j)?.flatProfileBg === true; } catch { flat = false; }
  flatAt = Date.now(); return flat;
}
addEventListener('la3bak:settings', () => { flat = null; });
const srcOf = (el) => {
  if (!el) return '';
  const img = el.querySelector('img[src]'); if (img) return img.currentSrc || img.src;
  for (const n of [el, ...el.querySelectorAll('*')]) { const b = getComputedStyle(n).backgroundImage; if (b && b !== 'none' && /url\(/.test(b)) return b; }
  return '';
};
const CLEAR = 'body, main.view, article.pv-profile, .cm-page, .pv-profile .hero.pvp-compact-head, .cm-prof';
const clearBg = (set) => { for (const el of document.querySelectorAll(set ? CLEAR : '[data-pf67-clr]')) { if (set) { if (el.style.getPropertyValue('background') !== 'transparent') { el.style.setProperty('background', 'transparent', 'important'); el.dataset.pf67Clr = '1'; } } else { el.style.removeProperty('background'); delete el.dataset.pf67Clr; } } };
const off = () => { if (H.classList.contains('pf67-full')) { H.classList.remove('pf67-full'); H.style.removeProperty('--pf67-bg'); clearBg(false); } };
const on = (src) => {
  if (!src) return off();
  const v = src.startsWith('url(') || src.includes('gradient(') ? src : `url("${src.replace(/"/g, '%22')}")`;
  if (H.style.getPropertyValue('--pf67-bg') !== v) H.style.setProperty('--pf67-bg', v);
  H.classList.add('pf67-full'); clearBg(true);
};
async function fillVisitor(el) {
  if (el.dataset.done) return; el.dataset.done = '1';
  try { const { bgLayer } = await import('/shop.js?v=r107'); el.innerHTML = bgLayer({ id: el.dataset.id, css: el.dataset.css || undefined, art: el.dataset.art || undefined }); } catch {}
}
async function check() {
  if (busy) return; busy = true;
  try {
    const vis = document.querySelector('.cm-prof .cm67-bg');
    if (vis) { await fillVisitor(vis); if (vis.dataset.full === '1') { await new Promise((r) => requestAnimationFrame(r)); return on(srcOf(vis)); } return off(); }
    const own = document.querySelector('.pv-profile .lpu-cover[data-pf67-full="1"]');
    const ok = own && own.dataset.pf67Flat !== '1' && (['legendary', 'ultra'].includes(own.dataset.pf67Rar) || Number(own.dataset.pf67Vip) >= vipMin);
    if (ok && !(await flatSetting())) return on(srcOf(own));
    off();
  } finally { busy = false; }
}
let t = 0; const sched = () => { clearTimeout(t); t = setTimeout(check, 60); };
new MutationObserver(sched).observe(document.body, { childList: true, subtree: true });
addEventListener('hashchange', sched); addEventListener('popstate', sched); sched();
