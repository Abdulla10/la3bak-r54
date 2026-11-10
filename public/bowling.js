/* بولينغ — الواجهة (R68z20). الخادم يحسب كل رمية (src/engine/bowling.ts)، والمتصفح يعيد نفس المحاكاة
 * (bowling-physics.js) عشان يحرّك الكرة والدبابيس. المسار والدبابيس رسم أصلي (Canvas) بمنظور ثلاثي الأبعاد. */
import { faceHtml } from './characters.js?v=shell-r6';
import { avatarArt } from './avatars.js?v=r67ac';
import { isOn as soundOn } from './sfx.js?v=shell-r6';
import { simulate, PINS, HALF, HP, BR, normShot, BALL_Y0 } from './bowling-physics.js?v=r68z22';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const BW = { room: '', x0: 0, anim: null, shown: -1, busy: false, send: null, hold: 0, drag: null, mark: '' };
export const uiKey = () => [BW.busy].join('|');
const nm = (room, id) => room.players.find((p) => p.id === id)?.name ?? 'لاعب';
const faceOf = (room, id, i, size) => { const rp = room.players.find((q) => q.id === id); return rp?.av ? avatarArt(rp.av, size) : rp?.avatar ? `<img src="/api/room-avatar?code=${esc(room.code)}&id=${encodeURIComponent(id)}&v=${rp.avatar}" alt="" decoding="async">` : faceHtml(i, size); };
const BALL_COL = ['#1f5fe0', '#e0262f', '#16a34a', '#8b2ff0'];
const CW = 720, CH = 1220;

/* بطاقة النقاط: لكل إطار خانات الرميات والمجموع */
function cardHTML(g, pi) {
  const rolls = g.rolls[pi] || []; const sc = g.scores[pi]?.frames || [];
  const cells = Array.from({ length: g.frames }, (_, f) => {
    const fr = rolls[f] || []; const last = f === g.frames - 1;
    const marks = []; const n = last ? 3 : 2;
    for (let t = 0; t < n; t++) {
      const v = fr[t]; let m = '';
      if (v !== undefined) {
        if (v === 10 && (t === 0 || last && (fr[t - 1] === 10 || (t === 2 && fr[0] + fr[1] === 10)))) m = 'X';
        else if (t > 0 && fr[t - 1] !== 10 && fr[t - 1] + v === 10 && !(last && t === 2 && fr[0] + fr[1] !== 10 && fr[0] !== 10)) m = '/';
        else m = v === 0 ? '-' : String(v);
      }
      if (!last && t === 1 && fr[0] === 10) m = '';
      marks.push(`<i>${m}</i>`);
    }
    const cur = g.phase === 'aim' && f === g.frame && g.turnId === g.players[pi];
    return `<span class="bw-f${cur ? ' cur' : ''}${last ? ' last' : ''}"><small>${f + 1}</small><span class="bw-r">${marks.join('')}</span><b>${sc[f] ?? ''}</b></span>`;
  }).join('');
  return `<div class="bw-card" dir="ltr">${cells}</div>`;
}

