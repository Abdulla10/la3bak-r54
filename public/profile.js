import { referenceImage, ACHIEVEMENT_ART, ACHIEVEMENT_ART_KIDS } from './reference-assets.js?v=r68z31';
import { avatarArt } from './avatars.js?v=r68z31';
import { frameArt, isFrame2, bgArt, isBg2 } from './cosmetics.js?v=r68z31';
/* نظام الشخصية: كل شي محفوظ على جهاز اللاعب فقط (localStorage). ما فيه حسابات ولا يرسل شي للخادم. */

const KEY = 'qa_profile_v1';
export const store = { persistent: true };
let mem = null; // نسخة بالذاكرة لو المتصفح ما يسمح بالتخزين

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const COLORS = [
  { id: 'violet', label: 'بنفسجي', hex: '#8d6bff' },
  { id: 'pink', label: 'وردي', hex: '#ff68b5' },
  { id: 'cyan', label: 'سماوي', hex: '#58e1ff' },
  { id: 'gold', label: 'ذهبي', hex: '#ffd166' },
  { id: 'navy', label: 'أزرق داكن', hex: '#2f4cc0' },
  { id: 'mint', label: 'أخضر نعناعي', hex: '#5ee6a8' },
];

export const AVATARS = [
  { id: 'brain', label: 'رجل بالبشت' },
  { id: 'boy', label: 'ولد' },
  { id: 'smart', label: 'ذكي' },
  { id: 'robot', label: 'روبوت' },
  { id: 'smile', label: 'مبتسم' },
  { id: 'star', label: 'نجم' },
  { id: 'crown', label: 'تاج' },
];

export const FRAMES = [
  { id: 'plain', label: 'عادي' },
  { id: 'violet', label: 'بنفسجي مضيء' },
  { id: 'cyan', label: 'سماوي' },
  { id: 'pink', label: 'وردي' },
  { id: 'gold', label: 'ذهبي' },
  { id: 'glow', label: 'متوهج', need: (st) => st.wins >= 5, why: 'يفتح بعد الفوز في 5 جولات' },
];

export const TITLES = [
  { id: 'new', label: 'لاعب جديد', need: () => true },
  { id: 'quick', label: 'العقل السريع', need: (st) => st.wins >= 1, why: 'يفتح بعد أول فوز' },
  { id: 'words', label: 'ملك الكلمات', need: (st) => (st.winsByGame.letters ?? 0) >= 1, why: 'يفتح بعد الفوز في «حرف، جماد، حيوان»' },
  { id: 'pro', label: 'محترف التحدي', need: (st) => st.rounds >= 10, why: 'يفتح بعد إكمال 10 جولات' },
  { id: 'points', label: 'صائد النقاط', need: (st) => points(st) >= 100, why: 'يفتح عند الوصول إلى 100 نقطة' },
  { id: 'rooms', label: 'بطل الغرف', need: (st) => st.winsVsHumans >= 3, why: 'يفتح بعد الفوز 3 مرات على لاعبين حقيقيين' },
  { id: 'letters', label: 'سيد الحروف', need: (st) => (st.winsByGame.letters ?? 0) >= 3, why: 'يفتح بعد الفوز 3 مرات في «حرف، جماد، حيوان»' },
];

export const ACHIEVEMENTS = [
  { id: 'first', icon: '🎯', label: 'أول جولة', desc: 'أكمل أول لعبة', val: (st) => st.rounds, goal: 1 },
  { id: 'steady', icon: '🔥', label: 'لاعب مستمر', desc: 'أكمل 5 جولات', val: (st) => st.rounds, goal: 5 },
  { id: 'quick', icon: '⚡', label: 'عقل سريع', desc: 'فز بجولة', val: (st) => st.wins, goal: 1 },
  { id: 'king', icon: '👑', label: 'ملك الحروف', desc: 'فز في «حرف، جماد، حيوان»', val: (st) => st.winsByGame.letters ?? 0, goal: 1 },
  { id: 'social', icon: '🤝', label: 'لاعب اجتماعي', desc: 'العب مع شخص حقيقي', val: (st) => st.humanGames, goal: 1 },
  { id: 'persist', icon: '💪', label: 'ما يستسلم', desc: 'أكمل 10 جولات', val: (st) => st.rounds, goal: 10 },
  { id: 'bot', icon: '🤖', label: 'خصم الكمبيوتر', desc: 'فز على الكمبيوتر', val: (st) => st.winsVsBots, goal: 1 },
];

