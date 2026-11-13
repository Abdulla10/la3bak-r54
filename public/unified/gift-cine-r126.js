/* R126: سينما الهدايا — الهدايا الكبيرة تعبي الشاشة بمشهد متحرك مثل التطبيقات الكبيرة.
 * رسمة الهدية نفسها (3D مرسومة) على مسرح ثلاثي الأبعاد (perspective) + جزيئات Canvas حسب نوع الهدية + صوت مركّب.
 * كل الرسومات أصلية: نار، أمواج، طريق سريع، بوابة، عملات ذهبية… بدون أي ملفات خارجية. يحترم «تقليل الحركة». */
const TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = { out: (t) => 1 - Math.pow(1 - t, 3), inOut: (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, back: (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); } };
const seg = (t, a, b) => clamp((t - a) / (b - a));

/** نوع المشهد من القسم أو الاسم */
export function sceneOf(gift) {
  const n = String(gift?.name || ''), fx = String(gift?.fx || '');
  if (/تنين|عنقاء|فينيكس|نار/.test(n) || fx === 'dragon') return /عنقاء/.test(n) ? 'phoenix' : 'dragon';
  if (/يخت|سفين|قارب/.test(n)) return 'sea';
  if (/سيار|مركب|دراج|فيراري|لامبو/.test(n) || fx === 'drive') return 'drive';
  if (/طائر|طيار|نسر|بيغاسوس|منطاد|صقر/.test(n) || fx === 'fly') return 'fly';
  if (/أسد|نمر|ذئب/.test(n)) return 'beast';
  if (/عرش|تاج|قلعة|قصر|ملك/.test(n) || fx === 'royal') return 'royal';
  if (/كوكب|مجر|صاروخ|فضاء/.test(n) || fx === 'galaxy') return 'space';
  if (fx === 'legend' || fx === 'swirl') return 'portal';
  return 'shine';
}
const PALETTE = { dragon: ['#ff4d1a', '#ffb703', '#ffe066'], phoenix: ['#38bdf8', '#a5f3fc', '#e0f2fe'], sea: ['#38bdf8', '#e0f7ff', '#0ea5e9'], drive: ['#f43f5e', '#fde68a', '#ffffff'], fly: ['#ffffff', '#c7d2fe', '#fde68a'], beast: ['#f59e0b', '#fde68a', '#fff7d6'], royal: ['#ffd166', '#fff3c4', '#f59e0b'], space: ['#a78bfa', '#67e8f9', '#ffffff'], portal: ['#c084fc', '#22d3ee', '#f0abfc'], shine: ['#ffd166', '#ffffff', '#f0abfc'] };

/* ───── صوت مركّب (بدون ملفات) ───── */
let AC = null;
function sfx(kind, at = 0, vol = .5) {
  try {
    AC ??= new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume().catch(() => {});
    const t0 = AC.currentTime + at, g = AC.createGain(); g.connect(AC.destination);
    const noise = (dur) => { const b = AC.createBuffer(1, AC.sampleRate * dur, AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = AC.createBufferSource(); s.buffer = b; return s; };
    if (kind === 'whoosh') { const s = noise(1.2), f = AC.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(300, t0); f.frequency.exponentialRampToValueAtTime(2400, t0 + .5); f.frequency.exponentialRampToValueAtTime(400, t0 + 1.1); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol * .5, t0 + .35); g.gain.linearRampToValueAtTime(0, t0 + 1.15); s.connect(f).connect(g); s.start(t0); s.stop(t0 + 1.2); }
    if (kind === 'boom') { const o = AC.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(120, t0); o.frequency.exponentialRampToValueAtTime(32, t0 + .9); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + 1); o.connect(g); o.start(t0); o.stop(t0 + 1); const s = noise(.4), f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; const g2 = AC.createGain(); g2.gain.setValueAtTime(vol * .6, t0); g2.gain.exponentialRampToValueAtTime(.001, t0 + .4); s.connect(f).connect(g2).connect(AC.destination); s.start(t0); }
    if (kind === 'roar') { const s = noise(1.6), f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(380, t0); f.frequency.linearRampToValueAtTime(900, t0 + .4); f.frequency.linearRampToValueAtTime(260, t0 + 1.5); const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t0); o.frequency.linearRampToValueAtTime(52, t0 + 1.5); const go = AC.createGain(); go.gain.value = vol * .25; o.connect(go).connect(g); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol * .9, t0 + .25); g.gain.linearRampToValueAtTime(0, t0 + 1.55); s.connect(f).connect(g); s.start(t0); s.stop(t0 + 1.6); o.start(t0); o.stop(t0 + 1.6); }
    if (kind === 'chime') { [880, 1175, 1568, 2093].forEach((fr, i) => { const o = AC.createOscillator(), gg = AC.createGain(); o.type = 'triangle'; o.frequency.value = fr; gg.gain.setValueAtTime(0, t0 + i * .09); gg.gain.linearRampToValueAtTime(vol * .22, t0 + i * .09 + .02); gg.gain.exponentialRampToValueAtTime(.001, t0 + i * .09 + 1.2); o.connect(gg).connect(AC.destination); o.start(t0 + i * .09); o.stop(t0 + i * .09 + 1.3); }); }
    if (kind === 'engine') { const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(55, t0); o.frequency.exponentialRampToValueAtTime(190, t0 + 1.4); o.frequency.exponentialRampToValueAtTime(80, t0 + 2.4); const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol * .35, t0 + .3); g.gain.linearRampToValueAtTime(0, t0 + 2.5); o.connect(f).connect(g); o.start(t0); o.stop(t0 + 2.5); }
    if (kind === 'waves') { const s = noise(3), f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol * .35, t0 + .8); g.gain.linearRampToValueAtTime(vol * .15, t0 + 1.8); g.gain.linearRampToValueAtTime(0, t0 + 3); s.connect(f).connect(g); s.start(t0); s.stop(t0 + 3); }
  } catch { /* الصوت تجميلي */ }
}
let soundOn = true; try { soundOn = localStorage.getItem('la3_gift_snd') !== '0'; } catch { /* */ }

