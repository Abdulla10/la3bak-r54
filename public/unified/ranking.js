import { mini } from '../avatars.js?v=r58l';

// Read-only ranking UI. Scoring and ordering belong exclusively to the server.
const GAME_NAMES = Object.freeze({ jackaro: 'جكارو', baloot: 'بلوت', ludo: 'لودو' });
const PERIODS = ['all', 'weekly', 'monthly'];
const SCOPES = [...PERIODS, ...Object.keys(GAME_NAMES)];
const nf = new Intl.NumberFormat('ar-AE-u-nu-latn');
const df = new Intl.DateTimeFormat('ar-AE-u-nu-latn', {
  timeZone: 'Asia/Dubai', day: 'numeric', month: 'long', year: 'numeric',
});
const coverageDf = new Intl.DateTimeFormat('ar-AE-u-nu-latn', {
  timeZone: 'Asia/Dubai', day: 'numeric', month: 'long', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
});
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[c]);
const num = (value) => esc(nf.format(value));
const integer = (value) => Number.isSafeInteger(value) && value >= 0;
const timestamp = (value) => integer(value) && value < 8640000000000000 - 4 * 3600_000;
const signedIn = (ctx) => Boolean(ctx.user?.id || ctx.me?.id);
const canRead = (ctx) => typeof ctx.api === 'function';
const trophy = () => '<svg class="lb-rank-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3h8v6a4 4 0 0 1-8 0Zm0 2H3v2a5 5 0 0 0 5 5m8-7h5v2a5 5 0 0 1-5 5m-4 1v5m-5 3h10m-8-3h6"/></svg>';

