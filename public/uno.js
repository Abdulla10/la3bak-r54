/* أونو — تصميم «الطاولة» (إعادة بناء كاملة للواجهة؛ القواعد والتحقق والنتائج كلها من الخادم: src/engine/uno.ts).
 * طاولة بيضاوية بإطار خشبي، الخصوم حول الطاولة على قوس، الرزمة والمرمى بالوسط وحولهما حلقة اتجاه اللعب بلون اللعب الحالي،
 * يدك مروحة منحنية أسفل الشاشة، زر «أونو!» دائري، ومؤثرات من أحداث الخادم (تخطّي، عكس، +2/+4، جوكر، أونو، كشف، فوز).
 * وضعان: رأسي (مسرح 921×2000 بنفس حجز المساحات الآمنة) وأفقي (مسرح 2000×1125) — يتبدل تلقائياً مع الشاشة.
 * رسم الأوراق SVG أصلي بالكامل (بدون أي شعار أو أصول منسوخة). */
import { faceHtml } from './characters.js?v=shell-r6';
import { avatarArt } from './avatars.js?v=r58o';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nf = (n) => Number(n).toLocaleString('ar-EG-u-nu-latn');

/** حالة الواجهة المحلية */
export const UN = { room: '', wild: null, busy: false, menu: false, rules: false, seen: '', evSeq: -1, tops: [] };
export const uiKey = () => [UN.wild, UN.busy, UN.menu, UN.rules, isWide() ? 'w' : 't'].join('|');
export const isWide = () => typeof matchMedia !== 'undefined' && matchMedia('(min-aspect-ratio: 6/5)').matches;

export const COLOR_NAME = { r: 'أحمر', y: 'أصفر', g: 'أخضر', b: 'أزرق' };
const VAL_NAME = { skip: 'تخطّي', rev: 'عكس', d2: 'اسحب 2', wild: 'جوكر', wd4: 'جوكر اسحب 4' };
export const cardName = (c) => c.c === 'w' ? VAL_NAME[c.v] : `${COLOR_NAME[c.c]} ${VAL_NAME[c.v] ?? nf(c.v)}`;
const HEX = { r: ['#ff5a4f', '#d32a24'], y: ['#ffd84a', '#f0a90a'], g: ['#4fd37a', '#1f9a4b'], b: ['#4aa8ff', '#1a62d6'], w: ['#3a3550', '#14111f'] };