const freshStats = () => ({
  rounds: 0, wins: 0, left: 0, bestScore: null, byGame: {}, winsByGame: {}, lastGame: null,
  vsBots: 0, vsFriends: 0, winsVsBots: 0, winsVsHumans: 0, humanGames: 0, games: {},
});
const fresh = () => ({ v: 1, since: Date.now(), saved: false, avatar: 'brain', color: 'violet', frame: 'plain', title: 'new', stats: freshStats(), recorded: [] });

export const points = (st) => st.rounds * 10 + st.wins * 20 + (st.bonus || 0) * 10;
export const levelOf = (st) => 1 + Math.floor(points(st) / 100);

export function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
    store.persistent = true;
  } catch {
    store.persistent = false;
    return mem ?? (mem = fresh());
  }
  if (!raw) return mem ?? (mem = fresh());
  try {
    const p = JSON.parse(raw);
    if (p && p.v === 1) return (mem = { ...fresh(), ...p, stats: { ...freshStats(), ...(p.stats || {}) } });
  } catch {
    /* بيانات تالفة: نبدأ من جديد */
  }
  return (mem = fresh());
}

export function save(p) {
  mem = p;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
    store.persistent = true;
  } catch {
    store.persistent = false;
  }
  return p;
}

export function clearAll() {
  mem = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ما فيه تخزين أصلاً */
  }
  return load();
}

/** يتأكد إن اللقب والإطار المحفوظين لسا مفتوحين (لو تلف التخزين أو تعدّل يدوياً) */
export function sanitize(p) {
  const st = p.stats;
  const t = TITLES.find((x) => x.id === p.title);
  if (!t || !t.need(st)) p.title = 'new';
  const f = FRAMES.find((x) => x.id === p.frame);
  if (!f || (f.need && !f.need(st))) p.frame = 'plain';
  if (!AVATARS.some((a) => a.id === p.avatar)) p.avatar = 'brain';
  if (!COLORS.some((c) => c.id === p.color)) p.color = 'violet';
  return p;
}

/**
 * يسجّل لعبة منتهية في إحصائيات اللاعب. نتيجة اللعبة تجي من الخادم (room.outcome).
 * الكمبيوتر ما يدخل في الإحصائيات أبداً: نحسب لك أنت فقط، وما نعتبر الكمبيوتر «شخص حقيقي».
 */
export function recordFinished(room, myId) {
  if (!room || room.status !== 'finished' || !room.outcome || !room.gameNo) return false;
  const me = room.players.find((p) => p.id === myId);
  if (!me || me.left) return false;
  const p = load();
  const key = `${room.code}:${room.gameNo}`;
  if (p.recorded.includes(key)) return false;
  const st = p.stats;
  const won = room.outcome.winners.includes(myId);
  const others = room.players.filter((x) => !x.bot && x.id !== myId);
  st.rounds++;
  if (won) st.wins++;
  st.byGame[room.gameId] = (st.byGame[room.gameId] ?? 0) + 1;
  if (won) st.winsByGame[room.gameId] = (st.winsByGame[room.gameId] ?? 0) + 1;
  st.lastGame = room.gameId;
  if (room.mode === 'bots') {
    st.vsBots++;
    if (won) st.winsVsBots++;
  } else st.vsFriends++;
  if (others.length > 0) {
    st.humanGames++;
    if (won) st.winsVsHumans++;
  }
  const g = (st.games[room.gameId] ??= { rounds: 0, wins: 0, streak: 0, bestStreak: 0, best: null });
  g.rounds++;
  if (won) { g.wins++; g.streak++; g.bestStreak = Math.max(g.bestStreak, g.streak); } else g.streak = 0;
  const sc = room.outcome.scores?.[myId];
  if (typeof sc === 'number' && (g.best === null || sc > g.best)) g.best = sc;
  if (typeof sc === 'number' && (st.bestScore === null || sc > st.bestScore)) st.bestScore = sc;
  p.recorded = [...p.recorded, key].slice(-200);
  save(p);
  return true;
}

