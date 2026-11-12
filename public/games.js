import { faceSvg, faceHtml, charOf } from './characters.js?v=shell-r6';
import { avatarArt } from './avatars.js?v=r107';
import { ldPlayMode, LD_MODES } from './hub.js?v=r108-r6';
import * as SFX from './sfx.js?v=r69zu-r6';
import { domino } from './domino.js?v=r107';
import { uno } from './uno.js?v=r107';
import { liars } from './liars.js?v=r107';
import { pool } from './pool.js?v=r107';
import { bowling } from './bowling.js?v=r107';
import { carrom } from './carrom.js?v=r107';
import { minaboli } from './minaboli-r47.js?v=r57';
/* واجهات الألعاب بالدور والتصويت. كل دالة تأخذ الغرفة وترجع HTML.
   الأزرار ترسل حركتها عبر data-a (JSON) والخادم هو اللي يتحقق منها. */
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const act = (a) => esc(JSON.stringify(a));
const nm = (room, id) => room.players.find((p) => p.id === id)?.name ?? 'لاعب غادر';
const isBot = (room, id) => !!room.players.find((p) => p.id === id)?.bot;
const label = (room, id) => esc(nm(room, id));
const timerEl = (txt = '--') => `<div class="timer" id="timer" role="timer" aria-label="الوقت المتبقي">${txt}</div>`;

function endCard(room) {
  const isHost = room.hostId === room.you;
  return `<section class="card form">
    ${isHost ? `<button class="btn block" data-act="rematch" type="button">جولة جديدة</button>` : `<p class="hint">ننتظر المضيف يبدأ جولة جديدة.</p>`}
    <div class="btn-row"><button class="btn ghost" data-act="leave" type="button">خروج من الغرفة</button></div>
  </section>`;
}
const leaveRow = `<div class="btn-row"><button class="btn ghost" data-act="leave" type="button">خروج من الغرفة</button></div>`;

/* ---------- شفرة الكلمات ---------- */
const TEAM = ['الأزرق', 'الأحمر'];
function codewords(room) {
  const g = room.game;
  const final = g.phase === 'final';
  const myTurn = !final && g.youTeam === g.turn;
  const canGuess = myTurn && g.phase === 'guess' && !g.youSpy;
  const canClue = myTurn && g.phase === 'clue' && g.youSpy;
  const canPass = canGuess && (g.history.at(-1)?.picks.length ?? 0) > 0;
  const cells = g.words
    .map((w, i) => {
      const k = g.key[i];
      const rev = g.revealed[i];
      const cls = ['cw-card', rev ? 'rev' : '', k !== null ? 'k' + k : '', !rev && k !== null ? 'peek' : ''].join(' ');
      return `<button class="${cls}" type="button" ${canGuess && !rev ? `data-act="play" data-a="${act({ type: 'guess', cell: i })}"` : 'disabled'}>${esc(w)}${k === 3 ? ' ☠️' : ''}</button>`;
    })
    .join('');
  const members = (t) => g.players.filter((p) => g.teams[p] === t).map((p) => `${label(room, p)}${g.spymasters[t] === p ? ' 🔑' : ''}`).join('، ');
  const teamBox = (t) => `<div class="team t${t} ${g.turn === t && !final ? 'on' : ''}"><b>الفريق ${TEAM[t]}</b><span class="left">${g.left[t]}</span><span class="small">${members(t)}</span></div>`;
  let status;
  if (final) {
    if (g.reason === 'abandoned') status = 'توقفت اللعبة لأن محد لعب.';
    else status = `فاز الفريق ${TEAM[g.winner]} 🏆${g.reason === 'assassin' ? ' (الفريق الثاني كشف الكلمة القاتلة)' : ''}`;
  } else if (g.phase === 'clue') status = canClue ? 'دورك يا قائد: أعطِ تلميح' : `ننتظر قائد الفريق ${TEAM[g.turn]} يعطي تلميح`;
  else status = canGuess ? `خمّنوا! باقي لك ${g.guessesLeft} محاولات` : `الفريق ${TEAM[g.turn]} يخمّن`;
  const role = g.youTeam === null ? '' : `<div class="role ${g.youSpy ? 'out' : 'in'}"><b>${g.youSpy ? `أنت قائد الفريق ${TEAM[g.youTeam]} 🔑` : `أنت في الفريق ${TEAM[g.youTeam]}`}</b><span>${g.youSpy ? 'أنت تشوف ألوان الكلمات. أعطِ تلميح من كلمة وحدة ورقم، وما تخمّن.' : 'خمّن من تلميح قائدكم. الكلمات السوداء ☠️ خسارة مباشرة.'}</span></div>`;
  const clue = g.clue ? `<div class="clue-box t${g.turn}"><span>التلميح</span><b>${esc(g.clue.word)}</b><span class="num">${g.clue.num}</span></div>` : '';
  const clueForm = canClue
    ? `<section class="card"><form class="form" data-form="gform" data-type="clue" data-nums="num"><div class="field"><label for="cw-word">التلميح (كلمة وحدة)</label>
        <input class="input" id="cw-word" name="word" maxlength="20" autocomplete="off" autocapitalize="off" spellcheck="false" required></div>
        <div class="field"><label for="cw-num">كم كلمة تقصد؟</label><select class="select" id="cw-num" name="num">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<option value="${n}" ${n === 2 ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <button class="btn block" type="submit">أرسل التلميح</button></form></section>`
    : '';
  const history = g.history.length
    ? `<section class="card"><h2 style="margin-bottom:12px">آخر التلميحات</h2><ul class="cw-hist">${[...g.history].reverse().map((h) => `<li class="t${h.team}"><b>${esc(h.clue)}</b> ${h.num} <span class="small muted">${h.picks.map((p) => (p.kind === h.team ? '✅' : p.kind === 3 ? '☠️' : p.kind === 2 ? '⬜' : '❌')).join(' ')}</span></li>`).join('')}</ul></section>`
    : '';
  return `<div class="stack cw-screen">
    <section class="card"><div class="teams">${teamBox(0)}${teamBox(1)}</div>${final ? '' : `<div class="game-top two" style="margin-top:12px"><span class="muted small">باقي كلمات كل فريق</span>${timerEl()}</div>`}</section>
    ${role ? `<section class="card">${role}</section>` : ''}
    <div class="notice ${final ? 'big' : ''}" role="status">${esc(status)}</div>
    ${clue}
    <section class="card board-card"><div class="cw">${cells}</div>
      ${canGuess ? `<button class="btn ghost block" style="margin-top:14px" type="button" ${canPass ? `data-act="play" data-a="${act({ type: 'pass' })}"` : 'disabled title="خمّن كلمة وحدة على الأقل"'}>انهاء الدور</button>` : ''}</section>
    ${clueForm}${history}
    ${final ? endCard(room) : leaveRow}
  </div>`;
}


