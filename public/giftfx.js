/* عرض الهدية على الشاشة لكل الموجودين بالغرفة — يشتغل فقط من حدث مؤكد من الخادم (roomgift).
   مؤثر مختلف لكل قسم (ورود تتساقط، قلوب تطلع، سيارة تمر، طائرة تطير، تنين يعبر بلهب، تاج وأشعة ذهبية، نجوم ومجرة، ألعاب نارية...)
   وشدّته (المدة وعدد الجزيئات والحجم) حسب الندرة. خفيف: عناصر DOM قليلة + WAAPI، وطابور حتى ما تتراكب، ويحترم «تقليل الحركة». */
import { giftArt } from './giftart.js?v=release-r14';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nf = (n) => Number(n).toLocaleString('ar-EG');
const Q = []; let busy = false;
const reduce = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const rnd = (a, b) => a + Math.random() * (b - a);

/** جزيء واحد: رمز/شكل يتحرك بمسار */
function part(root, html, from, to, dur, delay = 0, extra = {}) {
  const el = document.createElement('i'); el.className = 'gfx-p'; el.innerHTML = html; root.appendChild(el);
  const a = el.animate([{ transform: `translate(${from[0]}vw,${from[1]}vh) rotate(${extra.r0 ?? 0}deg) scale(${extra.s0 ?? 1})`, opacity: extra.o0 ?? 1 }, { transform: `translate(${to[0]}vw,${to[1]}vh) rotate(${extra.r1 ?? 0}deg) scale(${extra.s1 ?? 1})`, opacity: extra.o1 ?? 0 }], { duration: dur, delay, easing: extra.ease ?? 'cubic-bezier(.3,.6,.4,1)', fill: 'both' });
  a.onfinish = () => el.remove();
}
const SVG = {
  petal: (c) => `<svg viewBox="0 0 20 20" width="22" height="22"><path d="M10 1c6 5 6 13 0 18-6-5-6-13 0-18z" fill="${c}"/></svg>`,
  heart: (c) => `<svg viewBox="0 0 24 24" width="26" height="26"><path d="M12 21C3 15 2 9 6 6c3-2 5 0 6 2 1-2 3-4 6-2 4 3 3 9-6 15z" fill="${c}"/></svg>`,
  star: (c) => `<svg viewBox="0 0 20 20" width="18" height="18"><path d="M10 0l2.5 7.5H20l-6 4.5 2.3 8L10 15l-6.3 5 2.3-8-6-4.5h7.5z" fill="${c}"/></svg>`,
  dot: (c, r = 6) => `<svg viewBox="0 0 12 12" width="${r * 2}" height="${r * 2}"><circle cx="6" cy="6" r="6" fill="${c}"/></svg>`,
  flame: () => '<svg viewBox="0 0 20 28" width="26" height="34"><path d="M10 0c6 8 9 13 9 18a9 9 0 0 1-18 0c0-5 3-10 9-18z" fill="#ff922b"/><path d="M10 10c3 4 4 7 4 9a4 4 0 0 1-8 0c0-2 1-5 4-9z" fill="#ffe066"/></svg>',
  snow: () => '<svg viewBox="0 0 20 20" width="16" height="16"><path d="M10 0v20M0 10h20M3 3l14 14M17 3L3 17" stroke="#fff" stroke-width="2"/></svg>',
  balloon: (c) => `<svg viewBox="0 0 20 34" width="22" height="38"><ellipse cx="10" cy="11" rx="9" ry="11" fill="${c}"/><path d="M10 22c-2 4 2 6 0 12" stroke="#fff" fill="none"/></svg>`,
};
const COLORS = ['#ff4d7e', '#ffd166', '#58e1ff', '#8ce99a', '#c084fc', '#ffa94d'];

