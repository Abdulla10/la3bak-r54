/* Games-page presentation only. The existing catalogue, routes and delegated
 * filter actions remain authoritative; this module does not create game state. */
import { isRetiredGame, visibleGameCatalogue } from '../game-availability.js?v=games-royal-1';
const ICON = '/preview/assets/profile/icon-game.svg';
const ART = Object.freeze({
  jackaro: '/preview/assets/game-jackaro.webp',
  ludo: '/preview/assets/game-ludo.webp',
  baloot: '/preview/assets/game-baloot.webp',
  domino: '/preview/assets/game-domino.webp',
  uno: '/preview/assets/game-uno.webp',
  liars: '/preview/assets/game-liars.svg',
  pool: '/preview/assets/game-pool.svg',
  bowling: '/preview/assets/game-bowling.svg',
  carrom: '/preview/assets/game-carrom.webp',
  codewords: '/preview/assets/game-codewords-3d-r45.webp',
  minaboli: '/preview/assets/game-minaboli-3d-r49.webp',
});
// The same presentation categories used by the functioning games page.
const CATEGORIES = Object.freeze([
  ['party', 'جماعية'], ['quick', 'تحدّي سريع'], ['brain', 'ذكاء وتفكير'],
  ['quiz', 'مسابقات وأسئلة'], ['solo', 'فردية'],
]);
const CATEGORY_OF = Object.freeze({
  jackaro: 'party', ludo: 'party', baloot: 'party', domino: 'party',
  uno: 'party', liars: 'party', pool: 'party', bowling: 'party', carrom: 'party', codewords: 'party',
});
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const nf = value => new Intl.NumberFormat('ar-AE-u-nu-latn').format(value);
const route = id => '#/game/' + encodeURIComponent(String(id));
const icon = () => `<img src="${ICON}" alt="" width="56" height="56" decoding="async">`;
const gameList = ctx => visibleGameCatalogue(ctx.games)
  .filter(game => typeof game.id === 'string' && game.id && typeof game.name === 'string');