/* ---------- رسم الورقة (SVG 60×90) ---------- */
const skipIco = (c) => `<circle cx="30" cy="45" r="11" fill="none" stroke="${c}" stroke-width="4.5"/><path d="M22 53l16-16" stroke="${c}" stroke-width="4.5" stroke-linecap="round"/>`;
const revIco = (c) => `<path d="M21 42a9 9 0 0 1 15-6l2-4 2 11-11-2 4-2a5 5 0 0 0-8 3z" fill="${c}"/><path d="M39 48a9 9 0 0 1-15 6l-2 4-2-11 11 2-4 2a5 5 0 0 0 8-3z" fill="${c}"/>`;
const miniCard = (x, y, col, rot) => `<rect x="${x}" y="${y}" width="11" height="16" rx="2" fill="${HEX[col][0]}" stroke="#fff" stroke-width="1.6" transform="rotate(${rot} ${x + 5.5} ${y + 8})"/>`;
const wheel = (r = 12) => `<g transform="translate(30 45)"><path d="M0 0L0 ${-r}A${r} ${r} 0 0 1 ${r} 0Z" fill="${HEX.r[0]}"/><path d="M0 0L${r} 0A${r} ${r} 0 0 1 0 ${r}Z" fill="${HEX.y[0]}"/><path d="M0 0L0 ${r}A${r} ${r} 0 0 1 ${-r} 0Z" fill="${HEX.g[0]}"/><path d="M0 0L${-r} 0A${r} ${r} 0 0 1 0 ${-r}Z" fill="${HEX.b[0]}"/></g>`;
function center(c, ink) {
  if (c.v === 'skip') return skipIco(ink);
  if (c.v === 'rev') return revIco(ink);
  if (c.v === 'd2') return miniCard(20, 36, c.c, -12) + miniCard(29, 38, c.c, 10) + `<text x="30" y="70" text-anchor="middle" font-size="9" font-weight="900" fill="${ink}">+2</text>`;
  if (c.v === 'wild') return wheel(13);
  if (c.v === 'wd4') return miniCard(13, 37, 'b', -16) + miniCard(21, 34, 'r', -6) + miniCard(29, 34, 'y', 6) + miniCard(37, 37, 'g', 16) + '<text x="30" y="70" text-anchor="middle" font-size="9" font-weight="900" fill="#fff">+4</text>';
  return `<text x="30" y="56" text-anchor="middle" font-size="30" font-weight="900" fill="${ink}" stroke="rgba(0,0,0,.25)" stroke-width="1.2" paint-order="stroke">${c.v}</text>`;
}
const corner = (c) => (c.v === 'skip' ? '⊘' : c.v === 'rev' ? '⇄' : c.v === 'd2' ? '+2' : c.v === 'wd4' ? '+4' : c.v === 'wild' ? '★' : c.v);
export function faceSVG(c) {
  const [a, b] = HEX[c.c]; const id = 'ug' + c.c;
  const ink = c.c === 'w' ? '#fff' : b;
  return `<svg class="u2-face" viewBox="0 0 60 90" role="img" aria-label="${esc(cardName(c))}" style="direction:ltr"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <rect x="1" y="1" width="58" height="88" rx="8" fill="#fff"/><rect x="4" y="4" width="52" height="82" rx="6" fill="url(#${id})"/>
    <ellipse cx="30" cy="45" rx="20" ry="31" transform="rotate(24 30 45)" fill="${c.c === 'w' ? '#0e0b18' : '#fff'}" opacity="${c.c === 'w' ? '.9' : '1'}"/>
    <path d="M8 18c10-10 34-12 44-6" stroke="#fff" stroke-opacity=".25" stroke-width="3" fill="none"/>
    ${center(c, ink)}
    <text x="9" y="16" font-size="10" font-weight="900" fill="#fff" stroke="rgba(0,0,0,.35)" stroke-width=".8" paint-order="stroke">${corner(c)}</text>
    <text x="51" y="80" font-size="10" font-weight="900" fill="#fff" text-anchor="middle" transform="rotate(180 47 76)" stroke="rgba(0,0,0,.35)" stroke-width=".8" paint-order="stroke">${corner(c)}</text></svg>`;
}
export const backSVG = () => `<svg class="u2-face" viewBox="0 0 60 90" aria-hidden="true"><rect x="1" y="1" width="58" height="88" rx="8" fill="#fff"/><rect x="4" y="4" width="52" height="82" rx="6" fill="#1b1340"/><path d="M4 70L56 20M4 84L56 34M4 56L56 6" stroke="#2c2068" stroke-width="5"/><ellipse cx="30" cy="45" rx="19" ry="29" transform="rotate(24 30 45)" fill="#e8322b"/><text x="30" y="50" text-anchor="middle" font-size="12" font-weight="900" fill="#ffd84a" stroke="#7a1410" stroke-width="1" paint-order="stroke" transform="rotate(-18 30 45)">لعبك</text></svg>`;
/** للاستخدام خارج اللعبة (لوحة النتيجة وغيرها) */
export const cardHTML = (c, w = 60, extra = '') => `<span class="u2-card ${extra}" style="--cw:${w}">${faceSVG(c)}</span>`;

