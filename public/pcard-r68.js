/* R68z34: بطاقة الملف الشخصي (صور المالك). البطاقة 800×200، والصورة بمكان الدائرة لكل تصميم.
 * tint = لون البطاقة اللي ينصب شفاف على باقي الملف تحتها. */
const META = {
  lion: [124, 108, 62, '#b07cff'], ice: [122, 108, 62, '#4fb6ff'], sakura: [124, 104, 64.5, '#ff6fb8'], galaxy: [124, 102, 63.5, '#8f5bff'], dragon: [124, 102, 65, '#ff5a2a'],
  whale: [124, 102, 65, '#2f8bff'], city: [122, 102, 64, '#ffb347'], yacht: [124, 102, 61, '#ff9a3c'], wings: [126, 100, 66, '#d6b0ff'], castle: [126, 104, 66, '#a466ff'],
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const pcardOk = (css) => typeof css === 'string' && Object.hasOwn(META, css);
export const pcardTint = (css) => (pcardOk(css) ? META[css][3] : '');
/** face = HTML صورة اللاعب، name = الاسم، sub = سطر ثاني (الأيدي)، vip/level أرقام، extra = HTML شارات */
export function pcardHTML(css, { face = '', name = '', nameCls = '', sub = '', vip = 0, level = null, extra = '' } = {}) {
  if (!pcardOk(css)) return '';
  css68();
  const [cx, cy, r, tint] = META[css];
  const L = (cx - r) / 8, T = (cy - r) / 2, D = (2 * r) / 8;
  return `<div class="pc68" style="--pc-tint:${tint}" dir="rtl"><img class="pc68-art" src="/assets/art68/pcard/pc-${css}.webp" alt="" decoding="async">
  <span class="pc68-face" style="left:${L}%;top:${T}%;width:${D}%">${face}</span>
  <div class="pc68-body"><b class="pc68-name ${esc(nameCls)}">${esc(name)}</b>${sub ? `<small class="pc68-sub" dir="ltr">${sub}</small>` : ''}
   <div class="pc68-row">${level !== null && level !== undefined ? `<span class="pc68-lv">Lv.<b>${esc(level)}</b></span>` : ''}${vip > 0 ? `<span class="pc68-vip">👑 VIP<b>${esc(vip)}</b></span>` : ''}${extra}</div></div></div>`;
}
function css68() {
  if (document.getElementById('pc68-css')) return;
  const st = document.createElement('style'); st.id = 'pc68-css';
  st.textContent = `.pc68{position:relative;width:100%;aspect-ratio:4/1;margin:0 auto 10px;container-type:inline-size;filter:drop-shadow(0 8px 22px color-mix(in srgb,var(--pc-tint) 45%,transparent))}
.pc68-art{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2}
.pc68-face{position:absolute;aspect-ratio:1;border-radius:50%;overflow:hidden;z-index:1;display:grid;place-items:center;background:#120822}
.pc68-face>*,.pc68-face img,.pc68-face svg{width:100%!important;height:100%!important;max-width:none!important;border-radius:50%;object-fit:cover}
.pc68-face .avatar-wrap{--sz:100%!important}
.pc68-body{position:absolute;right:auto;left:27.6%;width:48.4%;top:26%;bottom:12%;z-index:3;display:flex;flex-direction:column;justify-content:center;gap:1.2cqw;padding:0 2.4cqw;text-align:right;color:#fff}
.pc68-name{font:900 4.6cqw/1.15 Cairo,Tahoma,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 2px 6px #000a}
.pc68-sub{font:700 2.9cqw/1 Arial,sans-serif;color:#e9dcff;opacity:.85;text-align:right}
.pc68-row{display:flex;gap:1.4cqw;align-items:center;flex-wrap:nowrap;overflow:hidden}
.pc68-lv,.pc68-vip{direction:ltr;display:inline-flex;align-items:center;gap:.6cqw;padding:.5cqw 1.8cqw;border-radius:99px;font:900 2.8cqw/1.2 Arial,sans-serif;white-space:nowrap}
.pc68-lv{background:linear-gradient(180deg,#7b3fe4,#3d1670);border:1px solid #c9a6ff}
.pc68-vip{background:linear-gradient(180deg,#3a2600,#120a00);color:#ffd36b;border:1px solid #e0a020}
.pc68-row img{height:5.4cqw;width:auto}
.pc68-tinted{background:linear-gradient(180deg,color-mix(in srgb,var(--pc-tint) 42%,transparent),color-mix(in srgb,var(--pc-tint) 20%,transparent) 60%,color-mix(in srgb,var(--pc-tint) 8%,transparent))!important;border-radius:20px}`;
  document.head.appendChild(st);
}