/** خروج قبل نهاية اللعبة */
export function recordLeftEarly(room) {
  if (!room || room.status !== 'playing' || !room.gameNo) return;
  const p = load();
  const key = `${room.code}:${room.gameNo}:left`;
  if (p.recorded.includes(key)) return;
  p.stats.left++;
  p.recorded = [...p.recorded, key].slice(-200);
  save(p);
}

/* ---------------- الرسم ---------------- */
const SHAPES = {
  // R68z33: الافتراضي صار شخصية خليجية (غترة وعقال وبشت) بدال رسمة المخ — المعرّف نفسه عشان الحسابات القديمة
  brain: `<path d="M5 64c2-12 12-18 27-18s25 6 27 18z" fill="#15151d"/><path d="M26 46l6 14 6-14z" fill="#fbfbfd"/><path d="M25.5 46.5L32 61l6.5-14.5" fill="none" stroke="#e3b23c" stroke-width="1.8" stroke-linejoin="round"/><path d="M13 31c0-14 8-22 19-22s19 8 19 22l2 18c-6-1-10-4-12-8H23c-2 4-6 7-12 8z" fill="#f7f7fa" stroke="#cfd2dc" stroke-width=".8"/><ellipse cx="32" cy="30" rx="9.6" ry="11.6" fill="#d8a274"/><path d="M22.6 31.5c0 8.5 4.6 12.4 9.4 12.4s9.4-3.9 9.4-12.4c-2 4.4-5 5.6-9.4 5.6s-7.4-1.2-9.4-5.6z" fill="#2a1c13"/><path d="M27.4 35.2q4.6-1.6 9.2 0" fill="none" stroke="#1a110b" stroke-width="2" stroke-linecap="round"/><path d="M28.8 37.8q3.2 2.6 6.4 0" fill="none" stroke="#e8b48e" stroke-width="1.5" stroke-linecap="round"/><circle cx="28.2" cy="28.6" r="1.3" fill="#1b120c"/><circle cx="35.8" cy="28.6" r="1.3" fill="#1b120c"/><path d="M25.6 25.4q2.5-1.6 4.8-.4M33.6 25q2.5-1.2 4.8.4" fill="none" stroke="#2a1c13" stroke-width="1.2" stroke-linecap="round"/><path d="M20.6 25c1-8 5.6-11.4 11.4-11.4S42.4 17 43.4 25c-3-3.6-7-4.8-11.4-4.8s-8.4 1.2-11.4 4.8z" fill="#f7f7fa"/><ellipse cx="32" cy="15.6" rx="12.4" ry="3.2" fill="none" stroke="#121218" stroke-width="2.6"/><ellipse cx="32" cy="12.6" rx="11" ry="2.6" fill="none" stroke="#121218" stroke-width="2.2"/>`,
  boy: `<path d="M8 64c2-11 11-16 24-16s22 5 24 16z" fill="#f7f7fa"/><path d="M29 48h6l-3 7z" fill="#d9dce6"/><ellipse cx="32" cy="31" rx="12" ry="13" fill="#e2ad7e"/><path d="M19.6 29c-1-10 5-16 12.4-16s13.4 6 12.4 16c-2-5-5-7.6-8.4-8.4-2.4 2.4-7 3.4-11 2.6-2.4 1.2-4 3-5.4 5.8z" fill="#2b1b12"/><circle cx="27.4" cy="31" r="1.6" fill="#1b120c"/><circle cx="36.6" cy="31" r="1.6" fill="#1b120c"/><circle cx="27.9" cy="30.4" r=".5" fill="#fff"/><circle cx="37.1" cy="30.4" r=".5" fill="#fff"/><path d="M27.4 37.4q4.6 4 9.2 0" fill="none" stroke="#7a3b22" stroke-width="1.8" stroke-linecap="round"/><circle cx="23.6" cy="35.2" r="2" fill="#f08a7a" opacity=".45"/><circle cx="40.4" cy="35.2" r="2" fill="#f08a7a" opacity=".45"/><ellipse cx="19.6" cy="32" rx="1.8" ry="2.6" fill="#d89c6c"/><ellipse cx="44.4" cy="32" rx="1.8" ry="2.6" fill="#d89c6c"/>`,
  smart: `<g fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><circle cx="23" cy="29" r="8"/><circle cx="41" cy="29" r="8"/><path d="M31 29h2M15 27l-4-3M49 27l4-3M24 46q8 6 16 0"/></g><circle cx="23" cy="29" r="2.5" fill="#fff"/><circle cx="41" cy="29" r="2.5" fill="#fff"/><path d="M26 14q6-6 12 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
  robot: `<g fill="rgba(255,255,255,.18)" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="20" width="36" height="30" rx="8"/><path d="M32 20v-8"/></g><circle cx="32" cy="10" r="3.5" fill="#fff"/><rect x="21" y="30" width="7" height="7" rx="2" fill="#fff"/><rect x="36" y="30" width="7" height="7" rx="2" fill="#fff"/><path d="M24 43h16" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
  smile: `<circle cx="23" cy="26" r="3.8" fill="#fff"/><circle cx="41" cy="26" r="3.8" fill="#fff"/><path d="M19 38q13 15 26 0" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>`,
  star: `<path d="M32 10l6.6 14.4 15.8 1.8-11.8 10.7 3.3 15.5L32 44.4 18.1 52.4l3.3-15.5L9.6 26.2l15.8-1.8z" fill="#fff" fill-opacity=".92" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>`,
  crown: `<path d="M12 46l-3-24 14 12 9-16 9 16 14-12-3 24z" fill="rgba(255,255,255,.9)" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/><circle cx="9" cy="22" r="3" fill="#fff"/><circle cx="32" cy="14" r="3" fill="#fff"/><circle cx="55" cy="22" r="3" fill="#fff"/>`,
};