/* أيقونات مشتركة لواجهات الشاشة الكاملة (جاكارو/بلوت) */
const jkIC = () => ({
    chat: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 7a3 3 0 0 1 3-3h16a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H15l-6 5v-5H8a3 3 0 0 1-3-3z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="11" cy="13" r="1.6" fill="currentColor"/><circle cx="16" cy="13" r="1.6" fill="currentColor"/><circle cx="21" cy="13" r="1.6" fill="currentColor"/></svg>',
    smile: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="13" r="1.8" fill="currentColor"/><circle cx="20" cy="13" r="1.8" fill="currentColor"/><path d="M9.5 18.5c1.6 3.6 11.4 3.6 13 0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    spk: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 12h5l7-6v20l-7-6H5z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>${SFX.isOn() ? '<path d="M21 11a7 7 0 0 1 0 10M24 7.5a12 12 0 0 1 0 17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' : '<path d="M22 12l7 8M29 12l-7 8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'}</svg>`,
    menuSpk: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 12h5l7-6v20l-7-6H5z" fill="currentColor"/><path d="M21 11a7 7 0 0 1 0 10M24 7.5a12 12 0 0 1 0 17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    rules: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="6" y="3" width="20" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M11 10h10M11 15h10M11 20h6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    full: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 12V5h7M20 5h7v7M27 20v7h-7M12 27H5v-7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    out: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M13 5H6v22h7M12 16h15M21 10l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
});
/* ---------- جاكارو ---------- */
const introSeen = new Set();
function introOnce(id) {
  if (introSeen.has(id)) return;
  introSeen.add(id);
  try { if (localStorage.getItem('qa_intro_' + id)) return; localStorage.setItem('qa_intro_' + id, '1'); } catch { /* بدون تخزين: يظهر مرة بالجلسة */ }
  JK.rules = true; JK.menu = false;
}
export const JK = { ver: -1, card: null, marble: null, menu: false, rules: false, guide: false, modeInfo: false };
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const SEAT_COLORS = ['#3fbf6f', '#f2b632', '#e8505b', '#4a90e2'];
const SEAT_NAMES = ['الأخضر', 'الأصفر', 'الأحمر', 'الأزرق'];
const AVS = ['🦁', '🐯', '🦊', '🐼', '🐸', '🦄', '🐙', '🐧', '🦅', '🐪', '🐬', '🦋'];
const hashId = (id) => [...String(id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const RING = 76;
const RANK = (r) => ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' })[r] ?? String(r);
const RANK_HELP = {
  1: 'A: تطلّع كرة من البيت، أو تمشي كرة 1 أو 11.',
  13: 'K: تطلّع كرة من البيت.',
  11: 'J: بدّل كرتك بأي كرة ثانية على اللوحة (حتى كرة شريكك).',
  4: '4: كرة من كراتك ترجع 4 خانات.',
  5: '5: حرّك أي كرة على اللوحة 5 خانات (لك، لشريكك، أو لخصم).',
  7: '7: امشِ كرة 7 خانات، أو قسّمها على كرتين (مثلاً 3 و4).',
  12: 'Q: تمشي كرة 12 خانة.',
};
const MB = (c = '#9b6a45') => `<svg class="mi" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.6" fill="${c}" stroke="#4a2c18" stroke-width="1.3"/><ellipse cx="7.5" cy="7" rx="2.4" ry="1.5" fill="#fff" opacity=".55"/></svg>`;
function cardFx(rank) {
  if (rank === 4) return { big: '\u200E−4', neg: true, icon: '' };
  if (rank === 5) return { big: '5', icon: ['#1e8fe0', '#3dbb3d', '#f0a52c', '#e5261e'].map((c) => `<i class="cdot" style="background:${c}"></i>`).join('') };
  if (rank === 7) return { big: '7', sub: '\u200E●+●=', icon: '' };
  if (rank === 11) return { big: '⇄', sub: 'بدّل كرتين', icon: '' };
  if (rank === 1) return { big: '1 · 11', sub: 'أو طلّع', icon: '' };
  if (rank === 13) return { big: 'طلّع', sub: 'من البيت', icon: '' };
  return { big: String(rank), icon: '' };
}
const SUITS = ['♠', '♥', '♣', '♦'];
const mk = (o, m) => `${o}:${m}`;
/* هندسة لوحة جاكارو (مأخوذة من لقطة المرجع): ملف صليب بأربع «خلجان» وأقطار مائلة 45°.
   الإحداثيات بوحدات اللوحة (عرضها 1000). 19 خانة لكل ربع (76 بالمجموع مثل المحرّك). مقعد 0 فوق، ثم يمين، تحت، يسار. */
const QT = 19, C_COL = 5, C_DIAG = 4, DK = 0.735; // خانات الربع (19) وعمود 5 وقطر 4؛ DK = خطوة القطر ÷ المسافة (مقيسة من الصورة الأصلية)
const T0 = 443, P0 = T0 / (2 + C_COL + (C_DIAG + 1) * DK); // نصف قطر الأذرع، والمسافة بين الخانات
const rotQ = (x, y, q) => { for (let i = 0; i < q; i++) [x, y] = [-y, x]; return [x, y]; };
const Q0 = (() => {
  const p = P0, d = p * DK, pts = [[2 * p, -T0]];
  for (let k = 1; k <= C_COL; k++) pts.push([2 * p, -T0 + k * p]);
  for (let k = 1; k <= C_DIAG; k++) pts.push([2 * p + k * d, -T0 + C_COL * p + k * d]);
  const x0 = 2 * p + (C_DIAG + 1) * d;
  for (let k = 0; k <= 5; k++) pts.push([x0 + k * p, -2 * p]);
  pts.push([T0, -p], [T0, 0], [T0, p]);
  return pts;
})();
const RING_PTS = Array.from({ length: RING }, (_, i) => rotQ(...Q0[i % QT], Math.floor(i / QT)));
const ringPos = (abs) => RING_PTS[((abs % RING) + RING) % RING];
const HOME0 = [217, -308];
const BASE_OFF = [[0, -39], [39, 0], [0, 39], [-39, 0]];
const homeCenter = (seat) => rotQ(HOME0[0], HOME0[1], seat);
const JKC = ['#e0322a', '#f2c12e', '#2fae4a', '#2a74e6']; // مقعد 0 (أنت بالأسفل): أحمر ← برتقالي (يسار) ← أخضر (فوق) ← أزرق (يمين)، مثل المرجع
const JKC_D = ['#7a120d', '#9a6f08', '#0f5a24', '#103a8a'];
function posOf(g, pi, prog, m) {
  const seat = g.seats[pi];
  if (prog >= 0 && prog < RING) return ringPos((seat * QT + prog) % RING);
  if (prog >= RING) { const k = prog - RING + 1; return rotQ(0, -T0 + k * P0, seat); }
  const [cx, cy] = homeCenter(seat);
  return [cx + BASE_OFF[m % 4][0], cy + BASE_OFF[m % 4][1]];
}
const LAST_KIND = { enter: 'طلّع كرة', move: 'حرّك كرة', back: 'رجّع كرة', swap: 'بدّل كرتين', discard: 'تخلّص من ورقة', timeout: 'فاته دوره', fold: 'رمى أوراقه (كل كراته بالبيت)' };

function jackaro(room) {
  introOnce('jackaro');
  const g = room.game;
  if (JK.ver !== g.ver) {
    JK.ver = g.ver;
    JK.card = null;
    JK.marble = null;
  }
  const pi = g.players.indexOf(room.you);
  const myTurn = g.turnId === room.you && g.phase === 'playing';
  const moves = g.moves;
  if (myTurn && g.split) JK.card = -1; // الجزء الثاني من السبعة: ما فيه اختيار ورقة
  const seenEnter = new Set(); // كرات البيت كلها متشابهة: نعرض حركة طلوع وحدة بس
  const cardMoves = JK.card === null ? [] : moves.filter((m) => {
    if (m.card !== JK.card) return false;
    if (m.kind !== 'enter') return true;
    const k = `${m.owner}`;
    if (seenEnter.has(k)) return false;
    seenEnter.add(k);
    return true;
  });
  const movable = new Set(cardMoves.map((m) => mk(m.owner, m.marble)));
  if (myTurn && JK.card !== null && JK.marble === null && movable.size === 1) JK.marble = [...movable][0]; // كرة وحدة بس: اختيار تلقائي
  const dests = JK.marble === null ? [] : moves.map((m, i) => ({ m, i })).filter(({ m }) => m.card === JK.card && mk(m.owner, m.marble) === JK.marble);
  const shift = pi >= 0 ? (2 - g.seats[pi] + 4) % 4 : 0; // مقعدك دايماً تحت يسار مثل جاكارو كينج
  const rot = shift * 90;
  const myTeam = g.teams[pi];
  const teamName = (t) => (g.players.length === 4 ? (t === myTeam ? 'فريقك' : 'الفريق الثاني') : '');
  // ---- لوحة خشب (مطابقة للمرجع): إطار ذهبي/أخضر بفصوص، خشب رماد بعروق، حفر بنية، بيوت بأربع فصوص ----
  const SC = [0, 1, 2, 3].map((sx) => JKC[(sx + shift + 2) % 4]); // اللون حسب مكانك على الشاشة
  const SD = [0, 1, 2, 3].map((sx) => JKC_D[(sx + shift + 2) % 4]);
  const oct = (R, a0 = 22.5) => [0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = ((a0 + i * 45) * Math.PI) / 180; return `${(Math.cos(a) * R).toFixed(1)},${(Math.sin(a) * R).toFixed(1)}`; }).join(' ');
  const defs = `<defs>
    <radialGradient id="jxHole" cx=".5" cy=".36" r=".78"><stop offset="0" stop-color="#34200f"/><stop offset=".7" stop-color="#170d06"/><stop offset="1" stop-color="#0d0704"/></radialGradient>
    <radialGradient id="jxVig" cx=".4" cy=".3" r=".85"><stop offset="0" stop-color="#ffe9c4" stop-opacity=".2"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>
    <linearGradient id="jxEdge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c8925a"/><stop offset=".45" stop-color="#7d4b25"/><stop offset="1" stop-color="#2f1a0d"/></linearGradient>
    <linearGradient id="jxOct" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a34"/><stop offset="1" stop-color="#4a2c17"/></linearGradient>
    <filter id="jxBlur" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="24"/></filter>
    <filter id="jkSh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#000" flood-opacity=".5"/></filter>
    <clipPath id="jxClip"><circle r="498"/></clipPath>
    ${SC.map((c, i) => `<radialGradient id="jkM${i}" cx=".35" cy=".28" r=".85"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".16" stop-color="${c}"/><stop offset=".78" stop-color="${SD[i]}"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>`).join('')}
  </defs>`;
  // طاولة دائرية بنية: ظل، حافة مشطوفة، خشب مغمّق بعروقه، تظليل أطراف، وحافة منقّطة
  let deco = `<circle r="506" cy="34" fill="#000" opacity=".62" filter="url(#jxBlur)"/><circle r="512" fill="url(#jxEdge)"/><circle r="505" fill="none" stroke="#f1cf9d" stroke-opacity=".35" stroke-width="2"/>`;
  deco += `<circle r="498" fill="#8a5a34"/><image href="jk-wood.jpg" x="-520" y="-520" width="1040" height="1040" preserveAspectRatio="none" clip-path="url(#jxClip)"/><circle r="498" fill="#69391a" opacity=".6"/><circle r="498" fill="url(#jxVig)"/>`;
  for (const r of [120, 190, 280, 370, 445]) deco += `<circle r="${r}" fill="none" stroke="#2b1608" stroke-opacity=".13" stroke-width="2.2"/>`;
  deco += `<circle r="476" fill="none" stroke="#f6dcae" stroke-opacity=".8" stroke-width="5.5" stroke-linecap="round" stroke-dasharray="0.1 19.6"/><circle r="498" fill="none" stroke="#2a1608" stroke-opacity=".55" stroke-width="3"/>`;
  // قاعدة الأوراق في الوسط: ثمانية متعددة الطبقات
  deco += `<polygon points="${oct(176)}" fill="#2a170a" opacity=".55" transform="translate(0 7)"/><polygon points="${oct(172)}" fill="url(#jxOct)" stroke="#2a170a" stroke-width="3"/><polygon points="${oct(158)}" fill="none" stroke="#e4b784" stroke-opacity=".35" stroke-width="2"/><polygon points="${oct(144)}" fill="#35200f" stroke="#1d1007" stroke-width="3"/><polygon points="${oct(144)}" fill="url(#jxVig)" opacity=".7"/>`;
  const hole = (x, y, r = 17.5) => `<circle cx="${x.toFixed(1)}" cy="${(y + 1.8).toFixed(1)}" r="${r}" fill="#f3d6a6" fill-opacity=".3"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="url(#jxHole)"/><ellipse cx="${x.toFixed(1)}" cy="${(y - r * 0.45).toFixed(1)}" rx="${(r * 0.62).toFixed(1)}" ry="${(r * 0.3).toFixed(1)}" fill="#000" opacity=".28"/>`;
  const laneHole = (x, y, col, dark, r = 17.5) => `<circle cx="${x.toFixed(1)}" cy="${(y + 1.8).toFixed(1)}" r="${r + 1}" fill="#f3d6a6" fill-opacity=".25"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${dark}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="url(#jxHole)" opacity=".45"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="none" stroke="${col}" stroke-opacity=".75" stroke-width="2.4"/>`;
  const startCell = (x, y, col) => `${hole(x, y)}<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="23" fill="none" stroke="${col}" stroke-width="4.2"/>`;
  let cells = '';
  for (let i = 0; i < RING; i++) {
    const [x, y] = ringPos(i);
    const seat = [0, 1, 2, 3].find((sx) => sx * QT === i);
    cells += `<g class="jk-cell${seat !== undefined ? ' start' : ''}">${seat !== undefined ? startCell(x, y, SC[seat]) : hole(x, y)}</g>`;
  }
  g.players.forEach((id, p) => {
    const sx = g.seats[p];
    for (let k = 1; k <= 4; k++) { const [x, y] = posOf(g, p, RING - 1 + k, 0); cells += `<g class="jk-lane">${laneHole(x, y, SC[sx], SD[sx])}</g>`; }
  });
    // الورقة الأخيرة وسط اللوحة: كومة أوراق مقلوبة + الورقة الأخيرة بالنسبة والرقم الكبير
  const lastRank = g.last && g.last.rank ? RANK(g.last.rank) : null;
  const fxL = g.last && g.last.rank ? cardFx(g.last.rank) : null;
  const lastP = g.last ? g.last.by : -1;
  const AVPOS = [[390, -520], [390, 470], [-390, 470], [-390, -520]];
  const lastCorner = lastP === pi ? [0, 600] : lastP >= 0 ? AVPOS[(g.seats[lastP] + shift) % 4] : [0, 0];
  const pile = [[-9, 0, 0], [6, -4, 5], [-4, 3, -4]].map(([r, dx, dy]) => `<g transform="translate(${dx} ${dy}) rotate(${r})"><rect x="-62" y="-86" width="124" height="172" rx="14" fill="#ececec" stroke="#b9b9bd" stroke-width="2"/></g>`).join('');
  const center = `<g aria-hidden="true" transform="scale(.92)">${pile}${fxL ? `<g class="jk-lastcard" style="--fx:${lastCorner[0]}px;--fy:${lastCorner[1]}px"><g transform="rotate(${-28 + (g.ver % 5) * 11})"><rect x="-64" y="-90" width="128" height="180" rx="14" fill="#f3f3f4" stroke="#aaa" stroke-width="2.5" filter="url(#jkSh)"/><text x="-42" y="-48" font-size="30" font-weight="800" fill="${fxL.red ? '#b72f3d' : '#1c1c24'}" font-family="IBM Plex Sans Arabic, sans-serif">${lastRank}</text><text y="${fxL.sub ? 20 : 34}" text-anchor="middle" font-size="${fxL.big.length > 3 ? 40 : 86}" font-weight="900" fill="${fxL.neg ? '#a8232f' : '#1c1c24'}" font-family="Lalezar, IBM Plex Sans Arabic, sans-serif">${fxL.big}</text>${fxL.sub ? `<text y="62" text-anchor="middle" font-size="19" font-weight="700" fill="#44444e" font-family="IBM Plex Sans Arabic, sans-serif">${fxL.sub}</text>` : ''}</g></g>` : ''}</g>`;
  // الكرات
  let marbles = '';
  g.players.forEach((id, p) => {
    g.marbles[p].forEach((prog, m) => {
      const [x, y] = posOf(g, p, prog, m);
      const can = myTurn && JK.card !== null && movable.has(mk(p, m));
      const sel = JK.marble === mk(p, m);
      const mine = g.teams[p] === myTeam;
      const cx = x.toFixed(1), cy = y.toFixed(1);
      marbles += `<g class="jk-mg" data-tk="m${p}:${m}" data-x="${cx}" data-y="${cy}"><ellipse cx="${cx}" cy="${(y + 15).toFixed(1)}" rx="14" ry="5" fill="#000" opacity=".42"/><circle class="jk-marble ${can ? 'can' : ''} ${sel ? 'sel' : ''} ${mine ? '' : 'foe'}" cx="${cx}" cy="${cy}" r="18" fill="url(#jkM${g.seats[p]})" ${can ? `data-act="jk-marble" data-m="${p}:${m}" role="button" tabindex="0" aria-label="كرة ${esc(nm(room, id))} رقم ${m + 1}"` : ''}/><ellipse cx="${(x - 5.5).toFixed(1)}" cy="${(y - 8).toFixed(1)}" rx="7.5" ry="4.4" fill="#fff" opacity=".7" pointer-events="none"/><ellipse cx="${(x + 4).toFixed(1)}" cy="${(y + 9).toFixed(1)}" rx="8" ry="3" fill="#fff" opacity=".16" pointer-events="none"/></g>`;
      if (!can && myTurn && JK.card !== null && p === pi && g.marbles[p][m] !== undefined) marbles += `<circle class="jk-hit" cx="${cx}" cy="${cy}" r="30" data-act="jk-nomarble" data-m="${p}:${m}"/>`;
      if (can) marbles += `<circle class="jk-halo" cx="${cx}" cy="${cy}" r="28"/>`;
      if (can) marbles += `<circle class="jk-hit" cx="${cx}" cy="${cy}" r="34" data-act="jk-marble" data-m="${p}:${m}"/>`;
    });
  });
  let hot = '';
  for (const { m, i } of dests) {
    let x, y;
    if (m.kind === 'swap') [x, y] = posOf(g, m.target.owner, g.marbles[m.target.owner][m.target.marble], m.target.marble);
    else [x, y] = posOf(g, m.owner, m.to, m.marble);
    hot += `<circle class="jk-dest" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="23" data-act="jk-dest" data-i="${i}" role="button" tabindex="0" aria-label="وجهة${m.split ? ' (جزء من سبعة)' : ''}"/><circle class="jk-hit" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="36" data-act="jk-dest" data-i="${i}"/>`;
  }
// اللاعبون حول الطاولة: الشريك فوق، اليسار/اليمين، وأنت أسفل اليسار (مثل المرجع). النسب من لوحة التصميم 660×1434
  const AVC = [[50, 14.4], [89.2, 26], [10.2, 64.4], [10.8, 26]]; // k0 فوق، k1 يمين، k2 أنت، k3 يسار
  let seats = '';
  g.players.forEach((id, p) => {
    const sx = g.seats[p];
    const k = (sx + shift) % 4;
    const col = SC[sx];
    const turn = g.turnId === id && g.phase === 'playing' && g.endsAt > 0;
    const raw = nm(room, id).replace(/^🤖\s*/, '');
    const shown = raw.length > 11 ? raw.slice(0, 10) + '…' : raw;
    const rp = room.players.find((x) => x.id === id);
    const online = rp ? rp.connected !== false : true;
    const clock = turn ? `<span class="jx-clock" role="timer" data-ends="${g.endsAt}" data-total="${g.turnMs ?? ''}" data-phase="ok" aria-label="الوقت المتبقي"><svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle class="jx-ring-bg" cx="50" cy="50" r="46"/><circle class="jx-ring-fg" cx="50" cy="50" r="46" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0" transform="rotate(-90 50 50)"/></svg><b class="jx-sec"></b></span>` : '';
    // الصورة المرفوعة من الخادم لأي لاعب بالغرفة (رقم النسخة بالرابط)؛ الأفاتار الافتراضي تحتها احتياط لو فشل التحميل
    const face = faceHtml(sx, 96) + (rp?.av ? `<span class="jx-photo jx-pa">${avatarArt(rp.av, 96)}</span>` : rp?.avatar ? `<img class="jx-photo" src="/api/room-avatar?code=${room.code}&id=${encodeURIComponent(id)}&v=${rp.avatar}" alt="" decoding="async">` : '');
    seats += `<div class="jx-seat k${k} ${turn ? 'turn' : ''} ${g.out[p] ? 'out' : ''}" style="left:${AVC[k][0]}%;top:${AVC[k][1]}%;--c:${col}" data-seat="${p}">
      <span class="jx-pill"><i class="jx-dot"></i><b>${esc(shown)}</b></span>
      <span class="jx-av" ${id === room.you ? 'data-self="1"' : ''}>${face}</span>${clock}
      <i class="jx-conn ${online ? 'on' : ''}" title="${online ? 'متصل' : 'غير متصل'}"></i>${g.players.length === 4 ? `<span class="jx-team ${g.teams[p] === 0 ? 'b' : 'a'}">${g.teams[p] === 0 ? 'B' : 'A'}</span>` : ''}
      <span class="jx-cnt" title="أوراقه"><i></i>${g.handCounts[p]}</span>
    </div>`;
  });
    const only = myTurn && JK.card !== null && dests.length === 1 ? dests[0].i : cardMoves.length === 1 && myTurn ? moves.indexOf(cardMoves[0]) : -1;
  const table = only >= 0 ? `<circle class="jk-table-hit" r="96" data-act="jk-dest" data-i="${only}"/>` : '';
  const svg = `<div class="jk-boardwrap"><svg class="jk-bg" viewBox="-500 -560 1000 1120" aria-hidden="true" focusable="false">${defs}<g transform="rotate(${rot})">${deco}</g><g transform="rotate(${rot})">${cells}</g></svg><svg class="jk-board" viewBox="-500 -560 1000 1120" role="img" aria-label="لوحة جاكارو">${defs}${table}<g>${center}</g><g class="fx-layer" transform="rotate(${rot})">${marbles}${hot}</g></svg></div>${seats}`;

  // الأوراق
  const handN = g.hand.length, handStep = handN > 1 ? Math.min(106, 480 / (handN - 1)) : 0, handX = (660 - (129 + (handN - 1) * handStep)) / 2;
  const handHtml = g.hand
    .map((rank, i) => {
      const playable = moves.some((m) => m.card === i);
      const can = myTurn && !g.split && (playable || g.canDiscard);
      const sel = JK.card === i;
      const suit = SUITS[(rank * 3 + i) % 4];
      const red = suit === '♥' || suit === '♦';
      const r = RANK(rank);
      const fx = cardFx(rank);
      return `<button style="--i:${i};--n:${g.hand.length};left:calc(${(handX + i * handStep).toFixed(1)}*var(--u))" class="jk-card r${rank} ${red ? 'red' : ''} ${sel ? 'sel' : ''} ${myTurn && !playable && !g.canDiscard ? 'dim' : ''} ${g.canDiscard ? 'discard' : ''}" type="button" ${can ? `data-act="jk-card" data-i="${i}"` : (myTurn && !g.split ? `data-act="jk-nocard" data-i="${i}" aria-disabled="true"` : 'disabled')} aria-label="ورقة ${r}">
        <i class="c-tl"><b>${r}</b><em>${suit}</em></i><span class="c-ic">${fx.icon}</span><strong class="c-big ${fx.neg ? 'neg' : ''} ${fx.big.length > 3 ? 'sm' : ''}">${fx.big}</strong>${fx.sub ? `<small class="c-sub">${fx.sub}</small>` : ''}</button>`;
    })
    .join('');
  const ctlSelf = g.ctl === pi;
  const who = ctlSelf ? '' : ' (بكرات شريكك)';
  const rankSel = JK.card !== null && JK.card >= 0 ? g.hand[JK.card] : null;
  let hint;
  if (g.phase === 'final') hint = g.winners.includes(room.you) ? 'فزتم! 🏆' : `فاز ${g.winners.map((id) => nm(room, id)).join(' و')}`;
  else if (!myTurn) hint = `دور ${nm(room, g.turnId)}…`;
  else if (g.split) hint = `كمّل السبعة: حرّك كرة ثانية ${g.split.left} خانات.`;
  else if (g.canDiscard) hint = 'ما عندك أي حركة ممكنة: اضغط ورقة وتخلّص منها.';
  else if (JK.card === null) hint = ctlSelf ? 'دورك: اختر ورقة.' : 'كراتك وصلت كلها! اختر ورقة وتلعب بكرات شريكك.';
  else if (only >= 0) hint = 'اضغط «ضع الورقة على الطاولة» 👇';
  else if (JK.marble === null) hint = `اختر كرة من الكرات المضيئة${who}.`;
  else hint = 'اضغط الوجهة المضيئة أو اختر حركة من القائمة 👇';
  const KIND_TXT = { enter: 'طلّع كرة من البيت', move: 'حرّك', back: 'رجّع', swap: 'بدّل مع' };
  const mvLabel = (m) => {
    const col = `<i class="jk-dot sm" style="background:${JKC[g.seats[m.owner]]}"></i>`;
    if (m.kind === 'swap') return `${col}بدّل مع كرة ${esc(nm(room, g.players[m.target.owner]))}`;
    if (m.kind === 'enter') return `${col}طلّع كرة من البيت${m.captures?.length ? ' وكسر كرة' : ''}`;
    const st = m.steps ?? '';
    return `${col}${m.kind === 'back' ? 'رجّع' : 'حرّك'} كرة ${m.owner === pi ? 'لك' : esc(nm(room, g.players[m.owner]))} ${st} خانات${m.captures?.length ? ' وكسر كرة' : ''}`;
  };
  let movesHtml = '';
  if (myTurn && JK.card !== null && cardMoves.length) {
    const act = (m, big) => `<button type="button" class="${big ? 'btn jk-put' : 'jk-mv'}" data-act="jk-dest" data-i="${moves.indexOf(m)}">${big ? '🃏 ضع الورقة على الطاولة' : mvLabel(m)}</button>`;
    movesHtml = cardMoves.length === 1 ? act(cardMoves[0], true) : `<div class="jk-moves">${cardMoves.map((m) => act(m, false)).join('')}</div>`;
  }
  const lastBy = g.last ? g.players[g.last.by] : null;
  const last = g.last ? `${nm(room, lastBy)}: ${g.last.rank ? RANK(g.last.rank) + ' · ' : ''}${LAST_KIND[g.last.kind] ?? ''}${g.last.captured ? ` وكسر ${g.last.captured}` : ''}` : '';
  const players = g.players
    .map((id, p) => `<div class="duel-p ${g.turnId === id && g.phase === 'playing' ? 'on' : ''} ${g.out[p] ? 'out' : ''}"><i class="jk-dot" style="background:${JKC[g.seats[p]]}" title="${SEAT_NAMES[g.seats[p]]}"></i><b>${label(room, id)}${id === room.you ? ' (أنت)' : ''}</b><span class="small muted">${teamName(g.teams[p]) ? esc(teamName(g.teams[p])) + ' · ' : ''}🏁 ${g.home[p]}/4 · 🃏 ${g.handCounts[p]}</span></div>`)
    .join('');
  const legend = Object.entries(RANK_HELP).map(([r, t]) => `<li><b>${RANK(Number(r))}</b><span>${esc(t.replace(/^[^:]+:\s*/, ''))}</span></li>`).join('');
  const IC = jkIC();
  const rulesRows = Object.entries(RANK_HELP).map(([r, t]) => `<li><span class="rc"><b>${RANK(Number(r))}</b><em>♣</em></span><span class="rt">${esc(t.replace(/^[^:]+:\s*/, ''))}</span></li>`).join('') + `<li><span class="rc"><b>2·3·6·8·9·10</b><em>♣</em></span><span class="rt">تمشي كرة بعدد الخانات اللي على الورقة (حتى كرة شريكك لو كراتك كلها وصلت).</span></li>`;
  const noCards = myTurn && g.canDiscard;
  return `<div class="stack jk-screen v2 jx">
    <div class="jk-stage" style="--ver:${g.ver}">
      ${svg}
      <button type="button" class="jk-menu-btn" data-act="jk-menu" aria-label="القائمة" aria-expanded="${JK.menu}"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 9h22M5 16h22M5 23h22" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg></button>
      ${JK.menu ? `<div class="jk-menu-back" data-act="jk-menu"></div><nav class="jk-menu" aria-label="القائمة"><button type="button" data-act="sound">${IC.menuSpk}<span>${SFX.isOn() ? 'صوت' : 'صوت (مكتوم)'}</span></button><button type="button" data-act="jk-help">${IC.rules}<span>القواعد</span></button><button type="button" data-act="fs-toggle">${IC.full}<span>الشاشة الكاملة</span></button><button type="button" class="out" data-act="jk-leave">${IC.out}<span>خروج</span></button></nav>` : ''}
      <section class="jk-dock" aria-label="أوراقك">
        ${noCards ? '<p class="jk-nocards" role="status">لا توجد بطاقات متاحة<small>اضغط ورقة للتخلص منها</small></p>' : ''}
        <div class="jk-bar"><div class="notice ${g.phase === 'final' ? 'big' : myTurn ? 'turn' : ''}" role="status">${esc(hint)}</div></div>
        ${movesHtml}
        <div class="jk-hand ${noCards ? 'nomoves' : ''} ${myTurn ? 'mine' : ''}">${handHtml || '<p class="hint">ما عندك أوراق.</p>'}</div>
        ${rankSel && RANK_HELP[rankSel] ? `<p class="jk-help">${esc(RANK_HELP[rankSel])}</p>` : ''}
      </section>
      <nav class="jk-bb" aria-label="أدوات">
        <button type="button" data-act="jk-menu" aria-label="القائمة">${IC.out}</button>
        <button type="button" data-act="sound" aria-label="الصوت">${IC.spk}</button>
        <button type="button" class="say" data-act="jk-chat" aria-label="ردود سريعة">${IC.chat}<span>ردود سريعة</span></button>
        <button type="button" data-act="jk-chat" aria-label="تعبيرات">${IC.smile}</button>
        <button type="button" class="howto" data-act="jk-help" aria-label="كيف ألعب؟">؟</button>
      </nav>
    </div>
    ${JK.rules ? `<div class="jk-rules-back" data-act="jk-help"></div><section class="jk-rules" role="dialog" aria-label="كيف ألعب؟"><h2><span>كيف ألعب؟</span></h2><p class="rn steps"><b>دورك:</b> 1) اختر ورقة من يدك. 2) اضغط الكرة المضيئة اللي تبي تحركها. 3) اضغط الوجهة المضيئة (أو زر «ضع الورقة»). ورقة معتمة = ما لها حركة قانونية الحين، اضغطها وبنقولك ليش.</p><ul>${rulesRows}</ul><p class="rn">الدايرة الصغيرة على الأفاتار = كم كرة وصلت للنهاية. A و B = الفريقين.</p><button type="button" class="jk-rx" data-act="jk-help" aria-label="إغلاق">✕</button></section>` : ''}
    ${g.phase === 'final' ? endCard(room) : ''}
  </div>`;
}


