/* لعبة الكذابين — الواجهة (R68z). القواعد والنتائج كلها من الخادم: src/engine/liars.ts
 * تصميم «البار»: طاولة حمرا بإطار ذهبي، اللاعبين حولها بصورهم، يدك تحت، والقنبلة بالعداد والأسلاك والكماشة.
 * كل الرسومات أصلية (SVG/CSS) بدون أي أصول منسوخة. */
import { faceHtml } from './characters.js?v=shell-r6';
import { avatarArt } from './avatars.js?v=r67ac';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const LR = { room: '', sel: [], busy: false, evSeq: -1, tip: 0, seenRound: 0 };
export const RANK_NAME = { Q: 'البنت', K: 'الشايب', A: 'الإكَه', J: 'الجوكر' };
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
const BACK = '<svg viewBox="0 0 60 84" class="lr-cb" style="direction:ltr"><rect x="1" y="1" width="58" height="82" rx="7" fill="#1d1416" stroke="#c9a24a" stroke-width="2"/><rect x="6" y="6" width="48" height="72" rx="5" fill="none" stroke="#c9a24a88" stroke-width="1.2"/><path d="M18 36l6 5 6-9 6 9 6-5-2 13H20z" fill="#e8c35a"/><text x="30" y="62" text-anchor="middle" font-size="9" font-weight="900" fill="#e8c35a" font-family="Tahoma">لعبك</text></svg>';
/* ---------- القنبلة ---------- */
function bombSVG(txt, cls = '') {
  const sticks = [0, 1, 2, 3, 4, 5, 6].map((i) => { const x = 20 + (i % 4) * 46 + (i >= 4 ? 23 : 0), y = i >= 4 ? 30 : 74; return `<g><rect x="${x}" y="${y}" width="44" height="104" rx="20" fill="url(#lrst)" stroke="#5a0d0d" stroke-width="2"/><rect x="${x}" y="${y + 20}" width="44" height="7" fill="#f4c542"/><rect x="${x}" y="${y + 78}" width="44" height="7" fill="#f4c542"/></g>`; }).join('');
  return `<svg viewBox="0 0 230 200" class="lr-bomb ${cls}" aria-hidden="true"><defs><linearGradient id="lrst" x1="0" x2="1"><stop offset="0" stop-color="#ff5a4a"/><stop offset=".5" stop-color="#d81f1f"/><stop offset="1" stop-color="#8f0f0f"/></linearGradient></defs>
    <path d="M60 40c-30-30 80-40 70-5M150 36c40-30 60 40 10 40M40 150c-40 10-30 60 20 40M190 140c30 20 10 60-30 40" fill="none" stroke="#3a7bff" stroke-width="4"/><path d="M70 30c10-30 90-20 80 20M50 160c0 30 60 40 70 10" fill="none" stroke="#ff9f1a" stroke-width="4"/><path d="M100 26c30-20 80 10 60 50" fill="none" stroke="#7a3cff" stroke-width="4"/><path d="M30 120c-20-20 0-60 30-50" fill="none" stroke="#2fbf71" stroke-width="4"/>
    ${sticks}<rect x="54" y="92" width="122" height="62" rx="9" fill="#3d4237" stroke="#1d1f1a" stroke-width="3"/><rect x="62" y="100" width="106" height="46" rx="5" fill="#0d1a0f"/><circle cx="74" cy="123" r="5" fill="#41ff6a"/>
    <text x="122" y="133" text-anchor="middle" class="lr-lcd">${esc(txt)}</text></svg>`;
}
const PLIERS = '<svg viewBox="0 0 120 140" class="lr-pliers" aria-hidden="true"><path d="M52 6l8 46-14 4z" fill="#c7ccd6" stroke="#555" stroke-width="2"/><path d="M68 6l-8 46 14 4z" fill="#aab0bc" stroke="#555" stroke-width="2"/><circle cx="60" cy="58" r="7" fill="#777"/><path d="M50 62C30 90 26 118 34 134l14-4c-6-16-2-40 10-62z" fill="#ffcf1a" stroke="#7a5a00" stroke-width="2"/><path d="M70 62c20 28 24 56 16 72l-14-4c6-16 2-40-10-62z" fill="#e8342e" stroke="#7a1010" stroke-width="2"/></svg>';
const clock = (g, cls = '') => { const left = Math.max(0, g.endsAt - g.serverNow); return `<span class="lr-clock ${cls}" data-lr-left="${left}" data-lr-at="${Date.now()}" role="timer">${Math.ceil(left / 1000)}</span>`; };
const BAR = '<svg class="lr-bar" viewBox="0 0 390 700" preserveAspectRatio="xMidYMin slice" aria-hidden="true"><defs><linearGradient id="lrw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a2516"/><stop offset="1" stop-color="#1c0b06"/></linearGradient><radialGradient id="lrl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".9"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/></radialGradient><linearGradient id="lrsh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a4426"/><stop offset="1" stop-color="#3a1c0e"/></linearGradient></defs><rect width="390" height="700" fill="url(#lrw)"/>'
  + [0,1,2,3,4,5,6,7].map((i) => `<rect x="${i * 52 - 6}" y="0" width="3" height="330" fill="#00000040"/>`).join('')
  + '<path d="M40 30h80v120H40zM270 30h80v120h-80z" fill="#1d2a4a"/><path d="M40 30h80v120H40zM270 30h80v120h-80z" fill="none" stroke="#7a4426" stroke-width="8"/><path d="M80 30v120M40 90h80M310 30v120M270 90h80" stroke="#7a4426" stroke-width="4"/><path d="M48 40l20 50M280 40l18 46" stroke="#9fc3ff55" stroke-width="6"/>'
  + [60, 190, 330].map((x) => `<circle cx="${x}" cy="40" r="60" fill="url(#lrl)"/><path d="M${x - 14} 14h28l-6 22h-16z" fill="#c98a3a"/><circle cx="${x}" cy="38" r="6" fill="#fff3c4"/>`).join('')
  + [180, 250].map((y) => `<rect x="130" y="${y}" width="130" height="8" fill="url(#lrsh)"/>` + [0, 1, 2, 3, 4].map((k) => `<rect x="${140 + k * 24}" y="${y - (18 + (k % 2) * 8)}" width="14" height="${18 + (k % 2) * 8}" rx="3" fill="${['#8a3a2a', '#c98a3a', '#3a6a5a', '#a05a8a', '#d9b27a'][k]}" opacity=".85"/>`).join('')).join('')
  + '<rect x="0" y="300" width="390" height="40" fill="#2a120a"/><rect x="0" y="300" width="390" height="6" fill="#7a4426"/></svg>';
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
    return `<div class="lr-seat${dead ? ' dead' : ''}${turn ? ' turn' : ''}" style="left:${x}%;top:${y}%" data-lr-seat="${esc(id)}"><span class="lr-av">${faceOf(room, id, p, 110)}${dead ? '<i class="lr-x">💥</i>' : ''}${turn ? clock(g, 'sm') : ''}</span><b class="lr-nm">${esc(nm(room, id))}</b><span class="lr-cnt" title="أوراقه">${g.counts[p]}</span><span class="lr-wire" title="الأسلاك المقطوعة">💣 ${g.cuts[p]}/${g.wires}</span>${lastBy === id && g.phase === 'play' ? `<em class="lr-claim">${g.last.n}</em>` : ''}</div>`;
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
    <div class="lr-room"><div class="lr-table${myTurn ? ' myturn' : ''}"><div class="lr-felt">${pile}${reveal}</div></div>${order.map((p, k) => seat(p, k)).join('')}
    ${me >= 0 ? `<div class="lr-me${!meAlive ? ' dead' : ''}${myTurn ? ' turn' : ''}"><span class="lr-av">${faceOf(room, room.you, me, 120)}</span><span class="lr-cnt">${g.hand.length}</span>${lastBy === room.you && g.phase === 'play' ? `<em class="lr-claim">${g.last.n}</em>` : ''}</div>` : ''}${overlay}</div>
    ${!meAlive && me >= 0 && g.phase !== 'final' ? '<p class="lr-hint">💥 طلعت من اللعبة — تقدر تتفرج لين تخلص.</p>' : ''}${acts}${hand}</div>`;
}
let clockTimer = 0;
export function afterRender(view, room) {
  const g = room.game; if (!g || g.game !== 'liars') return;
  clearInterval(clockTimer);
  clockTimer = setInterval(() => {
    const els = document.querySelectorAll('[data-lr-left]'); if (!els.length) { clearInterval(clockTimer); return; }
    for (const el of els) { const left = Number(el.dataset.lrLeft) - (Date.now() - Number(el.dataset.lrAt)); el.textContent = String(Math.max(0, Math.ceil(left / 1000))); el.classList.toggle('low', left < 6000); }
    const lcd = document.querySelector('.lr-bomb.tick .lr-lcd'); const ov = document.querySelector('.lr-ov');
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
