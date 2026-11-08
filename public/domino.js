/* دومينو: واجهة فقط. كل القواعد والتحقق والنقاط من الخادم (src/engine/domino.ts).
 * المسرح بنفس نظام وحدات بلوت/لودو: 921×2000 (نفس نسبة شاشة الفيديو المرجعي).
 * المساحات الآمنة: ما نستعمل env() هنا. الشريط العلوي يبدأ من 143u والسفلي ينتهي عند 1915u،
 * وهذا يغطي الجزيرة (حتى 59pt) ومؤشر الرجوع (34pt) على آيفون بمقاس الفيديو، فما فيه احتساب مزدوج. */
import { faceHtml } from './characters.js?v=shell-r6';
import { avatarArt } from './avatars.js?v=r59d';
import { layout, slotFor, viewport } from './domino-layout.js?v=shell-r6';
export { layout, slotFor, viewport };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nf = (n) => Number(n).toLocaleString('ar-EG-u-nu-latn');

/** حالة الواجهة المحلية (اختيار قطعة، ورقة الهدايا، منع الإرسال المزدوج) */
export const DM = { room: '', gameNo: null, you: '', epoch: 0, pending: null, sel: null, busy: false, gift: false, menu: false, rules: false, seen: '' };
/** مفتاح يتغيّر مع الحالة المحلية فيعيد الرسم (يضاف لـ structKey) */
export const uiKey = () => [DM.sel, DM.busy, DM.menu, DM.rules].join('|');

const sameContext = (room) => !!room && room.game?.game === 'domino' && DM.room === room.code && DM.gameNo === (room.gameNo ?? 0) && DM.you === room.you;
/** التوكن يُؤخذ قبل الطلب؛ ربط الشبكة لازم يرفض الرد قبل أي أثر جانبي لو تغيّر السياق. */
export function beginAction(room) {
  if (!sameContext(room) || DM.busy) return null;
  const token = { epoch: DM.epoch };
  DM.pending = token; DM.busy = true;
  return token;
}
export function finishAction(token, room) {
  if (!token || token !== DM.pending || token.epoch !== DM.epoch || !sameContext(room)) return false;
  DM.pending = null; DM.busy = false; DM.sel = null;
  return true;
}

/* ---------------- رسم القطع ---------------- */
// مواضع النقاط داخل مربع 1×1 (نصف القطعة). rot = النصف بقطعة أفقية (الستة بصفّين)
const P = { 1: [[.5, .5]], 2: [[.27, .27], [.73, .73]], 3: [[.25, .25], [.5, .5], [.75, .75]], 4: [[.27, .27], [.73, .27], [.27, .73], [.73, .73]], 5: [[.25, .25], [.75, .25], [.5, .5], [.25, .75], [.75, .75]] };
const SIX_V = [[.28, .2], [.72, .2], [.28, .5], [.72, .5], [.28, .8], [.72, .8]];
const SIX_H = [[.2, .28], [.5, .28], [.8, .28], [.2, .72], [.5, .72], [.8, .72]];
function pips(n, ox, oy, horiz, col) {
  const pts = n === 6 ? (horiz ? SIX_H : SIX_V) : P[n] || [];
  return pts.map(([x, y]) => `<circle cx="${(ox + x).toFixed(3)}" cy="${(oy + y).toFixed(3)}" r=".11" fill="${col}"/>`).join('');
}
/** قطعة بإحداثيات الوحدة. w/h = 2×1 أو 1×2. a = يسار/فوق، b = يمين/تحت */
function tileSvg(x, y, w, h, a, b, cls = '') {
  const horiz = w > h;
  const dark = cls.includes('off');
  const face = dark ? 'url(#dmFaceOff)' : 'url(#dmFace)', pip = dark ? '#1a1b1d' : '#141414';
  const div = horiz ? `<line x1="${x + 1}" y1="${y + .14}" x2="${x + 1}" y2="${y + h - .14}" stroke="#6b6355" stroke-width=".045"/>` : `<line x1="${x + .14}" y1="${y + 1}" x2="${x + w - .14}" y2="${y + 1}" stroke="#6b6355" stroke-width=".045"/>`;
  const cx = horiz ? x + 1 : x + w / 2, cy = horiz ? y + h / 2 : y + 1;
  return `<rect x="${x + .03}" y="${y + .07}" width="${w - .06}" height="${h - .04}" rx=".14" fill="#8a7a5c"/><rect x="${x + .03}" y="${y + .02}" width="${w - .06}" height="${h - .07}" rx=".14" fill="${face}" stroke="#cfc3a6" stroke-width=".03"/>${div}<circle cx="${cx}" cy="${cy}" r=".07" fill="#b98a6a"/>`
    + (horiz ? pips(a, x, y, true, pip) + pips(b, x + 1, y, true, pip) : pips(a, x, y, false, pip) + pips(b, x, y + 1, false, pip));
}
const DEFS = `<defs><linearGradient id="dmFace" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf6"/><stop offset="1" stop-color="#efe5cb"/></linearGradient><linearGradient id="dmFaceOff" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8d8f90"/><stop offset="1" stop-color="#6f7172"/></linearGradient></defs>`;
/** قطعة اليد (عمودية) كـ SVG مستقل */
function handTile(id, cls) {
  const [a, b] = id.split('-').map(Number);
  return `<svg viewBox="-.13 -.04 1.26 2.08" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">${DEFS}${tileSvg(0, 0, 1, 2, a, b, cls)}</svg>`;
}