/** مؤثرات الأقسام: (طبقة، الشدة 1..6) */
const FX = {
  pop: (r, k) => { for (let i = 0; i < 6 + k * 3; i++) part(r, SVG.star(COLORS[i % 6]), [50, 50], [rnd(5, 95) - 50 + 50, rnd(10, 90)], 1400 + k * 150, i * 20, { s0: .4, s1: 1.2 }); },
  petals: (r, k) => { for (let i = 0; i < 8 + k * 4; i++) { const x = rnd(0, 100); part(r, SVG.petal(i % 3 ? '#ff8fb1' : '#ffd1df'), [x, -8], [x + rnd(-15, 15), 105], 2600 + k * 250, i * 90, { r0: 0, r1: rnd(180, 540), o1: .9, ease: 'linear' }); } },
  hearts: (r, k) => { for (let i = 0; i < 8 + k * 4; i++) { const x = rnd(10, 90); part(r, SVG.heart(i % 2 ? '#ff4d7e' : '#ff8fb1'), [x, 102], [x + rnd(-10, 10), rnd(-5, 40)], 2400 + k * 200, i * 80, { s0: .6, s1: 1.4 }); } },
  bounce: (r, k) => { for (let i = 0; i < 6 + k * 3; i++) part(r, SVG.dot(COLORS[i % 6], 7), [rnd(10, 90), 100], [rnd(10, 90), rnd(20, 70)], 1500 + k * 200, i * 70, { ease: 'cubic-bezier(.2,1.6,.4,1)', o1: 0 }); },
  balloons: (r, k) => { for (let i = 0; i < 6 + k * 3; i++) { const x = rnd(5, 95); part(r, SVG.balloon(COLORS[i % 6]), [x, 105], [x + rnd(-8, 8), -15], 3200 + k * 200, i * 120, { o1: 1, ease: 'linear' }); } },
  lanterns: (r, k) => { for (let i = 0; i < 5 + k * 2; i++) { const x = rnd(5, 95); part(r, SVG.dot('#ffe066', 8), [x, 100], [x, rnd(-10, 30)], 3400, i * 150, { o0: .9, ease: 'linear' }); part(r, SVG.snow(), [rnd(0, 100), -5], [rnd(0, 100), 105], 3600, i * 200, { o1: .7, r1: 360, ease: 'linear' }); } },
  fireworks: (r, k) => { for (let b = 0; b < 2 + Math.ceil(k / 2); b++) { const cx = rnd(15, 85), cy = rnd(15, 55), c = COLORS[b % 6]; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; part(r, SVG.dot(c, 4), [cx, cy], [cx + Math.cos(a) * 18, cy + Math.sin(a) * 14], 1300, b * 500, { s1: .3 }); } } },
  swirl: (r, k) => { for (let i = 0; i < 12 + k * 3; i++) { const a = i / (12 + k * 3) * Math.PI * 4; part(r, SVG.star(i % 2 ? '#c084fc' : '#63e6be'), [50, 50], [50 + Math.cos(a) * 40, 50 + Math.sin(a) * 30], 2200 + k * 150, i * 40, { r1: 720, s0: .3, s1: 1.1 }); } },
  galaxy: (r, k) => { for (let i = 0; i < 18 + k * 4; i++) part(r, SVG.star(i % 3 ? '#fff' : '#91a7ff'), [rnd(0, 100), rnd(0, 100)], [rnd(0, 100), rnd(0, 100)], 2600 + k * 200, i * 50, { s0: 0, s1: rnd(.6, 1.4), o1: 0 }); },
  drive: (r) => { /* السيارة نفسها تعبر الشاشة (الحركة الرئيسية) + غبار */ for (let i = 0; i < 10; i++) part(r, SVG.dot('#ced4da', 5), [110 - i * 12, 66 + rnd(-2, 2)], [100 - i * 12, 60], 900, 300 + i * 160, { s1: 2, o0: .6 }); },
  fly: (r) => { for (let i = 0; i < 8; i++) part(r, SVG.dot('#ffffff', 6), [-10 + i * 14, 34 + i * 2], [-20 + i * 14, 30 + i * 2], 1200, 200 + i * 180, { s1: 2.4, o0: .7 }); },
  shine: (r, k) => { for (let i = 0; i < 10 + k * 3; i++) part(r, SVG.star('#ffd166'), [rnd(25, 75), rnd(25, 75)], [rnd(10, 90), rnd(10, 90)], 1800 + k * 150, i * 60, { s0: 0, s1: 1.3, r1: 180 }); },
  royal: (r, k) => { const rays = document.createElement('i'); rays.className = 'gfx-rays'; r.appendChild(rays); rays.animate([{ opacity: 0, transform: 'rotate(0)' }, { opacity: .9, offset: .3 }, { opacity: 0, transform: 'rotate(60deg)' }], { duration: 3000 + k * 300, fill: 'both' }).onfinish = () => rays.remove(); FX.shine(r, k); },
  dragon: (r, k) => { for (let i = 0; i < 10 + k * 3; i++) part(r, SVG.flame(), [rnd(30, 70), rnd(40, 60)], [rnd(0, 100), rnd(-10, 100)], 1600 + k * 150, 600 + i * 70, { s0: .3, s1: 1.4 }); },
  legend: (r, k) => { FX.royal(r, k); FX.swirl(r, k); FX.fireworks(r, Math.max(1, k - 2)); },
};
/** الحركة الرئيسية لمجسم الهدية حسب القسم */
function mainMove(el, fx, dur) {
  if (fx === 'drive') return el.animate([{ transform: 'translate(70vw,8vh) scale(1)' }, { transform: 'translate(0,8vh) scale(1.15)', offset: .5 }, { transform: 'translate(-70vw,8vh) scale(1)' }], { duration: dur, easing: 'ease-in-out', fill: 'both' });
  if (fx === 'fly') return el.animate([{ transform: 'translate(-70vw,25vh) rotate(-12deg)' }, { transform: 'translate(0,-2vh) rotate(-6deg) scale(1.2)', offset: .5 }, { transform: 'translate(70vw,-30vh) rotate(-15deg)' }], { duration: dur, easing: 'ease-in-out', fill: 'both' });
  if (fx === 'dragon') return el.animate([{ transform: 'translate(-60vw,10vh) scale(.7)' }, { transform: 'translate(0,0) scale(1.35)', offset: .45 }, { transform: 'translate(0,0) scale(1.3)', offset: .7 }, { transform: 'translate(60vw,-20vh) scale(.8)', opacity: 0 }], { duration: dur, easing: 'ease-in-out', fill: 'both' });
  return el.animate([{ transform: 'scale(.2) rotate(-12deg)', opacity: 0 }, { transform: 'scale(1.25) rotate(4deg)', opacity: 1, offset: .25 }, { transform: 'scale(1)', offset: .4 }, { transform: 'scale(1.06)', offset: .8 }, { transform: 'scale(.6)', opacity: 0 }], { duration: dur, easing: 'ease-out', fill: 'both' });
}