/* ---------- لودو ---------- */
const LUDO_PATH = [[1,6],[2,6],[3,6],[4,6],[5,6],[6,5],[6,4],[6,3],[6,2],[6,1],[6,0],[7,0],[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[14,7],[14,8],[13,8],[12,8],[11,8],[10,8],[9,8],[8,9],[8,10],[8,11],[8,12],[8,13],[8,14],[7,14],[6,14],[6,13],[6,12],[6,11],[6,10],[6,9],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],[0,7],[0,6]];
const LUDO_LANE = [[[1,7],[2,7],[3,7],[4,7],[5,7]], [[7,1],[7,2],[7,3],[7,4],[7,5]], [[13,7],[12,7],[11,7],[10,7],[9,7]], [[7,13],[7,12],[7,11],[7,10],[7,9]]];
const LUDO_YARD = [[3, 3], [12, 3], [12, 12], [3, 12]];
const LUDO_FIN = [[6.4, 7.5], [7.5, 6.4], [8.6, 7.5], [7.5, 8.6]];
const PIPS = ['', '5', '19', '159', '1379', '13579', '134679'];
const dieHtml = (n, cls = '') => `<div class="die ${cls}" role="img" aria-label="الزهر ${n}">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => `<i class="${PIPS[n].includes(String(i)) ? 'on' : ''}"></i>`).join('')}</div>`;
function ludoPos(g, pi, prog, t) {
  const seat = g.seats[pi];
  if (prog === -1) { const [cx, cy] = LUDO_YARD[seat]; return [cx + (t % 2 ? 1 : -1), cy + (t > 1 ? 1 : -1) + 0.05]; }
  if (prog <= 50) { const c = LUDO_PATH[(seat * 13 + prog) % 52]; return [c[0] + 0.5, c[1] + 0.5]; }
  if (prog <= 55) { const c = LUDO_LANE[seat][prog - 51]; return [c[0] + 0.5, c[1] + 0.5]; }
  const [fx, fy] = LUDO_FIN[seat]; return [fx + (t % 2 ? 0.22 : -0.22) * (seat % 2 ? 1 : 0.0), fy + (t > 1 ? 0.22 : -0.22) * (seat % 2 ? 0 : 1)];
}
/* ألوان لودو ستار حسب مكان اللاعب على الشاشة: 0 فوق يسار، 1 فوق يمين، 2 تحت يمين، 3 تحت يسار (أنت دايماً تحت يسار) */
/* R109: ألوان مثل لودو الكلاسيكي اللامع — فوق يسار أحمر، فوق يمين أخضر، تحت يمين أصفر، تحت يسار أزرق */
const LD_COL = ['#f1262c', '#12c43a', '#ffd30a', '#1e7bff'];
const LD_DK = ['#d01b22', '#0fa531', '#efb400', '#1563e0'];
const LD_DD = ['#a8121a', '#0b7f25', '#cf8a00', '#0d4cb8'];
const CROWN = 'M-.15 .08L-.17 -.1L-.07 -.02L0 -.14L.07 -.02L.17 -.1L.15 .08Z';
/* R108: رسوم الأغراض (رسم أصلي بسيط) */
const LD_ITEM = {
  dice: '<rect x="-.3" y="-.3" width=".6" height=".6" rx=".12" fill="#ff3b4f" stroke="#fff" stroke-width=".04"/><circle cx="-.13" cy="-.13" r=".06" fill="#fff"/><circle cx=".13" cy=".13" r=".06" fill="#fff"/><circle r=".06" fill="#fff"/>',
  rocket: '<g transform="rotate(45)"><path d="M0 -.36C.14 -.24 .16 -.04 .1 .14H-.1C-.16 -.04 -.14 -.24 0 -.36Z" fill="#fff" stroke="#c9d3e6" stroke-width=".03"/><path d="M0 -.36C.07 -.3 .1 -.24 .11 -.18H-.11C-.1 -.24 -.07 -.3 0 -.36Z" fill="#ff3b4f"/><circle cy="-.06" r=".06" fill="#3fb7ff"/><path d="M-.1 .04L-.22 .2L-.08 .16ZM.1 .04L.22 .2L.08 .16Z" fill="#ff3b4f"/><path d="M-.06 .15L0 .34L.06 .15Z" fill="#ffb02e"/></g>',
  portal: '<rect x="-.3" y="-.34" width=".6" height=".66" rx=".28" fill="#8a7a6a" stroke="#5b4d40" stroke-width=".04"/><rect x="-.2" y="-.24" width=".4" height=".5" rx=".2" fill="#2fb6ff"/><path d="M-.08 -.04a.08 .08 0 1 1 .1 .1a.13 .13 0 1 1 -.16 -.16" fill="none" stroke="#d9f6ff" stroke-width=".04"/>',
  bomb: '<circle cy=".05" r=".25" fill="#3b3550"/><circle cx="-.08" cy="-.03" r=".06" fill="#fff" opacity=".45"/><rect x="-.06" y="-.26" width=".12" height=".08" fill="#6d6880"/><path d="M0 -.26q.1 -.12 .2 -.06" stroke="#c49a3a" stroke-width=".04" fill="none"/><circle cx=".21" cy="-.33" r=".05" fill="#ffb02e"/>',
  ice: '<rect x="-.28" y="-.28" width=".56" height=".56" rx=".1" fill="#bfe9ff" stroke="#fff" stroke-width=".05"/><path d="M0 -.18V.18M-.16 -.09L.16 .09M-.16 .09L.16 -.09" stroke="#3a9bd6" stroke-width=".05" stroke-linecap="round"/>',
};
const LD_LOCK = '<rect x="-.2" y="-.04" width=".4" height=".3" rx=".06" fill="#3a77c4" stroke="#fff" stroke-width=".04"/><path d="M-.12 -.04V-.13a.12 .12 0 0 1 .24 0V-.04" fill="none" stroke="#cfe3ff" stroke-width=".06"/><circle cy=".1" r=".045" fill="#fff"/>';
const LD_SWORDS = '<g transform="translate(.22 -.3) scale(.8)"><circle r=".2" fill="#b3122b" stroke="#ffd34d" stroke-width=".03"/><path d="M-.12 -.12L.12 .12M.12 -.12L-.12 .12" stroke="#fff" stroke-width=".05" stroke-linecap="round"/></g>';
function ldToken(seat, mode, x, y, rot, col, dk) {
  let face;
  if (mode === 'arrow') face = `<circle r=".4" fill="#a8740e"/><circle cy="-.04" r=".4" fill="#ffd45a" stroke="#fff3b8" stroke-width=".04"/><path d="M0 .22C-.34 -.02 -.3 -.26 -.14 -.26C-.06 -.26 0 -.2 0 -.14C0 -.2 .06 -.26 .14 -.26C.3 -.26 .34 -.02 0 .22Z" fill="${col}" stroke="${dk}" stroke-width=".04"/><path d="M-.12 -.17q.05 -.06 .1 -.02" stroke="#fff" stroke-width=".05" fill="none" stroke-linecap="round"/>`;
  else if (mode === 'raids') face = `<circle r=".4" fill="${dk}"/><circle cy="-.04" r=".4" fill="${col}" stroke="#fff3d8" stroke-width=".04"/><path d="M-.17 -.18H.17L.12 .22H-.12Z" fill="#fff" opacity=".92"/><path d="M-.15 -.04H.15L.12 .22H-.12Z" fill="#ff7a3a"/><path d="M.05 -.18L.12 -.3" stroke="#fff" stroke-width=".05" stroke-linecap="round"/><circle cx="-.06" cy="-.12" r=".05" fill="#ffd166"/>`;
  else face = `<circle r=".4" fill="${dk}"/><circle cy="-.05" r=".4" fill="${col}" stroke="#fff" stroke-opacity=".85" stroke-width=".05"/><circle cy="-.05" r=".3" fill="#000" opacity=".14"/><circle cy="-.07" r=".27" fill="${col}"/><ellipse cx="-.1" cy="-.22" rx=".16" ry=".08" fill="#fff" opacity=".45"/><path d="${CROWN}" transform="translate(0 -.05) scale(1.15)" fill="#fff" stroke="${dk}" stroke-width=".02"/>`; /* R109: قطعة لامعة */
  return `<g transform="rotate(${-rot} ${x} ${y})"><ellipse cx="${x}" cy="${y + 0.33}" rx=".4" ry=".14" fill="#000" opacity=".3"/><g transform="translate(${x} ${y}) scale(1.22)">${face}</g></g>`;
}
function ludo(room) {
  introOnce('ludo');
  const g = room.game;
  const IC = jkIC();
  const pi = g.players.indexOf(room.you);
  const myTurn = g.turnId === room.you && g.phase !== 'final';
  const mode = ['quick', 'magic'].includes(g.variant) ? g.variant : 'classic', modeDef = LD_MODES.find((m) => m.id === mode) || LD_MODES[0]; /* R108: الوضع من الخادم */
  const shift = pi >= 0 ? (3 - g.seats[pi] + 4) % 4 : 0; // مقعدك دايماً تحت يسار مثل لودو ستار
  const rot = shift * 90;
  const posOf = (seat) => (seat + shift) % 4;
  const col = (seat) => LD_COL[posOf(seat)], dk = (seat) => LD_DK[posOf(seat)], dd = (seat) => LD_DD[posOf(seat)];
  const movable = new Set((g.moves || []).map((m) => m.token));
  /* R109: لوحة لامعة بإطار خشبي مثل لودو الكلاسيكي (رسم أصلي) */
  const grads = [0, 1, 2, 3].map((i) => `<linearGradient id="ldY${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col(i)}"/><stop offset="1" stop-color="${dk(i)}"/></linearGradient>`).join('');
  let b = `<defs>${grads}<linearGradient id="ldWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffcf73"/><stop offset=".5" stop-color="#f2a845"/><stop offset="1" stop-color="#d9822a"/></linearGradient><clipPath id="ldClip"><rect x="0" y="0" width="15" height="15" rx=".25"/></clipPath></defs>`;
  b += `<rect x="-.42" y="-.42" width="15.84" height="15.84" rx=".55" fill="#b8641c"/><rect x="-.36" y="-.4" width="15.72" height="15.7" rx=".5" fill="url(#ldWood)"/><rect x="-.1" y="-.1" width="15.2" height="15.2" rx=".3" fill="#a85a1e" opacity=".55"/>`;
  b += `<g transform="rotate(${rot} 7.5 7.5)"><g clip-path="url(#ldClip)"><rect width="15" height="15" fill="#fdeccb"/>`;
  LUDO_YARD.forEach(([cx, cy], i) => {
    const used = g.seats.includes(i), op = used ? 1 : 0.55;
    b += `<g opacity="${op}"><rect x="${cx - 3}" y="${cy - 3}" width="6" height="6" fill="${dd(i)}"/><rect x="${cx - 2.9}" y="${cy - 2.9}" width="5.8" height="5.8" rx=".3" fill="url(#ldY${i})" stroke="${dd(i)}" stroke-width=".1"/><rect x="${cx - 2.2}" y="${cy - 2.2}" width="4.4" height="4.4" rx=".45" fill="${dk(i)}"/><rect x="${cx - 2.2}" y="${cy - 2.2}" width="4.4" height="4.4" rx=".45" fill="none" stroke="#000" stroke-opacity=".18" stroke-width=".1"/>`;
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b += `<circle cx="${cx + dx}" cy="${cy + dy}" r=".56" fill="${dd(i)}"/><circle cx="${cx + dx}" cy="${cy + dy + .06}" r=".5" fill="#000" opacity=".12"/>`;
    b += '</g>';
  });
  const cell = (x, y, fill) => `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}" stroke="#e7c48a" stroke-width=".05"/>`;
  const globe = (x, y, c) => `<g transform="translate(${x + .5} ${y + .5}) rotate(${-rot})"><circle r=".34" fill="${c}"/><circle r=".34" fill="none" stroke="#000" stroke-opacity=".25" stroke-width=".04"/><path d="M-.2 -.12q.12 -.16 .26 -.04q-.02 .12 -.15 .14q-.12 .08 -.11 -.1zM.04 .1q.15 -.02 .2 .08q-.12 .12 -.2 -.08zM-.24 .1q.06 .1 .14 .12" fill="#000" opacity=".28"/></g>`;
  const star = (x, y) => `<rect x="${x + .04}" y="${y + .04}" width=".92" height=".92" rx=".08" fill="#f6c27a"/><g transform="translate(${x + .5} ${y + .5}) rotate(${-rot})"><path d="M0 -.32l.1 .21.23 .03-.17 .16.04 .23L0 .14l-.2 .11.04 -.23-.17 -.16.23 -.03z" fill="#fff" stroke="#f0b35c" stroke-width=".02"/></g>`;
  LUDO_PATH.forEach(([x, y], i) => {
    const sSeat = i % 13 === 0 ? i / 13 : -1;
    const isStar = i % 13 === 8;
    b += cell(x, y, sSeat >= 0 ? col(sSeat) : '#fdf0d4');
    if (sSeat >= 0) b += globe(x, y, dd(sSeat)); else if (isStar) b += star(x, y);
  });
  LUDO_LANE.forEach((l, i) => l.forEach(([x, y]) => (b += `<rect x="${x}" y="${y}" width="1" height="1" fill="${col(i)}" stroke="${dk(i)}" stroke-width=".05"/>`)));
  /* R108: أغراض الوضع السحري + أقفال طريق النهاية بالسريع */
  if (Array.isArray(g.items)) for (const it of g.items) { const c = LUDO_PATH[it.abs]; if (!c) continue; b += `<g class="ld-item ld-it-${it.kind}" transform="translate(${c[0] + .5} ${c[1] + .5}) rotate(${-rot}) scale(1.35)">${LD_ITEM[it.kind] || ''}</g>`; }
  if (mode === 'quick' && Array.isArray(g.unlocked)) g.seats.forEach((seat, p) => { if (g.unlocked[p]) return; const [x, y] = LUDO_LANE[seat][0]; b += `<g transform="translate(${x + .5} ${y + .5}) rotate(${-rot}) scale(1.4)">${LD_LOCK}</g>`; });
  const T = [`6,6 6,9 7.5,7.5`, `6,6 9,6 7.5,7.5`, `9,6 9,9 7.5,7.5`, `6,9 9,9 7.5,7.5`]; // يسار(0) فوق(1) يمين(2) تحت(3)
  T.forEach((pts, i) => (b += `<polygon points="${pts}" fill="${col(i)}"/>`));
  b += '</g></g>';
  // القطع (خارج المجموعة المقصوصة لكن بنفس التدوير)
  const stack = new Map();
  g.players.forEach((id, p) => g.tokens[p].forEach((prog, t) => { const [x, y] = ludoPos(g, p, prog, t); const k = prog === -1 || prog === 56 ? `${p}:${t}` : `${x},${y}`; (stack.get(k) ?? stack.set(k, []).get(k)).push({ p, t, x, y }); }));
  let toks = '';
  for (const list of stack.values()) list.forEach((o, k) => {
    const dx = (k - (list.length - 1) / 2) * 0.3, x = o.x + dx, y = o.y;
    const can = myTurn && o.p === pi && movable.has(o.t);
    const seat = g.seats[o.p];
    if (!can && myTurn && g.phase === 'move' && o.p === pi) toks += `<circle class="ld-hit" cx="${x}" cy="${y}" r=".6" data-act="ludo-nomove" data-t="${o.t}"/>`;
    if (can) toks += `<circle class="ld-halo" cx="${x}" cy="${y}" r=".62"/>`;
    toks += `<g class="ld-tok ${can ? 'can' : ''}" data-tk="t${o.p}:${o.t}" data-x="${x}" data-y="${y}">${ldToken(seat, mode, x, y, rot, col(seat), dd(seat))}${mode === 'quick' && g.unlocked?.[o.p] ? `<g transform="translate(${x} ${y}) rotate(${-rot})">${LD_SWORDS}</g>` : ''}</g>`;
    if (can) toks += `<circle class="ld-hit" cx="${x}" cy="${y}" r=".72" data-act="ludo-move" data-t="${o.t}" role="button" tabindex="0" aria-label="حرّك القطعة ${o.t + 1}"/>`;
  });
  const board = `<svg class="ld2-board" viewBox="0 0 15 15" role="img" aria-label="لوحة لودو (${modeDef.name})">${b}<g class="fx-layer" transform="rotate(${rot} 7.5 7.5)">${toks}</g></svg>`;
  // اللاعبون
  const AV = [[90, 495], [835, 495], [835, 1690], [85, 1690]];
  let seats = '';
  g.players.forEach((id, p) => {
    const sx = g.seats[p], ps = posOf(sx), [x, y] = AV[ps];
    const raw = nm(room, id).replace(/^🤖\s*/, '');
    const shown = id === room.you ? 'أنت' : esc(raw.length > 11 ? raw.slice(0, 10) + '…' : raw);
    const turn = g.turnId === id && g.phase !== 'final';
    const below = ps < 2;
    seats += `<div class="ld2-seat p${ps} ${turn ? 'on' : ''} ${g.out[p] ? 'out' : ''}" style="left:calc(${x}*var(--u));top:calc(${y}*var(--u));--c:${LD_COL[ps]}"><span class="ld2-av"><span class="in">${faceHtml(sx, 100)}${turn ? timerEl() : ''}</span></span><b class="ld2-nm ${below ? 'dn' : 'up'}">${shown}${isBot(room, id) ? ' 🤖' : ''}<small>🏁 ${g.done[p]}/4</small></b></div>`;
  });
  let hint;
  if (g.phase === 'final') hint = g.winner === room.you ? 'فزت! 🏆' : `فاز ${nm(room, g.winner)}`;
  else if (!myTurn) hint = `دور ${nm(room, g.turnId)}…`;
  else if (g.canRoll) hint = 'دورك: ارمِ الزهر 🎲';
  else hint = 'اختر قطعة مضيئة تحركها، أو اضغط زر الحركة.';
  const lastTxt = g.last ? `${nm(room, g.players[g.last.by])}: ${g.last.roll} · ${{ roll: 'رمى الزهر', move: 'حرّك', enter: 'طلّع قطعة', capture: 'كسر قطعة! 💥', finish: 'وصّل قطعة للنهاية ⭐', nomove: 'ما فيه حركة', triple: 'ثلاث ستات: ضاع الدور', timeout: 'فاته دوره', item: ({ rocket: 'صاروخ 🚀 قدّمه 6', portal: 'دخل البوابة 🌀', dice: 'زهر سحري 🎲 دور إضافي', bomb: 'قنبلة 💣 رجعت قطعته للبيت', ice: 'ثلج 🧊 بيضيع دوره الجاي' })[g.last.item] || 'غرض سحري' }[g.last.kind] ?? ''}${g.variant === 'quick' ? ` · الهدف ${g.goal || 2} قطع` : ''}` : '';
  const dieN = g.roll || g.last?.roll || 0;
  const diceFace = dieN ? dieHtml(dieN, g.roll ? 'roll' : 'dim') : '<span class="ld2-q">؟</span>';
  const diceBtn = g.canRoll
    ? `<button class="ld2-dice can" type="button" data-act="play" data-a="${act({ type: 'roll' })}" aria-label="ارمِ الزهر">${diceFace}<small>ارمِ</small></button>`
    : `<div class="ld2-dice" role="img" aria-label="الزهر">${diceFace}</div>`;
  const moves = !g.canRoll && g.moves?.length
    ? `<div class="ld2-moves">${g.moves.map((m) => `<button type="button" class="jk-mv" data-act="ludo-move" data-t="${m.token}">قطعة ${m.token + 1}: ${m.kind === 'enter' ? 'طلّعها' : m.kind === 'finish' ? 'وصّلها للنهاية' : 'حرّكها ' + g.roll}${m.captures.length ? ' 💥' : ''}</button>`).join('')}</div>`
    : '';
  const rulesRows = [
    ['🎲', 'دورك: اضغط النرد، بعدين اضغط القطعة المضيئة اللي تبي تحركها. لو ما فيه قطعة تتحرك ينتقل الدور تلقائياً. اضغط قطعة غير مضيئة وبنقولك ليش.'], ['6', 'القطعة تطلع من البيت برقم 6 فقط.'], ['6 ×3', '6 أو كسر قطعة أو وصول للنهاية = دور إضافي. ثلاث ستات ورا بعض يضيع الدور.'],
    ['💥', 'النزول فوق قطعة خصم يرجّعها لبيتها، إلا في الخانات الآمنة (خانة البداية والنجمة).'], ['🏁', 'النهاية بالرقم المضبوط. أول لاعب توصل قطعه الأربع يفوز.'],
  ].map(([k, t]) => `<li><span class="rc"><b>${k}</b></span><span class="rt">${esc(t)}</span></li>`).join('');
  const overlay = JK.rules ? `<div class="jk-rules-back" data-act="jk-help"></div><section class="jk-rules" role="dialog" aria-label="كيف ألعب؟"><h2><span>كيف ألعب؟</span></h2><ul>${rulesRows}</ul><p class="rn">وضع ${modeDef.name}: ${esc(modeDef.note)}</p><button type="button" class="jk-rx" data-act="jk-help" aria-label="إغلاق">✕</button></section>` : '';
  const info = JK.modeInfo ? `<div class="ld2-pop-back" data-act="ld-info"></div><section class="ld2-pop" role="dialog" aria-label="وضع اللعب"><h3><i>${modeDef.icon}</i><span>${modeDef.name}</span></h3><div class="strip">${modeDef.real ? 'القواعد الكاملة مطبّقة' : 'شكل فقط — القواعد كلاسيكية'}</div><p>${esc(modeDef.note)}</p><small>تغيير الوضع من صفحة لودو قبل بدء اللعبة. يظهر الوضع عندك أنت فقط.</small></section>` : '';
  return `<div class="stack jk-screen v2 ld2 ld-${mode}">
    <div class="bl2-stage ld2-stage" style="--ver:${g.ver}">
      <svg class="ld2-bg" viewBox="0 0 921 2000" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs><linearGradient id="ldSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f8ff0"/><stop offset=".5" stop-color="#1f7ae6"/><stop offset="1" stop-color="#1867d4"/></linearGradient><pattern id="ldGrid" width="160" height="160" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)"><path d="M0 0H160M0 0V160" stroke="#ffffff" stroke-opacity=".07" stroke-width="3"/></pattern><radialGradient id="ldGlow" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#8fd6ff" stop-opacity=".55"/><stop offset="1" stop-color="#8fd6ff" stop-opacity="0"/></radialGradient></defs><rect width="921" height="2000" fill="url(#ldSky)"/><rect width="921" height="2000" fill="url(#ldGrid)"/><ellipse cx="460" cy="1100" rx="560" ry="560" fill="url(#ldGlow)"/><rect x="0" y="630" width="921" height="940" rx="60" fill="#8fe0ff" opacity=".25"/></svg>
      <div class="ld2-board-wrap">${board}</div>
      ${seats}
      <button type="button" class="ld2-sq" style="left:calc(62*var(--u))" data-act="jk-menu" aria-label="القائمة" aria-expanded="${JK.menu}"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 9h22M5 16h22M5 23h22" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/></svg></button>
      <button type="button" class="ld2-sq mode" style="left:calc(170*var(--u))" data-act="ld-info" aria-label="وضع اللعب: ${modeDef.name}">${modeDef.icon}</button>
      <button type="button" class="ld2-sq howto" style="left:calc(278*var(--u))" data-act="jk-help" aria-label="كيف ألعب؟">؟</button>
      ${JK.menu ? `<div class="bl2-menu-back" data-act="jk-menu"></div><nav class="bl2-menu ld2-menu" aria-label="القائمة"><button type="button" data-act="sound">${IC.menuSpk}<span>${SFX.isOn() ? 'صوت' : 'صوت (مكتوم)'}</span></button><button type="button" data-act="jk-help">${IC.rules}<span>القواعد</span></button><button type="button" data-act="fs-toggle">${IC.full}<span>الشاشة الكاملة</span></button><button type="button" class="out" data-act="jk-leave">${IC.out}<span>خروج</span></button></nav>` : ''}
      ${info}
      <div class="ld2-tail" aria-hidden="true"></div>
      ${diceBtn}
      <section class="jk-dock ld2-dock" aria-label="التحكم"><div class="jk-bar"><div class="notice ${g.phase === 'final' ? 'big' : myTurn ? 'turn' : ''}" role="status">${esc(hint)}</div></div>${moves}${lastTxt ? `<p class="ld2-last">${esc(lastTxt)}</p>` : ''}</section>
      <nav class="ld2-btns" aria-label="أدوات"><button type="button" data-act="jk-chat">إيموجي</button><button type="button" data-act="jk-chat">الدردشة</button></nav>
    </div>
    ${overlay}
    ${g.phase === 'final' ? endCard(room) : ''}
  </div>`;
}

