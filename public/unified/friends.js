/* Friends-only adaptation of public/social-private.js.
 * The host owns auth, routing, HTTP/CSRF and the common shell.
 * No Community follows, mock players, presence inference or client persistence.
 */
import { renderProfileIcon as icon } from '../preview/assets/profile/ui-icons-inline.js?v=emerald-r44';

const BASE = '/api/social-private/';
const PUB = /^[A-Za-z0-9_-]{16}$/;
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const positive = value => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const loggedIn = ctx => !!(ctx?.user || ctx?.me);
const emptyPage = () => ({ list: [], more: false, nextBefore: null, loaded: false, error: '', friendsCount: null });
const loginHTML = () => '<section class="panel lb-friends-state"><h2 class="panel-title">سجّل دخولك أول</h2><p>سجّل دخولك عشان تشوف ربعك وطلبات الصداقة الخاصة فيك.</p><a class="gold-btn" href="#/account">تسجيل الدخول</a></section>';
const unavailableHTML = () => '<section class="panel lb-friends-state" role="status"><h2 class="panel-title">الأصدقاء مب متاحين الحين</h2><p>واجهة الاتصال الحالية مب متوفّرة. ما بنعرض أسماء أو طلبات غير حقيقية.</p></section>';
const heroHTML = () => `<section class="hero"><div class="hero-symbol" aria-hidden="true">${icon('users')}</div><h1>الأصدقاء</h1><p class="subtitle">تواصل ويا ربعك والعبوا مع بعض</p></section>`;
const limitationsHTML = () => '<aside class="panel lb-friends-limits"><h2 class="panel-title">عن هالقائمة</h2><p>الصداقة تحتاج قبول من الطرف الثاني؛ المتابعة في المجتمع مب صداقة.</p><p>حالة الاتصال، آخر ظهور، مستوى اللاعب وصورته مب متوفّرة في واجهة الأصدقاء الحالية. رمز اللاعب العام يُستخدم للرابط فقط، مب رقم اللاعب.</p><p>دعوات اللعب المباشرة مب مدعومة من هالواجهة. تقدر تفتح الغرف وتستخدم خيارات المشاركة الموجودة هناك.</p><a class="btn" href="#/rooms">افتح الغرف</a> <a class="btn" href="#/messages">الرسائل الخاصة</a></aside>';

/** Page body only; the parent supplies .lb-unified and common CSS/shell. */
export function render(ctx = {}) {
  const initial = !loggedIn(ctx) ? loginHTML() : typeof ctx.api !== 'function' ? unavailableHTML() : '<section class="panel lb-friends-state" role="status" aria-live="polite"><p>جاري تحميل الأصدقاء وطلبات الصداقة…</p></section>';
  return `<div data-lb-page="friends" dir="rtl">${heroHTML()}<div data-lb-friends-host>${initial}</div>${limitationsHTML()}</div>`;
}

