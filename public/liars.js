/* لعبة الكذابين — الواجهة (R68z). القواعد والنتائج كلها من الخادم: src/engine/liars.ts
 * تصميم «البار»: طاولة حمرا بإطار ذهبي، اللاعبين حولها بصورهم، يدك تحت، والقنبلة بالعداد والأسلاك والكماشة.
 * كل الرسومات أصلية (SVG/CSS) بدون أي أصول منسوخة. */
import { faceHtml } from './characters.js?v=shell-r6';
import { avatarArt } from './avatars.js?v=r107';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const LR = { room: '', sel: [], busy: false, evSeq: -1, tip: 0, seenRound: 0 };
export const RANK_NAME = { Q: 'البنت', K: 'الشايب', A: 'الإكَه', J: 'الجوكر' };
const CHAR = (i) => `/assets/games68/liars-c${(i % 4) + 1}.webp`;
const nm = (room, id) => room.players.find((p) => p.id === id)?.name ?? 'لاعب';
const faceOf = (room, id, i, size) => { const rp = room.players.find((q) => q.id === id); return rp?.av ? avatarArt(rp.av, size) : rp?.avatar ? `<img src="/api/room-avatar?code=${esc(room.code)}&id=${encodeURIComponent(id)}&v=${rp.avatar}" alt="" decoding="async">` : faceHtml(i, size); };
export const uiKey = () => [LR.sel.join(','), LR.busy].join('|');

/* ---------- الأوراق (SVG أصلي) ---------- */
const SPADE = '<path d="M30 14c-8 10-18 15-18 24a8 8 0 0 0 14 5l-3 9h14l-3-9a8 8 0 0 0 14-5c0-9-10-14-18-24z" fill="#111"/>';
const MASK = '<g transform="translate(30 47)"><path d="M-17-6c4-6 30-6 34 0 2 5-1 13-6 14-5 1-7-4-11-4s-6 5-11 4c-5-1-8-9-6-14z" fill="#ffd34d" stroke="#1a1a1a" stroke-width="2.4"/><ellipse cx="-8" cy="-1" rx="4.2" ry="3.4" fill="#1a1a1a"/><ellipse cx="8" cy="-1" rx="4.2" ry="3.4" fill="#1a1a1a"/><path d="M-12-12q12-12 24 0" fill="none" stroke="#1a1a1a" stroke-width="2.4"/><circle cx="0" cy="-15" r="3" fill="#e0457b" stroke="#1a1a1a" stroke-width="1.6"/></g>';
export function cardSVG(r) {
  if (r === 'J') return `<svg viewBox="0 0 60 84" class="lr-cf" style="direction:ltr"><rect x="1" y="1" width="58" height="82" rx="7" fill="#fff"/><text x="5" y="16" text-anchor="start" font-size="12" font-weight="900" fill="#b0122b" font-family="Georgia,serif">Joker</text>${MASK}</svg>`;
  return `<svg viewBox="0 0 60 84" class="lr-cf" style="direction:ltr"><rect x="1" y="1" width="58" height="82" rx="7" fill="#fff"/><text x="5" y="21" text-anchor="start" font-size="19" font-weight="900" fill="#111" font-family="Georgia,serif">${r}</text><g transform="translate(2 18) scale(.36)">${SPADE}</g><g transform="translate(9 22) scale(1.05)">${SPADE}</g></svg>`;
}
const BACK = '<svg viewBox="0 0 60 84" class="lr-cb" style="direction:ltr"><defs><linearGradient id="lrbk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbeaff"/><stop offset=".5" stop-color="#e09bff"/><stop offset="1" stop-color="#b45cff"/></linearGradient><radialGradient id="lrbg" cx=".5" cy=".45" r=".7"><stop offset="0" stop-color="#3a1466"/><stop offset="1" stop-color="#14081f"/></radialGradient></defs><rect x="1" y="1" width="58" height="82" rx="7" fill="url(#lrbg)" stroke="#c9a24a" stroke-width="2"/><rect x="5" y="5" width="50" height="74" rx="5" fill="none" stroke="#c9a24a88" stroke-width="1.2"/><path d="M21 30l4.5 3.6 4.5-6.6 4.5 6.6 4.5-3.6-1.6 9H22.6z" fill="#ffcb47"/><text x="30" y="55" text-anchor="middle" font-size="16" font-weight="900" fill="url(#lrbk)" font-family="Tahoma,sans-serif">لعبك</text><text x="30" y="65" text-anchor="middle" font-size="6" font-weight="900" fill="#ffcb47" letter-spacing=".6" font-family="Arial,sans-serif">LA3BAK</text></svg>';
/* ---------- القنبلة ---------- */
function bombSVG(txt, cls = '') {
  return `<div class="lr-bombi ${cls}" aria-hidden="true"><img src="/assets/games68/liars-bomb.webp" alt="" decoding="async"><b class="lr-lcd">${esc(txt)}</b></div>`;
}
const PLIERS = '<img class="lr-pliers" src="/assets/games68/liars-pliers.webp" alt="" aria-hidden="true">';
const clock = (g, cls = '') => { const left = Math.max(0, g.endsAt - g.serverNow); return `<span class="lr-clock ${cls}" data-lr-left="${left}" data-lr-at="${Date.now()}" role="timer">${Math.ceil(left / 1000)}</span>`; };
const BAR = '<img class="lr-bar" src="/assets/games68/liars-bg.webp" alt="" aria-hidden="true">';
/* أماكن الخصوم حسب عددهم (نسب من عرض/ارتفاع الطاولة) */
const SEATS = { 1: [[50, 1]], 2: [[24, 4], [76, 4]], 3: [[17, 6], [50, 0], [83, 6]] };