export function avatarHTML(p, size = 96) {
  const c = COLORS.find((x) => x.id === p.color) ?? COLORS[0];
  const gid = 'ag' + Math.random().toString(36).slice(2, 8);
  return `<span class="avatar-wrap frame-${esc(p.frame)}" style="--sz:${size}px;--ac:${c.hex}">
    <svg class="avatar-svg" viewBox="0 0 64 64" role="img" aria-label="الأفاتار">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.hex}"/><stop offset="1" stop-color="#241b55"/></linearGradient></defs>
      <rect width="64" height="64" rx="18" fill="url(#${gid})"/>
      ${SHAPES[p.avatar] ?? SHAPES.brain}
    </svg></span>`;
}

/* ---------------- الواجهات ---------------- */
const num = (n) => new Intl.NumberFormat('ar-EG-u-nu-latn').format(n);

function sinceText(p) {
  const d = Math.floor((Date.now() - (p.since || Date.now())) / 86400000);
  return d < 1 ? 'انضممت اليوم' : d === 1 ? 'منذ يوم' : d === 2 ? 'منذ يومين' : d <= 10 ? `منذ ${num(d)} أيام` : `منذ ${num(d)} يوم`;
}

export function gamesStatsHTML(p, gameInfo) {
  const ids = Object.keys(p.stats.games);
  if (!ids.length) return '';
  return `<h2 class="section-title" style="margin:0 4px">إحصائيات الألعاب</h2>` + ids.map((id) => {
    const g = p.stats.games[id], gi = gameInfo(id);
    return `<section class="card"><h3>${esc(gi?.icon ?? '🎮')} ${esc(gi?.name ?? id)}</h3>
      <dl class="dl" style="margin-top:10px">
        <div><dt>الجولات</dt><dd>${num(g.rounds)}</dd></div>
        <div><dt>مرات الفوز</dt><dd>${num(g.wins)}</dd></div>
        <div><dt>النقاط</dt><dd>${num(g.rounds * 10 + g.wins * 20)}</dd></div>
        <div><dt>أفضل سلسلة فوز</dt><dd>${num(g.bestStreak)}</dd></div>
        ${g.best === null ? '' : `<div><dt>أفضل نتيجة</dt><dd>${num(g.best)}</dd></div>`}
      </dl></section>`;
  }).join('');
}