/* ---------- بلوت ---------- */
const BL_SUIT = ['♠', '♥', '♦', '♣'];
const BL_SUIT_NAME = ['البستوني', 'الهاص', 'الديمن', 'السنك'];
const BL_LV = { 2: 'دبل', 3: 'ثري', 4: 'فور' };
const blPrj = (kind, sun) => (kind === 'aces' ? (sun ? 'أربعمية' : 'أربع إكك') : { sira: 'سرا', khamsin: 'خمسين', mia: 'مية' }[kind] || kind);
const blRank = (r) => ({ 14: 'A', 13: 'K', 12: 'Q', 11: 'J' })[r] ?? String(r);
const blRed = (s) => s === 1 || s === 2;
const blCard = (c, extra = '') => `<span class="bl-mini ${blRed(c.s) ? 'red' : ''} ${extra}"><b>${blRank(c.r)}</b><i>${BL_SUIT[c.s]}</i>${extra ? `<u>${BL_SUIT[c.s]}</u>` : ''}</span>`;
/* وجه ورقة بلوت (SVG): فهرس بالزاوية، وأشكال حسب الرقم (A كبيرة، 7-10 بتوزيع الورق، J/Q/K إطار ملوّن) */
const BL_PIPS = { // أعمدة الأشكال محصورة بين فهرسَي الزاويتين فلا تتداخل معهما
  7: [[39, 56], [61, 56], [39, 78], [61, 78], [39, 100], [61, 100], [50, 67]],
  8: [[39, 56], [61, 56], [39, 78], [61, 78], [39, 100], [61, 100], [50, 67], [50, 89]],
  9: [[39, 50], [61, 50], [39, 68], [61, 68], [39, 86], [61, 86], [39, 104], [61, 104], [50, 77]],
  10: [[39, 50], [61, 50], [39, 68], [61, 68], [39, 86], [61, 86], [39, 104], [61, 104], [50, 59], [50, 95]],
};
function blFace(c) {
  const col = blRed(c.s) ? '#c8242c' : '#1c1c26', r = blRank(c.r), su = BL_SUIT[c.s];
  const idx = `<text x="10" y="24" font-size="21" font-weight="800" fill="${col}" font-family="Arial,sans-serif">${r}</text><text x="10" y="42" font-size="18" fill="${col}" text-anchor="start">${su}</text>`;
  let mid = '';
  if (c.r === 14) mid = `<text x="50" y="92" font-size="62" fill="${col}" text-anchor="middle">${su}</text>`;
  else if (BL_PIPS[c.r]) mid = BL_PIPS[c.r].map(([x, y]) => `<text x="${x}" y="${y + 7}" font-size="19" fill="${col}" text-anchor="middle">${su}</text>`).join('');
  else mid = `<rect x="28" y="34" width="44" height="72" rx="4" fill="#fff" stroke="${col}" stroke-width="2"/><path d="M28 60L72 40M28 84L72 64M28 106L72 88" stroke="#d9a92a" stroke-width="5" opacity=".75"/><path d="M28 40L72 60M28 64L72 84" stroke="#1e8a62" stroke-width="5" opacity=".7"/><text x="50" y="82" font-size="30" font-weight="800" fill="${col}" text-anchor="middle" font-family="Arial,sans-serif" stroke="#fff" stroke-width="2.5" paint-order="stroke">${r}</text>`;
  return `<svg viewBox="0 0 100 140" aria-hidden="true" focusable="false">${idx}${mid}<g transform="rotate(180 50 70)">${idx}</g></svg>`;
}
const BL_BACK = '<svg viewBox="0 0 60 90" aria-hidden="true"><rect x="2" y="2" width="56" height="86" rx="7" fill="#e7a23c" stroke="#fff3cf" stroke-width="3"/><rect x="9" y="9" width="42" height="72" rx="4" fill="none" stroke="#9a5a14" stroke-width="2"/><path d="M30 18l12 27-12 27-12-27z" fill="none" stroke="#9a5a14" stroke-width="2.4"/><circle cx="30" cy="45" r="5" fill="#9a5a14"/></svg>';
const BL_ICON_CARD = '<svg viewBox="0 0 20 26" aria-hidden="true"><rect x="2" y="2" width="16" height="22" rx="3" fill="#f6efdc" stroke="#caa95a" stroke-width="1.6"/><circle cx="10" cy="11" r="3.4" fill="#4a3a52"/><path d="M5 21c1-4 9-4 10 0" fill="#4a3a52"/></svg>';
const BL_ROOM = (() => {
  const stripe = (x, y, h) => `<rect x="${x}" y="${y}" width="22" height="${h}" fill="#1f7a55"/><rect x="${x + 22}" y="${y}" width="9" height="${h}" fill="#efe2bf"/><rect x="${x + 31}" y="${y}" width="9" height="${h}" fill="#b33a2a"/>`;
  const star = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r * 2.6}" fill="#ffd36b" opacity=".22"/><circle cx="${x}" cy="${y}" r="${r}" fill="#fff0b0"/>`;
  const cres = (x, y, k) => `<path transform="translate(${x} ${y}) scale(${k})" d="M0 -14A14 14 0 1 0 12 10A11 11 0 1 1 0 -14z" fill="#f0c860"/>`;
  return `<svg class="bl2-room" viewBox="0 0 921 2000" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs>
    <linearGradient id="blWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10051e"/><stop offset="1" stop-color="#1b0932"/></linearGradient>
    <linearGradient id="blSofa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b42a22"/><stop offset="1" stop-color="#7d1914"/></linearGradient>
    <linearGradient id="blCur" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5c0f0f"/><stop offset=".3" stop-color="#8c1c18"/><stop offset=".6" stop-color="#5a0d0d"/><stop offset="1" stop-color="#7a1713"/></linearGradient>
    <linearGradient id="blRug" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3cc9e"/><stop offset=".5" stop-color="#ead6aa"/><stop offset="1" stop-color="#d8bd88"/></linearGradient>
    <radialGradient id="blLight" cx=".5" cy=".42" r=".7"><stop offset="0" stop-color="#fff6dc" stop-opacity=".45"/><stop offset="1" stop-color="#7a4a10" stop-opacity=".1"/></radialGradient>
    <linearGradient id="blPanel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#261044"/><stop offset=".25" stop-color="#1b0932"/><stop offset="1" stop-color="#10051e"/></linearGradient>
    <linearGradient id="blGoldS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#edc66c"/><stop offset=".5" stop-color="#edc66c"/><stop offset="1" stop-color="#ad55e8"/></linearGradient>
    <pattern id="blLat" width="46" height="46" patternUnits="userSpaceOnUse"><path d="M23 3L43 23L23 43L3 23z" fill="none" stroke="#a98544" stroke-width="1.8" opacity=".5"/><circle cx="23" cy="23" r="3.2" fill="#b8975a" opacity=".22"/></pattern>
    <pattern id="blScroll" width="64" height="70" patternUnits="userSpaceOnUse"><path d="M0 35C16 10 32 10 32 35S48 60 64 35" fill="none" stroke="#f1c75a" stroke-width="4.5" stroke-linecap="round"/><circle cx="32" cy="35" r="4.5" fill="#f1c75a"/><path d="M16 22l8 6M48 48l-8-6" stroke="#f1c75a" stroke-width="3" stroke-linecap="round"/></pattern>
    <pattern id="blX" width="56" height="56" patternUnits="userSpaceOnUse"><path d="M0 0L56 56M56 0L0 56" stroke="#d98a7a" stroke-width="3" opacity=".45"/><path d="M28 0L56 28L28 56L0 28z" fill="none" stroke="#e8b0a0" stroke-width="2" opacity=".35"/></pattern>
  </defs>
  <rect width="921" height="2000" fill="url(#blWall)"/>
  <path d="M0 0H921V70C880 40 840 60 800 30C760 62 700 38 650 56C590 30 520 62 470 40C400 66 330 36 270 58C200 34 120 60 60 40C30 52 14 44 0 56z" fill="#0f0705" opacity=".75"/>
  ${cres(246, 34, 1.1)}${cres(588, 40, 1.1)}${cres(660, 28, .9)}${star(120, 46, 3)}${star(330, 20, 3)}${star(430, 52, 3)}${star(520, 24, 3)}${star(790, 44, 3)}${star(860, 18, 3)}${star(40, 22, 3)}
  <path d="M0 0H120C105 60 135 120 100 190C85 230 100 270 92 300L0 310z" fill="url(#blCur)" opacity=".85"/><path d="M921 0H800C815 70 785 130 820 210C835 250 820 280 828 310L921 320z" fill="url(#blCur)" opacity=".85"/>
  <g><rect x="150" y="150" width="620" height="300" rx="10" fill="url(#blSofa)"/>${stripe(240, 150, 300)}${stripe(640, 150, 300)}<rect x="150" y="150" width="620" height="300" rx="10" fill="none" stroke="#5a0f0c" stroke-width="3" opacity=".6"/></g>
  <g transform="rotate(-6 120 370)"><rect x="12" y="285" width="215" height="170" rx="14" fill="#d2b896"/><path d="M120 300l80 70-80 70-80-70z" fill="none" stroke="#a8875a" stroke-width="6"/><path d="M120 330l45 40-45 40-45-40z" fill="none" stroke="#a8875a" stroke-width="4"/></g>
  <rect x="0" y="430" width="112" height="200" rx="10" fill="url(#blSofa)"/><rect x="0" y="430" width="112" height="200" rx="10" fill="url(#blX)"/>
  <rect x="810" y="430" width="111" height="200" rx="10" fill="url(#blSofa)"/><rect x="810" y="430" width="111" height="200" rx="10" fill="url(#blX)"/>
  <rect x="0" y="620" width="40" height="300" fill="url(#blSofa)"/>${stripe(0, 640, 270)}<rect x="881" y="620" width="40" height="300" fill="url(#blSofa)"/>${stripe(881, 640, 270)}
  <polygon points="112,436 812,436 944,1336 -24,1336" fill="url(#blRug)"/>
  <polygon points="112,436 812,436 944,1336 -24,1336" fill="url(#blLat)"/>
  <polygon points="140,470 784,470 892,1296 28,1296" fill="none" stroke="#c4a266" stroke-width="5" opacity=".75"/><polygon points="156,488 768,488 870,1280 52,1280" fill="none" stroke="#c4a266" stroke-width="2" stroke-dasharray="3 9" opacity=".8"/>
  <g fill="none" stroke="#bd9a58" stroke-width="3" opacity=".55"><circle cx="460" cy="838" r="250"/><circle cx="460" cy="838" r="205"/><circle cx="460" cy="838" r="150"/><circle cx="460" cy="838" r="96" stroke-width="5"/>${Array.from({ length: 16 }, (_, i) => `<ellipse cx="460" cy="${838 - 228}" rx="26" ry="46" transform="rotate(${i * 22.5} 460 838)"/>`).join('')}</g>
  <rect x="-30" y="430" width="980" height="920" fill="url(#blLight)"/>
  <path d="M0 1320H921V1780H0z" fill="url(#blSofa)"/>${stripe(150, 1330, 440)}${stripe(730, 1330, 440)}
  <rect x="0" y="1320" width="921" height="30" fill="#000" opacity=".28"/>
  <ellipse cx="846" cy="1326" rx="70" ry="22" fill="#efe4cf" stroke="#c8b48a" stroke-width="3"/><path d="M800 1286h92c0 34-18 50-46 50s-46-16-46-50z" fill="#fbf4e4" stroke="#c8b48a" stroke-width="3"/><ellipse cx="846" cy="1288" rx="46" ry="12" fill="#4a2410"/>
  <path d="M0 1810C0 1786 14 1776 36 1772H885C907 1776 921 1786 921 1810V2000H0z" fill="url(#blPanel)"/>
  <path d="M0 1810C0 1786 14 1776 36 1772H885C907 1776 921 1786 921 1810" fill="none" stroke="url(#blGoldS)" stroke-width="9"/>
  <path d="M10 1822C10 1802 20 1790 40 1788H881C901 1790 911 1802 911 1822" fill="none" stroke="#f1c75a" stroke-width="3" opacity=".8"/>
  <rect x="24" y="1782" width="873" height="70" fill="url(#blScroll)" opacity=".85"/>
  </svg>`;
})();

