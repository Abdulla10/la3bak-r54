/* ٨ بول — الواجهة (R68z). الخادم يحاكي كل ضربة ويقرر النتيجة (src/engine/pool.ts)،
 * والمتصفح يعيد نفس المحاكاة (pool-physics.js) عشان يحرّك الكرات. الطاولة والكرات رسم أصلي (Canvas). */
import { faceHtml } from './characters.js?v=shell-r6';
import { avatarArt } from './avatars.js?v=r68z31';
import { simulate, canPlace, groupOf, W, H, R, HEAD_Y, POCKETS } from './pool-physics.js?v=r68z5';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const PL = { room: '', angle: -Math.PI / 2, power: 0, spin: 0, place: null, anim: null, shown: -1, busy: false, dragging: '', send: null, evSeq: -1 };
export const uiKey = () => [PL.busy].join('|');
const COL = { 1: '#f7c600', 2: '#1f5fd6', 3: '#e0261f', 4: '#6a2fb0', 5: '#ff7a00', 6: '#16a34a', 7: '#8b1c1c', 8: '#111111' };
const colorOf = (n) => COL[n > 8 ? n - 8 : n] || '#fff';
const nm = (room, id) => room.players.find((p) => p.id === id)?.name ?? 'لاعب';
const faceOf = (room, id, i, size) => { const rp = room.players.find((q) => q.id === id); return rp?.av ? avatarArt(rp.av, size) : rp?.avatar ? `<img src="/api/room-avatar?code=${esc(room.code)}&id=${encodeURIComponent(id)}&v=${rp.avatar}" alt="" decoding="async">` : faceHtml(i, size); };
const ballSVG = (n, dim) => n === 8 || (n >= 1 && n <= 15) ? `<svg viewBox="0 0 20 20" class="pl-mb${dim ? ' dim' : ''}"><circle cx="10" cy="10" r="9.5" fill="${n > 8 ? '#fff' : colorOf(n)}"/>${n > 8 ? `<rect x="0.5" y="5" width="19" height="10" fill="${colorOf(n)}"/>` : ''}<circle cx="10" cy="10" r="4.6" fill="#fff"/><text x="10" y="12.8" text-anchor="middle" font-size="7" font-weight="900" fill="#111" font-family="Arial">${n}</text></svg>` : '<i class="pl-mb empty"></i>';

function rowOf(g, pi) {
  const grp = g.groups[pi]; const nums = grp === 'solid' ? [1, 2, 3, 4, 5, 6, 7] : grp === 'stripe' ? [9, 10, 11, 12, 13, 14, 15] : [];
  if (!nums.length) return Array.from({ length: 7 }, () => '<i class="pl-mb empty"></i>').join('');
  const inMap = new Map(g.balls.map((b) => [b.n, b.in]));
  return nums.map((n) => (inMap.get(n) ? '<i class="pl-mb empty"></i>' : ballSVG(n))).join('');
}
export function pool(room) {
  const g = room.game;
  if (PL.room !== room.code) Object.assign(PL, { room: room.code, angle: -Math.PI / 2, power: 0, spin: 0, place: null, anim: null, shown: -1, busy: false, evSeq: -1 });
  const me = g.you; const opp = me >= 0 ? 1 - me : 1; const meI = me >= 0 ? me : 0;
  const myTurn = g.phase === 'aim' && g.turnId === room.you;
  const left = (Math.max(0, g.endsAt - g.serverNow));
  const side = (pi, cls) => { const id = g.players[pi]; const turn = g.phase === 'aim' && g.turnId === id; return `<div class="pl-p ${cls}${turn ? ' turn' : ''}"><span class="pl-av">${faceOf(room, id, pi, 54)}${turn ? `<b class="pl-t" data-pl-left="${left}" data-pl-at="${Date.now()}">${Math.ceil(left / 1000)}</b>` : ''}</span><span class="pl-who"><b>${esc(nm(room, id))}</b><span class="pl-row">${rowOf(g, pi)}</span></span></div>`; };
  const msg = g.phase === 'final' ? `<div class="pl-final"><div>${g.winner === room.you ? '🏆' : '🎱'}</div><b>${g.winner ? `${esc(nm(room, g.winner))} فاز!` : 'انتهت'}</b><small>${esc(g.msg)}</small></div>` : g.msg ? `<p class="pl-msg${/خطأ|خلص/.test(g.msg) ? ' bad' : ''}">${esc(g.msg)}${myTurn && g.inHand ? ' — حرّك البيضا وحطها وين ما تبي' : ''}</p>` : '';
  return `<div class="pl" dir="rtl"><div class="pl-bar">${side(meI, 'l')}<span class="pl-vs">VS</span>${side(opp, 'r')}</div>
    <div class="pl-stage"><div class="pl-table"><canvas class="pl-cv" width="${W + 132}" height="${H + 132}" aria-label="طاولة البلياردو"></canvas></div>
    ${myTurn ? `<div class="pl-side"><button type="button" class="pl-spin" data-act="pl-spin" aria-label="دوران البيضا"><i style="top:${50 - PL.spin * 34}%"></i></button><div class="pl-power" data-pl-power aria-label="القوة — اسحب لتحت واترك"><span class="pl-pf" style="height:${PL.power * 100}%"></span><span class="pl-cue"></span></div><small>اسحب<br>لتحت</small></div>` : ''}</div>
    ${msg}${myTurn ? `<p class="pl-hint">${g.inHand ? '✋ البيضا بيدك: اسحبها لمكانها، ' : ''}اسحب على الطاولة عشان تصوّب، وبعدها اسحب القوة لتحت واترك.</p>` : ''}</div>`;
}

