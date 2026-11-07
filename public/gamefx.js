/* منفّذ الحركة: ياخذ خطة من gameevents.js ويشغّلها فوق الحالة المرسومة أصلاً من لقطة الخادم.
 * الحركة تزيينية فقط: DOM النهائي جاهز قبلها وبعدها، وإلغاء أي حركة ما يغيّر أي شي. WAAPI بـ transform/opacity بس. */
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let confettiEl = null;

function anim(el, frames, opts) {
  if (!el || !el.animate) return;
  try { el.animate(frames, { fill: 'backwards', easing: 'cubic-bezier(.3,.7,.3,1)', ...opts }); } catch { /* حركة تزيينية: نتجاهل أي فشل */ }
}
const tf = (dx, dy, s = 1, r = 0) => `translate(${dx}px,${dy}px) scale(${s}) rotate(${r}deg)`;

function burst(layer, b, unit) {
  const NS = 'http://www.w3.org/2000/svg';
  const c = document.createElementNS(NS, 'circle');
  c.setAttribute('cx', b.x); c.setAttribute('cy', b.y); c.setAttribute('r', unit);
  c.setAttribute('fill', 'none'); c.setAttribute('stroke', b.kind === 'swap' ? '#7ff0c0' : '#ffd45a');
  c.setAttribute('stroke-width', unit * 0.28); c.setAttribute('pointer-events', 'none');
  c.style.transformBox = 'fill-box'; c.style.transformOrigin = 'center'; c.style.opacity = '0';
  layer.appendChild(c);
  const a = c.animate([{ transform: 'scale(.3)', opacity: 0.95 }, { transform: 'scale(2.6)', opacity: 0 }], { delay: b.delay, duration: b.dur, fill: 'both', easing: 'ease-out' });
  a.onfinish = () => c.remove();
}

function confetti(delay, dur) {
  confettiEl?.remove();
  const n = (navigator.hardwareConcurrency || 4) <= 4 ? 16 : 30;
  const box = document.createElement('div');
  box.setAttribute('aria-hidden', 'true');
  box.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:60;direction:ltr';
  const cols = ['#ffd45a', '#7ff0c0', '#ff7a8a', '#9b7bff', '#ffffff'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    const x = Math.random() * innerWidth, sway = (Math.random() - 0.5) * 120;
    p.style.cssText = `position:absolute;left:${x}px;top:-16px;width:8px;height:12px;border-radius:2px;background:${cols[i % cols.length]}`;
    box.appendChild(p);
    p.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${sway}px,${innerHeight + 30}px) rotate(${360 + Math.random() * 540}deg)`, opacity: 0.9 }], { delay: delay + Math.random() * 350, duration: dur - 400 + Math.random() * 400, fill: 'both', easing: 'cubic-bezier(.3,.2,.6,1)' });
  }
  document.body.appendChild(box);
  confettiEl = box;
  setTimeout(() => { box.remove(); if (confettiEl === box) confettiEl = null; }, delay + dur + 800);
}

/** يشغّل الخطة. geom.unit = نصف قطر الانفجار بوحدات اللوحة. يرجع true لو شغّل شي. */
export function runPlan(root, plan, geom) {
  if (!plan || reduced() || document.hidden) return false;
  const layer = root.querySelector('.fx-layer');
  for (const tr of plan.tracks) {
    const el = root.querySelector(`[data-tk="${tr.key}"]`);
    if (!el || !layer) continue;
    const end = [Number(el.dataset.x), Number(el.dataset.y)];
    if (!Number.isFinite(end[0]) || !Number.isFinite(end[1])) continue;
    const d = (p) => [p[0] - end[0], p[1] - end[1]];
    let frames;
    if (tr.kind === 'walk') frames = tr.pts.map((p, i) => { const [dx, dy] = d(p); return { transform: tf(dx, dy, i % 2 && i < tr.pts.length - 1 ? 1.14 : 1) }; });
    else {
      const [ax, ay] = d(tr.pts[0]), [bx, by] = d(tr.pts[tr.pts.length - 1]);
      frames = [{ transform: tf(ax, ay) }, { transform: tf((ax + bx) / 2, (ay + by) / 2 - geom.unit * 1.2, 1.3, tr.spin / 2) }, { transform: tf(bx, by, 1, tr.spin) }];
    }
    anim(el, frames, { delay: tr.delay, duration: tr.dur });
  }
  if (layer) plan.bursts.forEach((b) => burst(layer, b, geom.unit));
  if (plan.die) anim(root.querySelector('.ld2-dice'), [{ transform: 'translateY(-26px) rotate(-300deg) scale(.7)' }, { transform: 'translateY(4px) rotate(20deg) scale(1.05)', offset: 0.6 }, { transform: 'none' }], { delay: plan.die.delay, duration: plan.die.dur });
  if (plan.shake) anim(root.querySelector('.ld2-dice'), [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-5px)' }, { transform: 'none' }], { delay: plan.shake.delay, duration: plan.shake.dur });
  if (plan.card) {
    const c = root.querySelector('.jk-lastcard');
    if (c) anim(c, [{ transform: 'translate(var(--fx,0),var(--fy,0)) scale(.5) rotate(-28deg)', opacity: 0 }, { opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], { delay: plan.card.delay, duration: 600, easing: 'cubic-bezier(.2,.9,.3,1)' });
  }
  if (plan.confetti) confetti(plan.confetti.delay, plan.confetti.dur);
  return true;
}