/* ---------------- مكوّنات الشاشة ---------------- */
const nm = (room, id) => room.players.find((p) => p.id === id)?.name ?? 'لاعب غادر';
const SEAT_X = { 1: [460], 2: [348, 573], 3: [245, 460, 675], 4: [140, 353, 568, 781] };
const SEAT_Y = 318;
const clockEl = (g) => `<span class="jx-clock dm-clock" role="timer" data-ends="${g.endsAt}" data-total="${g.phase === 'roundEnd' ? 6000 : g.turnMs}" data-phase="ok" aria-label="الوقت المتبقي"><svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle class="jx-ring-bg" cx="50" cy="50" r="46"/><circle class="jx-ring-fg" cx="50" cy="50" r="46" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0" transform="rotate(-90 50 50)"/></svg><b class="jx-sec"></b></span>`;

function seatHTML(room, g, id, p, x) {
  const rp = room.players.find((q) => q.id === id);
  const turn = g.phase === 'play' && g.turnId === id;
  const me = id === room.you;
  const raw = nm(room, id).replace(/^🤖\s*/, '');
  const name = me ? 'أنت' : raw; // القص (…) بالـCSS فقط لو الاسم أعرض من المساحة
  const face = rp?.av ? avatarArt(rp.av, 118) : rp?.avatar ? `<img class="dm-photo" src="/api/room-avatar?code=${esc(room.code)}&id=${encodeURIComponent(id)}&v=${rp.avatar}" alt="" decoding="async">` : faceHtml(p, 118);
  const lv = rp?.level ? `<b class="dm-lv" aria-label="المستوى ${rp.level}">م${nf(rp.level)}</b>` : rp?.bot ? '<b class="dm-lv bot" aria-label="كمبيوتر">🤖</b>' : '';
  const won = g.phase !== 'play' && g.result && g.result.winner === p;
  let medal = '';
  if (g.phase === 'roundEnd' && g.result) {
    medal = won
      ? `<div class="dm-medal win"><i aria-hidden="true">👑</i><b>+${nf(g.result.points)}</b><small>فاز بالجولة</small></div>`
      : `<div class="dm-medal"><b>${nf(g.result.pips[p] ?? 0)}</b><small>نقاط بيده</small></div>`;
  }
  return `<div class="dm-seat ${turn ? 'turn' : ''} ${me ? 'me' : ''} ${g.out[p] ? 'out' : ''}" style="left:calc(${x}*var(--u));top:calc(${SEAT_Y}*var(--u))" data-seat="${p}" data-pid="${esc(id)}">
    <span class="dm-av"><span class="in">${face}</span>${turn ? clockEl(g) : ''}</span>
    <span class="dm-cnt" aria-label="${nf(g.counts[p])} قطع باليد"><i aria-hidden="true"></i><b>${nf(g.counts[p])}</b></span>
    ${lv}
    <span class="dm-nm">${esc(name)}${rp && !rp.bot && !rp.connected && !me ? ' <em class="off">⚠︎</em>' : ''}${g.out[p] ? ' <em>انسحب</em>' : ''}</span>
    <span class="dm-score" aria-label="النقاط ${nf(g.scores[p])} من ${nf(g.target)}"><b>${nf(g.scores[p])}</b>/${nf(g.target)}</span>
    ${medal}
  </div>`;
}