function validRow(row) {
  return row && typeof row.name === 'string' && integer(row.rank) && row.rank > 0
    && ['points', 'wins', 'games'].every((key) => integer(row[key]))
    && row.wins <= row.games && typeof row.me === 'boolean';
}
function validData(data, scope) {
  if (!data || !integer(data.total) || !Array.isArray(data.list) || data.list.length > 20
    || data.list.length > data.total || !data.list.every(validRow)
    || (data.mine != null && !validRow(data.mine))) return false;
  if (data.list.some((row, i) => row.rank !== i + 1 || row.rank > data.total)) return false;
  if (data.mine && (data.mine.rank > data.total || !data.mine.me)) return false;
  if (scope === 'weekly') return timestamp(data.weekStart) && timestamp(data.resetsAt)
    && data.resetsAt > data.weekStart;
  if (scope === 'monthly') {
    // Reject the old weekly-only route response; never label weekly points as monthly.
    if (data.period !== 'monthly' || data.timeZone !== 'Asia/Dubai'
      || !timestamp(data.monthStart) || !timestamp(data.resetsAt)
      || !data.coverage || !timestamp(data.coverage.trackingSince)) return false;
    const local = new Date(data.monthStart + 4 * 3600_000);
    if (local.getUTCDate() !== 1 || local.getUTCHours() !== 0 || local.getUTCMinutes() !== 0
      || local.getUTCSeconds() !== 0 || local.getUTCMilliseconds() !== 0) return false;
    local.setUTCMonth(local.getUTCMonth() + 1);
    if (data.resetsAt !== local.getTime() - 4 * 3600_000) return false;
    const since = data.coverage.trackingSince;
    return data.coverage.complete === (since <= data.monthStart)
      && data.coverage.from === (since < data.resetsAt ? Math.max(since, data.monthStart) : null);
  }
  return data.game === scope;
}
function initialState(ctx) {
  const overall = ctx.rankings?.data ?? ctx.rankings;
  const board = ctx.board?.data ?? ctx.board;
  // Overall is the supplied design's default; keep the existing passed-board fallback when offline.
  const scope = !canRead(ctx) && !validData(overall, 'all') && validData(board, 'weekly') ? 'weekly' : 'all';
  const data = scope === 'weekly' ? board : validData(overall, 'all') ? overall : null;
  return { view: 'general', scope, generalScope: scope, gameScope: 'jackaro', data,
    loading: !data && canRead(ctx), error: !canRead(ctx) && !data ? 'unsupported' : '', revision: 0 };
}
function label(scope) {
  return scope === 'weekly' ? 'الصدارة الأسبوعية' : scope === 'monthly' ? 'الصدارة الشهرية'
    : scope === 'all' ? 'الترتيب العام — كل الفترات' : `ترتيب ${GAME_NAMES[scope]}`;
}
function avatar(row, size = 46) {
  const av = typeof row.av === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(row.av) ? row.av : null;
  const art = mini(av, size);
  return `<span class="avatar lb-rank-avatar" aria-hidden="true">${art || esc(Array.from(row.name.trim())[0] || '؟')}</span>`;
}
function stats(row) {
  return `${num(row.wins)} فوز · ${num(row.games)} مباراة`;
}
function points(row) {
  return `<span class="lb-rank-points"><b>${num(row.points)}</b><small>نقطة تصنيف</small></span>`;
}
function rowHTML(row) {
  return `<li class="list-row rankrow${row.me ? ' lb-rank-me' : ''}"><span class="lb-rank-number" aria-label="المرتبة ${num(row.rank)}">${num(row.rank)}</span>${avatar(row)}<div class="grow"><b class="lb-rank-name">${esc(row.name)}${row.me ? ' <span class="tag">إنت</span>' : ''}</b><small>${stats(row)}</small></div>${points(row)}</li>`;
}
function podiumHTML(rows) {
  if (!rows.length) return '';
  return `<details class="lb-rank-podium-toggle"><summary>عرض أول ثلاثة على منصة الصدارة</summary><section class="grid3 podium lb-rank-podium" aria-label="أول ثلاثة في الترتيب">${rows.map((row) => `<article class="card lb-rank-podium-card lb-rank-place-${row.rank}${row.me ? ' lb-rank-me' : ''}"><div class="lb-rank-podium-place">${trophy()}<span>المركز ${num(row.rank)}</span></div><div class="card-art">${avatar(row, 64)}</div><h3 class="lb-rank-name">${esc(row.name)}${row.me ? ' <span class="tag">إنت</span>' : ''}</h3>${points(row)}<p>${stats(row)}</p></article>`).join('')}</section></details>`;
}
function controls(state, ctx) {
  const unavailable = canRead(ctx) ? '' : ' disabled';
  const button = (view, title) => `<button type="button" data-lb-rank-view="${view}" class="${state.view === view ? 'active' : ''}" aria-pressed="${state.view === view}"${unavailable}>${title}</button>`;
  const choices = state.view === 'games' ? Object.entries(GAME_NAMES) : [['all', 'عام'], ['weekly', 'الأسبوع'], ['monthly', 'الشهر']];
  return `<div class="tabs" role="group" aria-label="نوع الترتيب">${button('general', 'الترتيب العام')}<button type="button" disabled title="ما فيه واجهة لترتيب الأصدقاء حالياً">ترتيب الأصدقاء — مب متاح</button>${button('games', 'ترتيب الألعاب')}<button type="button" disabled title="ما فيه بيانات لترتيب الدول حالياً">ترتيب الدول — مب متاح</button></div><div class="tabs filters lb-rank-scope-tabs" role="group" aria-label="نطاق الترتيب">${choices.map(([scope, title]) => `<button type="button" data-lb-rank-scope="${esc(scope)}" class="filter${state.scope === scope ? ' active' : ''}" aria-pressed="${state.scope === scope}"${unavailable}>${esc(title)}</button>`).join('')}</div>`;
}
function stateHTML(state, ctx) {
  if (state.loading) return '<section class="panel lb-rank-state" role="status"><span class="lb-rank-loader" aria-hidden="true"></span><h2>قاعدين نحمّل الترتيب…</h2><p>الأرقام والنتايج تيي من الخادم مباشرة.</p></section>';
  if (state.error) {
    const messages = {
      unsupported: 'ربط قراءة الترتيب مب متاح في هالواجهة الحين. ما بنعرض أرقام بديلة.',
      login: 'الجلسة تحتاج تسجيل دخول. سجّل دخولك وجرّب مرة ثانية.',
      unavailable: 'خدمة الترتيب مب متاحة على هالخادم الحين.',
      invalid: 'البيانات اللي وصلت مب مكتملة. ما بنعرض ترتيب غير مؤكّد.',
      failed: 'ما قدرنا نحمّل الترتيب. تأكّد من اتصالك وجرّب مرة ثانية.',
    };
    return `<section class="panel lb-rank-state" role="alert"><h2>الترتيب مب متاح الحين</h2><p>${esc(messages[state.error] || messages.failed)}</p>${state.error === 'login' ? '<a class="gold-btn" href="#/account">تسجيل الدخول</a>' : ''}${canRead(ctx) ? '<button class="btn" type="button" data-lb-rank-reload>حاول مرة ثانية</button>' : ''}</section>`;
  }
  return '';
}
function periodHTML(data, scope) {
  if (scope === 'weekly') return `<p class="lb-rank-period">بداية الأسبوع: ${esc(df.format(data.weekStart))}<br>التصفير الجاي: ${esc(df.format(data.resetsAt))}، الساعة 12 بالليل بتوقيت الإمارات.</p>`;
  if (scope !== 'monthly') return '<p class="lb-rank-period">هالترتيب تراكمي لكل الفترات، مب ترتيب أسبوعي ولا شهري.</p>';
  const dates = `<p class="lb-rank-period">بداية الشهر: ${esc(df.format(data.monthStart))}<br>التصفير الجاي: ${esc(df.format(data.resetsAt))}، الساعة 12 بالليل بتوقيت الإمارات.</p>`;
  if (data.coverage.complete) return `${dates}<p class="lb-rank-note">التتبع يغطي هالشهر من بدايته، والنقاط تتحدث مع المباريات المنتهية.</p>`;
  const from = data.coverage.from;
  return `${dates}<p class="lb-rank-coverage" role="status"><b>بيانات هالشهر غير مكتملة</b><br>${from == null ? 'ما فيه تغطية مسجلة لهالشهر.' : `النقاط المعروضة من ${esc(coverageDf.format(from))} بتوقيت الإمارات فقط.`} نتائج ما قبل بداية التتبع مب داخلة؛ البيانات الأسبوعية القديمة ما تكفي لحساب شهر دقيق.</p>`;
}
function standings(state, ctx) {
  const status = stateHTML(state, ctx);
  if (status) return status;
  const data = state.data;
  if (!data) return '<section class="panel lb-rank-state" role="status"><p>ما عندنا بيانات ترتيب للعرض الحين.</p></section>';
  const personal = data.mine;
  const partial = state.scope === 'monthly' && !data.coverage.complete;
  const summary = `<div class="grid2 lb-rank-summary"><section class="panel"><h2 class="panel-title">${esc(label(state.scope))}</h2><b class="lb-rank-total">${num(data.total)}</b><span> لاعب في الترتيب</span>${periodHTML(data, state.scope)}</section><section class="panel"><h2 class="panel-title">ترتيبك${partial ? ' — حسب البيانات المتاحة' : ''}</h2>${personal ? `<b class="lb-rank-total">#${num(personal.rank)}</b><p>${num(personal.points)} نقطة تصنيف · ${stats(personal)}</p>` : signedIn(ctx) ? '<p>ما عندك نتائج في البيانات المتاحة لهالترتيب. كمّل مباراة مع لاعب حقيقي عشان نقاطك تنحسب.</p>' : '<p>تقدر تشوف المتصدرين بدون تسجيل. سجّل دخولك عشان تشوف ترتيبك الشخصي.</p><a class="btn" href="#/account">تسجيل الدخول</a>'}</section></div>`;
  if (!data.list.length) return `${summary}<section class="panel lb-rank-state">${trophy()}<h2>ما فيه نتائج متاحة للحين</h2><p>${partial ? 'هذي بيانات جزئية من بداية التتبع، مب دليل على عدم وجود مباريات قبلها.' : 'ما فيه لاعبين في هالترتيب للحين.'} العب مباراة منتهية مع لاعب حقيقي واحد على الأقل عشان تبدأ نقاط التصنيف تنحسب.</p><a class="gold-btn" href="#/rooms">افتح الغرف</a></section>`;
  const ownOutside = personal && !data.list.some((row) => row.rank === personal.rank);
  return `${summary}<section class="panel lb-rank-standings"><div class="panel-title"><h2>قائمة المتصدرين${partial ? ' — جزئية' : ''}</h2><button class="btn lb-rank-refresh" type="button" data-lb-rank-reload${canRead(ctx) ? '' : ' disabled'}>تحديث</button></div><ol class="lb-rank-list">${data.list.map(rowHTML).join('')}</ol>${ownOutside ? `<div class="lb-rank-own"><h3>مكانك خارج قائمة المتصدرين</h3><ol class="lb-rank-list">${rowHTML(personal)}</ol></div>` : ''}<p class="lb-rank-note">ظاهر ${num(data.list.length)} من ${num(data.total)} لاعب. الخادم يرجّع أول 20 لاعب فقط، ومعهم ترتيبك إذا عندك نقاط تصنيف. ما فيه صفحات إضافية متاحة.</p>${podiumHTML(data.list.slice(0, 3))}</section>`;
}
function bodyHTML(state, ctx) {
  return `${controls(state, ctx)}<div class="lb-rank-results" aria-live="polite" aria-busy="${state.loading}">${standings(state, ctx)}</div><section class="panel lb-rank-rules"><h2 class="panel-title">شلون ينحسب الترتيب؟</h2><p>10 نقاط لكل مباراة منتهية، و20 نقطة زيادة للفوز، إذا فيها لاعبين حقيقيين أو أكثر. الكمبيوتر واللعب بروحك ما يزيدون نقاط التصنيف.</p><p>الخادم يرتّب حسب النقاط، عقب عدد الفوز، عقب الأقل مباريات، وعقب الاسم. هذي نقاط تصنيف، مب عملات ولا جواهر.</p><p class="lb-rank-note">عام وترتيب الألعاب لكل الفترات. الأسبوع يبدأ السبت، والشهر هو الشهر التقويمي بتوقيت الإمارات، مب آخر 30 يوم ولا مجموع أسابيع. نقاط الشهر تتجمع من بداية التتبع فقط، وأي نقص قديم يظهر فوق بوضوح.</p><p class="lb-rank-note">ترتيب الألعاب متاح لجكارو وبلوت ولودو بس. ترتيب الأصدقاء والدول مب مدعوم بواجهات البيانات الحالية. هالصفحة للعرض فقط، وما فيها استلام جوائز.</p>${!canRead(ctx) && state.data ? '<p class="lb-rank-note" role="status">هذي البيانات الممرّرة من الصفحة الحالية؛ التحديث وتبديل النطاق يحتاجون ربط واجهة القراءة.</p>' : ''}</section>`;
}

