/* بولينغ — الواجهة (R68z20). الخادم يحسب كل رمية (src/engine/bowling.ts)، والمتصفح يعيد نفس المحاكاة
 * (bowling-physics.js) عشان يحرّك الكرة والدبابيس. المسار والدبابيس رسم أصلي (Canvas) بمنظور ثلاثي الأبعاد. */
import { faceHtml } from './characters.js?v=shell-r6';
import { avatarArt } from './avatars.js?v=r67ac';
import { simulate, PINS, HALF, HP, BR, normShot } from './bowling-physics.js?v=r68z20b';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const BW = { room: '', x0: 0, anim: null, shown: -1, busy: false, send: null, hold: 0, drag: null, mark: '' };
export const uiKey = () => [BW.busy].join('|');
const nm = (room, id) => room.players.find((p) => p.id === id)?.name ?? 'لاعب';
const faceOf = (room, id, i, size) => { const rp = room.players.find((q) => q.id === id); return rp?.av ? avatarArt(rp.av, size) : rp?.avatar ? `<img src="/api/room-avatar?code=${esc(room.code)}&id=${encodeURIComponent(id)}&v=${rp.avatar}" alt="" decoding="async">` : faceHtml(i, size); };
const BALL_COL = ['#1f5fe0', '#e0262f', '#16a34a', '#8b2ff0'];
const CW = 720, CH = 1120;

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
    <div class="bw-stage"><canvas class="bw-cv" width="${CW}" height="${CH}" aria-label="مسار البولينغ"></canvas>
      <div class="bw-score">${g.players.map((id, i) => `<div class="bw-cr${g.turnId === id ? ' on' : ''}"><span class="bw-cn" style="--bc:${BALL_COL[i % 4]}">${esc(id === room.you ? 'أنت' : nm(room, id))}</span>${cardHTML(g, i)}</div>`).join('')}</div>
      <div class="bw-ban" hidden></div>
      ${g.phase === 'aim' ? `<div class="bw-turn"><span class="bw-tav">${faceOf(room, g.turnId, ti, 30)}</span><b>${g.turnId === room.you ? 'دورك' : esc(nm(room, g.turnId))}</b><small>الإطار ${g.frame + 1} - التسديدة ${rollNo}</small></div>` : ''}
      <span class="bw-fr">الإطار ${Math.min(g.frame + 1, g.frames)}/${g.frames}</span>
      ${myTurn ? '<p class="bw-hint">حرّك الكرة يمين ويسار، وبعدها اسحبها لفوق بقوة 👆</p>' : ''}
    </div>${final}</div>`;
}

/* ---------- الرسم بمنظور ---------- */
const F = 1560, CAMH = 125, HOR = 250, END = HP + 3 * 26.4 + 60;
function cam(y0) { return { y: y0 }; }
function P3(c, x, y, z) { const d = Math.max(30, y - c.y); return { x: CW / 2 + F * x / d, y: HOR + F * (CAMH - z) / d, s: F / d }; }
function quad(ctx, c, x1, x2, y1, y2, z = 0) { const a = P3(c, x1, y1, z), b = P3(c, x2, y1, z), d = P3(c, x2, y2, z), e = P3(c, x1, y2, z); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(d.x, d.y); ctx.lineTo(e.x, e.y); ctx.closePath(); }
const IMG = {}; const img = (src) => { let i = IMG[src]; if (!i) { i = IMG[src] = new Image(); i.src = src; i.onload = () => BW.repaint?.(); } return i.complete && i.naturalWidth ? i : null; };

function drawScene(ctx, c, pins, ball, ballCol) {
  ctx.clearRect(0, 0, CW, CH);
  // الخلفية
  const bg = ctx.createLinearGradient(0, 0, 0, CH); bg.addColorStop(0, '#0b0f24'); bg.addColorStop(.35, '#141a3a'); bg.addColorStop(1, '#05060c');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, CW, CH);
  const near = c.y + 40;
  // الجوانب (الحواف المرتفعة)
  for (const sgn of [-1, 1]) {
    quad(ctx, c, sgn * (HALF + 24), sgn * (HALF + 90), near, END + 40, 0);
    const gr = ctx.createLinearGradient(sgn > 0 ? CW : 0, 0, CW / 2, 0); gr.addColorStop(0, '#0d1230'); gr.addColorStop(1, '#2b3a7a'); ctx.fillStyle = gr; ctx.fill();
    // خط أزرق مضيء على الحافة
    const a = P3(c, sgn * (HALF + 24), near, 0), b = P3(c, sgn * (HALF + 24), END + 40, 0);
    ctx.strokeStyle = '#6fb8ff'; ctx.lineWidth = Math.max(1.5, a.s * 3); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    // المجرى
    quad(ctx, c, sgn * HALF, sgn * (HALF + 24), near, END, 0);
    const gu = ctx.createLinearGradient(P3(c, sgn * HALF, near, 0).x, 0, P3(c, sgn * (HALF + 24), near, 0).x, 0); gu.addColorStop(0, '#1a1a1f'); gu.addColorStop(.5, '#4a4f5c'); gu.addColorStop(1, '#16161a'); ctx.fillStyle = gu; ctx.fill();
  }
  // المسار الخشبي
  quad(ctx, c, -HALF, HALF, near, END, 0);
  const wood = ctx.createLinearGradient(0, P3(c, 0, END, 0).y, 0, CH); wood.addColorStop(0, '#c98b4a'); wood.addColorStop(.5, '#e2b277'); wood.addColorStop(1, '#d49a5a');
  ctx.fillStyle = wood; ctx.fill();
  ctx.save(); quad(ctx, c, -HALF, HALF, near, END, 0); ctx.clip();
  // الألواح
  for (let k = 0; k <= 39; k++) {
    const x = -HALF + k * (LWB); const a = P3(c, x, near, 0), b = P3(c, x, END, 0);
    if (k % 2) { quad(ctx, c, x, x + LWB, near, END, 0); ctx.fillStyle = k % 4 === 1 ? '#00000010' : '#ffffff0c'; ctx.fill(); }
    ctx.strokeStyle = '#7a4a1c30'; ctx.lineWidth = Math.max(0.6, a.s * 0.25); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  // لمعة
  const sh = ctx.createLinearGradient(CW * 0.3, 0, CW * 0.7, 0); sh.addColorStop(0, '#fff0'); sh.addColorStop(.5, '#ffffff26'); sh.addColorStop(1, '#fff0'); ctx.fillStyle = sh; ctx.fillRect(0, 0, CW, CH);
  // أرضية الدبابيس
  quad(ctx, c, -HALF, HALF, HP - 30, END, 0); ctx.fillStyle = '#ffffff18'; ctx.fill();
  ctx.restore();
  // خط الرمي
  if (c.y < -20) { quad(ctx, c, -HALF - 24, HALF + 24, -1.5, 1.5, 0); ctx.fillStyle = '#5a1010'; ctx.fill(); }
  // الأسهم والنقاط
  for (let k = 1; k <= 7; k++) { const x = -HALF + LWB * (k * 5 - 0.5); const yy = 457 + Math.abs(4 - k) * 30; tri(ctx, c, x, yy, '#9b1a1a'); }
  for (let k = 1; k <= 7; k++) { const x = -HALF + LWB * (k * 5 - 0.5); dotG(ctx, c, x, 213); }
  // الجدار الخلفي (لوحة لعبك)
  backWall(ctx, c);
  // الدبابيس والكرة حسب العمق
  const items = pins.filter((p) => p.st !== 2).map((p) => ({ y: p.y, draw: () => drawPin(ctx, c, p) }));
  if (ball && ball.on) items.push({ y: ball.y, draw: () => drawBall(ctx, c, ball, ballCol) });
  items.sort((a, b) => b.y - a.y).forEach((it) => it.draw());
}
const LWB = 106 / 39;
function tri(ctx, c, x, y, col) { const a = P3(c, x, y + 30, 0), b = P3(c, x - 2.6, y, 0), d = P3(c, x + 2.6, y, 0); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill(); }
function dotG(ctx, c, x, y) { const a = P3(c, x, y, 0); ctx.fillStyle = '#7a2a1a'; ctx.beginPath(); ctx.ellipse(a.x, a.y, Math.max(1, a.s * 1.2), Math.max(0.6, a.s * 0.5), 0, 0, 7); ctx.fill(); }
function backWall(ctx, c) {
  const y = END + 30, top = 105;
  const a = P3(c, -HALF - 90, y, top), b = P3(c, HALF + 90, y, 0);
  const w = b.x - a.x, h = b.y - a.y;
  const g = ctx.createLinearGradient(0, a.y, 0, b.y); g.addColorStop(0, '#1b2a6b'); g.addColorStop(.7, '#0b1236'); g.addColorStop(1, '#05070f');
  ctx.fillStyle = g; ctx.fillRect(a.x, a.y, w, h);
  // اللوحة الذهبية بالنص
  const pw = w * 0.5, ph = h * 0.62, px = a.x + (w - pw) / 2, py = a.y + h * 0.06;
  const gg = ctx.createLinearGradient(px, py, px, py + ph); gg.addColorStop(0, '#f6d27a'); gg.addColorStop(.5, '#c99a3a'); gg.addColorStop(1, '#8a6420');
  ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + pw, py); ctx.lineTo(px + pw * 0.62, py + ph); ctx.lineTo(px + pw * 0.38, py + ph); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#3a6fd8'; ctx.lineWidth = Math.max(2, w * 0.012); ctx.stroke();
  // شعار لعبك
  const fs = Math.max(8, pw * 0.2);
  ctx.textAlign = 'center'; ctx.font = `900 ${fs}px Tahoma, sans-serif`;
  const tg = ctx.createLinearGradient(0, py + ph * 0.2, 0, py + ph * 0.6); tg.addColorStop(0, '#f3d4ff'); tg.addColorStop(1, '#8b2ff0');
  ctx.fillStyle = '#3d0b78'; ctx.fillText('لعبك', px + pw / 2, py + ph * 0.52 + 2); ctx.fillStyle = tg; ctx.fillText('لعبك', px + pw / 2, py + ph * 0.52);
  ctx.font = `${fs * 0.55}px serif`; ctx.fillText('👑', px + pw / 2, py + ph * 0.22);
  ctx.font = `900 ${fs * 0.32}px Arial, sans-serif`; ctx.fillStyle = '#3a2a00'; ctx.fillText('LA3BAK', px + pw / 2, py + ph * 0.72);
  // إضاءة فوق
  ctx.fillStyle = '#9fd0ff'; for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.arc(a.x + w * (0.06 + k * 0.11), a.y + 3, Math.max(1.5, w * 0.008), 0, 7); ctx.fill(); }
}
/* الدبوس: شكل أصلي (أبيض بخطين أحمر) */
function pinPath(ctx, h) {
  // نص العرض حسب الارتفاع (نسب دبوس حقيقي)
  const prof = [[0, .155], [.08, .2], [.2, .25], [.32, .235], [.45, .17], [.56, .1], [.64, .085], [.72, .1], [.82, .13], [.9, .12], [.97, .07], [1, 0]];
  ctx.beginPath(); ctx.moveTo(-prof[0][1] * h, 0);
  for (const [t, r] of prof) ctx.lineTo(-r * h, -t * h);
  for (let i = prof.length - 1; i >= 0; i--) ctx.lineTo(prof[i][1] * h, -prof[i][0] * h);
  ctx.closePath();
}
function drawPin(ctx, c, p) {
  const base = P3(c, p.x, p.y, 0); const h = 38 * base.s;
  if (h < 1) return;
  ctx.save(); ctx.translate(base.x, base.y);
  // ظل
  ctx.fillStyle = '#0005'; ctx.beginPath(); ctx.ellipse(0, 0, h * 0.24, h * 0.07, 0, 0, 7); ctx.fill();
  if (p.st === 1) { const ang = (p.dir >= 0 ? 1 : -1) * (0.5 + Math.abs(p.dir) * 0.5) * p.tilt * Math.PI / 2; ctx.rotate(ang); ctx.scale(1, 1 - p.tilt * 0.45); }
  pinPath(ctx, h);
  const g = ctx.createLinearGradient(-h * 0.25, 0, h * 0.25, 0); g.addColorStop(0, '#c9ccd4'); g.addColorStop(.35, '#ffffff'); g.addColorStop(1, '#9aa0ab');
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); pinPath(ctx, h); ctx.clip(); ctx.fillStyle = '#d4202a'; ctx.fillRect(-h, -h * 0.7, 2 * h, h * 0.035); ctx.fillRect(-h, -h * 0.655, 2 * h, h * 0.035); ctx.restore();
  ctx.strokeStyle = '#0003'; ctx.lineWidth = Math.max(0.5, h * 0.012); ctx.stroke();
  ctx.restore();
}
function drawBall(ctx, c, b, col) {
  const p = P3(c, b.x, b.y, b.gutter ? BR * 0.4 : BR); const r = BR * p.s;
  ctx.fillStyle = '#0006'; ctx.beginPath(); ctx.ellipse(p.x, P3(c, b.x, b.y, 0).y, r * 0.95, r * 0.28, 0, 0, 7); ctx.fill();
  const g = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.4, r * 0.08, p.x, p.y, r);
  g.addColorStop(0, '#ffffffcc'); g.addColorStop(.18, col); g.addColorStop(1, '#000a');
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
  ctx.fillStyle = g; ctx.fill();
  // الفتحات تدور مع المشي
  const ph = (b.y / (2 * Math.PI * BR)) % 1; const hy = p.y - r * 0.35 + ph * r * 1.6;
  if (hy < p.y + r * 0.7) { ctx.fillStyle = '#0b0b14'; const k = r * 0.12; for (const [dx, dy] of [[-0.22, 0], [0.22, 0], [0, 0.32]]) { ctx.beginPath(); ctx.ellipse(p.x + dx * r, hy + dy * r, k, k * 0.8, 0, 0, 7); ctx.fill(); } }
}

/* ---------- الحالة الحالية (بدون حركة) ---------- */
const restPins = (standing) => PINS.map((q, i) => ({ x: q.x, y: q.y, st: standing[i] ? 0 : 2, tilt: 0, dir: 0 }));
function idleCam() { return cam(-260); }
function paintIdle(cv, g, room) {
  const ctx = cv.getContext('2d'); const c = idleCam();
  const myTurn = g.phase === 'aim' && g.turnId === room.you;
  const ti = Math.max(0, g.players.indexOf(g.turnId));
  const ball = { x: myTurn ? BW.x0 : 0, y: -10, on: g.phase === 'aim' };
  drawScene(ctx, c, restPins(g.standing), ball, BALL_COL[ti % 4]);
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
      BW.anim = { frames: r.frames, t0: performance.now(), col: BALL_COL[Math.max(0, g.players.indexOf(g.last.by)) % 4], mark: g.last.mark, n: g.last.knocked.length, by: g.last.by };
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
      { const t2 = document.querySelector('.bw-turn'); if (t2 && !t2.hidden) t2.hidden = true; }
      const k = Math.floor((performance.now() - A.t0) / (1000 / 60)); const fr = A.frames[Math.min(k, A.frames.length - 1)];
      const b = { x: fr.b[0], y: fr.b[1], gutter: !!fr.b[2], on: !!fr.b[3] };
      const camY = Math.min(HP - 640, -260 + Math.max(0, b.y - 200) * 0.8);
      const pins = fr.p.map(([x, y, st, tilt, dir]) => ({ x, y, st, tilt, dir }));
      drawScene(c.getContext('2d'), cam(camY), pins, b, A.col);
      if (k >= A.frames.length - 1) {
        if (!A.endAt) { A.endAt = performance.now(); A.banT = A.mark === 'strike' ? 'STRIKE!' : A.mark === 'spare' ? 'SPARE' : A.mark === 'gutter' ? 'مجرى 😬' : `${A.n} ${A.n === 1 ? 'دبوس' : 'دبابيس'}`; showBan(A.banT, A.mark || 'n'); }
        else if (document.querySelector('.bw-ban')?.hidden) showBan(A.banT, A.mark || 'n');
        if (performance.now() - A.endAt > 1300) { BW.anim = null; const bn = document.querySelector('.bw-ban'); if (bn) bn.hidden = true; const t2 = document.querySelector('.bw-turn'); if (t2) { t2.hidden = false; t2.style.animation = 'none'; void t2.offsetWidth; t2.style.animation = ''; } paintIdle(c, room.game, room); return; }
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
    if (dy > -40) { const sc = P3(idleCam(), 0, -10, BR).s; BW.x0 = Math.max(-HALF + BR, Math.min(HALF - BR, D.x0 + dx / sc)); paintIdle(cv, g, room); }
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