/* ───── جزيئات Canvas ───── */
class Particles {
  constructor(ctx) { this.c = ctx; this.p = []; }
  add(o) { if (this.p.length < 420) this.p.push({ x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0, life: 1, max: 1, size: 4, grow: 0, color: '#fff', kind: 'dot', rot: 0, vr: 0, drag: 0, ...o, age: 0 }); }
  step(dt) {
    const c = this.c;
    for (const q of this.p) {
      q.age += dt; q.vx += q.ax * dt; q.vy += q.ay * dt; if (q.drag) { q.vx *= 1 - q.drag * dt; q.vy *= 1 - q.drag * dt; }
      q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt; q.size = Math.max(.1, q.size + q.grow * dt);
      const a = clamp(1 - q.age / q.max); if (a <= 0) continue;
      c.save(); c.globalAlpha = a * (q.alpha ?? 1); c.translate(q.x, q.y); c.rotate(q.rot);
      if (q.kind === 'glow') { const g = c.createRadialGradient(0, 0, 0, 0, 0, q.size); g.addColorStop(0, q.color); g.addColorStop(1, 'transparent'); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.beginPath(); c.arc(0, 0, q.size, 0, TAU); c.fill(); }
      else if (q.kind === 'streak') { c.globalCompositeOperation = 'lighter'; c.strokeStyle = q.color; c.lineWidth = q.size; c.lineCap = 'round'; const L = Math.hypot(q.vx, q.vy) * (q.len ?? .05); c.rotate(Math.atan2(q.vy, q.vx) - q.rot); c.beginPath(); c.moveTo(0, 0); c.lineTo(-L, 0); c.stroke(); }
      else if (q.kind === 'coin') { const w = Math.abs(Math.cos(q.age * 9 + q.ph)) * q.size; c.fillStyle = '#f5b301'; c.beginPath(); c.ellipse(0, 0, w + .5, q.size, 0, 0, TAU); c.fill(); c.fillStyle = '#ffe58a'; c.beginPath(); c.ellipse(-w * .25, -q.size * .25, w * .45 + .3, q.size * .45, 0, 0, TAU); c.fill(); }
      else if (q.kind === 'star') { c.globalCompositeOperation = 'lighter'; c.fillStyle = q.color; c.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? q.size * .35 : q.size; c.lineTo(Math.cos(i / 8 * TAU) * r, Math.sin(i / 8 * TAU) * r); } c.fill(); }
      else if (q.kind === 'ring') { c.globalCompositeOperation = 'lighter'; c.strokeStyle = q.color; c.lineWidth = Math.max(1, 10 * a); c.beginPath(); c.arc(0, 0, q.size, 0, TAU); c.stroke(); }
      else if (q.kind === 'smoke') { const g = c.createRadialGradient(0, 0, 0, 0, 0, q.size); g.addColorStop(0, q.color); g.addColorStop(1, 'transparent'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, q.size, 0, TAU); c.fill(); }
      else { c.globalCompositeOperation = 'lighter'; c.fillStyle = q.color; c.beginPath(); c.arc(0, 0, q.size, 0, TAU); c.fill(); }
      c.restore();
    }
    this.p = this.p.filter((q) => q.age < q.max);
  }
}