function hintOf(room, g, pi) {
  const turnName = nm(room, g.turnId);
  const mine = g.turnId === room.you;
  if (g.phase === 'final') return g.winner === room.you ? 'فزت بالمباراة! 🏆' : g.winner ? `فاز ${nm(room, g.winner)} بالمباراة` : 'انتهت المباراة بالتعادل';
  if (g.phase === 'roundEnd') {
    const r = g.result;
    if (!r || r.winner === null) return 'انسدّت اللعبة بالتعادل: جولة بدون نقاط';
    const me = g.players[r.winner] === room.you, w = me ? 'أنت' : nm(room, g.players[r.winner]);
    return r.kind === 'domino' ? `${w} ${me ? 'قفّلت' : 'قفّل'}! +${nf(r.points)}` : `انسدّت: ${me ? 'أنت فزت' : w + ' فاز'} بأقل نقاط +${nf(r.points)}`;
  }
  if (mine) {
    if (!g.first && g.opening) return `دورك: افتح بالدبل ${g.opening.replace('-', '|')}`;
    if (g.canDraw) return 'ما عندك قطعة تركب: اسحب من المخزن';
    if (DM.sel) return 'اختر الطرف اللي تبي تحط عليه';
    return 'دورك: اختر قطعة مضيئة';
  }
  if (g.last?.kind === 'draw' && g.players[g.last.by] === g.turnId) return `يجب على ${turnName} سحب قطعة`;
  return `دور ${turnName}…`;
}

