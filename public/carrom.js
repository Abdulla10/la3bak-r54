/* كيرم — الواجهة فقط. القواعد والفيزياء والنقاط كلها في الخادم (src/engine/carrom.ts):
 * الواجهة ترسل (موقع الضاربة على الخط، الزاوية، القوة) والخادم يحاكي الضربة ويرجّع مسار كل قطعة، والواجهة تعيد تشغيله فقط.
 * اللوحة تدور بحيث خطك دائماً تحت. التصويب: اسحب من الضاربة للخلف (مثل النبّالة) وأفلت؛ الخط المنقّط يوضح الاتجاه وأول اصطدام.
 * التحريك على الخط: اسحب الضاربة يمين/يسار أو استعمل المنزلق تحت اللوحة. */
import { faceHtml } from './characters.js?v=shell-r6';
import { avatarArt } from './avatars.js?v=r58r';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nf = (n) => Number(n).toLocaleString('ar-EG-u-nu-latn');
export const CR = { room: '', gameNo: null, epoch: 0, pos: 0.5, seenShot: -1, busy: false, rules: false, anim: false, send: null, evSeq: -1 };
let cancelShot = null, cancelAim = null;
function syncMatch(room) {
  const gameNo = room.gameNo ?? 0;
  if (CR.room === room.code && CR.gameNo === gameNo) return;
  cancelShot?.(); cancelShot = null;
  cancelAim?.(); cancelAim = null;
  Object.assign(CR, { room: room.code, gameNo, epoch: CR.epoch + 1, pos: 0.5, seenShot: -1, busy: false, rules: false, anim: false, evSeq: -1 });
}
export const uiKey = () => [CR.busy, CR.rules, CR.anim].join('|');
/** فيه ضربة جديدة من الخادم ما انعرضت حركتها بعد؟ (نخفي الضاربة لين تخلص الحركة) */
const pending = (g) => !!g.last && CR.evSeq >= 0 && g.last.n > CR.seenShot;
const KIND = { w: 'أبيض', b: 'أسود', q: 'الملكة' };
const PTS = { w: 20, b: 10, q: 50 };

/* ---------- هندسة (نفس أرقام الخادم من view.geo) ---------- */
function strikerAt(G, side, pos) {
  const t = G.baseMin + (G.baseMax - G.baseMin) * pos; const S = G.size, o = G.baseOff;
  return side === 0 ? { x: t, y: S - o } : side === 1 ? { x: S - o, y: S - t } : side === 2 ? { x: S - t, y: o } : { x: o, y: t };
}
const rot = (side) => side * 90;
/** من إحداثيات الشاشة (داخل SVG) إلى إحداثيات اللوحة الأصلية */
function toBoard(svg, side, cx, cy) {
  const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy;
  const m = svg.getScreenCTM(); if (!m) return { x: 500, y: 500 };
  const p = pt.matrixTransform(m.inverse()); // إحداثيات viewBox (معروضة مدوّرة)
  const a = -rot(side) * Math.PI / 180; const dx = p.x - 500, dy = p.y - 500;
  return { x: 500 + dx * Math.cos(a) - dy * Math.sin(a), y: 500 + dx * Math.sin(a) + dy * Math.cos(a) };
}
/** أول اصطدام على امتداد التصويب (للخط المنقّط فقط — الخادم هو اللي يحسب الحقيقة) */
function firstHit(G, pieces, st, ang) {
  const dx = Math.cos(ang), dy = Math.sin(ang); let best = Infinity, hit = null; const R = G.coinR + G.strikerR;
  for (const p of pieces) {
    const fx = p.x - st.x, fy = p.y - st.y; const t = fx * dx + fy * dy; if (t <= 0) continue;
    const d2 = fx * fx + fy * fy - t * t; if (d2 > R * R) continue;
    const tt = t - Math.sqrt(R * R - d2); if (tt < best) { best = tt; hit = p; }
  }
  const S = G.size, r = G.strikerR;
  const walls = [dx > 0 ? (S - r - st.x) / dx : dx < 0 ? (r - st.x) / dx : Infinity, dy > 0 ? (S - r - st.y) / dy : dy < 0 ? (r - st.y) / dy : Infinity];
  const wl = Math.min(...walls);
  if (wl < best) { best = wl; hit = null; }
  return { x: st.x + dx * best, y: st.y + dy * best, hit };
}

