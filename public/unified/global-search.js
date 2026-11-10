import { fuzzyScore } from '../fuzzy-ar.js?v=r69zj';
import { SEARCH_ICON } from './search-icon.js?v=global-search-r17';

const PUB = /^[A-Za-z0-9_-]{16}$/;
const ROOM_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const fold = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase('ar-AE');
const empty = () => ({ state: 'idle', list: [], message: '', status: 0 });

/**
 * Mount ONCE in the app (not shell.mount); the host loads global-search.css.
 * Context is read only on interaction/checkScope/response, never captured at mount.
 * Host calls checkScope on auth/settings renders. No polling or client persistence.
 * Only authorized GETs; 401=login, 403=permission, 429=rate limit; failures are NOT empty results.
 * Native dialog supplies Escape/Tab trapping; visualViewport keeps the mobile keyboard usable.
 */
export function createGlobalSearch({ getContext, root = document } = {}) {
  const doc = root.nodeType === 9 ? root : root.ownerDocument;
  const win = doc.defaultView;
  const dialog = doc.createElement('dialog');
  dialog.className = 'lb-global-search';
  dialog.dir = 'rtl';
  dialog.setAttribute('aria-label', 'البحث عن الأشخاص والغرف');
  dialog.innerHTML = `<header class="lb-gs-head"><h2>البحث</h2><button type="button" class="lb-gs-close" data-global-search-close aria-label="إغلاق البحث">×</button></header>
    <form class="lb-gs-form" role="search"><input class="lb-gs-input" data-global-search-input type="search" maxlength="64" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" placeholder="اسم الشخص أو الغرفة أو ID" aria-label="اسم الشخص أو الغرفة أو ID" autofocus><button class="lb-gs-submit" type="submit" aria-label="بحث">${SEARCH_ICON}</button></form>
    <div class="lb-gs-tabs" role="group" aria-label="تصفية نتائج البحث"><button type="button" data-global-search-tab="all" aria-pressed="true">الكل</button><button type="button" data-global-search-tab="people" aria-pressed="false">الأشخاص</button><button type="button" data-global-search-tab="rooms" aria-pressed="false">الغرف</button></div>
    <div class="lb-gs-results"><div data-global-search-message role="status" aria-live="polite"></div><section class="lb-gs-section" data-global-search-people aria-label="نتائج الأشخاص" aria-live="polite" hidden></section><section class="lb-gs-section" data-global-search-rooms aria-label="نتائج الغرف" aria-live="polite" hidden></section></div>`;
  doc.body.append(dialog);
  const input = dialog.querySelector('[data-global-search-input]');
  const form = dialog.querySelector('form');
  const tabs = dialog.querySelector('.lb-gs-tabs');
  const closeButton = dialog.querySelector('[data-global-search-close]');
  const message = dialog.querySelector('[data-global-search-message]');
  const sections = {
    people: dialog.querySelector('[data-global-search-people]'),
    rooms: dialog.querySelector('[data-global-search-rooms]')
  };
  let destroyed = false, generation = 0, timer = null, scope = null;
  let trigger = null, query = '', startedQuery = null, tab = 'all', access = 'ready';
  let people = empty(), rooms = empty();
  const context = () => { try { return getContext?.() || {}; } catch { return {}; } };
  const scopeOf = ctx => JSON.stringify([ctx.user?.id ?? null, !!ctx.noCommunity]);
  const ready = ctx => ctx.user?.id != null && !ctx.noCommunity;
  const stopTimer = () => { if (timer !== null) win.clearTimeout(timer); timer = null; };
  const syncTriggers = () => doc.querySelectorAll('[data-lb-global-search]').forEach(button => button.setAttribute('aria-expanded', String(dialog.open)));
  const restoreFocus = () => {
    if (dialog.open) return;
    const current = [...doc.querySelectorAll('[data-lb-global-search]')].find(button => button.getClientRects().length && !button.disabled);
    const target = current || (trigger?.isConnected ? trigger : null);
    target?.focus?.({ preventScroll: true });
  };
  const reset = () => {
    stopTimer();
    ++generation;
    query = ''; startedQuery = null; tab = 'all'; access = 'ready';
    input.value = '';
    people = empty(); rooms = empty();
    sections.people.replaceChildren(); sections.rooms.replaceChildren();
    sections.people.hidden = true; sections.rooms.hidden = true;
    message.replaceChildren();
  };
  function close() {
    const wasOpen = dialog.open;
    reset();
    if (wasOpen) { dialog.close(); restoreFocus(); }
    syncTriggers();
  }
  function checkScope() {
    if (destroyed) return false;
    const next = scopeOf(context());
    if (scope !== null && next !== scope) { scope = next; close(); return false; }
    scope = next;
    syncTriggers();
    return true;
  }
  const viewport = () => {
    const view = win.visualViewport;
    if (!view) return;
    dialog.style.setProperty('--lb-gs-view-height', `${view.height}px`);
    dialog.style.setProperty('--lb-gs-view-top', `${view.offsetTop}px`);
  };
  const sectionHTML = (kind, data) => {
    const heading = `<h3>${kind === 'people' ? 'الأشخاص' : 'الغرف'}</h3>`;
    if (data.state === 'loading') return heading + '<p role="status">جاري البحث…</p>';
    if (data.state === 'hint') return heading + `<p>${esc(data.message)}</p>`;
    if (data.state === 'error') return heading + `<p class="lb-gs-error" role="alert">${esc(data.message)}${data.status === 401 ? ' <a href="#/profile">تسجيل الدخول</a>' : ''}</p>`;
    if (data.state !== 'ok') return heading;
    if (!data.list.length) return heading + `<p>${kind === 'people' ? 'ما لقينا شخص مطابق. جرّب اسمًا أدق أو ID.' : 'ما لقينا غرفة مطابقة ضمن الغرف المتاحة لك.'}</p>`;
    const rows = data.list.slice(0, 20).map(item => {
      const href = kind === 'people' ? `#/u/${item.pub}` : `#/social-room/${item.id}`;
      const count = kind === 'rooms' && Number.isSafeInteger(item.count) && item.count >= 0 ? `<small>${esc(item.count)} أعضاء</small>` : '';
      return `<li><a class="lb-gs-row" href="${esc(href)}"><bdi>${esc(item.name)}</bdi>${count}</a></li>`;
    }).join('');
    const limit = data.list.length > 20 ? `<p>نعرض أول 20 نتيجة من ${data.list.length}. جرّب اسمًا أدق.</p>` : kind === 'people' && data.list.length === 20 ? '<p>المعروض حتى 20 شخصًا؛ جرّب اسمًا أدق إذا ما لقيت الشخص.</p>' : '';
    return heading + `<ul class="lb-gs-list">${rows}</ul>` + limit;
  };
  const draw = () => {
    if (destroyed || !dialog.open) return;
    const available = access === 'ready';
    form.hidden = !available; tabs.hidden = !available;
    input.disabled = !available;
    if (!available) {
      message.innerHTML = access === 'guest' ? '<p>سجّل دخولك أول عشان تبحث عن الأشخاص والغرف. <a href="#/profile">تسجيل الدخول</a></p>' : '<p>البحث عن الأشخاص والغرف مقفّل لأن خيار «بدون مجتمع» مفعّل.</p>';
    } else {
      message.innerHTML = !query ? '<p>اكتب اسم الشخص أو الغرفة أو ID عشان تبحث.</p>' : query.length > 64 ? '<p>البحث يقبل حتى 64 حرفًا. قلّل النص عشان تبحث.</p>' : '';
    }
    for (const button of tabs.querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.globalSearchTab === tab));
    for (const kind of ['people', 'rooms']) {
      sections[kind].hidden = !available || !query || query.length > 64 || (tab !== 'all' && tab !== kind);
      sections[kind].innerHTML = sectionHTML(kind, kind === 'people' ? people : rooms);
    }
    // Deliberately never replace the form/input/submit while results refresh.
  };
  const current = (version, searchedQuery, searchedScope) => {
    if (destroyed || !dialog.open || version !== generation || query !== searchedQuery || input.value.trim() !== searchedQuery) return false;
    const ctx = context();
    const next = scopeOf(ctx);
    if (next !== scope || next !== searchedScope || !ready(ctx)) { scope = next; close(); return false; }
    return true;
  };
  const failure = error => {
    const status = Number(error?.status ?? error?.statusCode ?? error?.response?.status) || 0;
    const text = status === 401 ? 'انتهت جلسة الدخول. سجّل دخولك مرة ثانية.'
      : status === 403 ? 'ما عندك صلاحية لعرض هالنتائج.'
      : status === 429 ? 'طلبات البحث كثيرة الحين. انتظر شوي وجرّب لاحقًا.'
      : error?.invalidData ? 'تعذّر قراءة نتائج البحث من الخادم.'
      : 'تعذّر تحميل نتائج البحث. تأكد من الاتصال وجرّب مرة ثانية لاحقًا.';
    return { state: 'error', list: [], message: text, status };
  };
  const load = async (kind, path, ctx, version, searchedQuery, searchedScope) => {
    try {
      if (typeof ctx.api !== 'function') throw new Error('API unavailable');
      const result = await ctx.api(path, 'GET');
      if (!current(version, searchedQuery, searchedScope)) return;
      if (!result || result.ok === false) throw Object.assign(new Error('Search failed'), { status: result?.status ?? result?.statusCode });
      const list = kind === 'people' ? result.list : result.rooms;
      const valid = item => item && typeof item.name === 'string' && (kind === 'people' ? PUB.test(item.pub || '') : ROOM_ID.test(item.id || ''));
      if (!Array.isArray(list) || !list.every(valid)) throw Object.assign(new Error('Invalid response'), { invalidData: true });
      const needle = fold(searchedQuery);
      /* R69ze: بحث الغرف الذكي (يتحمل الأخطاء) */
      const filtered = kind === 'rooms' ? list.map(item => ({ item, s: fold(item.id).includes(needle) ? 90 : fuzzyScore(searchedQuery, item.name) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).map(x => x.item) : list;
      const next = { state: 'ok', list: filtered, message: '', status: 0 };
      if (kind === 'people') people = next; else rooms = next;
    } catch (error) {
      if (!current(version, searchedQuery, searchedScope)) return;
      if (kind === 'people') people = failure(error); else rooms = failure(error);
    }
    if (current(version, searchedQuery, searchedScope)) draw();
  };
  const search = () => {
    stopTimer();
    const retryable = (people.state === 'error' || rooms.state === 'error') && people.state !== 'loading' && rooms.state !== 'loading';
    if (destroyed || !dialog.open || !checkScope() || !dialog.open || !query || query.length > 64 || startedQuery === query && !retryable) return;
    const ctx = context();
    if (!ready(ctx) || scopeOf(ctx) !== scope) { checkScope(); close(); return; }
    startedQuery = query;
    const version = ++generation, searchedQuery = query, searchedScope = scope;
    const validPeople = query.length <= 30 && (query.length >= 2 || /^[1-9][0-9]*$/.test(query));
    people = validPeople ? { ...empty(), state: 'loading' } : { ...empty(), state: 'hint', message: 'للأشخاص: اكتب من حرفين إلى 30 حرفًا، أو ID رقمي موجب (حتى 30 خانة).' };
    rooms = { ...empty(), state: 'loading' };
    draw();
    // Start both GETs independently; one failure never hides the other section.
    if (validPeople) void load('people', `/api/social-private/search?q=${encodeURIComponent(searchedQuery)}`, ctx, version, searchedQuery, searchedScope);
    void load('rooms', '/api/social/rooms', ctx, version, searchedQuery, searchedScope);
  };
  const changeQuery = (debounce = true) => {
    if (!dialog.open || !checkScope() || !dialog.open || access !== 'ready') return;
    const next = input.value.trim();
    if (next !== query) {
      stopTimer(); ++generation;
      query = next; startedQuery = null;
      people = empty(); rooms = empty();
      draw();
    }
    if (debounce && query && query.length <= 64 && startedQuery !== query) {
      stopTimer(); timer = win.setTimeout(search, 250);
    }
  };
  const onInput = () => changeQuery();
  const onSubmit = event => { event.preventDefault(); changeQuery(false); search(); };
  const onDocumentClick = event => {
    const button = event.target.closest?.('[data-lb-global-search]');
    if (!button || destroyed || !root.contains(button)) return;
    event.preventDefault();
    checkScope();
    if (dialog.open) { input.disabled ? closeButton.focus() : input.focus({ preventScroll: true }); return; }
    reset(); trigger = button;
    const ctx = context(); scope = scopeOf(ctx);
    access = !ctx.user || ctx.user.id == null ? 'guest' : ctx.noCommunity ? 'locked' : 'ready';
    viewport(); dialog.showModal(); draw();
    syncTriggers();
    (access === 'ready' ? input : closeButton).focus({ preventScroll: true });
  };
  const onDialogClick = event => {
    if (event.target.closest?.('[data-global-search-close]')) { close(); return; }
    const button = event.target.closest?.('[data-global-search-tab]');
    if (button && checkScope() && dialog.open) { tab = button.dataset.globalSearchTab; draw(); return; }
    if (event.target === dialog) {
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
    }
  };
  const onCancel = event => { event.preventDefault(); close(); };
  const onKeyDown = event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); } };
  const onClose = () => { if (!dialog.open) { reset(); restoreFocus(); } };
  root.addEventListener('click', onDocumentClick);
  dialog.addEventListener('click', onDialogClick);
  dialog.addEventListener('keydown', onKeyDown, true);
  dialog.addEventListener('cancel', onCancel);
  dialog.addEventListener('close', onClose);
  input.addEventListener('input', onInput);
  form.addEventListener('submit', onSubmit);
  win.addEventListener('hashchange', close);
  win.addEventListener('resize', viewport);
  win.visualViewport?.addEventListener('resize', viewport);
  win.visualViewport?.addEventListener('scroll', viewport);
  return {
    checkScope,
    close,
    destroy() {
      if (destroyed) return;
      close(); destroyed = true;
      root.removeEventListener('click', onDocumentClick);
      dialog.removeEventListener('click', onDialogClick);
      dialog.removeEventListener('keydown', onKeyDown, true);
      dialog.removeEventListener('cancel', onCancel);
      dialog.removeEventListener('close', onClose);
      input.removeEventListener('input', onInput);
      form.removeEventListener('submit', onSubmit);
      win.removeEventListener('hashchange', close);
      win.removeEventListener('resize', viewport);
      win.visualViewport?.removeEventListener('resize', viewport);
      win.visualViewport?.removeEventListener('scroll', viewport);
      dialog.remove(); trigger = null;
    }
  };
}