/* ---------- الرسم ---------- */
const M = 66; // هامش الإطار داخل الكانفس
/* رسومات المالك: الطاولة والعصي */
const IMG = {}; const img = (src) => { if (!src) return null; let i = IMG[src]; if (!i) { i = IMG[src] = new Image(); i.decoding = 'async'; i.src = src; i.onload = () => { const c = document.querySelector('.pl-cv'); if (c && PL.repaint) PL.repaint(); }; } return i.complete && i.naturalWidth ? i : null; };
const TABLE_SRC = '/assets/games68/pool-table.webp', DEFAULT_CUE = '/assets/games68/cues/cue00.webp';
const CLOTH = { x: 48, y: 60, w: 455, h: 857 }; // مكان القماش داخل صورة الطاولة
function drawTable(ctx) {
  const cw = W + 2 * M, ch = H + 2 * M;
  ctx.clearRect(0, 0, cw, ch);
  const t = img(TABLE_SRC);
  if (t) { const sx = W / CLOTH.w, sy = H / CLOTH.h; ctx.drawImage(t, M - CLOTH.x * sx, M - CLOTH.y * sy, t.naturalWidth * sx, t.naturalHeight * sy); ctx.strokeStyle = '#ffffff1c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(M, M + HEAD_Y); ctx.lineTo(M + W, M + HEAD_Y); ctx.stroke(); return; }
  // الإطار
  const rail = ctx.createLinearGradient(0, 0, cw, 0); rail.addColorStop(0, '#1c1c22'); rail.addColorStop(.5, '#34343c'); rail.addColorStop(1, '#1c1c22');
  ctx.fillStyle = rail; roundRect(ctx, 0, 0, cw, ch, 26); ctx.fill();
  ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 3; roundRect(ctx, 3, 3, cw - 6, ch - 6, 24); ctx.stroke();
  // القماش
  const cl = ctx.createRadialGradient(cw / 2, ch / 2, 40, cw / 2, ch / 2, ch * 0.62); cl.addColorStop(0, '#3fb4ff'); cl.addColorStop(.6, '#1683d8'); cl.addColorStop(1, '#0b4f9a');
  ctx.fillStyle = cl; ctx.fillRect(M, M, W, H);
  ctx.strokeStyle = '#0a3d78'; ctx.lineWidth = 6; ctx.strokeRect(M - 3, M - 3, W + 6, H + 6);
  // خط الكسر
  ctx.strokeStyle = '#ffffff22'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(M, M + HEAD_Y); ctx.lineTo(M + W, M + HEAD_Y); ctx.stroke();
  // النقاط
  ctx.fillStyle = '#e9eef5';
  for (let i = 1; i < 4; i++) { const x = M + W * i / 4; dot(ctx, x, M / 2); dot(ctx, x, M + H + M / 2); }
  for (let i = 1; i < 8; i++) { if (i === 4) continue; const y = M + H * i / 8; dot(ctx, M / 2, y); dot(ctx, M + W + M / 2, y); }
  // الجيوب
  for (const p of POCKETS) { ctx.fillStyle = '#050608'; ctx.beginPath(); ctx.arc(M + Math.min(W + 6, Math.max(-6, p.x)), M + Math.min(H + 6, Math.max(-6, p.y)), p.r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 2; ctx.stroke(); }
}
const dot = (ctx, x, y) => { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); };
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawBall(ctx, b) {
  const x = M + b.x, y = M + b.y;
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = b.n === 0 ? '#f6f6f2' : b.n > 8 ? '#f6f6f2' : colorOf(b.n); ctx.fillRect(x - R, y - R, R * 2, R * 2);
  if (b.n > 8) { ctx.fillStyle = colorOf(b.n); ctx.fillRect(x - R, y - R * 0.55, R * 2, R * 1.1); }
  if (b.n > 0) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, R * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#111'; ctx.font = `900 ${R * 0.72}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(b.n), x, y + 0.5); }
  const sh = ctx.createRadialGradient(x - R * 0.4, y - R * 0.45, 1, x, y, R); sh.addColorStop(0, '#ffffffaa'); sh.addColorStop(.35, '#ffffff10'); sh.addColorStop(1, '#00000055');
  ctx.fillStyle = sh; ctx.fillRect(x - R, y - R, R * 2, R * 2); ctx.restore();
}
/** خط التصويب: من البيضا لأول كرة + الكرة الشبح + اتجاه الكرة المضروبة */
function drawAim(ctx, balls, cue, ang, power) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  let best = null;
  for (const b of balls) { if (b.in || b.n === 0) continue; const fx = b.x - cue.x, fy = b.y - cue.y; const t = fx * dx + fy * dy; if (t <= 0) continue; const px = fx - t * dx, py = fy - t * dy; const d2 = px * px + py * py; if (d2 > 4 * R * R) continue; const back = Math.sqrt(4 * R * R - d2); const tt = t - back; if (!best || tt < best.t) best = { t: tt, b }; }
  let tEnd = best ? best.t : 2000;
  if (!best) { const tx = dx > 0 ? (W - R - cue.x) / dx : dx < 0 ? (R - cue.x) / dx : 1e9; const ty = dy > 0 ? (H - R - cue.y) / dy : dy < 0 ? (R - cue.y) / dy : 1e9; tEnd = Math.min(tx, ty); }
  const gx = cue.x + dx * tEnd, gy = cue.y + dy * tEnd;
  ctx.strokeStyle = '#ffffffdd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(M + cue.x, M + cue.y); ctx.lineTo(M + gx, M + gy); ctx.stroke();
  ctx.beginPath(); ctx.arc(M + gx, M + gy, R, 0, Math.PI * 2); ctx.stroke();
  if (best) { const nx = best.b.x - gx, ny = best.b.y - gy, nl = Math.hypot(nx, ny) || 1; ctx.beginPath(); ctx.moveTo(M + best.b.x, M + best.b.y); ctx.lineTo(M + best.b.x + nx / nl * 70, M + best.b.y + ny / nl * 70); ctx.stroke(); }
  // العصا
  const pull = 18 + power * 70; const sx = cue.x - dx * (R + pull), sy = cue.y - dy * (R + pull), ex = sx - dx * 520, ey = sy - dy * 520;
  const ci = img(PL.cueArt || DEFAULT_CUE) || img(DEFAULT_CUE);
  if (ci) { const len = 600, th = Math.max(16, len * ci.naturalHeight / ci.naturalWidth); ctx.save(); ctx.translate(M + sx, M + sy); ctx.rotate(ang); ctx.shadowColor = '#000a'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6; ctx.drawImage(ci, -len, -th / 2, len, th); ctx.restore(); return; }
  const gr = ctx.createLinearGradient(M + sx, M + sy, M + ex, M + ey); gr.addColorStop(0, '#f1e6cf'); gr.addColorStop(.04, '#f1e6cf'); gr.addColorStop(.05, '#2a5bd7'); gr.addColorStop(.08, '#d9b27a'); gr.addColorStop(.7, '#a0652b'); gr.addColorStop(1, '#2a1607');
  ctx.strokeStyle = gr; ctx.lineCap = 'round'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(M + sx, M + sy); ctx.lineTo(M + ex, M + ey); ctx.stroke(); ctx.lineCap = 'butt';
}
function paint(cv, room, balls, aiming) {
  const ctx = cv.getContext('2d'); drawTable(ctx);
  const g = room.game;
  if (aiming && g.inHand && g.kitchen) { ctx.fillStyle = '#ffffff10'; ctx.fillRect(M, M + HEAD_Y, W, H - HEAD_Y); }
  for (const b of balls) if (!b.in) drawBall(ctx, b);
  if (aiming) { const cue = balls.find((b) => b.n === 0); if (cue && !cue.in) drawAim(ctx, balls, cue, PL.angle, PL.power); }
}
const currentBalls = (g) => { const b = g.balls.map((x) => ({ ...x })); if (PL.place) { const c = b.find((x) => x.n === 0); c.x = PL.place.x; c.y = PL.place.y; c.in = false; } return b; };