export function bowling(room) {
  const g = room.game;
  if (BW.room !== room.code) Object.assign(BW, { room: room.code, x0: 0, anim: null, shown: -1, busy: false, hold: 0, drag: null, mark: '' });
  const myTurn = g.phase === 'aim' && g.turnId === room.you;
  const left = Math.max(0, g.endsAt - g.serverNow);
  const ti = g.players.indexOf(g.turnId);
  const head = g.players.map((id, i) => { const turn = g.phase === 'aim' && g.turnId === id; return `<div class="bw-p${turn ? ' turn' : ''}${g.out[i] ? ' out' : ''}"><span class="bw-av" style="--bc:${BALL_COL[i % 4]}">${faceOf(room, id, i, 44)}${turn ? `<b class="bw-t" data-bw-left="${left}" data-bw-at="${Date.now()}">${Math.ceil(left / 1000)}</b>` : ''}<em>${g.scores[i]?.total ?? 0}</em></span><small>${esc(id === room.you ? 'أنت' : nm(room, id))}</small></div>`; }).join('');
  const rollNo = ti >= 0 ? ((g.rolls[ti]?.[g.frame]?.length ?? 0) + 1) : 1;
  const final = g.phase === 'final' ? `<div class="bw-final"><div>${g.winners.includes(room.you) ? '🏆' : '🎳'}</div><b>${g.winners.length > 1 ? 'تعادل!' : g.winners[0] ? `${esc(g.winners[0] === room.you ? 'فزت' : nm(room, g.winners[0]) + ' فاز')}!` : 'انتهت'}</b><small>${esc(g.msg)}</small><div class="bw-cards">${g.players.map((id, i) => `<div class="bw-cr"><span>${esc(nm(room, id))}</span>${cardHTML(g, i)}</div>`).join('')}</div></div>` : '';
  return `<div class="bw" dir="rtl"><div class="bw-head">${head}</div>
    <div class="bw-score">${g.players.map((id, i) => `<div class="bw-cr${g.turnId === id ? ' on' : ''}"><span class="bw-cn" style="--bc:${BALL_COL[i % 4]}">${esc(id === room.you ? 'أنت' : nm(room, id))}</span>${cardHTML(g, i)}</div>`).join('')}</div>
    <div class="bw-stage"><canvas class="bw-cv" width="${CW}" height="${CH}" aria-label="مسار البولينغ"></canvas>
      <div class="bw-ban" hidden></div><span class="bw-kmh" hidden></span>
      ${g.phase === 'aim' ? `<div class="bw-turn"><span class="bw-tav">${faceOf(room, g.turnId, ti, 30)}</span><b>${g.turnId === room.you ? 'دورك' : esc(nm(room, g.turnId))}</b><small>الإطار ${g.frame + 1} - التسديدة ${rollNo}</small></div>` : ''}
      <span class="bw-fr">الإطار ${Math.min(g.frame + 1, g.frames)}/${g.frames}</span>
      ${myTurn ? '<p class="bw-hint">حرّك الكرة يمين ويسار، وبعدها اسحبها لفوق بقوة 👆</p>' : ''}
    </div>${final}</div>`;
}

/* ---------- الرسم: صور المالك (المسار، الدبابيس، الكور) + منظور مضبوط على صورة المسار ---------- */
// القيم مقاسة من صورة المسار: نقطة التلاشي، ارتفاع الكاميرا، والبعد البؤري
const VPX = 366, HOR = 85.75, F = 1826, CAMH = 135.4, CAMY = 71;
const A = '/assets/games68/';
const BALL_IMG = ['bowl-ball-blue', 'bowl-ball-red', 'bowl-ball-green', 'bowl-ball-purple'];
function P3(x, y, z) { const d = Math.max(30, y - CAMY); return { x: VPX + F * x / d, y: HOR + F * (CAMH - z) / d, s: F / d }; }
const IMG = {}; const img = (n) => { const src = A + n + '.webp'; let i = IMG[src]; if (!i) { i = IMG[src] = new Image(); i.decoding = 'async'; i.src = src; i.onload = () => BW.repaint?.(); } return i.complete && i.naturalWidth ? i : null; };