export function play(ev, meId) { Q.push({ ev, meId }); if (Q.length > 6) Q.splice(0, Q.length - 6); if (!busy) next(); }
function next() {
  const it = Q.shift(); if (!it) { busy = false; return; }
  busy = true;
  const { ev, meId } = it;
  const k = (ev.gift.rarity ?? 0) + 1; const dur = 1800 + k * 450;
  const root = document.createElement('div'); root.className = `gfx r${ev.gift.rarity}`; root.setAttribute('aria-hidden', 'true');
  const from = ev.from.id === meId ? 'أنت' : ev.from.name, to = ev.to.id === meId ? 'أنت' : ev.to.name;
  root.innerHTML = `<div class="gfx-banner"><b class="gfx-x">${nf(ev.qty)}×</b><span class="gfx-who">${esc(from)}</span><span class="gfx-arrow">←</span><span class="gfx-gift">${giftArt(ev.gift, 34)}</span><span class="gfx-who">${esc(to)}</span></div><div class="gfx-main">${giftArt(ev.gift, 120 + k * 18)}<p>${esc(ev.gift.name)}</p></div>`;
  document.body.appendChild(root);
  const done = () => { root.remove(); setTimeout(next, 120); };
  if (reduce()) { root.classList.add('still'); setTimeout(done, 2200); return; }
  root.querySelector('.gfx-banner').animate([{ transform: 'translateX(60vw)', opacity: 0 }, { transform: 'none', opacity: 1, offset: .15 }, { transform: 'none', opacity: 1, offset: .85 }, { transform: 'translateX(-60vw)', opacity: 0 }], { duration: dur + 600, easing: 'ease-in-out', fill: 'both' });
  mainMove(root.querySelector('.gfx-main'), ev.gift.fx, dur);
  try { (FX[ev.gift.fx] || FX.pop)(root, k); } catch { /* مؤثر تجميلي فقط */ }
  setTimeout(done, dur + 700);
}