/** Page BODY only. The common shell owns navigation, auth and wallet balances. */
export function render(ctx = {}) {
  const state = initialState(ctx);
  return `<div data-lb-page="ranking" class="lb-ranking-page" dir="rtl"><section class="hero heading"><div class="hero-symbol lb-rank-hero-symbol">${trophy()}</div><div><h1>لوحة المتصدرين</h1><p class="subtitle">النتائج الفعلية من الخادم</p></div></section><div data-lb-ranking-body>${bodyHTML(state, ctx)}</div></div>`;
}

/** ctx.api is the existing authenticated helper: api(path, method, body). */
export function mount(root, ctx = {}) {
  const page = root?.matches?.('[data-lb-page="ranking"]') ? root : root?.querySelector?.('[data-lb-page="ranking"]');
  const body = page?.querySelector('[data-lb-ranking-body]');
  if (!page || !body) return { destroy() {} };
  const state = initialState(ctx);
  let destroyed = false;
  const paint = (focusKey = '') => {
    if (destroyed || !page.contains(body)) return;
    body.innerHTML = bodyHTML(state, ctx);
    // Fixed, whitelisted selectors only; never interpolate API-provided identifiers.
    if (focusKey === 'view') body.querySelector(`[data-lb-rank-view="${state.view}"]`)?.focus();
    if (focusKey === 'scope') body.querySelector(`[data-lb-rank-scope="${state.scope}"]`)?.focus();
  };
  const load = async (focusKey = '') => {
    if (!canRead(ctx)) return;
    const revision = ++state.revision;
    const scope = state.scope;
    state.loading = true; state.error = ''; state.data = null;
    paint(focusKey);
    try {
      const path = scope === 'weekly' ? '/api/leaderboard' : scope === 'monthly'
        ? '/api/leaderboard?period=monthly' : `/api/rankings?game=${encodeURIComponent(scope)}`;
      const data = await ctx.api(path, 'GET');
      if (destroyed || revision !== state.revision) return;
      if (data?.ok === false || data?.error) {
        const error = new Error('ranking request failed');
        error.status = data.status ?? data.statusCode;
        throw error;
      }
      if (!validData(data, scope)) { state.error = 'invalid'; }
      else { state.data = data; }
    } catch (error) {
      if (destroyed || revision !== state.revision) return;
      const status = Number(error?.status ?? error?.statusCode ?? error?.response?.status);
      state.error = status === 401 || status === 403 ? 'login' : status === 404 || status === 501 ? 'unavailable' : 'failed';
    }
    if (!destroyed && revision === state.revision) { state.loading = false; paint(); }
  };
  const click = (event) => {
    const button = event.target?.closest?.('[data-lb-rank-view], [data-lb-rank-scope], [data-lb-rank-reload]');
    if (!button || !page.contains(button) || button.disabled || destroyed) return;
    if (button.hasAttribute('data-lb-rank-view')) {
      const view = button.dataset.lbRankView;
      if (!['general', 'games'].includes(view) || view === state.view) return;
      state.view = view; state.scope = view === 'games' ? state.gameScope : state.generalScope;
      void load('view');
    } else if (button.hasAttribute('data-lb-rank-scope')) {
      const scope = button.dataset.lbRankScope;
      if (!SCOPES.includes(scope) || scope === state.scope
        || (state.view === 'games' ? !Object.hasOwn(GAME_NAMES, scope) : !PERIODS.includes(scope))) return;
      state.scope = scope;
      if (state.view === 'games') state.gameScope = scope;
      else state.generalScope = scope;
      void load('scope');
    } else { void load(); }
  };
  page.addEventListener('click', click);
  if (canRead(ctx)) void load();
  else paint();
  return { destroy() { destroyed = true; state.revision++; page.removeEventListener('click', click); } };
}