export function cardHTML(p, userName) {
  const st = p.stats;
  const title = TITLES.find((t) => t.id === p.title) ?? TITLES[0];
  return `<section class="card char-card glow">
    ${avatarHTML(p, 112)}
    <h2 class="char-name">${esc(userName || 'لاعب')}</h2>
    <span class="badge gold">${esc(title.label)}</span>
    <small class="muted">${sinceText(p)}</small>
    <div class="mini-grid">
      <div class="mini"><b>${num(levelOf(st))}</b><span>المستوى</span></div>
      <div class="mini"><b>${num(points(st))}</b><span>النقاط</span></div>
      <div class="mini"><b>${num(st.rounds)}</b><span>الجولات</span></div>
      <div class="mini"><b>${num(st.wins)}</b><span>مرات الفوز</span></div>
      <div class="mini"><b>${num(st.vsBots)}</b><span>مع الكمبيوتر</span></div>
      <div class="mini"><b>${num(st.vsFriends)}</b><span>مع الأصدقاء</span></div>
    </div>
  </section>`;
}

export function editorHTML(d, st, userName) {
  const opt = (k, items, cur, extra) =>
    items
      .map((it) => {
        const locked = it.need && !it.need(st);
        return `<button class="pick ${cur === it.id ? 'on' : ''} ${locked ? 'locked' : ''}" type="button" ${locked ? 'disabled' : `data-act="pf-pick" data-k="${k}" data-v="${esc(it.id)}"`} aria-pressed="${cur === it.id}">
          ${extra ? extra(it) : ''}<span>${esc(it.label)}</span>${locked ? `<small>🔒 ${esc(it.why)}</small>` : ''}</button>`;
      })
      .join('');
  return `<section class="card char-card glow">
    <h2>صمّم شخصيتك</h2>
    <p class="hint">المعاينة تتغير فوراً، وما ينحفظ شي إلا لما تضغط «حفظ التغييرات».</p>
    ${avatarHTML(d, 112)}
    <h3 class="char-name">${esc(userName || 'لاعب')}</h3>
    <span class="badge gold">${esc((TITLES.find((t) => t.id === d.title) ?? TITLES[0]).label)}</span>
  </section>
  <section class="card"><h3>شكل الشخصية</h3><div class="picks">${opt('avatar', AVATARS, d.avatar, (it) => avatarHTML({ ...d, avatar: it.id, frame: 'plain' }, 44))}</div></section>
  <section class="card"><h3>اللون</h3><div class="picks">${opt('color', COLORS, d.color, (it) => `<i class="sw" style="background:${it.hex}"></i>`)}</div></section>
  <section class="card"><h3>الإطار</h3><div class="picks">${opt('frame', FRAMES, d.frame)}</div></section>
  <section class="card"><h3>اللقب</h3><div class="picks col">${opt('title', TITLES, d.title)}</div></section>
  <section class="card form">
    <button class="btn block" type="button" data-act="pf-save">حفظ التغييرات</button>
    <button class="btn ghost block" type="button" data-act="pf-cancel">إلغاء</button>
  </section>`;
}