function category(game) {
  if (Object.hasOwn(CATEGORY_OF, game.id)) return CATEGORY_OF[game.id];
  const categories = Array.isArray(game.categories) ? game.categories : [];
  if (game.maxPlayers === 1) return 'solo';
  if (categories.includes('trivia')) return 'quiz';
  if (categories.includes('duel')) return 'quick';
  if (categories.includes('kids')) return 'brain';
  return 'party';
}
function players(game) {
  const min = game.minPlayers, max = game.maxPlayers;
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < min) return 'عدد اللاعبين مب محدّد';
  return min === max ? `${nf(min)} ${min === 1 ? 'لاعب' : 'لاعبين'}` : `${nf(min)} إلى ${nf(max)} لاعبين`;
}
function art(game) {
  const src = Object.hasOwn(ART, game.id) ? ART[game.id] : ICON;
  return `<div class="card-art"><img src="${esc(src)}" alt="" loading="lazy" decoding="async" width="128" height="112"></div>`;
}
function card(game) {
  const available = game.status === 'available';
  const status = available ? 'متاحة الحين' : game.status === 'soon' ? 'قريباً' : 'الحالة مب محدّدة';
  return `<article class="card game-card${available ? '' : ' soon-card'}" data-bots="${game.supportsBots === true ? '1' : '0'}" data-rooms="${Number.isInteger(game.maxPlayers) && game.maxPlayers >= 2 ? '1' : '0'}" data-cats="${esc(category(game))}">
    ${art(game)}<div class="game-head"><h3>${esc(game.name)}</h3><span class="tag lbg-status${available ? ' lbg-live' : ''}">${status}</span></div>
    <p>${esc(available ? game.description || game.idea : game.tagline || game.description)}</p>
    <div class="meta"><span class="tag">${esc(players(game))}</span>${available && game.maxPlayers >= 2 ? '<span class="tag">مع الربع</span>' : ''}${available && game.supportsBots === true ? '<span class="tag">مع الكمبيوتر</span>' : ''}</div>
    ${available ? `<a class="gold-btn btn block" href="${esc(route(game.id))}">العب الحين</a>` : `<button class="btn block" type="button" disabled>${game.status === 'soon' ? 'قريباً' : 'اللعب مب متاح'}</button>`}
  </article>`;
}
function chip(key, value, label, count, selected = value === 'all') {
  return `<button class="chip-btn${selected ? ' on active' : ''}" type="button" data-act="filter" data-k="${esc(key)}" data-f="${esc(value)}" aria-pressed="${selected}">${esc(label)}${count === undefined ? '' : `<small>${esc(nf(count))}</small>`}</button>`;
}
function catalogue(ctx) {
  const games = gameList(ctx), live = games.filter(game => game.status === 'available');
  const inactive = games.filter(game => game.status !== 'available');
  const sections = CATEGORIES.map(([id, label]) => {
    const list = live.filter(game => category(game) === id);
    return list.length ? `<section class="panel gcat" data-cat="${esc(id)}" aria-label="${esc(label)}"><h2 class="panel-title gcat-h">${esc(label)}<small>${esc(nf(list.length))}</small></h2><div class="grid2">${list.map(card).join('')}</div></section>` : '';
  }).join('');
  return `<div class="stack lbg-catalogue">
    <div class="strip lbg-counts" aria-label="حالة الكتالوج"><span class="tag lbg-live">متاحة الحين ${esc(nf(live.length))}</span>${inactive.filter(game => game.status === 'soon').length ? `<span class="tag">قريباً ${esc(nf(inactive.filter(game => game.status === 'soon').length))}</span>` : ''}</div>
    <section class="panel lbg-controls" aria-label="تصفية الألعاب"><label class="lbg-search-label" for="gq">دوّر على لعبتك</label><input class="search input" id="gq" type="search" inputmode="search" placeholder="اكتب اسم اللعبة" aria-label="دوّر باسم اللعبة" autocomplete="off">
      <div class="tabs chips filters" role="group" aria-label="تصنيفات الألعاب">${chip('cat', 'all', 'الكل', live.length)}${CATEGORIES.filter(([id]) => live.some(game => category(game) === id)).map(([id, label]) => chip('cat', id, label, live.filter(game => category(game) === id).length)).join('')}</div>
      <div class="tabs chips filters" role="group" aria-label="طريقة اللعب">${chip('mode', 'all', 'أي طريقة')}${chip('mode', 'bots', 'مع الكمبيوتر')}${chip('mode', 'friends', 'مع الربع')}</div>
    </section><p class="hint lbg-empty" id="noMatch" role="status" hidden>ما شي ألعاب بهالتصفية. جرّب اسم ثاني أو اختار الكل.</p>
    <div id="liveGames" class="stack">${sections}</div>
    ${inactive.length ? `<section class="panel"><h2 class="panel-title">ألعاب مب متاحة للعب</h2><p class="muted">تنفتح يوم تكون جاهزة حسب حالتها في الكتالوج.</p><div class="grid2">${inactive.map(card).join('')}</div></section>` : ''}
    ${!games.length ? '<p class="lbg-empty" role="status">الكتالوج فاضي الحين. ما شي ألعاب معلنة من السيرفر.</p>' : ''}
  </div>`;
}
function decodeGameLink(link) {
  const href = link?.getAttribute('href') || '';
  if (!href.startsWith('#/game/')) return '';
  try { return decodeURIComponent(href.slice(7)); } catch { return ''; }
}
function decorateOriginal(ctx) {
  if (!ctx.content || typeof document === 'undefined') return '';
  const template = document.createElement('template');
  // ctx.content is existing escaped application-generated HTML, not API data.
  template.innerHTML = String(ctx.content);
  const live = template.content.querySelector('#liveGames');
  if (!live) return '';
  template.content.querySelectorAll('.game-card,.feat').forEach(element => {
    const link = element.matches('a') ? element : element.querySelector('a[href]');
    const href = link?.getAttribute('href') || '';
    if (isRetiredGame(decodeGameLink(link)) || /^#\/(tower|city)(\/|$)/.test(href)) element.remove();
  });
  const body = live.parentElement?.closest('.stack');
  if (!body) return '';
  body.classList.add('lbg-catalogue');
  body.querySelectorAll('script, style, header, footer, .ref-footer, .wallet-strip, .bottom-nav, .drawer, .drawer-backdrop').forEach(node => node.remove());
  [...body.children].filter(node => node.tagName === 'H1').forEach(node => node.remove());
  const search = body.querySelector('#gq');
  if (search) {
    search.classList.add('search');
    search.placeholder = 'اكتب اسم اللعبة';
    search.setAttribute('aria-label', 'دوّر باسم اللعبة');
    const controls = document.createElement('section');
    controls.className = 'panel lbg-controls';
    controls.setAttribute('aria-label', 'تصفية الألعاب');
    search.before(controls);
    const label = document.createElement('label');
    label.className = 'lbg-search-label';
    label.htmlFor = 'gq';
    label.textContent = 'دوّر على لعبتك';
    controls.append(label, search);
    body.querySelectorAll('.filters').forEach(filters => {
      filters.classList.add('tabs');
      controls.append(filters);
    });
  }
  body.querySelectorAll('.grid.two').forEach(grid => grid.classList.add('grid2'));
  body.querySelectorAll('.gcat').forEach(section => {
    section.classList.add('panel');
    const heading = section.querySelector('.gcat-h');
    heading?.classList.add('panel-title');
    // Replace decorative category emoji, leaving real titles and counts intact.
    heading?.querySelector('span[aria-hidden]')?.remove();
  });
  const featured = body.querySelector('#featured');
  if (featured) {
    featured.classList.add('panel');
    featured.querySelector('.gcat-h')?.classList.add('panel-title');
    featured.querySelector('.gcat-h span[aria-hidden]')?.remove();
    featured.querySelector('.feat-row')?.classList.add('grid3');
    featured.querySelectorAll('.feat').forEach(link => {
      const id = decodeGameLink(link);
      if (id) link.setAttribute('href', route(id));
      const symbol = link.querySelector('span[aria-hidden]');
      if (symbol && Object.hasOwn(ART, id)) symbol.innerHTML = `<img src="${esc(ART[id])}" alt="" loading="lazy" decoding="async" width="80" height="64">`;
      else if (symbol && !symbol.querySelector('svg')) symbol.innerHTML = icon();
    });
  }
  body.querySelectorAll('.game-card').forEach(element => {
    const link = element.querySelector('a[href^="#/game/"]');
    const id = decodeGameLink(link);
    if (id) link.setAttribute('href', route(id));
    const symbol = element.querySelector('.game-ico');
    if (symbol) {
      const artwork = document.createElement('div');
      artwork.className = 'card-art';
      if (Object.hasOwn(ART, id)) artwork.innerHTML = `<img src="${esc(ART[id])}" alt="" loading="lazy" decoding="async" width="128" height="112">`;
      else if (symbol.querySelector('svg')) artwork.append(...symbol.childNodes);
      else artwork.innerHTML = icon();
      element.prepend(artwork);
      symbol.remove();
    }
    element.querySelectorAll('a.btn').forEach(button => { button.classList.add('gold-btn'); button.textContent = 'العب الحين'; });
    element.querySelectorAll('.badge').forEach(badge => badge.classList.add('tag'));
    const status = element.querySelector('.badge.live');
    if (status && id) status.textContent = 'متاحة الحين';
  });
  const noMatch = body.querySelector('#noMatch');
  if (noMatch) { noMatch.classList.add('lbg-empty'); noMatch.setAttribute('role', 'status'); noMatch.textContent = 'ما شي ألعاب بهالتصفية. جرّب اسم ثاني أو اختار الكل.'; }
  // Derive counts from actual retained games, never historical/deferred routes.
  body.querySelectorAll('[data-act="filter"][data-k="cat"]').forEach(button => {
    const id = button.dataset.f;
    const label = id === 'all' ? 'الكل' : CATEGORIES.find(([key]) => key === id)?.[1];
    const count = [...live.querySelectorAll('.game-card')].filter(element => id === 'all' || element.dataset.cats === id).length;
    if (label) button.innerHTML = `${esc(label)}<small>${esc(nf(count))}</small>`;
  });
  body.querySelectorAll('[data-act="filter"][data-k="mode"][data-f="friends"]').forEach(button => { button.textContent = 'مع الربع'; });
  body.querySelectorAll('.chip-btn').forEach(button => button.classList.toggle('active', button.classList.contains('on')));
  return body.outerHTML;
}
function frame(ctx, body) {
  const loggedIn = Boolean(ctx.user?.id || ctx.me?.id || ctx.me?.user?.id);
  return `<div data-lb-page="games" class="lbg-page" dir="rtl">
    <section class="hero"><div class="hero-symbol" aria-hidden="true">${icon()}</div><h1>الألعاب</h1><p class="subtitle">اختار لعبتك المفضّلة وابدأ التحدّي</p></section>
    ${!loggedIn ? '<div class="list-row lbg-session"><div class="grow"><b>تصفّح الألعاب على راحتك</b><small>عشان تلعب أونلاين، سجّل دخولك بحسابك الحالي.</small></div><a class="btn" href="#/account">تسجيل الدخول</a></div>' : ctx.connected === false ? '<p class="lbg-connection" role="status">اتصال اللعب مقطوع الحين. تقدر تتصفّح؛ إنشاء الغرف والانضمام يحتاج اتصال.</p>' : ''}
    <div data-lbg-body>${body}</div>
    <p class="lbg-limits">الحالة وطرق اللعب من الكتالوج الحالي. عدد اللاعبين على البطاقة يبيّن سعة اللعبة، مب عدد المتصلين. زر اللعب يفتح صفحة اللعبة الأصلية.</p>
  </div>`;
}
export function render(ctx = {}) {
  const original = decorateOriginal(ctx);
  if (original) return frame(ctx, original);
  if (gameList(ctx).length) return frame(ctx, catalogue(ctx));
  return frame(ctx, '<section class="panel lbg-state" data-lbg-fetch role="status" aria-live="polite"><h2 class="panel-title">كتالوج الألعاب</h2><p>نحمّل الألعاب من السيرفر…</p></section>');
}
export function mount(root, ctx = {}) {
  const page = root.matches?.('[data-lb-page="games"]') ? root : root.querySelector('[data-lb-page="games"]');
  if (!page) return { destroy() {} };
  let destroyed = false, loading = false;
  let cat = page.querySelector('[data-k="cat"][aria-pressed="true"]')?.dataset.f || 'all';
  let mode = page.querySelector('[data-k="mode"][aria-pressed="true"]')?.dataset.f || 'all';
  function apply() {
    const q = page.querySelector('#gq')?.value?.trim() || '';
    let shown = 0;
    page.querySelectorAll('#liveGames .game-card').forEach(element => {
      const matches = (cat === 'all' || element.dataset.cats === cat)
        && (mode === 'all' || (mode === 'bots' ? element.dataset.bots === '1' : element.dataset.rooms === '1'))
        && (!q || (element.querySelector('h3')?.textContent || '').includes(q));
      element.hidden = !matches;
      if (matches) shown++;
    });
    page.querySelectorAll('#liveGames .gcat').forEach(section => { section.hidden = !section.querySelector('.game-card:not([hidden])'); });
    const featured = page.querySelector('#featured');
    if (featured) featured.hidden = cat !== 'all' || mode !== 'all' || Boolean(q);
    const noMatch = page.querySelector('#noMatch');
    if (noMatch) noMatch.hidden = shown > 0;
    page.querySelectorAll('[data-act="filter"]').forEach(button => {
      const selected = button.dataset.f === (button.dataset.k === 'cat' ? cat : mode);
      button.classList.toggle('on', selected);
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }
  async function load() {
    if (loading || destroyed) return;
    const body = page.querySelector('[data-lbg-body]');
    if (!body) return;
    if (typeof ctx.api !== 'function') {
      body.innerHTML = '<section class="panel lbg-state" role="status"><h2 class="panel-title">الكتالوج مب متاح</h2><p>بيانات الألعاب ومساعد الاتصال مب متوفرين في هالصفحة. ما نقدر نعرض ألعاب أو حالات من عندنا.</p></section>';
      return;
    }
    loading = true;
    body.innerHTML = '<section class="panel lbg-state" role="status" aria-live="polite"><p>نحمّل الألعاب من السيرفر…</p></section>';
    try {
      const result = await ctx.api('/api/games', 'GET');
      if (destroyed) return;
      if (!Array.isArray(result?.games) || result?.error || result?.ok === false) throw new Error(result?.error || 'رد كتالوج الألعاب مب صالح.');
      body.innerHTML = catalogue({ ...ctx, games: result.games });
      cat = 'all'; mode = 'all'; apply();
    } catch (error) {
      if (destroyed) return;
      const login = error?.status === 401;
      body.innerHTML = `<section class="panel lbg-state" role="alert"><h2 class="panel-title">${login ? 'سجّل دخولك' : 'تعذّر تحميل الألعاب'}</h2><p>${esc(error?.message || 'جرّب مرة ثانية يوم يرجع الاتصال.')}</p>${login ? '<a class="btn" href="#/account">تسجيل الدخول</a>' : '<button class="btn" type="button" data-lbg-retry>حاول مرة ثانية</button>'}</section>`;
    } finally { loading = false; }
  }
  function click(event) {
    const retry = event.target.closest?.('[data-lbg-retry]');
    if (retry && page.contains(retry)) { event.preventDefault(); void load(); return; }
    const button = event.target.closest?.('[data-act="filter"]');
    if (!button || !page.contains(button)) return;
    if (button.dataset.k === 'cat') cat = button.dataset.f;
    else if (button.dataset.k === 'mode') mode = button.dataset.f;
    apply();
    // Do not stop propagation: the existing app updates its filter state too.
  }
  function input(event) { if (event.target.id === 'gq') apply(); }
  page.addEventListener('click', click);
  page.addEventListener('input', input);
  apply();
  if (page.querySelector('[data-lbg-fetch]')) void load();
  return { destroy() { destroyed = true; page.removeEventListener('click', click); page.removeEventListener('input', input); } };
}