function baloot(room) {
  const g = room.game;
  const me = g.me;
  const IC = jkIC();
  const myTeam = me >= 0 ? g.teams[me] : 0;
  const slot = (p) => (me >= 0 ? (p - me + 4) % 4 : p); // 0 أنت، 1 يمينك، 2 شريكك، 3 يسارك
  const SL = ['bottom', 'right', 'north', 'left'];
  const turnP = g.players.indexOf(g.turnId);
  const myTurn = g.turnId === room.you;
  const ct = g.contract;
  const lvTxt = g.level > 1 ? ` ${BL_LV[g.level]} ×${g.level}` : '';
  const ctShort = ct ? (ct.type === 'sun' ? '☀ صن' : `حكم ${BL_SUIT[ct.trump]}`) + lvTxt : g.phase === 'bid' ? 'المزايدة' : '';
  const ctTxt = ct ? ctShort + ` · ${nm(room, g.players[ct.bidder])}` : ctShort;
  const firstP = (g.dealer + 1) % 4;
  const seat = (p) => {
    const id = g.players[p];
    const sl = SL[slot(p)];
    const n = g.handCounts[p];
    const turn = p === turnP && (g.phase === 'bid' || g.phase === 'play');
    const raw = nm(room, id).replace(/^🤖\s*/, '');
    const shown = id === room.you ? 'أنت' : esc(raw.length > 11 ? raw.slice(0, 10) + '…' : raw);
    const nb = Math.min(n, 5);
    const fan = p === me ? '' : `<span class="bl2-fan" aria-hidden="true">${Array.from({ length: nb }, (_, i) => `<i style="--i:${i};--n:${nb}">${BL_BACK}</i>`).join('')}</span>`;
    const first = g.phase === 'bid' && g.bidRound === 1 && p === firstP ? '<span class="bl2-badge gold">الأول</span>' : '';
    const deal = g.dealer === p ? '<span class="bl2-badge green">الموزّع</span>' : '';
    return `<div class="bl2-seat ${sl} ${turn ? 'on' : ''} ${g.teams[p] === myTeam ? 'mine' : 'foe'}" data-seat="${p}">${fan}<span class="bl2-av"><span class="in">${faceHtml(p, 100)}${turn ? timerEl() : ''}</span></span><b class="bl2-nm">${shown}${isBot(room, id) ? ' 🤖' : ''}</b><span class="bl2-co"><i>${BL_ICON_CARD}</i><em>${n}</em><small>${g.teams[p] === myTeam ? 'فريقك' : 'الخصم'}</small></span>${first}${deal}</div>`;
  };
  const trickCards = g.trick.map((x, i) => `<span class="bl2-play ${SL[slot(x.p)]}" style="--r:${(x.p * 37 % 13) - 6}deg;z-index:${i + 1}">${blFace(x.c)}</span>`).join('');
  const floor = g.phase === 'bid' && g.floor ? `<span class="bl2-play floor" aria-label="الورقة المكشوفة">${blFace(g.floor)}</span><small class="bl2-cap">الورقة المكشوفة</small>` : '';
  const sm = g.summary;
  const summary = g.phase === 'roundEnd' && sm
    ? `<div class="bl2-sum" role="status"><b>نتيجة الجولة ${sm.failed ? '— العقد خسر!' : ''}</b>
        <p>${sm.contract === 'sun' ? 'صن' : 'حكم ' + BL_SUIT[sm.trump]} · صاحب العقد: ${sm.bidderTeam === myTeam ? 'فريقك' : 'الخصم'}${sm.kaboot !== null ? ' · كبوت!' : ''}${sm.level > 1 ? ` · ${BL_LV[sm.level]} ×${sm.level}` : ''}${sm.projPts > 0 ? ` · مشاريع ${sm.projWinner === myTeam ? 'لنا' : 'لهم'} +${sm.projPts * (sm.level > 1 ? 2 : 1)}` : ''}${sm.baloot !== null ? ` · بلوت ${sm.baloot === myTeam ? 'لنا' : 'لهم'} +2` : ''}${sm.tied ? ' · تعادل عند الهدف: جولة فاصلة' : ''}</p>
        <div class="bl2-sumrow"><span>فريقك</span><b>${sm.pts[myTeam]}</b><small>(${sm.abnat[myTeam]} أبناط)</small></div><div class="bl2-sumrow"><span>الخصم</span><b>${sm.pts[1 - myTeam]}</b><small>(${sm.abnat[1 - myTeam]} أبناط)</small></div><p class="hint">الجولة الجاية بعد لحظات…</p></div>`
    : '';
  const score = `<div class="bl2-score" role="group" aria-label="النتيجة">
      <div class="hd"><span class="us">لنا</span><em>${esc(ctShort)}</em><span class="them">لهم</span></div>
      <div class="bg"><b class="us">${g.scores[myTeam]}</b><i></i><b class="them">${g.scores[1 - myTeam]}</b></div>
      <div class="ft"><span>الجولة ${g.round}</span><span>الهدف ${g.target}</span></div></div>`;
  let hint;
  if (g.phase === 'final') hint = g.winners.includes(room.you) ? 'فزتم! 🏆' : 'فاز الفريق الثاني';
  else if (g.phase === 'roundEnd') hint = 'انتهت الجولة';
  else if (g.phase === 'bid') hint = myTurn ? (g.bidRound === 1 ? 'دورك: حكم، صن، أو بس؟' : 'الدور الثاني: اختر نوع الحكم أو صن أو بس.') : `دور ${nm(room, g.turnId)} في المزايدة…`;
  else if (myTurn) hint = g.canProject ? 'دورك: عندك مشروع، أعلنه قبل ما تلعب أول ورقة.' : g.canBaloot ? 'دورك: عندك بلوت (K و Q الحكم)، اضغط «بلوت» قبل ما ترمي الثانية.' : g.multOffer ? 'دورك: تقدر ترفع المضاعف قبل أول ورقة، أو العب.' : 'دورك: العب ورقة.';
  else hint = g.multOffer ? `تقدر ترفع المضاعف (${BL_LV[g.multOffer]}) قبل ما يبدأ اللعب.` : `دور ${nm(room, g.turnId)}…`;
  let bidUi = '';
  if (g.canBid) {
    const hk = g.hokmTaken ? '' : g.bidRound === 1
      ? `<button class="bl2-btn" type="button" data-act="play" data-a="${act({ type: 'bid', bid: 'hokm' })}"><span class="${blRed(g.floor.s) ? 'r' : ''}">${BL_SUIT[g.floor.s]}</span> حكم</button>`
      : [0, 1, 2, 3].filter((s) => s !== g.floor.s).map((s) => `<button class="bl2-btn" type="button" data-act="play" data-a="${act({ type: 'bid', bid: 'hokm', suit: s })}"><span class="${blRed(s) ? 'r' : ''}">${BL_SUIT[s]}</span> حكم</button>`).join('');
    bidUi = `<div class="bl2-bid">${hk}<button class="bl2-btn" type="button" data-act="play" data-a="${act({ type: 'bid', bid: 'sun' })}"><span class="sun">☀</span> صن</button><button class="bl2-btn ghost" type="button" data-act="play" data-a="${act({ type: 'bid', bid: 'pass' })}">بس</button></div>`;
  }
  // أزرار الإعلان: تظهر فقط لما يسمح المحرك (الخادم يتحقق مرة ثانية عند الضغط)
  const sunC = ct?.type === 'sun';
  const annBtns = [];
  if (g.phase === 'play' && g.canProject) {
    const names = g.myProjects.map((x) => blPrj(x.kind, sunC)).join(' + ');
    annBtns.push(`<button class="bl2-btn bl2-ann" type="button" data-act="play" data-a="${act({ type: 'project' })}">📣 مشروع: ${esc(names)} (${g.myProjects.reduce((a, x) => a + x.pts, 0)})</button>`);
  }
  if (g.phase === 'play' && g.canBaloot) annBtns.push(`<button class="bl2-btn bl2-ann" type="button" data-act="play" data-a="${act({ type: 'baloot' })}">♛ بلوت +2</button>`);
  if (g.phase === 'play' && g.multOffer) annBtns.push(`<button class="bl2-btn bl2-ann mult" type="button" data-act="play" data-a="${act({ type: 'mult', level: g.multOffer })}">⚡ ${BL_LV[g.multOffer]} ×${g.multOffer}</button>`);
  const annUi = annBtns.length ? `<div class="bl2-bid bl2-annrow">${annBtns.join('')}</div>` : '';
  // المعلَن: يشوفه الكل (النوع والنقاط)، وتفاصيل الأوراق تنكشف بعد الأكلة الأولى
  const declTxt = (g.projDeclared || []).map((d) => `${g.teams[d.p] === myTeam ? 'لنا' : 'لهم'}: ${d.kinds.map((k) => blPrj(k, sunC)).join(' + ')}`).join(' · ');
  const rv = g.projReveal;
  const rvTxt = rv && (rv.items[0].length || rv.items[1].length) ? (rv.winner === null ? 'المشاريع: تساوي، ما أحد سجّل' : `المشاريع: ${rv.winner === myTeam ? 'لنا' : 'لهم'} +${rv.pts}`) : '';
  const declUi = g.phase === 'play' && (declTxt || rvTxt) ? `<div class="bl2-decl" role="status">${esc([declTxt, rvTxt].filter(Boolean).join(' — '))}${g.balootDeclared ? ' · بلوت معلن' : ''}</div>` : '';
  const legal = new Set(g.legal.map((c) => `${c.s}:${c.r}`));
  // تخطيط المروحة: يُحسب من عدد الأوراق وعرض الشاشة (921 وحدة) وعرض الورقة، بدون أرقام ثابتة لورق معيّن
  const nH = g.hand.length, mid = (nH - 1) / 2;
  const AVAIL = 921 - 2 * 54;            // العرض المتاح بعد الهوامش ومساحة دوران الأوراق
  const W_MAX = 190, STEP_MAX = 0.66, STEP_MIN = 0.42; // نسب الإزاحة من عرض الورقة: أقصى (ما يتباعد زيادة) وأدنى (يبقى الفهرس مقروء)
  let cw = W_MAX;
  if (nH > 1 && (AVAIL - cw) / (nH - 1) < STEP_MIN * cw) cw = AVAIL / (1 + STEP_MIN * (nH - 1)); // لو ضاق العرض نصغّر الورقة
  const step = nH > 1 ? Math.min(STEP_MAX * cw, (AVAIL - cw) / (nH - 1)) : 0;
  const rot = nH > 1 ? Math.min(5, 26 / (nH - 1)) : 0; // درجات لكل ورقة، والمجموع محدود
  const arc = nH > 1 ? 2.4 : 0;                          // انحناء المروحة (الأطراف أخفض)
  const hand = g.hand.map((c, i) => {
    const can = g.phase === 'play' && myTurn && legal.has(`${c.s}:${c.r}`);
    const r = blRank(c.r);
    const d = i - mid;
    return `<button class="bl2-card ${g.phase === 'play' && myTurn && !can ? 'dim' : ''} ${can ? 'can' : ''}" type="button" style="--dx:${(d * step).toFixed(1)};--rot:${(d * rot).toFixed(1)}deg;--dy:${(d * d * arc).toFixed(1)};z-index:${i + 1}" ${can ? `data-act="play" data-a="${act({ type: 'play', s: c.s, r: c.r })}"` : 'disabled'} aria-label="ورقة ${r} ${BL_SUIT_NAME[c.s]}">${blFace(c)}</button>`;
  }).join('');
  const lastT = g.lastTrick && g.phase === 'play' ? `<div class="bl2-last"><small>آخر أكلة</small><span>${g.lastTrick.map((x) => blCard(x.c)).join('')}</span><small>${esc(nm(room, g.lastWinner))}</small></div>` : '';
  const guideRows = [
    ['5 + 3', 'كل لاعب ياخذ 5 أوراق وتنكشف ورقة. بعد المزايدة صاحب العقد ياخذ المكشوفة وورقتين، والباقين 3 أوراق.'],
    ['حكم', 'الدور الأول: «حكم» بنوع الورقة المكشوفة. الدور الثاني: «حكم» بنوع ثاني.'],
    ['صن', 'لعب بدون حكم: ما فيه ورقة تدق.'],
    ['بس', 'تتخطى. لو الكل «بس» مرتين تنعاد الورقة.'],
    ['8', 'تلعبون 8 أكلات. لازم تلعب نفس النوع المنزّل، وبالحكم لو ما عندك النوع تدق بالحكم (إلا لو شريكك ياكل).'],
    ['مشروع', 'سرا (3 ورقات متتالية)، خمسين (4)، مية (5 أو أربع 10/J/Q/K)، أربع إكك. اضغط «مشروع» بأول دور لك قبل ما تلعب، وإلا يسقط. أعلى مشروع بين الفريقين ياخذ نقاط كل مشاريع فريقه.'],
    ['بلوت', 'K و Q الحكم عندك: اضغط «بلوت» قبل ما ترمي الثانية = +2. بدون إعلان ما يُحسب.'],
    ['دبل', 'بالحكم فقط، قبل أول ورقة: الخصم «دبل» ×2، ثم صاحب العقد «ثري» ×3، ثم الخصم «فور» ×4.'],
  ].map(([k, t]) => `<li><span class="rc"><b>${k}</b></span><span class="rt">${esc(t)}</span></li>`).join('');
  const ruleRows = [
    ['صن', 'A=11 · 10=10 · K=4 · Q=3 · J=2. مجموع الصن 26 نقطة.'],
    ['حكم', 'ورق الحكم: J=20 · 9=14 · A=11 · 10=10 · K=4 · Q=3. مجموع الحكم 16 نقطة.'],
    ['+10', 'آخر أكلة تزيد 10 نقاط.'],
    ['بلوت', 'K و Q الحكم عند نفس اللاعب = +2 نقطة، لازم يعلنه قبل ما يرمي الثانية، ولا يتضاعف.'],
    ['مشاريع', 'بقيمتها الأساسية، وتتضاعف ×2 فقط مع دبل/ثري/فور. صن: سرا 4، خمسين 10، مية 20، أربعمية 40. حكم: سرا 2، خمسين 5، مية 10، أربع إكك 10.'],
    ['كبوت', 'تاخذ كل الأكلات: 25 نقطة بالحكم و44 بالصن.'],
    ['152', 'أول فريق يوصل 152 نقطة يفوز، والتعادل عند 152 جولة فاصلة. صاحب العقد لازم تكون نقاطه (أوراق + مشاريع + بلوت) أكثر من خصمه، والتعادل = يخسر، وياخذ الخصم كل شي.'],
  ].map(([k, t]) => `<li><span class="rc"><b>${k}</b></span><span class="rt">${esc(t)}</span></li>`).join('');
  const panel = JK.guide ? ['دليل اللعبة', guideRows, 'غير مطبّق عمداً: أشكل، المقفل، القهوة، ومضاعفات الصن.', 'bl-guide'] : JK.rules ? ['القواعد', ruleRows, 'النظام السعودي: 4 لاعبين في فريقين متقابلين. غير مطبّق: أشكل، المقفل، القهوة، ومضاعفات الصن.', 'jk-help'] : null;
  const overlay = panel ? `<div class="jk-rules-back" data-act="${panel[3]}"></div><section class="jk-rules" role="dialog" aria-label="${panel[0]}"><h2><span>${panel[0]}</span></h2><ul>${panel[1]}</ul><p class="rn">${panel[2]}</p><button type="button" class="jk-rx" data-act="${panel[3]}" aria-label="إغلاق">✕</button></section>` : '';
  return `<div class="stack jk-screen v2 bl2">
    <div class="bl2-stage" style="--ver:${g.ver}">
      ${BL_ROOM}
      ${score}
      <div class="bl2-table">${[0, 1, 2, 3].map(seat).join('')}<div class="bl2-center">${floor}${trickCards}</div>${summary}</div>
      ${lastT}
      <button type="button" class="bl2-menu-btn" data-act="jk-menu" aria-label="القائمة" aria-expanded="${JK.menu}"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 9h20M6 16h20M6 23h20" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/></svg></button>
      ${JK.menu ? `<div class="bl2-menu-back" data-act="jk-menu"></div><nav class="bl2-menu" aria-label="القائمة"><button type="button" data-act="sound">${IC.menuSpk}<span>${SFX.isOn() ? 'صوت' : 'صوت (مكتوم)'}</span></button><button type="button" data-act="bl-guide">${IC.rules}<span>دليل اللعبة</span></button><button type="button" data-act="jk-help">${IC.rules}<span>القواعد</span></button><button type="button" data-act="fs-toggle">${IC.full}<span>الشاشة الكاملة</span></button><button type="button" class="out" data-act="jk-leave">${IC.out}<span>خروج</span></button></nav>` : ''}
      <section class="jk-dock bl2-dock" aria-label="أوراقك">
        <div class="jk-bar"><div class="notice ${g.phase === 'final' ? 'big' : myTurn ? 'turn' : ''}" role="status">${esc(hint)}</div></div>
        ${bidUi}${annUi}${declUi}
        <div class="bl2-hand ${myTurn ? 'mine' : ''}" style="--cw:${cw.toFixed(1)};--ch:${(cw * 1.4).toFixed(1)}">${hand || '<p class="hint">ما عندك أوراق.</p>'}</div>
      </section>
      <nav class="bl2-bb" aria-label="أدوات">
        <button type="button" data-act="jk-chat" aria-label="ردود سريعة">${IC.chat}</button>
        <button type="button" data-act="jk-chat" aria-label="تعبيرات">${IC.smile}</button>
        <button type="button" data-act="sound" aria-label="الصوت">${IC.spk}</button>
      </nav>
    </div>
    ${overlay}
    ${g.phase === 'final' ? endCard(room) : ''}
  </div>`;
}