/* ───── المشاهد: كل مشهد يحدد حركة الهدية (3D) + المؤثرات بكل إطار ───── */
const SCENES = {
  dragon: { dur: 7000, sound: [['whoosh', 0], ['roar', 1.6], ['boom', 1.7]],
    hero: (t) => { const a = ease.out(seg(t, 0, .22)), b = seg(t, .82, 1); return { x: (1 - a) * 0.75 - b * 0.9, y: -0.18 * (1 - a) + Math.sin(t * 9) * .02 - b * .35, z: -300 * (1 - a) + 120 * Math.sin(seg(t, .22, .5) * Math.PI), ry: -35 * (1 - a) + Math.sin(t * 6) * 8, rx: 6 * Math.sin(t * 5), s: .55 + .5 * a - .2 * b, o: 1 - b }; },
    fx: (P, t, dt, W, H, h, pal, st) => { if (t > .22 && t < .78) { const fire = t > .28 && t < .62; for (let i = 0; i < (fire ? 9 : 2); i++) { const ang = Math.PI + rnd(-.35, .35) + (fire ? -.25 : 0); const sp = rnd(380, 760) * (fire ? 1 : .3); P.add({ kind: 'glow', x: h.x - h.w * .28, y: h.y - h.h * .15, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp + rnd(-40, 40), ay: -60, drag: 1.2, size: rnd(14, 34), grow: 46, max: rnd(.6, 1.1), color: pal[i % 3] }); } } if (Math.random() < .5) P.add({ kind: 'dot', x: rnd(0, W), y: H + 10, vx: rnd(-20, 20), vy: rnd(-160, -60), size: rnd(1.5, 3.5), max: rnd(1.5, 3), color: pal[1] }); if (t > .28 && t < .62) st.shake = 9; } },
  phoenix: { dur: 7000, sound: [['whoosh', 0], ['chime', 1.2], ['boom', 1.4]],
    hero: (t) => { const a = ease.out(seg(t, 0, .25)), b = seg(t, .82, 1); return { x: -0.7 * (1 - a) + b * 0.8, y: 0.35 * (1 - a) - b * .5 + Math.sin(t * 7) * .025, z: -250 * (1 - a), ry: 30 * (1 - a) + Math.sin(t * 5) * 10, rx: -8 * (1 - a), s: .5 + .5 * a, o: 1 - b }; },
    fx: (P, t, dt, W, H, h, pal) => { for (let i = 0; i < 4; i++) P.add({ kind: 'glow', x: h.x + rnd(-h.w * .35, h.w * .35), y: h.y + rnd(-h.h * .2, h.h * .3), vx: rnd(-60, 60), vy: rnd(40, 160), size: rnd(8, 22), grow: 20, max: rnd(.6, 1.2), color: pal[i % 3] }); if (t > .3 && t < .34) for (let i = 0; i < 60; i++) { const a = rnd(0, TAU), sp = rnd(200, 600); P.add({ kind: 'star', x: h.x, y: h.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 1.5, size: rnd(4, 9), max: 1.4, color: pal[i % 3], vr: rnd(-4, 4) }); } } },
  sea: { dur: 7000, sound: [['waves', 0], ['chime', 2.2]], waves: true,
    hero: (t) => { const a = ease.out(seg(t, 0, .3)), b = seg(t, .8, 1); return { x: 0.85 * (1 - a) - b * 0.95, y: 0.1 + Math.sin(t * 8) * .018, z: -100 * (1 - a), ry: -18 + Math.sin(t * 4) * 4, rx: 0, rz: Math.sin(t * 8 + 1) * 3, s: .8 + .15 * a, o: 1 - b * .2 }; },
    fx: (P, t, dt, W, H, h, pal) => { for (let i = 0; i < 3; i++) P.add({ kind: 'dot', x: h.x + h.w * rnd(.1, .4), y: h.y + h.h * .32, vx: rnd(40, 220), vy: rnd(-220, -60), ay: 520, size: rnd(2, 4.5), max: rnd(.6, 1.1), color: pal[1] }); if (Math.random() < .25) P.add({ kind: 'star', x: rnd(0, W), y: rnd(0, H * .35), size: rnd(2, 4), max: 1.5, color: '#fff' }); } },
  drive: { dur: 6200, sound: [['engine', 0], ['boom', 1.25]], road: true,
    hero: (t) => { const a = ease.inOut(seg(t, 0, .3)), d = ease.back(seg(t, .3, .42)), b = ease.inOut(seg(t, .78, 1)); return { x: -b * 1.1 + Math.sin(seg(t, .42, .78) * Math.PI) * .03, y: 0.12 - 0.1 * (1 - a), z: -900 * (1 - a) + 40 * d - b * 200, ry: -6 + 12 * d * (1 - b) - 25 * b, rx: 4, s: .25 + .75 * a, o: 1 }; },
    fx: (P, t, dt, W, H, h, pal, st) => { const n = t < .32 ? 6 : 2; for (let i = 0; i < n; i++) { const a = rnd(0, TAU), r = rnd(20, 60); P.add({ kind: 'streak', x: W / 2 + Math.cos(a) * r, y: H * .5 + Math.sin(a) * r, vx: Math.cos(a) * rnd(700, 1400), vy: Math.sin(a) * rnd(700, 1400), size: rnd(1, 2.5), len: .06, max: .7, color: i % 2 ? pal[2] : pal[1] }); } if (t > .3) for (let i = 0; i < 3; i++) P.add({ kind: 'smoke', x: h.x + h.w * rnd(.15, .4) * (t > .78 ? -1 : 1), y: h.y + h.h * .32, vx: rnd(-60, 60) + (t > .78 ? 200 : -40), vy: rnd(-40, -10), size: rnd(12, 26), grow: 50, max: rnd(.8, 1.4), color: 'rgba(220,220,230,.35)' }); if (t > .3 && t < .34) st.shake = 10; } },
  fly: { dur: 6800, sound: [['whoosh', 0], ['whoosh', 2.6], ['chime', 1.4]], clouds: true,
    hero: (t) => { const p = ease.inOut(t); return { x: -0.9 + 1.8 * p, y: 0.25 - 0.5 * p + Math.sin(t * 6) * .03, z: -200 + 260 * Math.sin(t * Math.PI), ry: 25 - 50 * p, rx: -6, rz: -10 + 6 * Math.sin(t * 5), s: .55 + .5 * Math.sin(t * Math.PI), o: 1 }; },
    fx: (P, t, dt, W, H, h, pal) => { for (let i = 0; i < 3; i++) P.add({ kind: 'glow', x: h.x - h.w * .35, y: h.y + rnd(-6, 6), vx: rnd(-120, -40), vy: rnd(-10, 10), size: rnd(10, 18), grow: 18, max: rnd(.9, 1.6), color: 'rgba(255,255,255,.55)' }); if (Math.random() < .35) P.add({ kind: 'star', x: h.x + rnd(-h.w / 2, h.w / 2), y: h.y + rnd(-h.h / 2, h.h / 2), vx: rnd(-80, 0), vy: rnd(-30, 30), size: rnd(3, 7), max: 1, color: pal[2] }); } },
  beast: { dur: 6600, sound: [['boom', .9], ['roar', 1.0]],
    hero: (t) => { const a = ease.back(seg(t, .08, .28)), b = seg(t, .84, 1); return { x: 0, y: 0.9 * (1 - ease.out(seg(t, 0, .2))) - b * .1, z: -60 + 120 * Math.sin(seg(t, .28, .45) * Math.PI), ry: Math.sin(t * 4) * 12, rx: 0, s: .3 + .7 * a, o: 1 - b }; },
    fx: (P, t, dt, W, H, h, pal, st) => { if (t > .27 && t < .3) { for (let k = 0; k < 3; k++) P.add({ kind: 'ring', x: h.x, y: h.y, size: 10, grow: 900 + k * 300, max: .9, color: pal[k % 3] }); for (let i = 0; i < 40; i++) { const a = rnd(Math.PI, TAU); P.add({ kind: 'smoke', x: h.x + rnd(-80, 80), y: h.y + h.h * .4, vx: Math.cos(a) * rnd(100, 300), vy: Math.sin(a) * rnd(20, 120), size: rnd(16, 30), grow: 40, max: 1.3, color: 'rgba(240,200,120,.35)' }); } st.shake = 14; } if (Math.random() < .5) P.add({ kind: 'dot', x: rnd(0, W), y: H + 8, vy: rnd(-200, -80), size: rnd(1.5, 3), max: 2.4, color: pal[1] }); } },
  royal: { dur: 7000, sound: [['chime', 0], ['boom', 1.2], ['chime', 1.6]], pillar: true,
    hero: (t) => { const a = ease.out(seg(t, .05, .3)), b = seg(t, .85, 1); return { x: 0, y: -0.9 * (1 - a) + Math.sin(t * 5) * .015, z: -120 * (1 - a), ry: 360 * (1 - a) + Math.sin(t * 3) * 10, rx: 0, s: .5 + .5 * a + .06 * Math.sin(seg(t, .3, .4) * Math.PI), o: 1 - b }; },
    fx: (P, t, dt, W, H, h, pal, st) => { if (t > .25) for (let i = 0; i < 3; i++) P.add({ kind: 'coin', x: rnd(0, W), y: -20, vx: rnd(-30, 30), vy: rnd(160, 340), ay: 300, size: rnd(6, 11), max: 2.6, ph: rnd(0, 6) }); if (t > .29 && t < .32) { P.add({ kind: 'ring', x: h.x, y: h.y + h.h * .3, size: 20, grow: 1100, max: 1, color: pal[0] }); st.shake = 8; for (let i = 0; i < 50; i++) { const a = rnd(0, TAU); P.add({ kind: 'star', x: h.x, y: h.y, vx: Math.cos(a) * rnd(150, 520), vy: Math.sin(a) * rnd(150, 520), drag: 1.4, size: rnd(4, 9), max: 1.4, color: pal[i % 3], vr: rnd(-5, 5) }); } } } },
  space: { dur: 6800, sound: [['whoosh', 0], ['chime', 1.1]], starfield: true,
    hero: (t) => { const a = ease.out(seg(t, 0, .3)), b = seg(t, .84, 1); return { x: 0, y: 0, z: -800 * (1 - a) + b * 600, ry: t * 160, rx: 10 * Math.sin(t * 3), s: .25 + .75 * a, o: 1 - b }; },
    fx: (P, t, dt, W, H, h, pal) => { for (let i = 0; i < 5; i++) { const a = rnd(0, TAU), r = rnd(160, 260); P.add({ kind: 'dot', x: h.x + Math.cos(a) * r, y: h.y + Math.sin(a) * r * .4, vx: -Math.sin(a) * 180, vy: Math.cos(a) * 70, size: rnd(1.5, 3.5), max: rnd(.8, 1.6), color: pal[i % 3] }); } } },
  portal: { dur: 7000, sound: [['whoosh', 0], ['boom', 1.1], ['chime', 1.3]], portal: true,
    hero: (t) => { const a = ease.back(seg(t, .15, .38)), b = seg(t, .84, 1); return { x: 0, y: 0, z: -500 * (1 - a), ry: 540 * (1 - ease.out(seg(t, .15, .5))), rx: 0, s: .05 + .95 * a, o: (t < .15 ? 0 : 1) * (1 - b) }; },
    fx: (P, t, dt, W, H, h, pal, st) => { for (let i = 0; i < 7; i++) { const a = rnd(0, TAU), r = rnd(120, 280) * (t < .35 ? 1 : .8); P.add({ kind: 'glow', x: W / 2 + Math.cos(a) * r, y: H * .45 + Math.sin(a) * r * .55, vx: (-Math.cos(a) * 140 - Math.sin(a) * 260), vy: (-Math.sin(a) * 80 + Math.cos(a) * 150), size: rnd(4, 10), max: .9, color: pal[i % 3] }); } if (t > .36 && t < .39) { st.shake = 12; for (let k = 0; k < 2; k++) P.add({ kind: 'ring', x: W / 2, y: H * .45, size: 30, grow: 1300, max: .9, color: pal[k] }); } } },
  shine: { dur: 5600, sound: [['chime', 0], ['chime', 1.4]],
    hero: (t) => { const a = ease.back(seg(t, 0, .25)), b = seg(t, .85, 1); return { x: 0, y: Math.sin(t * 5) * .02, z: -200 * (1 - a), ry: 360 * ease.inOut(seg(t, .2, .6)), rx: 0, s: .3 + .7 * a, o: 1 - b }; },
    fx: (P, t, dt, W, H, h, pal) => { if (Math.random() < .7) P.add({ kind: 'star', x: h.x + rnd(-h.w * .6, h.w * .6), y: h.y + rnd(-h.h * .6, h.h * .6), size: rnd(3, 8), grow: -4, max: rnd(.6, 1.2), color: pal[(Math.random() * 3) | 0], vr: rnd(-3, 3) }); } },
};

