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
  el.innerHTML = `<div class="e3d-stage"><div class="e3d-glow"></div><img class="e3d-bg" src="${src}" alt="" decoding="async"><div class="e3d-sweep"></div><img class="e3d-fg" src="${fg}" alt="" decoding="async"><div class="e3d-sp">${sparks}</div></div>${label ? `<span class="e3d-name"></span>` : ''}`;
  if (label) el.querySelector('.e3d-name').textContent = label;
  return el;
}
function css() {
  if (document.getElementById('e3d-css')) return;
  const st = document.createElement('style'); st.id = 'e3d-css';
  st.textContent = `
.e3d{position:absolute;left:0;right:0;top:26%;z-index:30;pointer-events:none;perspective:820px;perspective-origin:50% 40%;display:flex;flex-direction:column;align-items:center;gap:8px}
.e3d-stage{position:relative;width:min(88vw,520px);aspect-ratio:960/205;transform-style:preserve-3d;animation:e3dIn 5.6s cubic-bezier(.2,.8,.25,1) both}
.e3d-loop .e3d-stage{animation:e3dLoop 6s ease-in-out infinite}
.e3d-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:14px;transform:translateZ(0);box-shadow:0 0 0 1.5px color-mix(in srgb,var(--t) 70%,#fff 0%),0 0 28px color-mix(in srgb,var(--t) 60%,transparent),0 18px 40px #000c;filter:saturate(1.1) brightness(.92)}
.e3d-fg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:translateZ(70px) scale(.915);filter:drop-shadow(0 14px 18px #000a) saturate(1.2) brightness(1.08);animation:e3dBob 1.7s ease-in-out infinite alternate}
.e3d-glow{position:absolute;inset:-18% -6%;transform:translateZ(-60px) scale(1.08);background:radial-gradient(closest-side,color-mix(in srgb,var(--t) 55%,transparent),transparent);filter:blur(10px);opacity:.85}
.e3d-sweep{position:absolute;inset:0;border-radius:14px;overflow:hidden;transform:translateZ(1px)}
.e3d-sweep::after{content:"";position:absolute;top:-20%;bottom:-20%;width:28%;left:-40%;background:linear-gradient(100deg,transparent,#ffffff55,transparent);animation:e3dSweep 2.4s .6s ease-in-out infinite}
.e3d-sp{position:absolute;inset:0;transform:translateZ(120px) scale(.87);transform-style:preserve-3d}
.e3d-sp i{position:absolute;left:var(--x);bottom:8%;width:calc(6px*var(--s));height:calc(6px*var(--s));border-radius:50%;background:radial-gradient(circle,#fff,var(--t) 45%,transparent 70%);opacity:0;animation:e3dSpark 2.2s var(--d) ease-out infinite}
.e3d-name{transform:translateZ(0);max-width:90%;padding:5px 16px;border-radius:999px;font:800 14px/1.4 Cairo,Tahoma,sans-serif;color:#fff1c5;background:linear-gradient(180deg,#3a1670ee,#1c0a38ee);border:1.5px solid #c9a24a;box-shadow:0 0 16px color-mix(in srgb,var(--t) 50%,transparent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;animation:e3dName 5.6s ease both}
@keyframes e3dIn{0%{transform:translate3d(0,40px,-900px) rotateY(-55deg) rotateX(18deg);opacity:0}14%{opacity:1}22%{transform:translate3d(0,0,40px) rotateY(-14deg) rotateX(6deg)}55%{transform:translate3d(0,-4px,20px) rotateY(10deg) rotateX(2deg)}82%{transform:translate3d(0,0,0) rotateY(-6deg) rotateX(4deg);opacity:1}100%{transform:translate3d(130%,0,-200px) rotateY(40deg);opacity:0}}
@keyframes e3dLoop{0%,100%{transform:rotateY(-16deg) rotateX(6deg)}50%{transform:rotateY(16deg) rotateX(2deg) translateZ(20px)}}
@keyframes e3dBob{to{transform:translateZ(84px) translateY(-5px) scale(.9)}}
@keyframes e3dSweep{0%{left:-40%}60%,100%{left:120%}}
@keyframes e3dSpark{0%{opacity:0;transform:translate3d(0,0,0)}15%{opacity:1}100%{opacity:0;transform:translate3d(calc((var(--s) - 1)*40px),-120px,40px)}}
@keyframes e3dName{0%,18%{opacity:0;transform:translateY(10px)}26%,84%{opacity:1;transform:none}100%{opacity:0}}
.e3d-loop .e3d-name{animation:none}
.e3d-slot{display:block;width:100%}.r23-lux-preview .e3d{position:relative;top:auto;width:100%;padding:22px 0 10px}
.r23-lux-preview .e3d-stage{width:100%}
@media(prefers-reduced-motion:reduce){.e3d-stage,.e3d-fg,.e3d-sweep::after,.e3d-sp i{animation:none!important}.e3d-sp{display:none}}`;
  document.head.appendChild(st);
}