/* هندسة اللوحات لخطة الحركة (gameevents.js): الموضع بإحداثيات اللوحة، ومفتاح العنصر، ونصف قطر التأثيرات */
export const FX_GEOM = {
  ludo: { unit: 0.5, key: (p, t) => `t${p}:${t}`, pos: (g, p, prog, t) => ludoPos(g, p, prog, t) },
  jackaro: { unit: 22, key: (p, m) => `m${p}:${m}`, pos: (g, p, prog, m) => posOf(g, p, prog, m) },
};

export const GAME_VIEWS = { codewords, jackaro, ludo, baloot, domino, uno, carrom, minaboli, liars, pool, bowling };
/* حركة انتقال حقيقية للكرات/القطع: نحفظ مواضعها قبل إعادة الرسم ثم نحرّكها من القديم للجديد */
export function flipSnapshot() {
  const m = new Map();
  document.querySelectorAll('#view [data-tk]').forEach((el) => { const r = el.getBoundingClientRect(); m.set(el.dataset.tk, [r.left + r.width / 2, r.top + r.height / 2]); });
  return m;
}
export function flipPlay(snap) {
  if (!snap || !snap.size || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('#view [data-tk]').forEach((el) => {
    const old = snap.get(el.dataset.tk); if (!old) return;
    const r = el.getBoundingClientRect(); const dx = old[0] - (r.left + r.width / 2), dy = old[1] - (r.top + r.height / 2);
    if (Math.abs(dx) + Math.abs(dy) < 2) return;
    let ldx = dx, ldy = dy;
    const par = el.parentNode; const ctm = par.getScreenCTM && par.getScreenCTM();
    if (ctm) { const inv = ctm.inverse(); const a = new DOMPoint(0, 0).matrixTransform(inv), b = new DOMPoint(dx, dy).matrixTransform(inv); ldx = b.x - a.x; ldy = b.y - a.y; }
    el.animate([{ transform: `translate(${ldx}px,${ldy}px)` }, { transform: 'translate(0,0)' }], { duration: Math.min(650, 220 + Math.hypot(dx, dy) * 1.6), easing: 'cubic-bezier(.3,.7,.3,1)' });
  });
}
