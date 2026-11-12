/* LA3BAK R50: presentation navigation only. No sessions, accounts, API or wallet.
 * R51: زر الرجوع يتبع سجل التنقل الفعلي (عمق كل مدخل + الصفحة السابقة + موضع التمرير بحالة السجل)،
 * والفتح المباشر بدون صفحة سابقة يستبدل المدخل بأب منطقي يمرّره المستدعي (بدون حلقات). */
(function (win) {
  'use strict';
  if (win.__LA3BAK_NAV__) return;
  const KEY = '__la3bakRoute';
  const DEPTH = '__la3bakDepth'; // عدد التنقلات داخل الموقع قبل هذا المدخل بنفس التبويب
  const FROM = '__la3bakFrom'; // المسار اللي جينا منه
  const SCROLL = '__la3bakScrollY'; // موضع التمرير لما طلعنا من هذا المدخل
  let pendingScroll = null;
  const ROOT = '/';
  const location = win.location;
  const history = win.history;
  // التطبيق يرجّع التمرير بنفسه من حالة السجل؛ نوقف استرجاع المتصفح التلقائي عشان ما يتعارضون
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (_) { /* optional */ }
  function normalize(value) {
    if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u0020\u007f\\]/.test(value)) return null;
    if (value.startsWith('//') || value.startsWith('#//')) return null;
    if (value === '' || value === '#') return '#/';
    if (value.startsWith('/')) value = '#' + value;
    return /^#\/[a-zA-Z0-9_/%?=&.+~-]*$/.test(value) ? value : null;
  }
  const plain = (state) => (state && typeof state === 'object' && !Array.isArray(state) ? state : {});
  const depthOf = (state) => (Number.isInteger(plain(state)[DEPTH]) && plain(state)[DEPTH] > 0 ? plain(state)[DEPTH] : 0);
  function stateFor(route) {
    return { ...plain(history.state), [KEY]: route };
  }
  function saveScroll() {
    try { history.replaceState({ ...plain(history.state), [SCROLL]: Math.max(0, Math.round(win.scrollY || 0)) }, '', ROOT); } catch (_) { /* optional */ }
  }
  const initialHash = location.hash;
  let route = (initialHash ? normalize(initialHash) : null) || normalize(history.state?.[KEY]) || '#/';
  try { history.replaceState(stateFor(route), '', ROOT); }
  catch (_) { return; } // Keep the original hash router usable if History API is unavailable.
  function announce(before, after) {
    if (before === after) return;
    win.setTimeout(function () {
      const options = { oldURL: location.origin + '/' + before, newURL: location.origin + '/' + after };
      const event = typeof win.HashChangeEvent === 'function' ? new win.HashChangeEvent('hashchange', options) : new win.Event('hashchange');
      win.dispatchEvent(event);
    }, 0);
  }
  function go(value, options = {}) {
    const next = normalize(value);
    if (!next || next === route) return false;
    const before = route;
    const current = plain(history.state);
    pendingScroll = null;
    try {
      if (options.replace) history.replaceState({ ...current, [KEY]: next, [SCROLL]: undefined }, '', ROOT);
      else { saveScroll(); history.pushState({ [KEY]: next, [DEPTH]: depthOf(current) + 1, [FROM]: before }, '', ROOT); }
    } catch (_) { return false; }
    route = next;
    win.__la3NavDir = options.replace ? 'replace' : 'fwd'; /* R105: اتجاه حركة الصفحة مثل التطبيقات */
    announce(before, next);
    return true;
  }
  const navigation = Object.freeze({
    get hash() { return route; },
    set hash(value) { go(value); },
    go,
    replace(value) { return go(value, { replace: true }); },
    /** رجوع: للصفحة السابقة الفعلية لو دخلناها من داخل الموقع، وإلا يستبدل المدخل بالأب المنطقي (fallback) */
    back(fallback) {
      if (depthOf(history.state) > 0) { saveScroll(); history.back(); return true; }
      return go(normalize(fallback) || '#/', { replace: true });
    },
    get canGoBack() { return depthOf(history.state) > 0; },
    /** موضع التمرير المحفوظ للصفحة اللي رجعنا لها (مرة وحدة) */
    takeScroll() { const y = pendingScroll; pendingScroll = null; return y; },
  });
  Object.defineProperty(win, '__LA3BAK_NAV__', { value: navigation, enumerable: false, writable: false, configurable: false });
  win.addEventListener('popstate', function (event) {
    const before = route;
    const next = normalize(event.state?.[KEY]) || (location.hash ? normalize(location.hash) : null) || '#/';
    const y = plain(event.state)[SCROLL];
    pendingScroll = Number.isFinite(y) && y > 0 ? y : null;
    try { history.replaceState(stateFor(next), '', ROOT); } catch (_) { return; }
    route = next;
    win.__la3NavDir = 'back';
    announce(before, next);
  });
  // Accept legacy native hash navigation from an old cached tab or browser action.
  win.addEventListener('hashchange', function (event) {
    if (!location.hash) return; // Virtual events above never create a native fragment.
    const before = route;
    const next = normalize(location.hash) || '#/';
    try { history.replaceState(stateFor(next), '', ROOT); } catch (_) { return; }
    route = next;
    // The native event continues to existing listeners, which read the virtual route.
    if (before === next && event.stopImmediatePropagation) event.stopImmediatePropagation();
  });
  // Window bubbling runs after the application's document-level action handlers.
  win.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const anchor = event.target?.closest?.('a[href]');
    if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;
    let url;
    try { url = new URL(anchor.href, location.href); } catch (_) { return; }
    if (url.origin !== location.origin || !url.hash || !['/', '/index.html', '/preview.html'].includes(url.pathname)) return;
    const next = normalize(url.hash);
    if (!next) return;
    event.preventDefault();
    // زر «رجوع» بالواجهة: href فيه الأب المنطقي ويُستخدم فقط لو ما فيه صفحة سابقة داخل الموقع
    if (anchor.matches('.lb-route-back,[data-lb-back]')) { navigation.back(next); return; }
    // رابط للصفحة اللي جينا منها مباشرة = رجوع، عشان ما يتراكم السجل ويصير الرجوع حلقة (ملف → نوبل → «مقتنياتي» → رجوع …).
    // فقط لنقرات الروابط؛ التنقل البرمجي (go) يبقى متزامن لأن بعض الأكواد تقرأ المسار مباشرة بعده.
    const current = plain(history.state);
    if (depthOf(current) > 0 && current[FROM] === next) { navigation.back(next); return; }
    go(next);
  });
})(window);