function drawScene(ctx, zoom, pins, ball, ci) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0b0d22'; ctx.fillRect(0, 0, CW, CH);
  ctx.translate(VPX, HOR); ctx.scale(zoom, zoom); ctx.translate(-VPX, -HOR);
  const lane = img('bowl-lane');
  if (lane) ctx.drawImage(lane, 0, 0, CW, CH);
  logo(ctx);
  const items = pins.filter((p) => p.st !== 2 || (p.y < HP + 140 && Math.abs(p.x) < HALF + 26)).map((p) => ({ y: p.y, draw: () => drawPin(ctx, p) }));
  // الانعكاس على الخشب اللامع
  for (const p of pins) if (p.st === 0 && Math.abs(p.x) < HALF) reflectPin(ctx, p);
  if (ball && ball.on && !ball.gutter) reflectBall(ctx, ball, ci);
  if (ball && ball.on) items.push({ y: ball.y, draw: () => drawBall(ctx, ball, ci) });
  items.sort((a, b) => b.y - a.y).forEach((it) => it.draw());
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
/* شعار لعبك على المثلث الذهبي اللي فوق الدبابيس */
function logo(ctx) {
  const cx = 371, cy = 98;
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 34px Tahoma, sans-serif';
  const tg = ctx.createLinearGradient(0, cy - 16, 0, cy + 16); tg.addColorStop(0, '#f3d4ff'); tg.addColorStop(.5, '#c46bff'); tg.addColorStop(1, '#7a22e0');
  ctx.fillStyle = '#3d0b78'; ctx.fillText('لعبك', cx, cy + 2); ctx.fillStyle = tg; ctx.fillText('لعبك', cx, cy);
  ctx.font = '16px serif'; ctx.fillText('👑', cx, cy - 25);
  ctx.font = '900 10px Arial, sans-serif'; ctx.fillStyle = '#4a3200'; ctx.fillText('LA3BAK', cx, cy + 22);
  ctx.restore();
}
function drawPin(ctx, p) {
  const b = P3(p.x, p.y, 0); const h = 38 * b.s; if (h < 1) return;
  const up = img('bowl-pin'), dn = img('bowl-pin-down'); if (!up) return;
  const z = (p.z || 0) * b.s;
  ctx.save(); ctx.translate(b.x, b.y);
  // ظل (يصغر لما الدبوس بالهوا)
  ctx.fillStyle = `rgba(0,0,0,${0.4 / (1 + z / h)})`; ctx.beginPath(); ctx.ellipse(0, 0, h * 0.2, h * 0.06, 0, 0, 7); ctx.fill();
  const w = h * up.naturalWidth / up.naturalHeight;
  const base = p.st ? (p.dir >= 0 ? 1 : -1) * (0.55 + Math.abs(p.dir) * 0.45) * Math.min(1, p.tilt) * Math.PI / 2 : 0;
  if (z > 0.5) {
    // بالهوا: يتقلب حول نصه
    ctx.translate(0, -z - h / 2); ctx.rotate(base + (p.rot || 0)); ctx.drawImage(up, -w / 2, -h / 2, w, h);
  } else if (p.st && p.tilt >= 0.99 && dn) {
    const L = h * 1.02, H = L * dn.naturalHeight / dn.naturalWidth;
    if (p.dir < 0) ctx.scale(-1, 1);
    ctx.drawImage(dn, -L * 0.15, -H * 0.9, L, H);
  } else {
    ctx.rotate(base); ctx.drawImage(up, -w / 2, -h, w, h);
  }
  ctx.restore();
}
function reflectPin(ctx, p) {
  const up = img('bowl-pin'); if (!up) return;
  const b = P3(p.x, p.y, 0); const h = 38 * b.s; const w = h * up.naturalWidth / up.naturalHeight;
  ctx.save(); ctx.globalAlpha = 0.16; ctx.translate(b.x, b.y); ctx.scale(1, -0.55); ctx.drawImage(up, -w / 2, -h, w, h); ctx.restore();
}
function reflectBall(ctx, b, ci) {
  const im = img(BALL_IMG[ci % 4]); if (!im) return;
  const g = P3(b.x, b.y, 0), c = P3(b.x, b.y, BR); const r = BR * c.s;
  ctx.save(); ctx.globalAlpha = 0.2; ctx.translate(c.x, g.y + (g.y - c.y) * 0.55); ctx.scale(1, -0.55); ctx.drawImage(im, -r, -r, 2 * r, 2 * r); ctx.restore();
}
function drawBall(ctx, b, ci) {
  const g = P3(b.x, b.y, 0), c = P3(b.x, b.y, b.gutter ? BR * 0.45 : BR); const r = BR * c.s;
  ctx.fillStyle = '#0007'; ctx.beginPath(); ctx.ellipse(c.x, g.y, r * 0.9, r * 0.25, 0, 0, 7); ctx.fill();
  const im = img(BALL_IMG[ci % 4]);
  if (!im) { ctx.fillStyle = BALL_COL[ci % 4]; ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, 7); ctx.fill(); return; }
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate((b.y - BALL_Y0) / (2 * Math.PI * BR) * 0.22); ctx.drawImage(im, -r, -r, 2 * r, 2 * r); ctx.restore();
}

/* ---------- الحالة الحالية (بدون حركة) ---------- */
const restPins = (standing) => PINS.map((q, i) => ({ x: q.x, y: q.y, st: standing[i] ? 0 : 2, tilt: 0, dir: 0 }));
function paintIdle(cv, g, room) {
  const ctx = cv.getContext('2d');
  const myTurn = g.phase === 'aim' && g.turnId === room.you;
  const ti = Math.max(0, g.players.indexOf(g.turnId));
  const ball = { x: myTurn ? BW.x0 : 0, y: BALL_Y0, on: g.phase === 'aim' };
  drawScene(ctx, 1, restPins(g.standing), ball, ti);
}