/** Mount only this page; cleanup removes local listeners and ignores late responses. */
export function mount(root, ctx = {}) {
  const page = root?.matches?.('[data-lb-page="friends"]') ? root : root?.querySelector?.('[data-lb-page="friends"]');
  const host = page?.querySelector('[data-lb-friends-host]');
  if (!host) return { destroy() {} };
  let destroyed = false;
  if (!loggedIn(ctx) || typeof ctx.api !== 'function') {
    host.innerHTML = !loggedIn(ctx) ? loginHTML() : unavailableHTML();
    return { destroy() { destroyed = true; } };
  }
  const state = {
    tab: 'friends', loading: false, busy: false, authRequired: false, error: '', notice: '',
    friends: emptyPage(), incoming: emptyPage(), outgoing: emptyPage(),
    settings: { loaded: false, dmEnabled: false, error: '' },
    filter: '', query: '', searchResults: [], searched: false, confirm: null
  };
  let generation = 0;
  const isCurrent = version => !destroyed && version === generation;
  const disabled = () => state.loading || state.busy ? 'disabled aria-busy="true"' : '';
  const button = (action, label, attributes = '', gold = false) => `<button type="button" class="${gold ? 'gold-btn' : 'btn'}" data-lbf-action="${action}" ${attributes} ${disabled()}>${label}</button>`;
  const publicUser = user => !!user && typeof user.pub === 'string' && PUB.test(user.pub) && typeof user.name === 'string';
  const idAttributes = item => `data-id="${esc(item.id)}" data-pub="${esc(item.user.pub)}"`;
  const secureKey = () => {
    if (typeof globalThis.crypto?.randomUUID !== 'function') throw new Error('تعذّر إنشاء معرّف آمن للطلب. جرّب من متصفح يدعم الاتصال الآمن.');
    return globalThis.crypto.randomUUID();
  };
  const errorText = error => error?.message || 'تعذّر إكمال الطلب. جرّب مرة ثانية.';
  const call = async (path, method = 'GET', body) => {
    try {
      const result = await ctx.api(BASE + path, method, body);
      if (!result || typeof result !== 'object' || result.ok === false) {
        const error = new Error(result?.error || 'تعذّر إكمال الطلب. جرّب مرة ثانية.');
        error.status = result?.status;
        throw error;
      }
      return result;
    } catch (error) {
      if (!destroyed && error?.status === 401) state.authRequired = true;
      throw error;
    }
  };
  const normalPage = (result, kind) => {
    if (!Array.isArray(result.list) || result.list.some(item => !positive(item?.id) || !publicUser(item.user))) throw new Error('رد قائمة الأصدقاء مب صالح. جرّب تحديث الصفحة.');
    if (typeof result.more !== 'boolean' || (result.more && !positive(result.nextBefore))) throw new Error('تعذّر قراءة الصفحة التالية من الخادم.');
    const count = kind === 'friends' && typeof result.friendsCount === 'number' && Number.isSafeInteger(result.friendsCount) && result.friendsCount >= 0 ? result.friendsCount : null;
    return { list: result.list, more: result.more, nextBefore: result.more ? result.nextBefore : null, friendsCount: count, loaded: true, error: '' };
  };
  const endpoint = kind => kind === 'friends' ? 'friends?limit=20' : `friend-requests?direction=${kind}&limit=20`;
  const loadPage = async (kind, version, more = false) => {
    const previous = state[kind];
    const cursor = more ? previous.nextBefore : null;
    const result = await call(endpoint(kind) + (cursor ? `&before=${encodeURIComponent(cursor)}` : ''));
    if (!isCurrent(version)) return;
    const next = normalPage(result, kind);
    state[kind] = more ? { ...next, list: [...previous.list, ...next.list.filter(item => !previous.list.some(old => old.id === item.id))] } : next;
  };
  const profileHTML = user => `<div class="avatar" aria-hidden="true">${icon('person')}</div><div class="grow"><a class="lb-friends-name" href="#/u/${esc(encodeURIComponent(user.pub))}">${esc(user.name || 'لاعب')}</a>`;
  const listHTML = (kind, filter = '') => {
    const data = state[kind];
    if (data.error) return `<p class="lb-friends-error" role="alert">${esc(data.error)}</p>${data.loaded ? '<p class="muted">المعروض آخر بيانات تحمّلت بنجاح.</p>' : ''}` + (data.loaded ? rowsHTML(kind, filter) : '');
    if (!data.loaded) return `<p role="status">${state.loading ? 'جاري تحميل القائمة…' : 'القائمة مب متوفّرة الحين. اضغط تحديث للمحاولة.'}</p>`;
    return rowsHTML(kind, filter);
  };
  const rowsHTML = (kind, filter = '') => {
    const data = state[kind];
    const query = filter.trim().toLocaleLowerCase('ar-AE');
    const rows = data.list.filter(item => !query || item.user.name.toLocaleLowerCase('ar-AE').includes(query));
    const empty = query ? 'ما لقينا صديق بهالاسم ضمن الأصدقاء المحمّلين.' : kind === 'friends' ? 'ما عندك أصدقاء ظاهرين في القائمة للحين. تقدر تضيف ربعك من تبويب إضافة صديق.' : kind === 'incoming' ? 'ما عندك طلبات واردة للحين.' : 'ما عندك طلبات مرسلة للحين.';
    const content = rows.length ? `<ul class="lb-friends-list">${rows.map(item => {
      const attrs = idAttributes(item);
      const actions = kind === 'incoming' ? button('accept', `${icon('check')} قبول`, attrs, true) + button('reject', 'رفض', attrs)
        : kind === 'outgoing' ? button('confirm-remove', 'إلغاء الطلب', `${attrs} data-kind="outgoing"`)
        : '<a class="btn" href="#/messages" title="فتح صفحة الرسائل واختيار صديق">' + icon('mail') + ' الرسائل</a>' + button('confirm-remove', 'إزالة الصداقة', `${attrs} data-kind="friends"`);
      const confirming = state.confirm?.pub === item.user.pub && state.confirm?.kind === kind;
      return `<li class="list-row">${profileHTML(item.user)}<small>${kind === 'friends' ? 'صديق مقبول' : kind === 'incoming' ? 'طلب صداقة وارد' : 'بانتظار القبول'}</small></div><div class="lb-friends-actions">${actions}</div>${confirming ? `<div class="lb-friends-confirm" role="group" aria-label="تأكيد الإزالة"><p>${kind === 'friends' ? 'متأكد إنك تبغي تزيل هالصداقة؟' : 'تبغي تلغي هالطلب؟'}</p>${button('remove', 'هيه، أكّد', `${attrs} data-kind="${kind}"`, true)}${button('cancel-remove', 'تراجع')}</div>` : ''}</li>`;
    }).join('')}</ul>` : `<p class="lb-friends-empty">${empty}</p>`;
    return content + `<div class="lb-friends-page-note"><small>المحمّل من هالقائمة: ${esc(data.list.length)}. التحميل على دفعات، 20 في كل طلب.</small>${data.more ? button('more', 'عرض المزيد', `data-kind="${kind}"`) : ''}</div>`;
  };
  const friendPanelHTML = () => `<section class="panel"><h2 class="panel-title">أصدقائي ${state.friends.friendsCount === null ? '' : `<span class="tag">${esc(state.friends.friendsCount)}</span>`}</h2><label class="lb-friends-label">ابحث ضمن الأصدقاء المحمّلين<input class="search" data-lbf-filter maxlength="100" value="${esc(state.filter)}" placeholder="اكتب اسم صديق…" type="search" ${disabled()}></label><div data-lbf-friend-rows>${listHTML('friends', state.filter)}</div><p class="muted">العدد من الخادم؛ بعض العلاقات ممكن ما تظهر بسبب الحظر أو عدم توفر الحساب. البحث هنا يشمل المحمّل بس؛ اضغط عرض المزيد لباقي القائمة.</p></section>`;
  const requestPanelsHTML = () => `<div class="grid2"><section class="panel"><h2 class="panel-title">طلبات واردة</h2>${listHTML('incoming')}</section><section class="panel"><h2 class="panel-title">طلبات مرسلة</h2>${listHTML('outgoing')}</section></div>`;
  const addPanelHTML = () => `<section class="panel"><h2 class="panel-title">إضافة صديق ${icon('plus')}</h2><form data-lbf-form="search"><label class="lb-friends-label">اسم اللاعب أو رقمه الأصلي أو المميّز<input class="search" name="to" minlength="2" maxlength="30" autocomplete="off" value="${esc(state.query)}" placeholder="اكتب الاسم أو رقم اللاعب…" required ${disabled()}></label><button class="gold-btn" type="submit" ${disabled()}>ابحث عن اللاعب</button></form><p class="muted">نتائج البحث بحد أقصى 20 حساب، بدون صفحات إضافية. جرّب رقم اللاعب أو اسم أدق لو ما لقيته.</p>${state.searched ? `<h3>نتائج البحث</h3>${state.searchResults.length ? `<ul class="lb-friends-list">${state.searchResults.map(user => `<li class="list-row">${profileHTML(user)}<small>${user.playerId ? `رقم اللاعب: ${esc(user.playerId)}` : 'رقم اللاعب مب متوفّر'}</small></div><div class="lb-friends-actions">${button('request', 'إرسال طلب صداقة', `data-pub="${esc(user.pub)}"`, true)}</div></li>`).join('')}</ul>` : '<p class="lb-friends-empty">ما لقينا حساب مطابق. جرّب الاسم أو رقم اللاعب.</p>'}` : ''}</section>`;
  const privacyHTML = () => `<section class="panel"><h2 class="panel-title">خصوصية الرسائل ${icon('shield')}</h2>${state.settings.loaded ? `<label class="lb-friends-privacy"><input class="switch" type="checkbox" data-lbf-setting="dmEnabled" ${state.settings.dmEnabled ? 'checked' : ''} ${disabled()}> السماح بالرسائل الخاصة بين أصدقائي المقبولين</label><p class="muted">إيقاف هالخيار يمنع الرسائل الجديدة بالاتجاهين، وما يحذف سجل الرسائل.</p>` : `<p>${state.loading ? 'جاري تحميل إعداد الخصوصية…' : 'إعداد الخصوصية مب متوفّر الحين.'}</p>`}${state.settings.error ? `<p class="lb-friends-error" role="alert">${esc(state.settings.error)}</p>` : ''}</section>`;
  const draw = () => {
    if (destroyed) return;
    if (state.authRequired) { host.innerHTML = loginHTML(); return; }
    const tabs = [['friends', 'الأصدقاء'], ['requests', 'طلبات الصداقة'], ['add', 'إضافة صديق']];
    host.innerHTML = `<div class="tabs" role="group" aria-label="عرض الأصدقاء"><button type="button" disabled title="حالة اتصال الأصدقاء مب متوفّرة في واجهة الخادم" aria-describedby="lb-friends-presence-note">المتصلون الحين · مب متاح</button>${tabs.map(([tab, title]) => `<button type="button" class="${state.tab === tab ? 'active' : ''}" data-lbf-action="tab" data-tab="${tab}" aria-pressed="${state.tab === tab}" ${disabled()}>${title}</button>`).join('')}</div><p class="muted lb-friends-presence-note" id="lb-friends-presence-note">فلتر المتصلين مب مدعوم؛ اتصالك بالخادم ما يدل على اتصال أصدقائك.</p><div class="lb-friends-toolbar">${button('refresh', 'تحديث القوائم')}<a class="btn" href="#/messages">${icon('mail')} الرسائل الخاصة</a></div>${state.error ? `<p class="lb-friends-error" role="alert">${esc(state.error)}</p>` : ''}${state.notice ? `<p class="lb-friends-notice" role="status">${esc(state.notice)}</p>` : ''}${state.loading || state.busy ? `<p role="status" aria-live="polite">${state.busy ? 'جاري تنفيذ الطلب…' : 'جاري تحميل البيانات من الخادم…'}</p>` : ''}${state.tab === 'friends' ? friendPanelHTML() : state.tab === 'requests' ? requestPanelsHTML() : addPanelHTML()}${privacyHTML()}`;
  };
  const refresh = async () => {
    if (destroyed || state.authRequired) return;
    const version = ++generation;
    state.loading = true; state.confirm = null; draw();
    const work = ['friends', 'incoming', 'outgoing'].map(async kind => {
      try { await loadPage(kind, version); }
      catch (error) { if (isCurrent(version)) state[kind].error = errorText(error); }
    });
    work.push((async () => {
      try {
        const settings = await call('settings');
        if (!isCurrent(version)) return;
        if (typeof settings.dmEnabled !== 'boolean') throw new Error('تعذّر قراءة إعداد الخصوصية من الخادم.');
        state.settings = { loaded: true, dmEnabled: settings.dmEnabled, error: '' };
      } catch (error) { if (isCurrent(version)) state.settings = { loaded: false, dmEnabled: false, error: errorText(error) }; }
    })());
    await Promise.all(work);
    if (isCurrent(version)) { state.loading = false; draw(); }
  };
  const notify = text => { if (!destroyed) { state.notice = text; try { ctx.toast?.(text); } catch { /* Host notifications must not turn a saved operation into failure. */ } } };
  const run = async operation => {
    if (destroyed || state.loading || state.busy || state.authRequired) return;
    state.busy = true; state.error = ''; state.notice = ''; draw();
    try { await operation(); }
    catch (error) { if (!destroyed) state.error = errorText(error); }
    finally { if (!destroyed) { state.busy = false; draw(); } }
  };
  const click = event => {
    const target = event.target.closest?.('[data-lbf-action]');
    if (!target || !host.contains(target)) return;
    event.preventDefault();
    if (state.loading || state.busy || state.authRequired) return;
    const { lbfAction: action, tab, pub, id, kind } = target.dataset;
    if (action === 'tab' && ['friends', 'requests', 'add'].includes(tab)) { state.tab = tab; state.confirm = null; draw(); return; }
    if (action === 'refresh') { state.error = ''; state.notice = ''; void refresh(); return; }
    if (action === 'cancel-remove') { state.confirm = null; draw(); return; }
    if (action === 'confirm-remove' && ['friends', 'outgoing'].includes(kind) && PUB.test(pub || '')) { state.confirm = { pub, kind }; draw(); return; }
    void run(async () => {
      if (action === 'more' && ['friends', 'incoming', 'outgoing'].includes(kind)) {
        if (state[kind].more) await loadPage(kind, generation, true);
      } else if (action === 'request') {
        if (!PUB.test(pub || '') || !state.searchResults.some(user => user.pub === pub)) throw new Error('الحساب مب متوفّر في نتائج البحث الحالية.');
        await call('friend-requests', 'POST', { to: pub, key: secureKey() });
        if (destroyed) return;
        state.searchResults = []; state.searched = false; state.query = '';
        notify('تم حفظ طلب الصداقة عند الخادم.'); await refresh();
      } else if (action === 'accept' || action === 'reject') {
        const item = state.incoming.list.find(item => String(item.id) === id && item.user.pub === pub);
        if (!item) throw new Error('الطلب مب موجود في القائمة الحالية.');
        await call(`friend-requests/${encodeURIComponent(item.id)}/${action}`, 'POST', { key: secureKey() });
        if (destroyed) return;
        notify(action === 'accept' ? 'تم قبول الصداقة.' : 'تم رفض الطلب.'); await refresh();
      } else if (action === 'remove') {
        if (!['friends', 'outgoing'].includes(kind) || !PUB.test(pub || '') || state.confirm?.pub !== pub || state.confirm?.kind !== kind || !state[kind].list.some(item => item.user.pub === pub)) throw new Error('اختر الطلب من القائمة وأكّد العملية.');
        await call(`friends/${encodeURIComponent(pub)}`, 'DELETE');
        if (destroyed) return;
        state.confirm = null; notify(kind === 'friends' ? 'تمت إزالة الصداقة.' : 'تم إلغاء الطلب.'); await refresh();
      }
    });
  };
  const input = event => {
    if (event.target.matches?.('[data-lbf-filter]')) {
      state.filter = event.target.value;
      const rows = host.querySelector('[data-lbf-friend-rows]');
      if (rows) rows.innerHTML = listHTML('friends', state.filter);
    }
    if (event.target.name === 'to') state.query = event.target.value;
  };
  const submit = event => {
    const form = event.target;
    if (form.dataset?.lbfForm !== 'search' || !host.contains(form)) return;
    event.preventDefault();
    state.query = String(form.elements?.to?.value ?? state.query);
    void run(async () => {
      const query = state.query.trim();
      if (query.length < 2 || query.length > 30) throw new Error('اكتب اسم اللاعب أو رقمه، من حرفين إلى 30 حرف.');
      state.searched = false; state.searchResults = [];
      const result = await call('search?q=' + encodeURIComponent(query));
      if (destroyed) return;
      if (!Array.isArray(result.list) || result.list.some(user => !publicUser(user))) throw new Error('تعذّر قراءة نتائج البحث من الخادم.');
      state.searchResults = result.list.slice(0, 20); state.searched = true;
    });
  };
  const change = event => {
    if (event.target.dataset?.lbfSetting !== 'dmEnabled' || !state.settings.loaded) return;
    const enabled = event.target.checked;
    void run(async () => {
      const result = await call('settings', 'PATCH', { dmEnabled: enabled });
      if (destroyed) return;
      if (typeof result.dmEnabled !== 'boolean') throw new Error('تم إرسال الإعداد، لكن رد الخادم مب واضح. حدّث القوائم للتأكد.');
      state.settings = { loaded: true, dmEnabled: result.dmEnabled, error: '' };
      notify('تم حفظ خصوصية الرسائل.');
    });
  };
  host.addEventListener('click', click); host.addEventListener('input', input); host.addEventListener('submit', submit); host.addEventListener('change', change);
  draw();
  const ready = refresh();
  return { ready, destroy() {
    destroyed = true; generation++;
    host.removeEventListener('click', click); host.removeEventListener('input', input); host.removeEventListener('submit', submit); host.removeEventListener('change', change);
    state.query = ''; state.searchResults = [];
  } };
}