export function statsHTML(p, gameName) {
  const st = p.stats;
  if (st.rounds === 0 && st.left === 0) {
    return `<section class="card"><h2>إحصائياتي</h2><p class="muted" style="margin-top:8px">بتظهر إحصائياتك بعد أول جولة مكتملة.</p><p class="hint" style="margin-top:8px;text-align:start">الإحصائيات تنحفظ على هذا الجهاز فقط.</p></section>`;
  }
  const most = Object.entries(st.byGame).sort((a, b) => b[1] - a[1])[0];
  const rows = [
    ['مجموع النقاط', num(points(st))],
    ['الجولات المكتملة', num(st.rounds)],
    ['مرات الفوز', num(st.wins)],
    ['مرات الخروج قبل النهاية', num(st.left)],
    ['أفضل نتيجة', st.bestScore === null ? '—' : num(st.bestScore)],
    ['اللعبة الأكثر لعباً', most ? `${esc(gameName(most[0]))} (${num(most[1])})` : '—'],
    ['آخر لعبة', st.lastGame ? esc(gameName(st.lastGame)) : '—'],
    ['اللعب مع الكمبيوتر', num(st.vsBots)],
    ['اللعب مع الأصدقاء', num(st.vsFriends)],
  ];
  return `<section class="card"><h2 style="margin-bottom:12px">إحصائياتي</h2>
    <dl class="dl">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    <p class="hint" style="margin-top:12px;text-align:start">من جولاتك المكتملة على هذا الجهاز فقط. الكمبيوتر ما يدخل في إحصائياتك كلاعب.</p></section>`;
}

export function achievementsHTML(p) {
  const st = p.stats;
  return `<section class="card"><h2 style="margin-bottom:12px">إنجازاتي</h2><ul class="ach">${ACHIEVEMENTS.map((a) => {
    const v = a.val(st);
    const done = v >= a.goal;
    return `<li class="${done ? 'done' : ''}"><span class="ach-ico" aria-hidden="true">${done ? a.icon : '🔒'}</span>
      <div><b>${esc(a.label)}</b><small>${esc(a.desc)}${done ? ' · تحقق ✅' : ` · ${num(Math.min(v, a.goal))}/${num(a.goal)}`}</small></div></li>`;
  }).join('')}</ul></section>`;
}

/* ---------- الملف الفاخر: الأرقام هنا من الخادم (/api/account)، والشخصية واللقب من الجهاز ---------- */
const GAMES3 = ['jackaro', 'baloot', 'ludo'];
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

/** صورة مرفوعة (من الخادم) بنفس مقاس الأفاتار؛ ver = رقم نسخة الصورة */
export function photoHTML(size, ver, name = '') {
  return `<span class="avatar-wrap pf-photo" style="--sz:${size}px"><img src="/api/avatar?v=${encodeURIComponent(ver)}" alt="صورة ${esc(name || 'اللاعب')}" width="${size}" height="${size}" decoding="async"></span>`;
}