/* ---------- الهندسة: رأسي 921×2000، أفقي 2000×1125 ---------- */
const GEO = {
  tall: { W: 921, H: 2000, cx: 460, cy: 880, trx: 400, try: 470, srx: 395, sry: 575, a0: 192, a1: 348, b0: 163, b1: 377, pileX: 330, discX: 590, pileY: 880, cardW: 150, msgY: 1210, handTop: 1500, handR: 1300, meX: 98, meY: 1290, unoX: 822, unoY: 1310, btnY: 1300, small: 148 },
  wide: { W: 2000, H: 1125, cx: 1000, cy: 500, trx: 700, try: 320, srx: 830, sry: 360, a0: 184, a1: 356, b0: 172, b1: 368, pileX: 860, discX: 1140, pileY: 480, cardW: 130, msgY: 780, handTop: 885, handR: 1500, meX: 170, meY: 955, unoX: 1830, unoY: 955, btnY: 690, small: 130 },
};
function seatSpots(k, G) {
  if (k === 1) return [{ x: G.cx, y: G.cy - G.sry, a: 270 }];
  const span = k === 2 ? [235, 305] : k === 3 ? [215, 325] : k >= 7 ? [G.b0 ?? G.a0, G.b1 ?? G.a1] : [G.a0, G.a1];
  // توزيع بمسافات متساوية على محيط القوس (مو بزوايا متساوية) عشان ما تتزاحم المقاعد فوق
  const N = 360, pt = (a) => { const r = a * Math.PI / 180; return { x: G.cx + G.srx * Math.cos(r), y: G.cy + G.sry * Math.sin(r), a }; };
  const pts = Array.from({ length: N + 1 }, (_, i) => pt(span[0] + (span[1] - span[0]) * i / N));
  const acc = [0]; for (let i = 1; i <= N; i++) acc.push(acc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const L = acc[N];
  return Array.from({ length: k }, (_, i) => { const t = L * i / (k - 1); let j = 0; while (j < N && acc[j] < t) j++; return pts[j]; });
}

const nm = (room, id) => room.players.find((p) => p.id === id)?.name ?? 'لاعب غادر';
const clockEl = (g) => `<span class="jx-clock u2-clock" role="timer" data-ends="${g.endsAt}" data-total="${g.phase === 'roundEnd' ? 8000 : g.turnMs}" data-phase="ok" aria-label="الوقت المتبقي"><svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle class="jx-ring-bg" cx="50" cy="50" r="46"/><circle class="jx-ring-fg" cx="50" cy="50" r="46" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0" transform="rotate(-90 50 50)"/></svg><b class="jx-sec"></b></span>`;
const faceOf = (room, id, p, size) => { const rp = room.players.find((q) => q.id === id); return rp?.av ? avatarArt(rp.av, size) : rp?.avatar ? `<img class="dm-photo" src="/api/room-avatar?code=${esc(room.code)}&id=${encodeURIComponent(id)}&v=${rp.avatar}" alt="" decoding="async">` : faceHtml(p, size); };

function seatHTML(room, g, p, s, G, small) {
  const id = g.players[p]; const rp = room.players.find((q) => q.id === id);
  const turn = (g.phase === 'play' || g.phase === 'wd4') && g.turnId === id;
  const raw = nm(room, id).replace(/^🤖\s*/, '');
  const n = g.counts[p]; const fan = Math.min(n, 5);
  const backs = Array.from({ length: fan }, (_, i) => `<span class="u2-mini" style="--i:${i - (fan - 1) / 2}">${backSVG()}</span>`).join('');
  const flag = g.exposed === id ? (g.canCatch ? `<button type="button" class="u2-catch" data-act="un-catch" data-id="${esc(id)}">امسكه! نسي «أونو»</button>` : '<em class="u2-flag warn">نسي «أونو»</em>') : n === 1 && g.said[p] ? '<em class="u2-flag">أونو!</em>' : '';
  const won = g.phase === 'roundEnd' && g.result?.winner === p;
  return `<div class="u2-seat ${turn ? 'turn' : ''} ${small} ${g.out[p] ? 'out' : ''} ${won ? 'won' : ''}" style="left:calc(${s.x.toFixed(0)}*var(--u));top:calc(${s.y.toFixed(0)}*var(--u))" data-seat="${p}">
    <span class="u2-fan" aria-hidden="true">${backs}</span>
    <span class="u2-av"><span class="in">${faceOf(room, id, p, 100)}</span>${turn ? clockEl(g) : ''}</span>
    <b class="u2-cnt" aria-label="${nf(n)} ورقة">${nf(n)}</b>
    <span class="u2-plate"><span class="u2-nm">${esc(raw)}${rp && !rp.bot && !rp.connected ? ' <em class="off" title="غير متصل">⚠︎</em>' : ''}${g.out[p] ? ' <em>انسحب</em>' : ''}</span><span class="u2-sc">${nf(g.scores[p])}</span></span>
    ${flag}</div>`;
}

function lastText(room, g) {
  const L = g.last; if (!L) return '';
  const who = g.players[L.by] === room.you ? 'أنت' : nm(room, g.players[L.by]);
  switch (L.kind) {
    case 'play': return `${who}: ${cardName(L.card)}${L.card.c === 'w' ? ` ← ${COLOR_NAME[L.color]}` : ''}`;
    case 'draw': return `${who} سحب ورقة`;
    case 'pass': return `${who} مرّر`;
    case 'accept': return `${who} قبل +4 وسحب ${nf(L.n)}`;
    case 'challenge-won': return `${who} تحدّى ونجح! اللي لعب +4 سحب ${nf(L.n)}`;
    case 'challenge-lost': return `${who} تحدّى وخسر وسحب ${nf(L.n)}`;
    case 'catch': return `${who} مسك لاعب نسي «أونو»: +${nf(L.n)} عليه`;
    case 'color': return `${who} اختار ${COLOR_NAME[L.color]}`;
    case 'out': return `${who} انسحب`;
    default: return '';
  }
}
function hintOf(room, g) {
  const mine = g.turnId === room.you;
  if (g.phase === 'final') return g.winner === room.you ? 'فزت بالمباراة! 🏆' : g.winner ? `فاز ${nm(room, g.winner)} بالمباراة` : 'انتهت المباراة';
  if (g.phase === 'roundEnd' && g.result) { const w = g.players[g.result.winner]; return w === room.you ? `خلّصت أوراقك! +${nf(g.result.points)}` : `${nm(room, w)} خلّص أوراقه +${nf(g.result.points)}`; }
  if (g.pick) return mine ? 'أول ورقة جوكر: اختر لون البداية' : `${nm(room, g.turnId)} يختار لون البداية…`;
  if (g.phase === 'wd4') return mine ? 'لعبوا عليك +4: تقبل أو تتحدّى؟' : `${nm(room, g.turnId)} يقرر: يقبل +4 أو يتحدّى`;
  if (mine) {
    if (g.drawn !== null && g.legal.length) return 'سحبت ورقة تنلعب: العبها أو مرّر';
    if (g.legal.length) return g.hand.length === 2 && g.canUno ? 'باقي لك ورقتين: اضغط «أونو!» قبل لا تلعب' : 'دورك: العب ورقة مضيئة';
    return 'ما عندك ورقة تنلعب: اسحب من الرزمة';
  }
  return `دور ${nm(room, g.turnId)}…`;
}
const RULES = [
  ['🎴', 'طابق الورقة اللي فوق المرمى باللون أو الرقم أو الرمز. الجوكر ينلعب بأي وقت وتختار بعده اللون.'],
  ['⊘', 'تخطّي: اللاعب اللي بعدك يروح دوره. ⇄ عكس: يقلب اتجاه اللعب (بلاعبين يصير مثل التخطّي). +2: اللي بعدك يسحب ورقتين ويروح دوره.'],
  ['+4', 'جوكر +4 ينلعب بس إذا ما عندك ورقة من اللون الحالي. اللي بعدك يقبل (يسحب 4) أو يتحدّى: لو كنت مخالف تسحب أنت 4، ولو مو مخالف يسحب هو 6.'],
  ['📥', 'ما عندك ورقة تنلعب؟ اسحب ورقة وحدة: لو تنلعب تقدر تلعبها هي بس، وإلا ينتقل الدور.'],
  ['!', 'لما يبقى معك ورقتين اضغط «أونو!» قبل لا تلعب. لو نسيت وأحد مسكك قبل حركة اللي بعدك تسحب ورقتين.'],
  ['🏁', 'اللي يخلّص أوراقه ياخذ مجموع أوراق خصومه: الرقم بقيمته، الأوراق الخاصة 20، الجوكر 50. أول من يوصل الهدف يفوز. ما فيه رسوم ولا جوائز عملات.'],
  ['⏱', 'لو خلص وقتك يلعب الخادم عنك حركة قانونية، وثلاث مرات ورا بعض تعتبر انسحاب.'],
];

export function uno(room) {
  const g = room.game;
  if (UN.room !== room.code) Object.assign(UN, { room: room.code, wild: null, busy: false, menu: false, rules: false, seen: '', evSeq: -1, tops: [] });
  const wide = isWide(); const G = wide ? GEO.wide : GEO.tall;
  const pi = g.players.indexOf(room.you);
  const mine = g.phase === 'play' && g.turnId === room.you;
  if (UN.wild !== null && !(mine && g.legal.includes(UN.wild))) UN.wild = null;
  const legal = new Set(g.legal);
  // آخر الأوراق اللي انلعبت (للعرض فقط: كومة المرمى)
  if (!UN.tops.length || UN.tops.at(-1).id !== g.top.id) { UN.tops.push(g.top); if (UN.tops.length > 3) UN.tops.shift(); }
  if (g.discardCount === 1) UN.tops = [g.top];
  const n = g.players.length;
  const order = pi >= 0 ? Array.from({ length: n - 1 }, (_, i) => (pi + 1 + i) % n) : g.players.map((_, i) => i);
  const spots = seatSpots(order.length, G);
  const seats = order.map((p, i) => seatHTML(room, g, p, spots[i], G, order.length > 6 ? 'sm xs' : order.length > 4 ? 'sm' : '')).join('');
  const col = g.color; const [ca] = HEX[col] || HEX.w;
  const ccw = g.dir === 1;
  // الطاولة: بيضاوي بإطار خشبي وحلقة اتجاه بلون اللعب
  const table = `<div class="u2-table" style="left:calc(${G.cx - G.trx}*var(--u));top:calc(${G.cy - G.try}*var(--u));width:calc(${G.trx * 2}*var(--u));height:calc(${G.try * 2}*var(--u));--cc:${ca}"><i class="u2-felt"></i><i class="u2-glow"></i></div>`;
  const ringR = wide ? 230 : 250;
  const ring = `<svg class="u2-ring ${ccw ? 'ccw' : 'cw'}" style="left:calc(${G.cx - ringR}*var(--u));top:calc(${G.pileY - ringR}*var(--u));width:calc(${ringR * 2}*var(--u));height:calc(${ringR * 2}*var(--u));--cc:${ca}" viewBox="0 0 200 200" role="img" aria-label="اتجاه اللعب: ${ccw ? 'عكس' : 'مع'} عقارب الساعة، واللون الحالي ${COLOR_NAME[col] ?? ''}"><circle cx="100" cy="100" r="92" fill="none" stroke="var(--cc)" stroke-width="3" stroke-dasharray="14 10" opacity=".75"/>${[0, 90, 180, 270].map((r) => `<path d="M100 4l9 9-9 3z" fill="var(--cc)" transform="rotate(${r} 100 100)"/>`).join('')}</svg>`;
  const pile = `<button type="button" class="u2-pile ${g.canDraw ? 'can' : ''}" data-act="un-draw" style="left:calc(${G.pileX - G.cardW / 2}*var(--u));top:calc(${G.pileY - G.cardW * .75}*var(--u));--cw:${G.cardW}" aria-label="الرزمة: ${nf(g.drawCount)} ورقة${g.canDraw ? '، اضغط للسحب' : ''}" ${g.canDraw && !UN.busy ? '' : 'aria-disabled="true"'}><span class="u2-card b3">${backSVG()}</span><span class="u2-card b2">${backSVG()}</span><span class="u2-card b1">${backSVG()}</span><b>${nf(g.drawCount)}</b>${g.canDraw ? '<em>اسحب</em>' : ''}</button>`;
  const disc = `<div class="u2-disc" style="left:calc(${G.discX - G.cardW / 2}*var(--u));top:calc(${G.pileY - G.cardW * .75}*var(--u));--cw:${G.cardW}">${UN.tops.map((c, i) => `<span class="u2-card d${UN.tops.length - 1 - i}" ${i === UN.tops.length - 1 ? `data-tk="un${c.id}"` : ''} style="--rot:${[-14, 9, -4][i % 3]}deg">${faceSVG(c)}</span>`).join('')}</div>`;
  const chip = `<span class="u2-colchip" style="left:calc(${G.discX}*var(--u));top:calc(${G.pileY + G.cardW * .75 + 24}*var(--u));--cc:${ca}"><i></i>${COLOR_NAME[col] ?? '—'}</span>`;
  // يدي: مروحة منحنية
  const h = g.hand; const cw = h.length > 12 ? G.cardW - 18 : G.cardW;
  const maxSpread = wide ? 1100 : 780;
  const step = h.length > 1 ? Math.min(cw * .8, (maxSpread - cw) / (h.length - 1)) : 0;
  const handHtml = h.map((c, i) => {
    const off = (i - (h.length - 1) / 2) * step; const ang = off / G.handR * 57.3;
    const x = G.cx + off - cw / 2; const y = G.handTop + (off * off) / (2 * G.handR);
    const can = mine && legal.has(c.id);
    return `<button type="button" class="u2-h ${mine ? (can ? 'can' : 'off') : ''} ${UN.wild === c.id ? 'sel' : ''}" data-act="un-card" data-id="${c.id}" data-tk="un${c.id}" style="left:calc(${x.toFixed(1)}*var(--u));top:calc(${y.toFixed(1)}*var(--u));--cw:${cw};--rot:${ang.toFixed(2)}deg;z-index:${i + 1}" aria-label="${esc(cardName(c))}${mine && !can ? ' (ما تنلعب الحين)' : ''}" ${UN.busy ? 'aria-disabled="true"' : ''}><span class="u2-card">${faceSVG(c)}</span></button>`;
  }).join('');
  const meTurn = (g.phase === 'play' || g.phase === 'wd4') && g.turnId === room.you;
  const me = pi >= 0 ? `<div class="u2-me ${meTurn ? 'turn' : ''}" style="left:calc(${G.meX}*var(--u));top:calc(${G.meY}*var(--u))"><span class="u2-av"><span class="in">${faceOf(room, room.you, pi, 100)}</span>${meTurn ? clockEl(g) : ''}</span><span class="u2-plate"><span class="u2-nm">أنت</span><span class="u2-sc">${nf(g.scores[pi])}/${nf(g.target)}</span></span>${g.exposed === room.you ? '<em class="u2-flag warn">نسيت «أونو»!</em>' : g.said[pi] && h.length === 1 ? '<em class="u2-flag">أونو!</em>' : ''}</div>` : '';
  const unoBtn = `<button type="button" class="u2-uno ${g.canUno ? 'on' : ''} ${g.exposed === room.you ? 'urgent' : ''}" data-act="un-uno" style="left:calc(${G.unoX}*var(--u));top:calc(${G.unoY}*var(--u))" ${g.canUno ? '' : 'aria-disabled="true"'} aria-label="أعلن أونو">أونو!</button>`;
  const btns = [];
  if (g.canPass) btns.push('<button type="button" class="u2-btn" data-act="un-pass">مرّر الدور</button>');
  if (mine && g.canDraw && !g.legal.length) btns.push('<button type="button" class="u2-btn draw" data-act="un-draw">اسحب ورقة</button>');
  // اختيار اللون وقرار +4
  let picker = '';
  if (UN.wild !== null || g.needColor) {
    const act = g.needColor ? 'un-color' : 'un-wild';
    picker = `<div class="u2-modal-back" ${g.needColor ? '' : 'data-act="un-wild-x"'}></div><section class="u2-modal u2-picker" role="dialog" aria-label="اختر اللون"><h3>${g.needColor ? 'اختر لون البداية' : 'اختر اللون'}</h3><div class="u2-cols">${['r', 'y', 'g', 'b'].map((c) => `<button type="button" class="u2-col" style="--a:${HEX[c][0]};--b:${HEX[c][1]}" data-act="${act}" data-c="${c}">${COLOR_NAME[c]}</button>`).join('')}</div>${g.needColor ? '' : '<button type="button" class="btn ghost block" data-act="un-wild-x">رجوع</button>'}</section>`;
  }
  let wd4 = '';
  if (g.wd4) {
    const by = g.last && g.players[g.last.by] ? nm(room, g.players[g.last.by]) : 'الخصم';
    wd4 = `<div class="u2-modal-back"></div><section class="u2-modal" role="dialog" aria-label="جوكر +4">${cardHTML({ id: -1, c: 'w', v: 'wd4' }, 70)}<h3>${esc(by)} لعب عليك +4</h3><p>اللون الجديد: <b style="color:${HEX[g.color]?.[0]}">${COLOR_NAME[g.color]}</b>. لو تشك إن ${esc(by)} كان عنده ورقة من اللون السابق تقدر تتحدّاه.</p><div class="u2-two"><button type="button" class="btn" data-act="un-accept">أقبل وأسحب 4</button><button type="button" class="btn gold" data-act="un-challenge">أتحدّاه</button></div><p class="hint">لو كان مخالف يسحب هو 4 وتكمل دورك. ولو مو مخالف تسحب 6 ويروح دورك.</p></section>`;
  }
  let roundPanel = '';
  if (g.phase === 'roundEnd' && g.result) {
    const rows = g.players.map((id, p) => { const hand = g.result.hands[p] || []; return `<li class="${g.result.winner === p ? 'w' : ''}"><b>${id === room.you ? 'أنت' : esc(nm(room, id))}</b><span class="u2-rv">${hand.length ? hand.map((c) => cardHTML(c, 30)).join('') : '<em>خلّص أوراقه 🏁</em>'}</span><i>${nf(g.scores[p])}</i></li>`; }).join('');
    roundPanel = `<section class="u2-panel" role="status" aria-label="نتيجة الجولة"><div class="u2-trophy" aria-hidden="true">🏆</div><h3>نهاية الجولة ${nf(g.round)}</h3><p class="u2-psum">${esc(hintOf(room, g))}</p><ul>${rows}</ul><p class="u2-next">الجولة الجاية بعد ${clockEl(g)} ثوانٍ</p></section>`;
  }
  let finalPanel = '';
  if (g.phase === 'final') {
    const isHost = room.hostId === room.you;
    const list = g.players.map((id, p) => `<li class="${g.winner === id ? 'w' : ''}"><b>${id === room.you ? 'أنت' : esc(nm(room, id))}</b><i>${nf(g.scores[p])}</i></li>`).join('');
    finalPanel = `<section class="dm-final u2-final" role="dialog" aria-label="نهاية المباراة"><div class="u2-trophy big" aria-hidden="true">🏆</div><h3>${esc(hintOf(room, g))}</h3><ul>${list}</ul>${isHost ? '<button class="btn block" data-act="rematch" type="button">مباراة جديدة</button>' : '<p class="hint">ننتظر المضيف يبدأ مباراة جديدة.</p>'}<button class="btn ghost block" data-act="leave" type="button">خروج من الغرفة</button></section>`;
  }
  const rules = UN.rules ? `<div class="jk-rules-back" data-act="un-rules"></div><section class="jk-rules" role="dialog" aria-label="كيف ألعب؟"><h2><span>كيف ألعب أونو؟</span></h2><ul>${RULES.map(([k, t]) => `<li><span class="rc"><b>${esc(k)}</b></span><span class="rt">${esc(t)}</span></li>`).join('')}</ul><button type="button" class="jk-rx" data-act="un-rules" aria-label="إغلاق">✕</button></section>` : '';
  const menu = UN.menu ? `<div class="bl2-menu-back" data-act="un-menu"></div><nav class="dm-menu u2-menu" aria-label="القائمة"><button type="button" data-act="un-rules">📖 <span>القواعد</span></button><button type="button" data-act="fs-toggle">⛶ <span>الشاشة الكاملة</span></button><button type="button" data-act="sound">🔊 <span>الصوت</span></button><button type="button" class="out" data-act="leave">⏻ <span>خروج</span></button></nav>` : '';
  return `<div class="stack jk-screen v2 u2 ${wide ? 'wide' : 'tall'}${g.phase === 'roundEnd' ? ' rend' : ''}">
    <div class="u2-stage" style="--ver:${g.ver}">
      <div class="u2-bg" aria-hidden="true"></div>
      ${table}${ring}
      <div class="u2-top"><button type="button" class="dm-ic" data-act="leave" aria-label="خروج من اللعبة">⏻</button><button type="button" class="dm-ic" data-act="fs-toggle" aria-label="الشاشة الكاملة">⛶</button><button type="button" class="dm-ic" data-act="un-rules" aria-label="كيف ألعب؟">؟</button><span class="dm-round-chip">الجولة ${nf(g.round)} · الهدف ${nf(g.target)}</span></div>
      ${seats}${pile}${disc}${chip}
      <p class="u2-last" style="top:calc(${G.msgY - 52}*var(--u))" aria-live="polite">${esc(lastText(room, g))}</p>
      <p class="u2-msg ${mine || g.wd4 ? 'turn' : ''}" style="top:calc(${G.msgY}*var(--u))" role="status" aria-live="polite">${esc(hintOf(room, g))}</p>
      <div class="u2-btns" style="top:calc(${G.btnY}*var(--u))">${btns.join('')}</div>
      ${me}${unoBtn}
      <div class="u2-hand" aria-label="أوراقك (${nf(h.length)})">${handHtml}</div>
      <div class="u2-fx" aria-hidden="true"></div>
      ${roundPanel}
      <nav class="u2-bar" aria-label="أدوات">
        <button type="button" class="dm-ic sm" data-act="sound" aria-label="الصوت">🔊</button>
        <button type="button" class="dm-ic sm" data-act="jk-chat" aria-label="الردود السريعة والمحادثة">💬</button>
        <button type="button" class="dm-ic sm" data-act="un-menu" aria-label="القائمة" aria-expanded="${UN.menu}">☰</button>
        <button type="button" class="dm-ic sm gift" data-act="un-gift" aria-label="إرسال هدية">🎁</button>
      </nav>
      ${menu}
    </div>
    ${rules}${picker}${wd4}${finalPanel}
  </div>`;
}

/* ---------- المؤثرات: من أحداث الخادم الجديدة فقط ---------- */
function burst(view, x, y, html, cls = '') {
  const fx = view.querySelector('.u2-fx'); if (!fx) return;
  const el = document.createElement('div'); el.className = 'u2-burst ' + cls; el.innerHTML = html;
  el.style.left = x + 'px'; el.style.top = y + 'px'; fx.appendChild(el);
  el.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.25)', opacity: 1, offset: .3 }, { transform: 'translate(-50%,-90%) scale(1)', opacity: 0 }], { duration: 1300, easing: 'ease-out', fill: 'both' }).onfinish = () => el.remove();
}
function centerOf(el, base) { const r = el.getBoundingClientRect(), b = base.getBoundingClientRect(); return [r.left + r.width / 2 - b.left, r.top + r.height / 2 - b.top]; }
function confetti(view) {
  const fx = view.querySelector('.u2-fx'); if (!fx) return;
  const cols = Object.values(HEX).map((x) => x[0]);
  for (let i = 0; i < 40; i++) { const p = document.createElement('i'); p.className = 'u2-conf'; p.style.background = cols[i % 4]; p.style.left = Math.random() * 100 + '%'; fx.appendChild(p); p.animate([{ transform: `translateY(-10vh) rotate(0)` }, { transform: `translateY(110vh) rotate(${600 + Math.random() * 600}deg)` }], { duration: 2400 + Math.random() * 1400, delay: Math.random() * 500, easing: 'linear', fill: 'both' }).onfinish = () => p.remove(); }
}
export function afterRender(view, room) {
  const g = room.game; if (!g || g.game !== 'uno') return;
  const base = view.querySelector('.u2-stage'); if (!base) return;
  const evs = (g.events || []).filter((e) => e.seq > UN.evSeq);
  const first = UN.evSeq < 0; UN.evSeq = g.evSeq ?? UN.evSeq;
  const key = `${room.code}:${g.round}:${g.discardCount}:${g.top.id}`;
  const prevKey = UN.seen; UN.seen = key;
  if (first || typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const seatEl = (p) => g.players[p] === room.you ? view.querySelector('.u2-me .u2-av') : view.querySelector(`.u2-seat[data-seat="${p}"] .u2-av`);
  const disc = view.querySelector('.u2-disc'); const [dx, dy] = disc ? centerOf(disc, base) : [0, 0];
  for (const e of evs.slice(-6)) {
    if (e.type === 'play') {
      const c = e.card;
      // ورقة الخصم تطير من مقعده للمرمى (ورقتي تتحرك من يدي عبر flip العام)
      if (g.players[e.by] !== room.you && prevKey !== key) { const s = seatEl(e.by), top = disc?.querySelector('.d0'); if (s && top) { const [sx, sy] = centerOf(s, base); top.animate([{ transform: `translate(${sx - dx}px,${sy - dy}px) scale(.3) rotate(-40deg)`, opacity: .4 }, { transform: 'rotate(var(--rot)) scale(1)', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.3,.7,.3,1)' }); } }
      if (c.v === 'skip') burst(view, dx, dy - 40, '<b class="u2-big">⊘</b><small>تخطّي!</small>', 'skip');
      if (c.v === 'rev') { burst(view, dx, dy - 40, '<b class="u2-big">⇄</b><small>عكس!</small>', 'rev'); view.querySelector('.u2-ring')?.animate([{ rotate: '0deg' }, { rotate: (g.dir === 1 ? '-' : '') + '360deg' }], { duration: 900, easing: 'ease-out' }); }
      if (c.c === 'w') { const ring = document.createElement('i'); ring.className = 'u2-wave'; ring.style.setProperty('--cc', HEX[e.color]?.[0] || '#fff'); ring.style.left = dx + 'px'; ring.style.top = dy + 'px'; view.querySelector('.u2-fx')?.appendChild(ring); ring.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: .9 }, { transform: 'translate(-50%,-50%) scale(4)', opacity: 0 }], { duration: 1100, easing: 'ease-out' }).onfinish = () => ring.remove(); }
    } else if (e.type === 'draw' && e.forced) { const s = seatEl(e.by); if (s) { const [x, y] = centerOf(s, base); burst(view, x, y, `<b class="u2-big">+${nf(e.n)}</b>`, 'plus'); } }
    else if (e.type === 'uno') { const s = seatEl(e.by); if (s) { const [x, y] = centerOf(s, base); burst(view, x, y, '<b class="u2-big">أونو!</b>', 'uno'); } }
    else if (e.type === 'caught') { const s = seatEl(e.target); if (s) { const [x, y] = centerOf(s, base); burst(view, x, y, `<b class="u2-big">+${nf(e.n)}</b><small>انمسك!</small>`, 'plus'); } }
    else if (e.type === 'challenge') { burst(view, dx, dy - 40, `<b class="u2-big">${e.won ? '✔' : '✖'}</b><small>${e.won ? 'تحدٍّ ناجح' : 'تحدٍّ خاسر'}</small>`, e.won ? 'uno' : 'plus'); }
    else if (e.type === 'round' || e.type === 'win') confetti(view);
  }
}