export function liars(room) {
  const g = room.game;
  if (LR.room !== room.code) Object.assign(LR, { room: room.code, sel: [], busy: false, evSeq: -1, tip: 0, seenRound: 0 });
  const n = g.players.length, me = g.you;
  const handIds = new Set(g.hand.map((c) => c.id)); LR.sel = LR.sel.filter((id) => handIds.has(id));
  if (!g.canPlay) LR.sel = [];
  const order = me >= 0 ? Array.from({ length: n - 1 }, (_, i) => (me + 1 + i) % n) : g.players.map((_, i) => i);
  const spots = SEATS[order.length] || SEATS[3];
  const lastBy = g.last?.by;
  const seat = (p, k) => {
    const id = g.players[p]; const [x, y] = spots[k] || [50, 4]; const dead = !g.alive[p]; const turn = g.phase === 'play' && g.turnId === id;
    return `<div class="lr-seat${dead ? ' dead' : ''}${turn ? ' turn' : ''}" style="left:${x}%;top:${y}%" data-lr-seat="${esc(id)}"><span class="lr-ch"><img src="${CHAR(p)}" alt="" decoding="async">${dead ? '<i class="lr-x">💥</i>' : ''}${turn ? clock(g, 'sm') : ''}</span><b class="lr-nm"><span class="lr-mini">${faceOf(room, id, p, 40)}</span>${esc(nm(room, id))}</b><span class="lr-cnt" title="أوراقه">${g.counts[p]}</span><span class="lr-wire" title="الأسلاك المقطوعة">💣 ${g.cuts[p]}/${g.wires}</span>${lastBy === id && g.phase === 'play' ? `<em class="lr-claim">${g.last.n}</em>` : ''}</div>`;
  };
  const myTurn = g.phase === 'play' && g.turnId === room.you;
  const pile = g.pile ? `<div class="lr-pile">${Array.from({ length: Math.min(g.pile, 6) }, (_, i) => `<span style="transform:translate(${(i % 3) * 6 - 6}px,${-i * 3}px) rotate(${(i * 37) % 24 - 12}deg)">${BACK}</span>`).join('')}</div>` : '';
  const reveal = g.reveal ? `<div class="lr-reveal"><div class="lr-rv-cards">${g.reveal.cards.map((c) => `<span class="lr-rc ${c.r === 'J' || c.r === g.table ? 'ok' : 'bad'}">${cardSVG(c.r)}</span>`).join('')}</div><p class="lr-rv-msg ${g.reveal.lied ? 'bad' : 'ok'}">${g.reveal.lied ? `😈 ${esc(nm(room, g.reveal.target))} كان يكذب!` : `😇 ${esc(nm(room, g.reveal.target))} كان صادق!`}</p><small>${esc(nm(room, g.reveal.loser))} بيقطع سلك من قنبلته</small></div>` : '';
  // طبقات القنبلة
  let overlay = '';
  if (g.phase === 'deal' && g.round === 1 && Math.max(0, g.endsAt - g.serverNow) > 2400) overlay = `<div class="lr-ov">${bombSVG('--:--', 'set')}<p class="lr-ovt">تم ضبط القنبلة</p></div>`;
  else if (g.phase === 'deal') overlay = `<div class="lr-ov soft"><div class="lr-big">${cardSVG(g.table)}</div><p class="lr-ovt"><b>${RANK_NAME[g.table]}</b> هو الكرت الأساسي هالجولة — كل الكروت اللي تلعبها تعتبر ${RANK_NAME[g.table]}.<br><small>والجوكر يحسب دايم الكرت الصح 🃏</small></p></div>`;
  else if (g.phase === 'bomb') { const left = Math.max(0, g.endsAt - g.serverNow); overlay = `<div class="lr-ov">${bombSVG('00:' + String(Math.ceil(left / 1000)).padStart(2, '0'), 'tick')}<p class="lr-ovt">${esc(nm(room, g.reveal?.loser))} يستعد لقطع السلك…</p>${g.canCut ? `<div class="lr-wires">${Array.from({ length: g.wires }, (_, i) => `<button type="button" class="lr-wb w${i}" data-act="lr-cut" data-w="${i}" ${LR.busy ? 'disabled' : ''} aria-label="اقطع السلك ${i + 1}"></button>`).join('')}</div><p class="lr-hint">اختر سلك واقطعه! ✂️</p>` : ''}</div>`; }
  else if (g.phase === 'result' && g.bomb) overlay = g.bomb.exploded ? `<div class="lr-ov boom"><div class="lr-blast"></div>${bombSVG('BOOM')}<p class="lr-ovt bad">💥 انفجرت! ${esc(nm(room, g.bomb.who))} طلع من اللعبة</p></div>` : `<div class="lr-ov">${bombSVG('أمان', 'safe')}${PLIERS}<p class="lr-ovt ok">✅ أمان! ${esc(nm(room, g.bomb.who))} نجا هالمرة</p></div>`;
  else if (g.phase === 'final') overlay = `<div class="lr-ov soft"><div class="lr-win">👑</div><p class="lr-ovt ok">${g.winner ? `${esc(nm(room, g.winner))} فاز!` : 'انتهت اللعبة'}</p></div>`;
  const meAlive = me >= 0 && g.alive[me];
  const hand = me >= 0 ? `<div class="lr-hand${myTurn ? ' on' : ''}">${g.hand.map((c) => `<button type="button" class="lr-card${LR.sel.includes(c.id) ? ' sel' : ''}" data-act="lr-card" data-id="${c.id}" ${g.canPlay ? '' : 'disabled'} aria-pressed="${LR.sel.includes(c.id)}" aria-label="${RANK_NAME[c.r]}">${cardSVG(c.r)}</button>`).join('')}</div>` : '';
  const acts = myTurn ? `<div class="lr-acts">${g.canLiar ? `<button type="button" class="lr-liar" data-act="lr-liar" ${LR.busy ? 'disabled' : ''}>كذاب ⁉️</button>` : ''}${clock(g)}${g.mustLiar ? '' : `<button type="button" class="lr-play${LR.sel.length ? ' go' : ''}" data-act="lr-play" ${!LR.sel.length || LR.busy ? 'disabled' : ''}>العب${LR.sel.length ? ` (${LR.sel.length})` : ''}</button>`}</div>${g.mustLiar ? '<p class="lr-hint">خلصت أوراقك — لازم تقول «كذاب!»</p>' : ''}` : '';
  const myCuts = me >= 0 ? g.cuts[me] : 0;
  return `<div class="lr" dir="rtl">${BAR}<div class="lr-top"><span class="lr-tcard">${cardSVG(g.table)}<b>طاولة: <em>${RANK_NAME[g.table]}</em></b></span><span class="lr-mybomb" title="أسلاك قنبلتك المقطوعة">🧨 (${myCuts}/${g.wires})</span></div>
    <div class="lr-room"><div class="lr-table${myTurn ? ' myturn' : ''}"><div class="lr-felt"><div class="lr-tlogo" aria-hidden="true"><i>👑</i><b>لعبك</b><small>LA3BAK</small></div>${pile}${reveal}</div></div>${order.map((p, k) => seat(p, k)).join('')}
    ${me >= 0 ? `<div class="lr-me${!meAlive ? ' dead' : ''}${myTurn ? ' turn' : ''}"><span class="lr-ch"><img src="${CHAR(me)}" alt="" decoding="async"></span><b class="lr-nm"><span class="lr-mini">${faceOf(room, room.you, me, 40)}</span>${esc(nm(room, room.you))}</b><span class="lr-cnt">${g.hand.length}</span>${lastBy === room.you && g.phase === 'play' ? `<em class="lr-claim">${g.last.n}</em>` : ''}</div>` : ''}${overlay}</div>
    ${!meAlive && me >= 0 && g.phase !== 'final' ? '<p class="lr-hint">💥 طلعت من اللعبة — تقدر تتفرج لين تخلص.</p>' : ''}${acts}${hand}</div>`;
}
let clockTimer = 0;
export function afterRender(view, room) {
  const g = room.game; if (!g || g.game !== 'liars') return;
  clearInterval(clockTimer);
  clockTimer = setInterval(() => {
    const els = document.querySelectorAll('[data-lr-left]'); if (!els.length) { clearInterval(clockTimer); return; }
    for (const el of els) { const left = Number(el.dataset.lrLeft) - (Date.now() - Number(el.dataset.lrAt)); el.textContent = String(Math.max(0, Math.ceil(left / 1000))); el.classList.toggle('low', left < 6000); }
    const lcd = document.querySelector('.lr-bombi.tick .lr-lcd'); const ov = document.querySelector('.lr-ov');
    if (lcd && g.phase === 'bomb') { const left = Math.max(0, g.endsAt - g.serverNow - (Date.now() - LR.renderedAt)); lcd.textContent = '00:' + String(Math.ceil(left / 1000)).padStart(2, '0'); }
    void ov;
  }, 250);
  LR.renderedAt = Date.now();
  const evs = (g.events || []).filter((e) => e.seq > LR.evSeq); const first = LR.evSeq < 0; LR.evSeq = g.evSeq ?? LR.evSeq;
  if (first || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const e of evs) {
    if (e.type === 'liar') { const el = view.querySelector(`[data-lr-seat="${CSS.escape(g.players[e.by] ?? '')}"]`) || view.querySelector('.lr-me'); if (el) { const b = document.createElement('i'); b.className = 'lr-shout'; b.textContent = 'كذاب!'; el.append(b); setTimeout(() => b.remove(), 2200); } }
    if (e.type === 'boom') { navigator.vibrate?.([80, 40, 200]); }
  }
}
