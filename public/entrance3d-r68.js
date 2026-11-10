/* R68z31: الدخولية ثلاثية الأبعاد — صورة المالك بطبقتين (الخلفية + الشكل البارز -fg)
 * داخل مشهد CSS 3D: تجي من بعيد وتلف، والشكل يبرز قدام الخلفية (عمق حقيقي مع الدوران)، وشرار يطير قدامهم. */
const TINT = { 'ent-dragon': '#ff8a2a', 'ent-phoenix': '#ff9a4a', 'ent-whale': '#5fb8ff', 'ent-yacht': '#5fb8ff', 'ent-pegasus': '#c48bff', 'ent-moto': '#c46bff', 'ent-portal': '#c48bff', 'ent-royalcar': '#ffcb47', 'ent-jet': '#ffcb47', 'ent-carriage': '#ffcb47' };
export const is3D = (id) => /^ent-[a-z]+$/.test(String(id || ''));
export function entrance3DNode(id, src, label, { loop = false } = {}) {
  css();
  const fg = src.replace(/\.webp$/, '-fg.webp');
  const tint = TINT[id] || '#ffcb47';
  const el = document.createElement('div'); el.className = 'e3d' + (loop ? ' e3d-loop' : ''); el.style.setProperty('--t', tint); el.setAttribute('aria-hidden', loop ? 'true' : 'false');
  let sparks = ''; for (let k = 0; k < 16; k++) sparks += `<i style="--x:${(k * 37) % 100}%;--d:${(k * 0.23) % 2.2}s;--s:${0.6 + (k % 4) * 0.25}"></i>`;
  el.innerHTML = `${loop ? '' : `<img class="e3d-blur" src="${src}" alt="" decoding="async">`}<div class="e3d-stage"><div class="e3d-glow"></div><img class="e3d-bg" src="${src}" alt="" decoding="async"><div class="e3d-sweep"></div><img class="e3d-fg" src="${fg}" alt="" decoding="async"><div class="e3d-sp">${sparks}</div></div>${label ? `<span class="e3d-name"></span>` : ''}`;
  if (label) el.querySelector('.e3d-name').textContent = label;
  const bgi = el.querySelector('.e3d-bg'); const ar = () => { if (bgi.naturalWidth) el.style.setProperty('--ar', String(bgi.naturalWidth / bgi.naturalHeight)); }; if (bgi.complete) ar(); else bgi.addEventListener('load', ar, { once: true });
  return el;
}
function css() {
  if (document.getElementById('e3d-css')) return;
  const st = document.createElement('style'); st.id = 'e3d-css';
  st.textContent = `
/* R68z38: تعبّي الشاشة كاملة وبدون قص — الصورة كاملة بعرض الشاشة، وخلفها نسخة مموّهة تغطي الشاشة */
.e3d{direction:ltr;position:fixed;inset:0;z-index:9000;pointer-events:none;perspective:900px;perspective-origin:50% 45%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;overflow:hidden;animation:e3dVeil 6.2s ease both}
.e3d .e3d-blur{position:absolute!important;inset:-10%!important;width:120%!important;height:120%!important;max-width:none!important;max-height:none!important;object-fit:cover!important;filter:blur(30px) saturate(1.4) brightness(.5)!important;opacity:.9}
.e3d-stage{position:relative;transform-style:preserve-3d}
.e3d:not(.e3d-loop) .e3d-stage{align-self:flex-start;height:34vh;width:auto;aspect-ratio:var(--ar,4.7);max-width:none;animation:e3dPan 6.2s cubic-bezier(.3,.1,.3,1) both}
.e3d:not(.e3d-loop) .e3d-stage>.e3d-bg{height:100%!important;width:100%!important;object-fit:cover}
@keyframes e3dPan{0%{transform:translate3d(0,60px,-700px) rotateX(14deg);opacity:0}14%{transform:translate3d(0,0,0) rotateX(4deg);opacity:1}50%{transform:translate3d(calc((100vw - 100%) / 2),-6px,40px) rotateX(0deg)}84%{transform:translate3d(calc(100vw - 100%),0,0) rotateX(-3deg);opacity:1}100%{transform:translate3d(calc(100vw - 100%),0,260px) scale(1.1);opacity:0}}
.e3d-stage>.e3d-bg{position:relative!important;inset:auto!important;display:block;height:auto!important}
@keyframes e3dVeil{0%{opacity:0}10%,85%{opacity:1}100%{opacity:0}}
.e3d-loop .e3d-stage{animation:e3dLoop 6s ease-in-out infinite}
.e3d-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;border-radius:0;transform:translateZ(0);box-shadow:0 0 60px color-mix(in srgb,var(--t) 55%,transparent);filter:saturate(1.1) brightness(.92)}
.e3d-fg{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;transform:translateZ(70px) scale(.915);filter:drop-shadow(0 14px 18px #000a) saturate(1.2) brightness(1.08);animation:e3dBob 1.7s ease-in-out infinite alternate}
.e3d-glow{position:absolute;inset:-18% -6%;transform:translateZ(-60px) scale(1.08);background:radial-gradient(closest-side,color-mix(in srgb,var(--t) 55%,transparent),transparent);filter:blur(10px);opacity:.85}
.e3d-sweep{position:absolute;inset:0;border-radius:0;overflow:hidden;transform:translateZ(1px)}
.e3d-sweep::after{content:"";position:absolute;top:-20%;bottom:-20%;width:28%;left:-40%;background:linear-gradient(100deg,transparent,#ffffff55,transparent);animation:e3dSweep 2.4s .6s ease-in-out infinite}
.e3d-sp{position:absolute;inset:0;transform:translateZ(120px) scale(.87);transform-style:preserve-3d}
.e3d-sp i{position:absolute;left:var(--x);bottom:8%;width:calc(6px*var(--s));height:calc(6px*var(--s));border-radius:50%;background:radial-gradient(circle,#fff,var(--t) 45%,transparent 70%);opacity:0;animation:e3dSpark 2.2s var(--d) ease-out infinite}
.e3d-name{direction:rtl;position:relative;z-index:2;transform:translateZ(0);max-width:90%;padding:5px 16px;border-radius:999px;font:800 14px/1.4 Cairo,Tahoma,sans-serif;color:#fff1c5;background:linear-gradient(180deg,#3a1670ee,#1c0a38ee);border:1.5px solid #c9a24a;box-shadow:0 0 16px color-mix(in srgb,var(--t) 50%,transparent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;animation:e3dName 6.2s ease both}
@keyframes e3dIn{0%{transform:translate3d(0,60px,-1100px) rotateY(-50deg) rotateX(16deg);opacity:0}14%{opacity:1}22%{transform:translate3d(0,0,40px) rotateY(-14deg) rotateX(6deg)}55%{transform:translate3d(0,-4px,20px) rotateY(10deg) rotateX(2deg)}82%{transform:translate3d(0,0,0) rotateY(-6deg) rotateX(4deg);opacity:1}100%{transform:translate3d(0,0,260px) scale(1.15);opacity:0}}
@keyframes e3dLoop{0%,100%{transform:rotateY(-16deg) rotateX(6deg)}50%{transform:rotateY(16deg) rotateX(2deg) translateZ(20px)}}
@keyframes e3dBob{to{transform:translateZ(84px) translateY(-5px) scale(.9)}}
@keyframes e3dSweep{0%{left:-40%}60%,100%{left:120%}}
@keyframes e3dSpark{0%{opacity:0;transform:translate3d(0,0,0)}15%{opacity:1}100%{opacity:0;transform:translate3d(calc((var(--s) - 1)*40px),-120px,40px)}}
@keyframes e3dName{0%,18%{opacity:0;transform:translateY(10px)}26%,84%{opacity:1;transform:none}100%{opacity:0}}
.e3d-loop .e3d-name{animation:none}
.e3d-slot{display:block;width:100%}.r23-lux-preview .e3d{position:relative;inset:auto;z-index:auto;width:100%;padding:22px 0 10px;animation:none}
.r23-lux-preview .e3d-stage{width:100%;max-width:none}
@media(prefers-reduced-motion:reduce){.e3d-stage,.e3d-fg,.e3d-sweep::after,.e3d-sp i{animation:none!important}.e3d-sp{display:none}}`;
  document.head.appendChild(st);
}
