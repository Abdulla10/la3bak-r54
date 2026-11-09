/* تحدي اليوم + السلسلة + المهام. كله محفوظ على الجهاز؛ والنجوم تضيف نقاط لمستوى شخصيتك. */
import * as PF from './profile.js?v=r67an';

const MKEY = 'qa_missions_v1';
const DKEY = 'qa_daily_v1';
const GULF = 4 * 3600_000;
const DAY = 86400_000;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const num = (n) => new Intl.NumberFormat('ar-EG-u-nu-latn').format(n);

export const gulfDay = (now = Date.now()) => new Date(now + GULF).toISOString().slice(0, 10);
const dayNo = (key) => Math.floor(Date.parse(key + 'T00:00:00Z') / DAY);
// الأسبوع يبدأ السبت: 1970-01-03 كان سبت
export const weekKey = (now = Date.now()) => Math.floor((dayNo(gulfDay(now)) - 2) / 7);

const rd = (k, d) => { try { return { ...d, ...(JSON.parse(localStorage.getItem(k) || 'null') || {}) }; } catch { return d; } };
const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ما فيه تخزين */ } };

/* ---------------- تحدي اليوم ---------------- */
export function daily(now = Date.now()) {
  const d = rd(DKEY, { last: '', streak: 0, best: 0, score: 0, ok: 0, total: 0, days: 0 });
  const today = gulfDay(now);
  const gap = d.last ? dayNo(today) - dayNo(d.last) : null;
  return { ...d, today, doneToday: d.last === today, live: d.last && gap !== null && gap <= 1 ? d.streak : 0 };
}
export function recordDaily(score, ok, total, now = Date.now()) {
  const d = daily(now);
  if (d.doneToday) return d;
  const gap = d.last ? dayNo(d.today) - dayNo(d.last) : null;
  const streak = gap === 1 ? d.streak + 1 : 1;
  const next = { last: d.today, streak, best: Math.max(d.best, streak), score, ok, total, days: d.days + 1 };
  wr(DKEY, next);
  event('daily');
  return daily(now);
}

/* ---------------- المهام ---------------- */
const MISSIONS = [
  { id: 'play', scope: 'd', label: 'العب لعبة وحدة', c: 'played', need: 1, stars: 1 },
  { id: 'win', scope: 'd', label: 'اربح لعبة', c: 'won', need: 1, stars: 2 },
  { id: 'daily', scope: 'd', label: 'حلّ تحدي اليوم', c: 'daily', need: 1, stars: 2 },
  { id: 'friend', scope: 'd', label: 'العب مع صديق حقيقي', c: 'friends', need: 1, stars: 2 },
  { id: 'offline', scope: 'd', label: 'العب جولة على نفس الجهاز', c: 'offline', need: 1, stars: 1 },
  { id: 'w10', scope: 'w', label: 'العب 10 ألعاب هالأسبوع', c: 'played', need: 10, stars: 5 },
  { id: 'w3win', scope: 'w', label: 'اربح 3 ألعاب هالأسبوع', c: 'won', need: 3, stars: 5 },
];

function state(now = Date.now()) {
  const s = rd(MKEY, { day: '', week: -1, c: {}, wc: {}, claimed: {} });
  const day = gulfDay(now), wk = weekKey(now);
  if (s.day !== day) { s.day = day; s.c = {}; for (const k of Object.keys(s.claimed)) if (k.startsWith('d:')) delete s.claimed[k]; }
  if (s.week !== wk) { s.week = wk; s.wc = {}; for (const k of Object.keys(s.claimed)) if (k.startsWith('w:')) delete s.claimed[k]; }
  return s;
}
export function event(name, now = Date.now()) {
  const s = state(now);
  s.c[name] = (s.c[name] || 0) + 1;
  s.wc[name] = (s.wc[name] || 0) + 1;
  wr(MKEY, s);
}
export function claim(id) {
  const m = MISSIONS.find((x) => x.id === id);
  if (!m) return 0;
  const s = state();
  const key = `${m.scope}:${m.id}`;
  const have = (m.scope === 'd' ? s.c : s.wc)[m.c] || 0;
  if (s.claimed[key] || have < m.need) return 0;
  s.claimed[key] = true;
  wr(MKEY, s);
  const p = PF.load();
  p.stats.bonus = (p.stats.bonus || 0) + m.stars;
  PF.save(p);
  return m.stars;
}
export const stars = () => PF.load().stats.bonus || 0;

export function missionsHTML() {
  const s = state();
  const row = (m) => {
    const have = Math.min(m.need, (m.scope === 'd' ? s.c : s.wc)[m.c] || 0);
    const done = have >= m.need;
    const got = !!s.claimed[`${m.scope}:${m.id}`];
    return `<li class="ms ${done ? 'done' : ''}"><div><b>${esc(m.label)}</b><small>${num(have)} / ${num(m.need)}</small><i class="ms-bar"><u style="width:${(have / m.need) * 100}%"></u></i></div>
      ${got ? '<span class="badge live">استلمتها ✅</span>' : done ? `<button class="btn" type="button" data-act="ms-claim" data-id="${m.id}">استلم ⭐${m.stars}</button>` : `<span class="badge">⭐${m.stars}</span>`}</li>`;
  };
  return `<section class="card"><h2>مهام اليوم</h2><ul class="ms-list">${MISSIONS.filter((m) => m.scope === 'd').map(row).join('')}</ul></section>
    <section class="card"><h2>مهام الأسبوع</h2><ul class="ms-list">${MISSIONS.filter((m) => m.scope === 'w').map(row).join('')}</ul>
    <p class="hint" style="text-align:start">كل نجمة = 10 نقاط تزيد مستوى شخصيتك. المهام تتصفّر يومياً وأسبوعياً (السبت).</p></section>`;
}