let clockT = 0;
export function afterRender(view, room, send) {
  const g = room.game; if (!g || g.game !== 'bowling') return;
  BW.send = send;
  const cv = view.querySelector('.bw-cv'); if (!cv) return;
  const ctx = cv.getContext('2d');
  const myTurn = g.phase === 'aim' && g.turnId === room.you;
  clearInterval(clockT); clockT = setInterval(() => { const els = document.querySelectorAll('[data-bw-left]'); if (!els.length) return clearInterval(clockT); for (const el of els) { const l = Number(el.dataset.bwLeft) - (Date.now() - Number(el.dataset.bwAt)); el.textContent = String(Math.max(0, Math.ceil(l / 1000))); el.classList.toggle('low', l < 6000); } }, 300);
  // حركة الرمية الأخيرة
  if (g.last && g.shotNo !== BW.shown) {
    const first = BW.shown < 0; BW.shown = g.shotNo;
    if (!first && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const r = simulate(g.last.before, g.last.shot, true);
      BW.anim = { frames: r.frames, t0: performance.now(), kmh: Math.round((560 + g.last.shot.power * 380) * 0.036), ci: Math.max(0, g.players.indexOf(g.last.by)), mark: g.last.mark, n: g.last.knocked.length, by: g.last.by };
    }
  } else if (!g.last) BW.shown = g.shotNo;
  BW.repaint = () => { if (!BW.anim) { const c = document.querySelector('.bw-cv'); if (c) paintIdle(c, room.game, room); } };
  const showBan = (t, cls) => { const ban = document.querySelector('.bw-ban'); if (!ban) return; ban.hidden = false; ban.className = 'bw-ban ' + (cls || ''); ban.textContent = t; };
  const lid = BW.loopId = (BW.loopId || 0) + 1;
  const tb = view.querySelector('.bw-turn'); if (tb && BW.anim) tb.hidden = true;
  const loop = () => {
    if (lid !== BW.loopId) return;
    const c = document.querySelector('.bw-cv'); if (!c) { BW.anim = null; return; }
    const A = BW.anim;
    if (A) {
      { const t2 = document.querySelector('.bw-turn'); if (t2 && !t2.hidden) t2.hidden = true; const sp = document.querySelector('.bw-kmh'); if (sp && sp.hidden) { sp.hidden = false; sp.textContent = `${A.kmh} كم/س`; } }
      const k = Math.floor((performance.now() - A.t0) / (1000 / 60)); const fr = A.frames[Math.min(k, A.frames.length - 1)];
      const b = { x: fr.b[0], y: fr.b[1], gutter: !!fr.b[2], on: !!fr.b[3] };
      const zoom = 1 + 1.25 * Math.min(1, Math.max(0, (b.y - 700) / 1000)) ** 1.4;
      const pins = fr.p.map(([x, y, st, tilt, dir, z, rot]) => ({ x, y, st, tilt, dir, z, rot }));
      sound(A, fr, k);
      const cx2 = c.getContext('2d');
      drawScene(cx2, zoom, pins, b, A.ci);
      if (A.shakeAt) { const e = performance.now() - A.shakeAt; if (e < 450) { const m = 9 * (1 - e / 450); c.style.transform = `translate(${(Math.random() - .5) * m}px,${(Math.random() - .5) * m}px)`; } else c.style.transform = ''; }
      if (k >= A.frames.length - 1) {
        if (!A.endAt) { A.endAt = performance.now(); if (A.mark === 'strike') A.shakeAt = performance.now(); A.banT = A.mark === 'strike' ? 'STRIKE!' : A.mark === 'spare' ? 'SPARE' : A.mark === 'gutter' ? 'مجرى 😬' : `${A.n} ${A.n === 1 ? 'دبوس' : 'دبابيس'}`; showBan(A.banT, A.mark || 'n'); }
        else if (document.querySelector('.bw-ban')?.hidden) showBan(A.banT, A.mark || 'n');
        if (performance.now() - A.endAt > 1300) { BW.anim = null; stopRoll(); const bn = document.querySelector('.bw-ban'); if (bn) bn.hidden = true; const sp = document.querySelector('.bw-kmh'); if (sp) sp.hidden = true; c.style.transform = ''; const t2 = document.querySelector('.bw-turn'); if (t2) { t2.hidden = false; t2.style.animation = 'none'; void t2.offsetWidth; t2.style.animation = ''; } paintIdle(c, room.game, room); return; }
      }
      requestAnimationFrame(loop); return;
    }
    paintIdle(c, g, room);
  };
  loop();
  if (!myTurn) return;
  // اللمس: سحب يمين/يسار = مكان الكرة، سحب لفوق = رمية
  const toCanvas = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * CW / r.width, y: (e.clientY - r.top) * CH / r.height, t: performance.now() }; };
  cv.onpointerdown = (e) => { if (BW.anim || BW.busy) return; cv.setPointerCapture(e.pointerId); const p = toCanvas(e); BW.drag = { pts: [p], x0: BW.x0 }; };
  cv.onpointermove = (e) => {
    const D = BW.drag; if (!D) return; const p = toCanvas(e); D.pts.push(p); if (D.pts.length > 80) D.pts.splice(1, 1);
    const s0 = D.pts[0]; const dy = p.y - s0.y, dx = p.x - s0.x;
    if (dy > -40) { const sc = P3(0, BALL_Y0, BR).s; BW.x0 = Math.max(-HALF + BR, Math.min(HALF - BR, D.x0 + dx / sc)); paintIdle(cv, g, room); }
  };
  cv.onpointerup = (e) => {
    const D = BW.drag; BW.drag = null; if (!D) return; const p = toCanvas(e); D.pts.push(p);
    // نحسب من آخر جزء من السحبة (الانطلاقة)
    let i0 = D.pts.length - 1; while (i0 > 0 && p.t - D.pts[i0 - 1].t < 260) i0--;
    const s = D.pts[i0]; const dy = p.y - s.y, dx = p.x - s.x, dt = Math.max(16, p.t - s.t);
    if (dy > -70) return; // مو رمية
    const speed = -dy / dt; // بكسل كانفس لكل ملي ثانية
    const power = Math.max(0.35, Math.min(1, 0.25 + speed / 3.2));
    const aim = Math.max(-0.06, Math.min(0.06, (dx / -dy) * 0.045));
    // الانحناء: الفرق بين اتجاه أول السحبة وآخرها
    const mid = D.pts[Math.floor((i0 + D.pts.length - 1) / 2)];
    const s1 = (mid.x - s.x) / Math.min(-1, mid.y - s.y), s2 = (p.x - mid.x) / Math.min(-1, p.y - mid.y);
    const spin = Math.max(-1, Math.min(1, (s1 - s2) * 1.6));
    send?.({ type: 'throw', ...normShot({ x0: BW.x0, aim, spin, power }) });
  };
}