let clockT = 0;
export function afterRender(view, room, send) {
  const g = room.game; if (!g || g.game !== 'pool') return;
  PL.send = send;
  { const meP = room.players.find((p) => p.id === room.you); const a = meP?.equipped?.cue?.art; PL.cueArt = typeof a === 'string' && /^\/assets\/[A-Za-z0-9_./-]+\.webp$/.test(a) ? a : ''; }
  const cv = view.querySelector('.pl-cv'); if (!cv) return;
  const myTurn = g.phase === 'aim' && g.turnId === room.you;
  clearInterval(clockT); clockT = setInterval(() => { const els = document.querySelectorAll('[data-pl-left]'); if (!els.length) return clearInterval(clockT); for (const el of els) { const l = Number(el.dataset.plLeft) - (Date.now() - Number(el.dataset.plAt)); el.textContent = String(Math.max(0, Math.ceil(l / 1000))); el.classList.toggle('low', l < 8000); } }, 300);
  // حركة الضربة الأخيرة
  if (g.last && g.shotNo !== PL.shown) {
    const first = PL.shown < 0; PL.shown = g.shotNo; PL.place = null;
    if (!first && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const frames = []; const before = g.last.before.map((b) => ({ ...b })); if (g.last.place) { const c = before.find((b) => b.n === 0); c.x = g.last.place.x; c.y = g.last.place.y; c.in = false; }
      simulate(before, g.last.v, g.last.spin, (bs, i) => { if (i % 1 === 0) frames.push(bs.map((b) => ({ n: b.n, x: b.x, y: b.y, in: b.in }))); });
      PL.anim = { frames, i: 0, t0: performance.now() };
    }
  } else if (!g.last) PL.shown = g.shotNo;
  PL.repaint = () => { if (!PL.anim) { const c = document.querySelector('.pl-cv'); if (c) paint(c, room, currentBalls(g), g.phase === 'aim' && g.turnId === room.you); } };
  const loop = () => {
    const c = document.querySelector('.pl-cv'); if (!c) { PL.anim = null; return; }
    if (PL.anim) {
      const k = Math.floor((performance.now() - PL.anim.t0) / (1000 / 60));
      if (k < PL.anim.frames.length) { paint(c, room, PL.anim.frames[k], false); requestAnimationFrame(loop); return; }
      PL.anim = null;
    }
    paint(c, room, currentBalls(g), myTurn);
  };
  loop();
  if (!myTurn) return;
  // التصويب ووضع البيضا
  const toTable = (e) => { const r = cv.getBoundingClientRect(); const sx = (W + 2 * M) / r.width; return { x: (e.clientX - r.left) * sx - M, y: (e.clientY - r.top) * sx - M }; };
  cv.onpointerdown = (e) => {
    if (PL.anim || PL.busy) return; cv.setPointerCapture(e.pointerId);
    const p = toTable(e); const cue = currentBalls(g).find((b) => b.n === 0);
    PL.dragging = g.inHand && cue && Math.hypot(p.x - cue.x, p.y - cue.y) < R * 3 ? 'place' : 'aim';
    cv.onpointermove(e);
  };
  cv.onpointermove = (e) => {
    if (!PL.dragging) return; const p = toTable(e); const balls = currentBalls(g); const cue = balls.find((b) => b.n === 0);
    if (PL.dragging === 'place') { const x = Math.round(p.x), y = Math.round(p.y); if (canPlace(g.balls, x, y, g.kitchen)) PL.place = { x, y }; }
    else if (cue) PL.angle = Math.atan2(p.y - cue.y, p.x - cue.x);
    paint(cv, room, currentBalls(g), true);
  };
  cv.onpointerup = () => { PL.dragging = ''; };
  const pw = view.querySelector('[data-pl-power]'); if (!pw) return;
  const fill = pw.querySelector('.pl-pf');
  pw.onpointerdown = (e) => { if (PL.anim || PL.busy) return; pw.setPointerCapture(e.pointerId); PL.dragging = 'power'; pw.onpointermove(e); };
  pw.onpointermove = (e) => { if (PL.dragging !== 'power') return; const r = pw.getBoundingClientRect(); PL.power = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)); fill.style.height = PL.power * 100 + '%'; paint(cv, room, currentBalls(g), true); };
  pw.onpointerup = () => {
    if (PL.dragging !== 'power') return; PL.dragging = '';
    const power = PL.power; PL.power = 0; fill.style.height = '0%';
    if (power < 0.04) { paint(cv, room, currentBalls(g), true); return; }
    send?.({ type: 'shot', angle: PL.angle, power, spin: PL.spin, ...(g.inHand && PL.place ? { place: PL.place } : {}) });
  };
}