export function domino(room) {
  const g = room.game;
  if (!sameContext(room)) {
    FEED.length = 0;
    Object.assign(DM, { room: room.code, gameNo: room.gameNo ?? 0, you: room.you, epoch: DM.epoch + 1, pending: null, sel: null, busy: false, gift: false, menu: false, rules: false, seen: '' });
  }
  const pi = g.players.indexOf(room.you);
  const mine = g.phase === 'play' && g.turnId === room.you;
  const playable = new Map();
  for (const m of g.moves || []) (playable.get(m.tile) ?? playable.set(m.tile, []).get(m.tile)).push(m.end);
  if (DM.sel && (!mine || !playable.has(DM.sel))) DM.sel = null;
  // المسار
  const lay = layout(g.first, g.left, g.right);
  const slots = [];
  if (mine && DM.sel) {
    const [a, b] = DM.sel.split('-').map(Number);
    for (const end of new Set(playable.get(DM.sel))) slots.push({ end, r: slotFor(lay, end, a === b) });
  }
  const BOX = { x: 36, y: 590, w: 849, h: 600 };
  const vp = viewport([...lay.tiles, ...slots.map((s) => s.r)], BOX.w / BOX.h);
  const fresh = g.last?.kind === 'play' ? g.nPlaced : -1;
  const tiles = lay.tiles.map((t) => {
    const id = `${Math.min(t.a, t.b)}-${Math.max(t.a, t.b)}`;
    return `<g class="dm-tile${t.n === fresh ? ' fresh' : ''}" data-tk="dm${id}" data-n="${t.n}"><g>${tileSvg(t.x, t.y, t.w, t.h, t.a, t.b)}</g></g>`;
  }).join('');
  const slotSvg = slots.map((s) => `<rect class="dm-slot" x="${s.r.x + .02}" y="${s.r.y + .02}" width="${s.r.w - .04}" height="${s.r.h - .04}" rx=".14" data-act="dm-slot" data-end="${s.end}" role="button" tabindex="0" aria-disabled="${DM.busy}" aria-label="ضع القطعة على ${s.end === 'L' ? 'الطرف الأيسر' : 'الطرف الأيمن'}"/>`).join('');
  const board = `<svg class="dm-board" viewBox="${vp.x.toFixed(3)} ${vp.y.toFixed(3)} ${vp.w.toFixed(3)} ${vp.h.toFixed(3)}" role="group" aria-label="مسار الدومينو: ${nf(lay.tiles.length)} قطعة${g.ends ? `، الطرفان ${g.ends.L} و${g.ends.R}` : ''}">${DEFS}<g class="dm-tiles">${tiles}</g>${slotSvg}</svg>`;
  // اليد
  const n = g.hand.length;
  const tw = Math.min(112, 840 / Math.max(n, 1)); // عرض زر القطعة (الفراغ المرئي داخل الرسم)
  const handHtml = g.hand.map((id) => {
    const can = mine && playable.has(id);
    const cls = can ? 'can' : 'off';
    return `<button type="button" class="dm-h ${cls}${DM.sel === id ? ' sel' : ''}" data-act="dm-tile" data-id="${esc(id)}" data-tk="dm${esc(id)}" style="width:calc(${tw.toFixed(1)}*var(--u))" aria-label="قطعة ${id.replace('-', ' و ')}${can ? '' : ' (ما تركب الحين)'}" ${DM.busy ? 'aria-disabled="true"' : ''}>${handTile(id, can ? '' : 'off')}</button>`;
  }).join('');
  // المقاعد
  const xs = SEAT_X[g.players.length] || SEAT_X[4];
  const seats = g.players.map((id, p) => seatHTML(room, g, id, p, xs[p])).join('');
  // نهاية الجولة: كشف القطع المتبقية
  let roundPanel = '';
  if (g.phase === 'roundEnd' && g.result) {
    const rows = g.players.map((id, p) => {
      const hand = g.result.hands[p] || [];
      const meRow = id === room.you, who = meRow ? 'أنت' : esc(nm(room, id));
      return `<li class="${g.result.winner === p ? 'w' : ''}"><b>${who}</b><span class="dm-rv">${hand.length ? hand.map((t) => `<svg viewBox="-.04 -.04 2.08 1.08" aria-label="${t[0]} و ${t[1]}">${DEFS}${tileSvg(0, 0, 2, 1, t[0], t[1])}</svg>`).join('') : `<em>${meRow ? 'خلّصت قطعك' : 'خلّص قطعه'}</em>`}</span><i>${nf(g.result.pips[p])}</i></li>`;
    }).join('');
    roundPanel = `<section class="dm-round" role="status" aria-label="نتيجة الجولة"><h3>نهاية الجولة ${nf(g.round)}</h3><p class="dm-rsum">${esc(hintOf(room, g, pi))}</p><ul>${rows}</ul><p>الجولة الجاية بعد ${clockEl(g)}<span class="dm-next">ثوانٍ</span></p></section>`;
  }
  let finalPanel = '';
  if (g.phase === 'final') {
    const isHost = room.hostId === room.you;
    const rows = g.players.map((id, p) => `<li class="${g.winner === id ? 'w' : ''}"><b>${id === room.you ? 'أنت' : esc(nm(room, id))}</b><i>${nf(g.scores[p])}</i></li>`).join('');
    finalPanel = `<section class="dm-final" role="dialog" aria-label="نهاية المباراة"><h3>${esc(hintOf(room, g, pi))}</h3><ul>${rows}</ul>
      ${isHost ? '<button class="btn block" data-act="rematch" type="button">جولة جديدة</button>' : '<p class="hint">ننتظر المضيف يبدأ جولة جديدة.</p>'}
      <button class="btn ghost block" data-act="leave" type="button">خروج من الغرفة</button></section>`;
  }
  const rulesRows = [
    ['🁣', 'بدورك اضغط قطعة مضيئة. لو تركب على طرف واحد تنحط مباشرة، ولو تركب على الطرفين تظهر لك خانتان خضراء تختار منها.'],
    ['📦', 'ما عندك قطعة تركب؟ اضغط المخزن واسحب قطعة قطعة. لو المخزن فاضي ينتقل دورك تلقائياً.'],
    ['6|6', 'أول جولة يفتحها صاحب أعلى دبل، والجولات بعدها يفتحها فائز الجولة السابقة بأي قطعة.'],
    ['🏁', 'اللي يخلّص قطعه ياخذ مجموع نقاط قطع خصومه. لو انسدت اللعبة يفوز صاحب أقل مجموع. أول من يوصل 50 يفوز.'],
    ['⏱', 'لو خلص وقتك يلعب الخادم عنك حركة قانونية، وثلاث مرات ورا بعض تعتبر انسحاب.'],
  ].map(([k, t]) => `<li><span class="rc"><b>${k}</b></span><span class="rt">${esc(t)}</span></li>`).join('');
  const rules = DM.rules ? `<div class="jk-rules-back" data-act="dm-rules"></div><section class="jk-rules" role="dialog" aria-label="كيف ألعب؟"><h2><span>كيف ألعب دومينو؟</span></h2><ul>${rulesRows}</ul><button type="button" class="jk-rx" data-act="dm-rules" aria-label="إغلاق">✕</button></section>` : '';
  const menu = DM.menu ? `<div class="bl2-menu-back" data-act="dm-menu"></div><nav class="dm-menu" aria-label="القائمة"><button type="button" data-act="dm-rules">📖 <span>القواعد</span></button><button type="button" data-act="fs-toggle">⛶ <span>الشاشة الكاملة</span></button><button type="button" data-act="sound">🔊 <span>الصوت</span></button><button type="button" class="out" data-act="leave">⏻ <span>خروج</span></button></nav>` : '';
  const hint = hintOf(room, g, pi);
  const drawBtn = `<button type="button" class="dm-stock ${g.canDraw ? 'can' : ''}" data-act="dm-draw" aria-label="المخزن: ${nf(g.stock)} قطعة${g.canDraw ? '، اضغط للسحب' : ''}" ${g.canDraw && !DM.busy ? '' : 'aria-disabled="true"'}>${CHEST}<b>${nf(g.stock)}</b></button>`;
  return `<div class="stack jk-screen v2 dm2${g.phase === 'roundEnd' ? ' rend' : ''}">
    <div class="bl2-stage dm-stage" data-dm-context="${DM.epoch}" style="--ver:${g.ver}">
      ${BG}
      <div class="dm-topbar"><button type="button" class="dm-ic" data-act="leave" aria-label="خروج من اللعبة">⏻</button><button type="button" class="dm-ic" data-act="fs-toggle" aria-label="الشاشة الكاملة">⛶</button><button type="button" class="dm-ic" data-act="dm-rules" aria-label="كيف ألعب؟">؟</button><span class="dm-round-chip">الجولة ${nf(g.round)} · الهدف ${nf(g.target)}</span></div>
      ${seats}
      <p class="dm-msg ${mine ? 'turn' : ''}" role="status" aria-live="polite">${esc(hint)}</p>
      ${drawBtn}
      <div class="dm-board-wrap" style="left:calc(${BOX.x}*var(--u));top:calc(${BOX.y}*var(--u));width:calc(${BOX.w}*var(--u));height:calc(${BOX.h}*var(--u))">${board}</div>
      <div class="dm-hand" aria-label="قطعك (${nf(n)})">${handHtml}</div>
      ${roundPanel}
      <section class="dm-social" aria-label="الدردشة"><div id="dmFeed" class="dm-feed">${feedHTML()}</div></section>
      <nav class="dm-bar" aria-label="أدوات">
        <button type="button" class="dm-ic sm" data-act="sound" aria-label="الصوت">🔊</button>
        <button type="button" class="dm-ic sm" data-act="jk-chat" aria-label="إيموجي">😊</button>
        <button type="button" class="dm-say" data-act="jk-chat">قل شيئاً…</button>
        <button type="button" class="dm-ic sm" data-act="dm-menu" aria-label="القائمة" aria-expanded="${DM.menu}">☰</button>
        <button type="button" class="dm-ic sm" data-act="dm-gift" aria-label="إرسال هدية">🎁</button>
      </nav>
      ${menu}
    </div>
    ${rules}${finalPanel}
  </div>`;
}