/** رأس الملف. me = بيانات الخادم أو null (تحميل/فشل) فنخفي الأرقام بدل ما نخترعها */
export function heroHTML(p, userName, me, acct) {
  const title = TITLES.find((t) => t.id === p.title) ?? TITLES[0];
  let server = '';
  if (me) {
    const span = Math.max(1, me.xpNext - me.xpFloor);
    const w = Math.min(100, Math.round(((me.xp - me.xpFloor) / span) * 100));
    // كل الأرقام من الخادم (me)؛ نسبة الفوز تُحسب من مبارياته وانتصاراته الفعلية
    server = `<div class="pf-lv"><div class="pf-lvrow"><span>المستوى ${num(me.level)}</span><span>${num(me.level + 1)}</span></div>
        <div class="pf-xp" role="progressbar" aria-valuemin="0" aria-valuemax="${span}" aria-valuenow="${me.xp - me.xpFloor}" aria-label="التقدم إلى المستوى التالي"><i style="width:${w}%"></i></div>
        <small>${num(me.xp - me.xpFloor)} / ${num(span)} خبرة للمستوى التالي</small></div>
      <div class="pf-chips">
        <div><i aria-hidden="true">🏆</i><b>${num(me.points)}</b><span>نقاط التصنيف</span></div>
        <div><i aria-hidden="true">🪙</i><b>${num(me.coins)}</b><span>العملات</span></div>
      </div>
      <div class="pf-chips pf-chips2">
        <div><b>${num(me.played)}</b><span>مباريات</span></div>
        <div><b>${num(me.wins)}</b><span>انتصارات</span></div>
        <div><b>${me.played ? pct(me.wins, me.played) + '%' : '—'}</b><span>نسبة الفوز</span></div>
      </div>`;
  } else if (acct.loading) server = '<p class="pf-note" role="status">جاري تحميل بياناتك من الخادم…</p>';
  else server = `<p class="pf-note bad" role="alert">${esc(acct.err || 'ما قدرنا نحمّل بياناتك من الخادم.')} <button class="pill-btn" type="button" data-act="pf-reload">إعادة المحاولة</button></p>`;
  const eq = me?.equipped ?? {};
  const artMap = eq.avatar?.id?.startsWith('ref-k-') ? ACHIEVEMENT_ART_KIDS : ACHIEVEMENT_ART;
  const badgeArt = artMap[eq.badge?.id], titleArt = artMap[eq.title?.id];
  const photo = eq.avatar ? avatarArt(eq.avatar.id, 112) || avatarHTML(p, 112) : me?.avatar ? photoHTML(112, me.avatar, userName) : avatarHTML(p, 112);
  const bg2 = eq.bg && isBg2(eq.bg.css); const fr2 = eq.frame && isFrame2(eq.frame.css);
  const bgc = eq.bg && !bg2 ? ' bg-' + esc(eq.bg.css) : '';
  return `<section class="pf-hero pf-royal${bgc}">
    <div class="pf-banner${bg2 ? ' cx-banner' : ''}" aria-hidden="true">${bg2 ? bgArt(eq.bg.css, 'cx-fill') : `<svg viewBox="0 0 400 90" preserveAspectRatio="none"><defs><pattern id="pfp" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M14 2l12 12-12 12L2 14z" fill="none" stroke="rgba(255,209,102,.22)" stroke-width="1.2"/></pattern></defs><rect width="400" height="90" fill="url(#pfp)"/></svg>`}</div>
    <div class="pf-id">
      <button class="pf-avbtn pf-medal" type="button" data-act="av-pick" aria-label="تغيير الصورة الشخصية"><span class="pf-ring${fr2 ? ' cx-pring' : eq.frame ? ' fr-' + esc(eq.frame.css) : ''}">${photo}${fr2 ? frameArt(eq.frame.css) : ''}</span>${me ? `<b class="pf-lvgem" aria-label="المستوى ${num(me.level)}">${num(me.level)}</b>` : ''}<i class="pf-cam" aria-hidden="true">📷</i></button>
      <div class="pf-who"><h2 class="pf-name">${eq.badge ? '<span aria-label="' + esc(eq.badge.name) + '">' + (badgeArt ? referenceImage(badgeArt, 'ref-equipped-badge') : esc(eq.badge.css)) + '</span> ' : ''}${esc(me?.name || userName || 'لاعب')}</h2>
        <span class="badge gold cx-title r-${esc(eq.title?.rarity ?? 'common')}">${titleArt ? referenceImage(titleArt, 'ref-equipped-title') : esc(eq.title ? eq.title.css : 'لاعب جديد')}${eq.title?.earned ? ' <small>🏅 مكتسب</small>' : ''}</span>
        <small>${me ? 'رقم اللاعب: <bdi dir="ltr" class="pf-num">' + esc(me.id) + '</bdi> · ' + (me.rank ? 'الترتيب #' + num(me.rank) + ' · ' : '') : ''}${sinceText(me || p)}</small></div></div>
    ${server}
    ${me?.avatar && eq.avatar ? '<p class="pf-note">صورتك المرفوعة محفوظة، لكن أفاتار المتجر مجهّز حاليًا. لإظهار الصورة، افتح المتجر واضغط «إزالة» على الأفاتار المجهّز؛ ما بتفقد ملكيته.</p>' : ''}
    ${me ? '<p class="pf-legend"><b>🪙 العملات</b> افتراضية بلا قيمة مالية؛ التحويل يخضع لسياسة المالك المفعّلة · <b>🏆 نقاط التصنيف</b> للترتيب فقط، وتنحسب من مباريات فيها لاعبان حقيقيان فأكثر.</p>' : ''}
    <div class="btn-row pf-acts"><button class="btn" type="button" data-act="av-pick">${me?.avatar ? 'استبدال الصورة' : 'رفع صورة'}</button>${me?.avatar ? '<button class="btn ghost" type="button" data-act="av-del">حذف الصورة</button>' : ''}<a class="btn gold" href="#/shop">🛍️ المتجر</a><button class="btn ghost" type="button" data-act="pf-edit">${p.saved ? 'تعديل الشخصية' : 'صمّم شخصيتك'}</button></div>
  </section>`;
}

/** إحصائيات الخادم: الإجمالي وكل لعبة من الألعاب الثلاث + آخر الألعاب */
export function serverStatsHTML(me, acct, gameName) {
  if (!me) return `<section class="card"><h2>إحصائياتي</h2><p class="muted" style="margin-top:8px">${acct.loading ? 'جاري التحميل…' : esc(acct.err || 'تعذّر التحميل.')}</p></section>`;
  if (!me.played) {
    return `<section class="card empty-state"><span class="es-ic" aria-hidden="true">📊</span><h2>إحصائياتي</h2><p>ما لعبت ولا لعبة منتهية للحين. بعد أول لعبة تظهر هنا مبارياتك وفوزك ونقاطك.</p><a class="btn" href="#/lobby">روح للصالة</a></section>`;
  }
  // كل لعبة لعبتها فعلاً (من سجل الخادم)، والترتيب متاح للألعاب الثلاث الكبيرة فقط
  const ids = [...new Set([...GAMES3, ...Object.keys(me.allGames ?? {})])];
  const rows = ids.map((id) => {
    const g = me.stats?.[id] ?? (me.allGames?.[id] ? { ...me.allGames[id], losses: me.allGames[id].played - me.allGames[id].won, points: null, rank: null } : null);
    if (!g || (!g.played && !GAMES3.includes(id))) return '';
    return `<li><b>${esc(gameName(id))}</b>${g.played ? `<span>${num(g.played)} مباراة · ${num(g.won)} فوز · ${num(g.losses)} خسارة · ${pct(g.won, g.played)}%</span>${g.points !== null ? `<small>${num(g.points)} نقطة${g.rank ? ' · ترتيبك #' + num(g.rank) : ''}</small>` : ''}` : '<span class="muted">ما لعبتها للحين</span>'}</li>`;
  }).join('');
  return `<section class="card"><h2>إحصائياتي</h2>
    <div class="pf-grid"><div><b>${num(me.played)}</b><span>إجمالي المباريات</span></div><div><b>${num(me.wins)}</b><span>الانتصارات</span></div><div><b>${pct(me.wins, me.played)}%</b><span>نسبة الفوز</span></div><div><b>${num(me.points)}</b><span>مجموع النقاط</span></div></div>
    <ul class="pf-games">${rows}</ul>
    <p class="hint" style="text-align:start">من مباريات منتهية أكّدها الخادم. النقاط فقط من مباريات فيها لاعبان حقيقيان فأكثر، واللعب ضد الكمبيوتر يعطي خبرة بدون نقاط.</p></section>`;
}