/* ---------- الأصوات (WebAudio، بدون ملفات): دحرجة الكرة وتطاير الدبابيس ---------- */
let AC = null, roll = null, noiseBuf = null;
function ac() { if (!soundOn()) return null; try { AC ??= new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch { return null; } return AC; }
function noise(a) { if (noiseBuf) return noiseBuf; const n = a.sampleRate * 1.5; noiseBuf = a.createBuffer(1, n, a.sampleRate); const d = noiseBuf.getChannelData(0); let last = 0; for (let i = 0; i < n; i++) { last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04; d[i] = last * 3.2; } return noiseBuf; }
function startRoll() { const a = ac(); if (!a || roll) return; const src = a.createBufferSource(); src.buffer = noise(a); src.loop = true; const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260; const g = a.createGain(); g.gain.setValueAtTime(0.0001, a.currentTime); g.gain.exponentialRampToValueAtTime(0.5, a.currentTime + 0.25); src.connect(f).connect(g).connect(a.destination); src.start(); roll = { src, g, f }; }
function stopRoll() { if (!roll || !AC) return; const r = roll; roll = null; try { r.g.gain.setTargetAtTime(0.0001, AC.currentTime, 0.08); r.src.stop(AC.currentTime + 0.4); } catch { /* ignore */ } }
function crash(n) {
  const a = ac(); if (!a) return; const t = a.currentTime;
  const hits = Math.max(2, Math.min(14, n * 1.5 | 0));
  for (let i = 0; i < hits; i++) {
    const t0 = t + i * (0.018 + Math.random() * 0.03);
    const src = a.createBufferSource(); src.buffer = noise(a); const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400 + Math.random() * 2200; f.Q.value = 2.5;
    const g = a.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.9 / (1 + i * 0.15), t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
    src.connect(f).connect(g).connect(a.destination); src.start(t0, Math.random()); src.stop(t0 + 0.15);
    const o = a.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(700 + Math.random() * 500, t0); o.frequency.exponentialRampToValueAtTime(260, t0 + 0.08);
    const og = a.createGain(); og.gain.setValueAtTime(0.0001, t0); og.gain.exponentialRampToValueAtTime(0.18, t0 + 0.003); og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1); o.connect(og).connect(a.destination); o.start(t0); o.stop(t0 + 0.12);
  }
}
function sound(A, fr, k) {
  if (!A.rolling && fr.b[3]) { A.rolling = true; startRoll(); }
  if (roll && AC) { roll.f.frequency.value = fr.b[2] ? 180 : 260; if (!fr.b[3] || fr.b[1] > HP + 40) stopRoll(); }
  if (!A.crashed && fr.p.some((q) => q[2] === 1)) { A.crashed = true; crash(A.n); }
  void k;
}