/* ───── خلفيات المشاهد ───── */
function backdrop(c, kind, t, W, H, pal, T) {
  const g = c.createRadialGradient(W / 2, H * .45, 10, W / 2, H * .45, Math.max(W, H) * .75); g.addColorStop(0, pal[0] + '66'); g.addColorStop(.45, '#16072ef0'); g.addColorStop(1, '#05020cfa'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  // أشعة ضوء دوارة
  c.save(); c.translate(W / 2, H * .45); c.rotate(T * .15); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) { c.rotate(TAU / 14); const gr = c.createLinearGradient(0, 0, 0, -Math.max(W, H)); gr.addColorStop(0, pal[1] + '30'); gr.addColorStop(1, 'transparent'); c.fillStyle = gr; c.beginPath(); c.moveTo(0, 0); c.lineTo(-40, -Math.max(W, H)); c.lineTo(40, -Math.max(W, H)); c.fill(); }
  c.restore();
  if (kind.road) { c.save(); c.globalAlpha = .55; const hy = H * .5; c.strokeStyle = '#ffffff'; c.lineWidth = 2; for (let i = -6; i <= 6; i++) { c.beginPath(); c.moveTo(W / 2, hy); c.lineTo(W / 2 + i * W * .25, H); c.stroke(); } for (let k = 0; k < 8; k++) { const z = ((k / 8 + T * 1.6) % 1); const y = hy + (H - hy) * z * z; c.globalAlpha = .5 * z; c.fillStyle = pal[1]; c.fillRect(W / 2 - 3 - z * 10, y, 6 + z * 20, 6 + z * 26); } c.restore(); }
  if (kind.waves) { for (let L = 0; L < 4; L++) { c.save(); c.globalAlpha = .55 - L * .08; const y0 = H * (.68 + L * .07); const gw = c.createLinearGradient(0, y0 - 20, 0, H); gw.addColorStop(0, L % 2 ? '#38bdf8' : '#0ea5e9'); gw.addColorStop(1, '#0b1f4d'); c.fillStyle = gw; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 12) c.lineTo(x, y0 + Math.sin(x / (60 + L * 20) + T * (2 + L) + L) * (10 + L * 3)); c.lineTo(W, H); c.fill(); c.restore(); } }
  if (kind.clouds) { c.save(); for (let k = 0; k < 7; k++) { const x = ((k * 173 + T * (40 + k * 25)) % (W + 300)) - 150, y = H * (.15 + (k % 4) * .18); c.globalAlpha = .18; c.fillStyle = '#fff'; for (let j = 0; j < 4; j++) { c.beginPath(); c.arc(x + j * 34, y + Math.sin(j) * 8, 30 + j * 4, 0, TAU); c.fill(); } } c.restore(); }
  if (kind.starfield) { c.save(); c.fillStyle = '#fff'; for (let k = 0; k < 90; k++) { const a = k * 2.399, r = ((k * 37 + T * 120) % (Math.max(W, H) * .8)); c.globalAlpha = clamp(r / 400) * .8; c.fillRect(W / 2 + Math.cos(a) * r, H * .45 + Math.sin(a) * r, 2, 2); } c.restore(); }
  if (kind.portal) { c.save(); c.translate(W / 2, H * .45); c.scale(1, .55); for (let k = 0; k < 5; k++) { c.rotate(T * (1.5 + k * .3)); c.strokeStyle = pal[k % 3]; c.globalAlpha = .45 * clamp(t * 3) * (1 - seg(t, .85, 1)); c.lineWidth = 6 - k; c.beginPath(); c.arc(0, 0, 70 + k * 34 + Math.sin(T * 3 + k) * 6, k, k + Math.PI * 1.4); c.stroke(); } c.restore(); }
  if (kind.pillar) { c.save(); c.globalCompositeOperation = 'lighter'; const a = clamp(seg(t, .05, .3) * 2) * (1 - seg(t, .8, 1)); const gp = c.createLinearGradient(W / 2 - 90, 0, W / 2 + 90, 0); gp.addColorStop(0, 'transparent'); gp.addColorStop(.5, `rgba(255,214,102,${.45 * a})`); gp.addColorStop(1, 'transparent'); c.fillStyle = gp; c.fillRect(W / 2 - 90, 0, 180, H); c.restore(); }
}