/* سجل الردود السريعة الأخير (من نظام الدردشة القائم، بدون كتابة حرة) */
const FEED = [];
export function feedPush(name, text, mine, code) {
  // ما نخمن غرفة حدث بدون نطاق، عشان رد قديم ما يدخل غرفة ثانية.
  if (!code || code !== DM.room) return false;
  FEED.push({ name: mine ? 'أنت' : name, text });
  while (FEED.length > 4) FEED.shift();
  const el = typeof document !== 'undefined' && document.getElementById('dmFeed');
  if (el) el.innerHTML = feedHTML();
  return true;
}
function feedHTML() {
  if (!FEED.length) return '<p class="dm-feed-empty">الردود السريعة تظهر هنا 💬</p>';
  return FEED.map((m) => `<p><b>${esc(m.name)}</b><span>${esc(m.text)}</span></p>`).join('');
}

const KEY_VIEWS = new WeakSet();
function bindSlotKeys(view) {
  if (KEY_VIEWS.has(view)) return;
  KEY_VIEWS.add(view);
  view.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const slot = e.target?.closest?.('.dm-slot[data-act="dm-slot"]');
    const stage = slot?.closest('.dm-stage[data-dm-context]');
    if (!slot || stage?.dataset.dmContext !== String(DM.epoch)) return;
    e.preventDefault();
    if (e.repeat || DM.busy || !DM.sel || slot.getAttribute('aria-disabled') === 'true') return;
    // SVG ما عنده تفعيل أزرار أصلي؛ يمر بنفس تفويض النقر وحارس الإرسال القائم.
    slot.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

/** حركة القطعة اللي لعبها خصم: تطلع من مقعده لمكانها (قطعتي أنا تتحرك من يدي عبر flip العام) */
export function afterRender(view, room) {
  const g = room.game;
  if (!g || !sameContext(room)) return;
  bindSlotKeys(view);
  const key = `${room.code}:${DM.gameNo}:${g.round}:${g.nPlaced}`;
  if (DM.seen === key) return;
  const prev = DM.seen; DM.seen = key;
  if (!prev || g.last?.kind !== 'play' || g.players[g.last.by] === room.you) return;
  if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el = view.querySelector(`.dm-tile[data-n="${g.nPlaced}"]`);
  const seat = view.querySelector(`.dm-seat[data-seat="${g.last.by}"] .dm-av`);
  if (!el || !seat) return;
  const a = seat.getBoundingClientRect(), b = el.getBoundingClientRect();
  const ctm = el.parentNode.getScreenCTM && el.parentNode.getScreenCTM();
  let dx = a.left + a.width / 2 - (b.left + b.width / 2), dy = a.top + a.height / 2 - (b.top + b.height / 2);
  if (ctm) { const inv = ctm.inverse(); const p0 = new DOMPoint(0, 0).matrixTransform(inv), p1 = new DOMPoint(dx, dy).matrixTransform(inv); dx = p1.x - p0.x; dy = p1.y - p0.y; }
  el.animate([{ transform: `translate(${dx}px,${dy}px) scale(.6)`, opacity: 0.4 }, { transform: 'translate(0,0) scale(1)', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.3,.7,.3,1)' });
}

/* خلفية: طاولة جوخ زرقاء مخضرة بسقف مائل وإطار مزخرف (تصميم أصلي، بدون أصول منسوخة) */
const BG = `<svg class="dm-bg" viewBox="0 0 921 2000" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs>
<radialGradient id="dmFelt" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#25b3a4"/><stop offset=".55" stop-color="#17908a"/><stop offset="1" stop-color="#0b5a5c"/></radialGradient>
<linearGradient id="dmWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a1d14"/><stop offset="1" stop-color="#1e0e0a"/></linearGradient>
<pattern id="dmOrn" width="44" height="44" patternUnits="userSpaceOnUse"><path d="M22 4L40 22L22 40L4 22Z" fill="none" stroke="#7fd6cb" stroke-width="2" opacity=".35"/><circle cx="22" cy="22" r="3" fill="#bfe9e3" opacity=".35"/></pattern>
<pattern id="dmFiber" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 6L6 0" stroke="#000" stroke-width=".6" opacity=".06"/></pattern></defs>
<rect width="921" height="2000" fill="url(#dmWood)"/>
<path d="M0 300L460 70L921 300V1440Q921 1470 891 1470H30Q0 1470 0 1440Z" fill="url(#dmFelt)"/>
<path d="M0 300L460 70L921 300V1440Q921 1470 891 1470H30Q0 1470 0 1440Z" fill="url(#dmFiber)"/>
<path d="M-10 262L460 32L931 262L931 312L460 82L-10 312Z" fill="#0b4c4d"/><path d="M-10 262L460 32L931 262L931 312L460 82L-10 312Z" fill="url(#dmOrn)"/>
<path d="M-10 312L460 82L931 312" fill="none" stroke="#d9b45a" stroke-width="3" opacity=".7"/>
<rect x="28" y="470" width="865" height="960" rx="34" fill="rgba(0,0,0,.06)" stroke="rgba(0,30,30,.55)" stroke-width="3" stroke-dasharray="14 10"/>
<g opacity=".09" fill="#002a2a"><text x="460" y="905" text-anchor="middle" font-size="120" font-weight="900" font-family="serif">دومينو</text><rect x="120" y="880" width="120" height="6" rx="3"/><rect x="681" y="880" width="120" height="6" rx="3"/></g>
</svg>`;
/* المخزن: صندوق خشبي أصلي */
const CHEST = `<svg viewBox="0 0 100 80" aria-hidden="true" focusable="false"><rect x="6" y="26" width="88" height="48" rx="8" fill="#a8622c" stroke="#5b2f12" stroke-width="3"/><path d="M6 34Q50 4 94 34V40H6Z" fill="#c97a3a" stroke="#5b2f12" stroke-width="3"/><rect x="6" y="38" width="88" height="7" fill="#e3b85a"/><rect x="6" y="60" width="88" height="6" fill="#e3b85a" opacity=".8"/><rect x="44" y="34" width="12" height="18" rx="3" fill="#f2cf6b" stroke="#7a4a12" stroke-width="2"/><g fill="#fff8e6" stroke="#7a4a12" stroke-width="1.5"><rect x="20" y="16" width="16" height="26" rx="3" transform="rotate(-12 28 29)"/><rect x="62" y="14" width="16" height="26" rx="3" transform="rotate(10 70 27)"/></g></svg>`;