const nm = (room, id) => room.players.find((p) => p.id === id)?.name?.replace(/^🤖\s*/, '') ?? 'لاعب غادر';
const faceOf = (room, id, i) => { const rp = room.players.find((q) => q.id === id); return rp?.av ? avatarArt(rp.av, 44) : rp?.avatar ? `<img class="dm-photo" src="/api/room-avatar?code=${esc(room.code)}&id=${encodeURIComponent(id)}&v=${rp.avatar}" alt="" decoding="async">` : faceHtml(i, 44); };
const clockEl = (g) => `<span class="jx-clock cr-clock" role="timer" data-ends="${g.endsAt}" data-total="${g.turnMs}" data-phase="ok" aria-label="الوقت المتبقي"><svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle class="jx-ring-bg" cx="50" cy="50" r="46"/><circle class="jx-ring-fg" cx="50" cy="50" r="46" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0" transform="rotate(-90 50 50)"/></svg><b class="jx-sec"></b></span>`;

function pieceSVG(p, G, extra = '') {
  const r = G.coinR;
  const fill = p.k === 'w' ? 'url(#crW)' : p.k === 'b' ? 'url(#crB)' : 'url(#crQ)';
  return `<g class="cr-p k-${p.k}" id="cp-${esc(p.id)}" transform="translate(${p.x} ${p.y})" ${extra}><circle r="${r}" fill="${fill}" stroke="${p.k === 'w' ? '#b9a27a' : p.k === 'b' ? '#000' : '#7a0f12'}" stroke-width="2"/><circle r="${r * .62}" fill="none" stroke="${p.k === 'w' ? '#c8b48c' : p.k === 'b' ? '#444' : '#ff9a9a'}" stroke-width="2"/><circle r="${r * .25}" fill="${p.k === 'w' ? '#d9c79f' : p.k === 'b' ? '#333' : '#ffd166'}"/></g>`;
}
function boardSVG(g) {
  const G = g.geo; const S = G.size; const side = g.mySide;
  const base = (sd) => { const a = strikerAt(G, sd, 0), b = strikerAt(G, sd, 1); const off = G.strikerR + 4; const horiz = sd % 2 === 0; const o1 = horiz ? [0, -off] : [-off, 0]; const o2 = horiz ? [0, off] : [off, 0];
    return `<g class="cr-base ${sd === side ? 'mine' : ''}"><line x1="${a.x + o1[0]}" y1="${a.y + o1[1]}" x2="${b.x + o1[0]}" y2="${b.y + o1[1]}"/><line x1="${a.x + o2[0]}" y1="${a.y + o2[1]}" x2="${b.x + o2[0]}" y2="${b.y + o2[1]}"/><circle cx="${a.x}" cy="${a.y}" r="${off}"/><circle cx="${b.x}" cy="${b.y}" r="${off}"/></g>`; };
  const pockets = [[G.inset, G.inset], [S - G.inset, G.inset], [G.inset, S - G.inset], [S - G.inset, S - G.inset]].map(([x, y]) => `<circle class="cr-pocket" cx="${x}" cy="${y}" r="${G.pocketR + 8}"/>`).join('');
  const arrows = [[160, 160, 45], [840, 160, 135], [840, 840, 225], [160, 840, 315]].map(([x, y, a]) => `<path class="cr-arrow" d="M0 0h130" transform="translate(${x} ${y}) rotate(${a})"/>`).join('');
  const st = strikerAt(G, side, CR.pos);
  return `<svg class="cr-board" viewBox="-40 -40 1080 1080" role="img" aria-label="لوحة الكيرم" style="direction:ltr" data-side="${side}">
    <defs><radialGradient id="crW" cx="40%" cy="35%"><stop offset="0" stop-color="#fcf9f4"/><stop offset="1" stop-color="#e8dcc2"/></radialGradient><radialGradient id="crB" cx="40%" cy="35%"><stop offset="0" stop-color="#5a5a66"/><stop offset="1" stop-color="#14141a"/></radialGradient><radialGradient id="crQ" cx="40%" cy="35%"><stop offset="0" stop-color="#ff6a6a"/><stop offset="1" stop-color="#b3141c"/></radialGradient><radialGradient id="crS" cx="40%" cy="35%"><stop offset="0" stop-color="#e6f6ff"/><stop offset="1" stop-color="#7fb2d9"/></radialGradient><linearGradient id="crWood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a3e17"/><stop offset=".5" stop-color="#5a2a0e"/><stop offset="1" stop-color="#7a3e17"/></linearGradient><radialGradient id="crFelt" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#f6dfb0"/><stop offset="1" stop-color="#e2bd7c"/></radialGradient></defs>
    <g transform="rotate(${rot(side)} 500 500)">
      <rect x="-40" y="-40" width="1080" height="1080" rx="40" fill="url(#crWood)"/><rect x="0" y="0" width="${S}" height="${S}" fill="url(#crFelt)"/>
      <g class="cr-lines"><circle cx="500" cy="500" r="120"/><circle cx="500" cy="500" r="30"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M500 500l0 -112" transform="rotate(${a} 500 500)" opacity=".5"/>`).join('')}</g>
      ${arrows}${[0, 1, 2, 3].map(base).join('')}${pockets}
      <g class="cr-pieces">${g.pieces.map((p) => pieceSVG(p, G)).join('')}</g>
      <g class="cr-aim" id="crAim"></g>
      <g class="cr-anim" id="crAnim"></g>
      ${g.canShoot && !CR.anim && !pending(g) ? `<g class="cr-striker" id="crStriker" transform="translate(${st.x} ${st.y})" tabindex="0" role="slider" aria-label="الضاربة: اسحب للخلف للتصويب" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(CR.pos * 100)}"><circle r="${G.strikerR + 14}" fill="transparent"/><circle class="cr-sring" r="${G.strikerR}" fill="url(#crS)" stroke="#2a6fa8" stroke-width="3"/><circle r="${G.strikerR * .55}" fill="none" stroke="#2a6fa8" stroke-width="2"/></g>` : ''}
    </g></svg>`;
}

const RULES = [
  ['🎯', 'بدورك: حرّك الضاربة يمين ويسار على خطك (أو بالمنزلق)، ثم اسحب منها للخلف وأفلت. كل ما سحبت أبعد صارت الضربة أقوى.'],
  ['⚪', 'الأبيض 20 نقطة، الأسود 10، الملكة الحمراء 50 بشرط تغطيتها: تدخّل قطعة ثانية بنفس الضربة أو اللي بعدها مباشرة، وإلا ترجع للوسط.'],
  ['🔁', 'دخّلت قطعة؟ تكمل دورك. ما دخّلت شي؟ الدور للي بعدك.'],
  ['⚠️', 'الضاربة دخلت الجيب = مخالفة: خصم 10 نقاط، والقطع اللي دخلت معها ترجع للوسط.'],
  ['🏁', 'لما تخلص القطع، أعلى نقاط يفوز. ما فيه رسوم ولا جوائز عملات.'],
  ['⏱', 'لو خلص وقتك يروح دورك، وثلاث مرات ورا بعض تعتبر انسحاب.'],
];

function hint(room, g) {
  if (g.phase === 'final') { const w = g.winners; return w.includes(room.you) ? (w.length > 1 ? 'تعادل على المركز الأول! 🤝' : 'فزت بالمباراة! 🏆') : w.length ? `فاز ${w.map((x) => nm(room, x)).join(' و')}` : 'انتهت المباراة'; }
  if (CR.anim || pending(g)) return '…';
  if (g.canShoot) return g.queenBy === room.you ? 'دخّلت الملكة! دخّل قطعة الحين عشان تغطيها' : 'دورك: حرّك الضاربة ثم اسحب للخلف وأفلت';
  return `دور ${nm(room, g.turnId)}…`;
}
function lastText(room, g) {
  const L = g.last; if (!L) return '';
  const who = g.players[L.by] === room.you ? 'أنت' : nm(room, g.players[L.by]);
  if (L.foul) return `${who}: مخالفة! الضاربة دخلت الجيب ${L.delta ? `(${nf(L.delta)})` : ''}`;
  if (!L.pocketed.length) return `${who}: ما دخلت شي`;
  const parts = L.pocketed.map((p) => KIND[p.k]).join('، ');
  const q = L.queen === 'pending' ? ' — الملكة تنتظر التغطية' : L.queen === 'covered' ? ' — غطّى الملكة +50' : L.queen === 'returned' ? ' — الملكة رجعت للوسط' : '';
  return `${who}: دخّل ${parts} (+${nf(L.delta)})${q}`;
}

export function carrom(room) {
  const g = room.game;
  syncMatch(room);
  const pi = g.players.indexOf(room.you);
  const seats = g.players.map((id, i) => {
    const turn = g.phase === 'aim' && g.turnId === id;
    return `<li class="cr-seat ${turn ? 'turn' : ''} ${g.out[i] ? 'out' : ''} ${g.winners.includes(id) ? 'won' : ''}" data-seat="${i}"><span class="cr-av">${faceOf(room, id, i)}${turn ? clockEl(g) : ''}</span><span class="cr-nm">${id === room.you ? 'أنت' : esc(nm(room, id))}${g.out[i] ? ' <em>انسحب</em>' : ''}${g.queenBy === id ? ' <em class="q">♛</em>' : ''}</span><b class="cr-sc">${nf(g.scores[i])}</b></li>`;
  }).join('');
  const counts = `<div class="cr-counts" aria-label="القطع الباقية"><span><i class="k-w"></i>${nf(g.counts.w)}</span><span><i class="k-b"></i>${nf(g.counts.b)}</span><span><i class="k-q"></i>${g.counts.q ? '1' : (g.queenBy ? '⏳' : '0')}</span></div>`;
  const slider = g.canShoot && !CR.anim && !pending(g) ? `<label class="cr-slide"><span>حرّك الضاربة</span><input type="range" min="0" max="100" step="1" value="${Math.round(CR.pos * 100)}" data-input="cr-pos" aria-label="موقع الضاربة على الخط"></label>` : '';
  let finalPanel = '';
  if (g.phase === 'final') {
    const isHost = room.hostId === room.you;
    const list = g.players.map((id, i) => `<li class="${g.winners.includes(id) ? 'w' : ''}"><b>${id === room.you ? 'أنت' : esc(nm(room, id))}</b><i>${nf(g.scores[i])}</i></li>`).join('');
    finalPanel = `<section class="dm-final cr-final" role="dialog" aria-label="نهاية المباراة"><div class="u2-trophy big" aria-hidden="true">🏆</div><h3>${esc(hint(room, g))}</h3><ul>${list}</ul>${isHost ? '<button class="btn block" data-act="rematch" type="button">مباراة جديدة</button>' : '<p class="muted">بانتظار المضيف يبدأ مباراة جديدة</p>'}<button class="btn ghost block" data-act="leave" type="button">خروج</button></section>`;
  }
  const rules = CR.rules ? `<div class="jk-rules-back" data-act="cr-rules"></div><section class="jk-rules" role="dialog" aria-label="كيف ألعب؟"><h2><span>كيف ألعب كيرم؟</span></h2><ul>${RULES.map(([k, t]) => `<li><span class="rc"><b>${esc(k)}</b></span><span class="rt">${esc(t)}</span></li>`).join('')}</ul><button class="btn block" type="button" data-act="cr-rules">فهمت</button></section>` : '';
  return `<div class="stack cr-screen ${pi < 0 ? 'watch' : ''}">
    <div class="cr-side">
    <div class="cr-top"><button type="button" class="dm-ic" data-act="leave" aria-label="خروج من اللعبة">⏻</button><button type="button" class="dm-ic" data-act="fs-toggle" aria-label="الشاشة الكاملة">⛶</button><button type="button" class="dm-ic" data-act="cr-rules" aria-label="كيف ألعب؟">؟</button>${counts}</div>
    <ul class="cr-seats">${seats}</ul>
    <p class="cr-last" aria-live="polite">${esc(lastText(room, g))}</p>
    <p class="cr-msg ${g.canShoot ? 'turn' : ''}" role="status" aria-live="polite">${esc(hint(room, g))}</p>
    <div class="cr-power" aria-hidden="true"><i id="crPow"></i></div>
    ${slider}
    <div class="cr-bar"><button type="button" class="dm-ic" data-act="sfx-toggle" aria-label="الصوت">🔊</button><button type="button" class="dm-ic" data-act="jk-chat" aria-label="المحادثة">💬</button><button type="button" class="dm-ic gift" data-act="cr-gift" aria-label="أرسل هدية">🎁</button></div>
    </div>
    <div class="cr-wrap">${boardSVG(g)}<div class="cr-fx" aria-hidden="true"></div></div>
    ${finalPanel}${rules}
  </div>`;
}

/* ---------- إعادة تشغيل الضربة من مسارات الخادم ---------- */
function playShot(view, g, done, epoch) {
  const L = g.last; const svg = view.querySelector('.cr-board'); const layer = svg?.querySelector('#crAnim');
  if (!L || !layer) return done();
  const G = g.geo; const moved = new Set(L.tracks.map((t) => t.id));
  for (const id of moved) { const el = svg.querySelector('#cp-' + CSS.escape(id)); if (el) el.style.visibility = 'hidden'; }
  layer.innerHTML = L.tracks.map((t) => t.id === 's'
    ? `<g data-t="s" transform="translate(${t.pts[0]} ${t.pts[1]})"><circle r="${G.strikerR}" fill="url(#crS)" stroke="#2a6fa8" stroke-width="3"/></g>`
    : pieceSVG({ id: 'a-' + t.id, k: L.pocketed.find((p) => p.id === t.id)?.k ?? (g.pieces.find((p) => p.id === t.id)?.k || (t.id === 'q' ? 'q' : 'w')), x: t.pts[0], y: t.pts[1] }, G, `data-t="${esc(t.id)}"`)).join('');
  const els = [...layer.children].map((el) => ({ el, t: L.tracks.find((t) => t.id === el.dataset.t) }));
  const t0 = performance.now(); const fps = 30;
  let frame = null, timer = null;
  const cancel = () => { if (frame !== null) cancelAnimationFrame(frame); if (timer !== null) clearTimeout(timer); };
  cancelShot = cancel;
  const step = (now) => {
    if (CR.epoch !== epoch) return;
    frame = null;
    const f = Math.max(0, Math.min(L.frames, Math.floor((now - t0) / 1000 * fps)));
    for (const { el, t } of els) {
      const n = t.pts.length / 2; const i = Math.min(f, n - 1);
      el.setAttribute('transform', `translate(${t.pts[i * 2]} ${t.pts[i * 2 + 1]})`);
      if (t.inAt >= 0 && f >= t.inAt) { el.style.transition = 'opacity .25s, transform .25s'; el.style.opacity = '0'; }
    }
    if (f < L.frames) frame = requestAnimationFrame(step);
    else timer = setTimeout(() => {
      if (CR.epoch !== epoch) return;
      if (cancelShot === cancel) cancelShot = null;
      done();
    }, 250);
  };
  frame = requestAnimationFrame(step);
}
function floatText(view, html, cls) {
  const fx = view.querySelector('.cr-fx'); if (!fx) return;
  const el = document.createElement('div'); el.className = 'cr-float ' + (cls || ''); el.innerHTML = html; fx.appendChild(el);
  el.animate([{ transform: 'translate(-50%,-30%) scale(.5)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.15)', opacity: 1, offset: .25 }, { transform: 'translate(-50%,-120%) scale(1)', opacity: 0 }], { duration: 1500, easing: 'ease-out', fill: 'both' }).onfinish = () => el.remove();
}

export function afterRender(view, room, rerender) {
  cancelAim?.(); cancelAim = null;
  const g = room.game; if (!g || g.game !== 'carrom') return;
  syncMatch(room);
  const epoch = CR.epoch;
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const first = CR.seenShot < 0 && CR.evSeq < 0; CR.evSeq = g.evSeq ?? 0;
  if (g.last && g.last.n > CR.seenShot) {
    const n = g.last.n; const L = g.last;
    if (first || reduce) { CR.seenShot = n; if (!first) return rerender(); }
    else if (!CR.anim) {
      CR.anim = true; CR.seenShot = n;
      playShot(view, g, () => {
        if (CR.epoch !== epoch) return;
        CR.anim = false;
        if (L.foul) floatText(view, `مخالفة! ${L.delta ? nf(L.delta) : ''}`, 'bad');
        else if (L.delta) floatText(view, `+${nf(L.delta)}${L.queen === 'covered' ? ' ♛' : ''}`, 'good');
        else if (L.queen === 'pending') floatText(view, '♛ غطّها!', 'good');
        rerender();
      }, epoch);
    }
  }
  if (!g.canShoot || CR.anim) return;
  wireAim(view, g);
}

/* ---------- التصويب بالسحب ---------- */
function wireAim(view, g) {
  const svg = view.querySelector('.cr-board'); const stEl = svg?.querySelector('#crStriker'); const aim = svg?.querySelector('#crAim'); const pow = view.querySelector('#crPow');
  if (!svg || !stEl || !aim) return;
  const G = g.geo; const side = g.mySide;
  const epoch = CR.epoch; let active = true;
  const current = () => active && CR.epoch === epoch;
  const st = () => strikerAt(G, side, CR.pos);
  const blocked = () => { const s = st(); return g.pieces.some((p) => (p.x - s.x) ** 2 + (p.y - s.y) ** 2 < (G.coinR + G.strikerR) ** 2); };
  const paintStriker = () => { const s = st(); stEl.setAttribute('transform', `translate(${s.x} ${s.y})`); stEl.classList.toggle('bad', blocked()); stEl.setAttribute('aria-valuenow', String(Math.round(CR.pos * 100))); const rg = view.querySelector('[data-input="cr-pos"]'); if (rg) rg.value = String(Math.round(CR.pos * 100)); };
  paintStriker();
  let mode = null, start = null, shot = null, pointerId = null;
  const along = (sd) => (sd === 0 ? [1, 0] : sd === 1 ? [0, -1] : sd === 2 ? [-1, 0] : [0, 1]);
  const onMove = (e) => {
    if (!current() || !start || e.pointerId !== pointerId) return;
    const p = toBoard(svg, side, e.clientX, e.clientY); const s = st();
    const dx = p.x - start.x, dy = p.y - start.y; const [ax, ay] = along(side);
    if (!mode) { const d = Math.hypot(dx, dy); if (d < 14) return; const lat = Math.abs(dx * ax + dy * ay); mode = lat > d * 0.8 ? 'slide' : 'aim'; }
    if (mode === 'slide') {
      const t = (p.x * ax + p.y * ay) - (strikerAt(G, side, 0).x * ax + strikerAt(G, side, 0).y * ay);
      CR.pos = Math.max(0, Math.min(1, t / (G.baseMax - G.baseMin))); paintStriker(); start = { x: p.x, y: p.y }; return;
    }
    // نبّالة: الاتجاه عكس السحب، والقوة من طول السحب
    const vx = s.x - p.x, vy = s.y - p.y; const len = Math.hypot(vx, vy); const power = Math.min(1, len / 330);
    if (len < 8) { shot = null; aim.innerHTML = ''; if (pow) pow.style.width = '0'; return; }
    const ang = Math.atan2(vy, vx); shot = { angle: ang, power };
    const h = firstHit(G, g.pieces, s, ang);
    const ghost = h.hit ? `<circle cx="${h.x}" cy="${h.y}" r="${G.strikerR}" fill="none" stroke="#fff" stroke-dasharray="6 6" stroke-width="3" opacity=".8"/>` : '';
    let after = '';
    if (h.hit) { const nx = h.hit.x - h.x, ny = h.hit.y - h.y; const nl = Math.hypot(nx, ny) || 1; after = `<line x1="${h.hit.x}" y1="${h.hit.y}" x2="${h.hit.x + nx / nl * 160}" y2="${h.hit.y + ny / nl * 160}" class="cr-aim2"/>`; }
    aim.innerHTML = `<line x1="${s.x}" y1="${s.y}" x2="${h.x}" y2="${h.y}" class="cr-aim1"/>${ghost}${after}<line x1="${s.x}" y1="${s.y}" x2="${p.x}" y2="${p.y}" class="cr-pull" style="--p:${power}"/>`;
    if (pow) { pow.style.width = Math.round(power * 100) + '%'; pow.dataset.lv = power > .75 ? 'hi' : power > .4 ? 'mid' : 'lo'; }
  };
  const clearGesture = () => {
    svg.removeEventListener('pointermove', onMove);
    svg.removeEventListener('pointerup', onUp);
    svg.removeEventListener('pointercancel', onCancel);
    if (pointerId !== null) {
      try { if (svg.hasPointerCapture?.(pointerId)) svg.releasePointerCapture?.(pointerId); } catch { /* المؤشر ممكن انلغى من الجهاز */ }
    }
    pointerId = null; mode = null; start = null; shot = null; aim.innerHTML = ''; if (pow) pow.style.width = '0';
  };
  const end = (e, cancelled) => {
    if (!start || e.pointerId !== pointerId) return;
    const was = mode, draft = shot;
    clearGesture();
    if (cancelled || !current() || !g.canShoot || CR.anim) return;
    if (was === 'aim' && draft && draft.power >= 0.08) {
      if (blocked()) return CR.send?.(null, 'الضاربة فوق قطعة؛ حرّكها على الخط.');
      CR.send?.({ type: 'shoot', pos: Math.round(CR.pos * 1000) / 1000, angle: Math.round(draft.angle * 10000) / 10000, power: Math.round(draft.power * 1000) / 1000 });
    }
  };
  const onUp = (e) => end(e, false);
  const onCancel = (e) => end(e, true);
  const onDown = (e) => {
    if (!current() || start || !g.canShoot || CR.anim) return;
    e.preventDefault(); pointerId = e.pointerId; svg.setPointerCapture?.(pointerId); start = toBoard(svg, side, e.clientX, e.clientY); mode = null; shot = null;
    svg.addEventListener('pointermove', onMove); svg.addEventListener('pointerup', onUp); svg.addEventListener('pointercancel', onCancel);
  };
  const onKey = (e) => { if (current() && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { CR.pos = Math.max(0, Math.min(1, CR.pos + (e.key === 'ArrowRight' ? 0.02 : -0.02))); paintStriker(); e.preventDefault(); } };
  const rg = view.querySelector('[data-input="cr-pos"]');
  const onInput = () => { if (current()) { CR.pos = Number(rg.value) / 100; paintStriker(); } };
  stEl.addEventListener('pointerdown', onDown); stEl.addEventListener('keydown', onKey); rg?.addEventListener('input', onInput);
  cancelAim = () => {
    active = false; clearGesture();
    stEl.removeEventListener('pointerdown', onDown); stEl.removeEventListener('keydown', onKey); rg?.removeEventListener('input', onInput);
  };
}