/** يشغّل المشهد. يرجع Promise تخلص لما يخلص */
export function playCinema(ev, { art, bar, duration } = {}) {
  return new Promise((resolve) => {
    const kind = sceneOf(ev.gift), S = SCENES[kind], pal = PALETTE[kind];
    const dur = duration ?? S.dur;
    const root = document.createElement('section'); root.className = 'gc126'; root.setAttribute('role', 'status'); root.setAttribute('dir', 'rtl');
    root.innerHTML = `<canvas class="gc126-bg"></canvas><div class="gc126-stage"><div class="gc126-hero">${art}<i class="gc126-refl" aria-hidden="true"></i></div></div><canvas class="gc126-fx"></canvas>${bar}<button type="button" class="gc126-snd" aria-label="الصوت">${soundOn ? '🔊' : '🔇'}</button>`;
    document.body.append(root);
    const bg = root.querySelector('.gc126-bg'), fx = root.querySelector('.gc126-fx'), hero = root.querySelector('.gc126-hero'), stage = root.querySelector('.gc126-stage');
    const dpr = Math.min(2, window.devicePixelRatio || 1); let W = 0, H = 0;
    const fit = () => { W = innerWidth; H = innerHeight; for (const cv of [bg, fx]) { cv.width = W * dpr; cv.height = H * dpr; cv.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0); } };
    fit(); addEventListener('resize', fit);
    const cb = bg.getContext('2d'), cf = fx.getContext('2d'), P = new Particles(cf), st = { shake: 0 };
    if (soundOn) for (const [k, at] of S.sound) sfx(k, at);
    root.querySelector('.gc126-snd').addEventListener('click', (e) => { e.stopPropagation(); soundOn = !soundOn; try { localStorage.setItem('la3_gift_snd', soundOn ? '1' : '0'); } catch { /* */ } e.currentTarget.textContent = soundOn ? '🔊' : '🔇'; });
    let t0 = 0, last = 0, raf = 0, done = false;
    const finish = () => { if (done) return; done = true; cancelAnimationFrame(raf); removeEventListener('resize', fit); root.classList.add('is-out'); setTimeout(() => { root.remove(); resolve(); }, 420); };
    root.addEventListener('click', finish);
    const frame = (now) => {
      if (!t0) { t0 = now; last = now; }
      const el = now - t0, t = clamp(el / dur), dt = Math.min(.05, (now - last) / 1000); last = now;
      const h0 = S.hero(t), size = Math.min(W * .9, H * .56, 480);
      const hx = W / 2 + h0.x * W * .5, hy = H * .45 + h0.y * H * .5;
      st.shake *= .88; const sx = rnd(-1, 1) * st.shake, sy = rnd(-1, 1) * st.shake;
      stage.style.transform = `translate(${sx}px,${sy}px)`;
      hero.style.width = hero.style.height = size + 'px';
      hero.style.transform = `translate(-50%,-50%) translate3d(${hx}px,${hy}px,${h0.z || 0}px) rotateY(${h0.ry || 0}deg) rotateX(${h0.rx || 0}deg) rotateZ(${h0.rz || 0}deg) scale(${h0.s ?? 1})`;
      hero.style.opacity = String(clamp(h0.o ?? 1) * clamp(el / 160));
      cb.clearRect(0, 0, W, H); cf.clearRect(0, 0, W, H);
      cb.globalAlpha = clamp(el / 300) * (1 - seg(t, .92, 1)); backdrop(cb, S, t, W, H, pal, el / 1000); cb.globalAlpha = 1;
      const hb = { x: hx, y: hy, w: size * (h0.s ?? 1), h: size * (h0.s ?? 1) };
      try { S.fx(P, t, dt, W, H, hb, pal, st); } catch { /* */ }
      P.step(dt);
      if (t >= 1) return finish();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    setTimeout(finish, dur + 1500); // أمان
  });
}
