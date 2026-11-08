import { CM, faceOf } from '../community.js?v=r59d';
import { isCommunityRestricted } from '../community-access-r37.js';
import { renderProfileIcon } from '../preview/assets/profile/ui-icons-inline.js?v=r58p';

// Existing community state is shared with the shell bell; all reads/writes use ctx.api.
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const PUBLIC_ID = /^[A-Za-z0-9_-]{16}$/;
const NOTICE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AVATAR_ID = /^[A-Za-z0-9_-]{1,100}$/;
const count = (value) => Number.isSafeInteger(value) && value >= 0;
const numericId = (value) => Number.isSafeInteger(value) && value > 0;
const numberText = (value) => escapeHTML(value.toLocaleString('ar-AE-u-nu-latn'));
const sources = {
  community: { label: 'المجتمع', path: '/api/community/notifs', empty: 'ما عندك إشعارات من المجتمع للحين. التفاعل على منشوراتك والمتابعات بيظهر هني.' },
  admin: { label: 'الإدارة والدعم', path: '/api/notifications-internal', empty: 'ما عندك إشعارات من الإدارة أو ردود دعم للحين.' },
};
const kinds = { like: 'أعجبه منشورك', comment: 'علّق على منشورك', reply: 'ردّ على تعليقك', follow: 'صار يتابعك' };
const icon = () => renderProfileIcon('bell');
const tabs = [['all', 'الكل'], ['community', 'المجتمع'], ['admin', 'الإدارة والدعم'], ['unread', 'غير المقروء']];

function guard(ctx) {
  if (!ctx.user) return 'login';
  // Preserve existing device restrictions without importing the removed section.
  if (isCommunityRestricted()) return 'locked';
  if (typeof ctx.api !== 'function') return 'unsupported';
  return '';
}

function gateHTML(reason) {
  const states = {
    login: ['سجّل دخولك عشان تشوف إشعارات حسابك.', '#/account', 'تسجيل الدخول'],
    locked: ['المجتمع مقفّل على هالجهاز من إعدادات ولي الأمر. ما بنعرض إشعاراته هني.', '#/', 'الرئيسية'],
    unsupported: ['تحميل الإشعارات مو متاح في هالواجهة: مساعد الاتصال الحالي ما تم ربطه.', '#/account', 'حسابي'],
  };
  const [message, href, label] = states[reason];
  return `<section class="panel lb-notification-state" role="status"><p>${message}</p><a class="btn" href="${href}">${label}</a></section>`;
}

function freshState() {
  return { tab: 'all', busy: false, message: '', messageError: false, community: { data: null, loading: true, error: '', status: 0 }, admin: { data: null, loading: true, error: '', status: 0 } };
}

function dateHTML(at) {
  const date = typeof at === 'number' && Number.isFinite(at) ? new Date(at) : null;
  if (!date || !Number.isFinite(date.getTime())) return '<small>وقت الإشعار غير متاح</small>';
  return `<time datetime="${escapeHTML(date.toISOString())}">${escapeHTML(date.toLocaleString('ar-AE-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' }))}</time>`;
}

function detailHref(notice) {
  if (notice.kind === 'follow' && PUBLIC_ID.test(String(notice.from?.pub ?? ''))) return '#/u/' + encodeURIComponent(notice.from.pub);
  if (notice.kind !== 'follow' && numericId(notice.post)) return '#/post/' + encodeURIComponent(String(notice.post));
  return '';
}

function rowHTML(source, notice, state) {
  const community = source === 'community';
  const validId = community ? numericId(notice.id) : NOTICE_ID.test(String(notice.id ?? ''));
  const id = escapeHTML(notice.id);
  const read = notice.read === true;
  const knownRead = typeof notice.read === 'boolean';
  const busy = state.busy || state[source].loading || !!state[source].error;
  let avatar = `<span class="avatar lb-notification-avatar">${icon('i-bell')}</span>`;
  let title = notice.title ?? 'إشعار من الإدارة';
  let body = notice.body ?? '';
  if (community) {
    const from = notice.from && typeof notice.from === 'object' ? notice.from : {};
    avatar = `<span class="avatar lb-notification-avatar">${faceOf({ name: String(from.name ?? ''), pub: PUBLIC_ID.test(String(from.pub ?? '')) ? from.pub : '', av: AVATAR_ID.test(String(from.av ?? '')) ? from.av : null }, 42)}</span>`;
    title = from.name || 'مرسل الإشعار';
    body = kinds[notice.kind] || 'إشعار من المجتمع';
  }
  const href = community ? detailHref(notice) : '';
  return `<article class="list-row lb-notification-row ${knownRead && !read ? 'lb-notification-new' : ''}" data-lb-notification-row>
    ${avatar}<div class="grow"><div class="lb-notification-row-head"><b>${escapeHTML(title)}</b><span class="tag">${knownRead ? (read ? 'مقروء' : 'جديد') : 'حالة القراءة غير متاحة'}</span></div>
      <p class="lb-notification-body">${escapeHTML(body)}</p><div class="lb-notification-meta"><small>${escapeHTML(community ? sources.community.label : notice.actor || sources.admin.label)}</small>${dateHTML(notice.at)}</div>
    </div><div class="lb-notification-row-actions">${href ? `<a class="btn" href="${escapeHTML(href)}" ${validId && knownRead && !read && !busy ? `data-lb-notification-open="${id}"` : ''}>${notice.kind === 'follow' ? 'الملف الشخصي' : 'فتح المنشور'}</a>` : ''}
    ${validId && knownRead && !read ? `<button type="button" class="btn" data-lb-notification-read="${id}" data-lb-notification-source="${source}" ${busy ? 'disabled' : ''}>تمت القراءة</button>` : ''}
    ${!validId || !knownRead ? '<small>تعليم القراءة غير متاح لهالإشعار.</small>' : ''}</div>
  </article>`;
}

function sourceHTML(source, state) {
  const current = state[source];
  const label = sources[source].label;
  const list = current.data?.list ?? [];
  const visible = state.tab === 'unread' ? list.filter((n) => n.read === false) : list;
  let status = current.loading ? '<p role="status">يتم تحميل الإشعارات…</p>' : '';
  if (current.error) {
    const auth = current.status === 401;
    status += `<div class="lb-notification-error" role="alert"><p>${escapeHTML(current.error)}</p>${auth ? '<a class="btn" href="#/account">تسجيل الدخول</a>' : `<button type="button" class="btn" data-lb-notification-retry="${source}" ${state.busy || current.loading ? 'disabled' : ''}>جرّب مرة ثانية</button>`}</div>`;
    if (current.data) status += '<p class="lb-notification-note">المعروض آخر بيانات وصلتنا قبل الخطأ، وممكن تكون تغيّرت.</p>';
  }
  if (!current.loading && current.data && !visible.length) status += `<p class="lb-notification-state">${state.tab === 'unread' ? 'ما فيه إشعارات غير مقروءة ضمن القائمة المعروضة من هالمصدر.' : sources[source].empty}</p>`;
  return `<section class="panel lb-notification-source" aria-label="إشعارات ${label}" aria-busy="${current.loading}"><h2 class="panel-title">${label}${current.data ? `<small>غير المقروء: ${numberText(current.data.unread)}</small>` : ''}</h2>${status}<div class="lb-notification-list">${visible.map((notice) => rowHTML(source, notice, state)).join('')}</div></section>`;
}

function bodyHTML(state) {
  const communityReady = state.community.data && !state.community.error && !state.community.loading;
  const summary = (source) => `<div class="lb-notification-summary"><span>${sources[source].label}</span><strong>${state[source].data ? numberText(state[source].data.unread) : '—'}</strong><small>${state[source].loading ? 'يتم التحديث…' : state[source].error ? 'تعذّر التحديث' : 'غير مقروء'}</small></div>`;
  return `<div class="grid2 lb-notification-summaries">${summary('community')}${summary('admin')}</div>
    <div class="tabs" role="group" aria-label="تصفية الإشعارات">${tabs.map(([value, label]) => `<button type="button" class="${state.tab === value ? 'active' : ''}" data-lb-notification-tab="${value}" aria-pressed="${state.tab === value}">${label}</button>`).join('')}</div>
    <section class="panel"><h2 class="panel-title">إدارة الإشعارات</h2><div class="action-row lb-notification-controls">
      <button class="gold-btn" type="button" data-lb-notification-read-all ${!communityReady || !state.community.data.unread || state.busy ? 'disabled' : ''}>تعليم كل إشعارات المجتمع كمقروءة</button>
      <button class="btn" type="button" data-lb-notification-refresh ${state.busy || state.community.loading || state.admin.loading ? 'disabled' : ''}>تحديث</button>
      <button class="btn" type="button" disabled title="ما فيه مسار حذف إشعارات في النظام الحالي">حذف الإشعارات غير متاح</button></div>
      <p class="lb-notification-note">إشعارات الإدارة تنعلّم كمقروءة وحدة وحدة. زر المجتمع يشمل كل إشعاراته المحفوظة، مو بس اللي ظاهرة.</p>
      <p class="${state.messageError ? 'lb-notification-error' : 'lb-notification-note'}" data-lb-notification-status role="${state.messageError ? 'alert' : 'status'}">${escapeHTML(state.message)}</p>
    </section>
    ${['community', 'admin'].filter((source) => state.tab === 'all' || state.tab === 'unread' || state.tab === source).map((source) => sourceHTML(source, state)).join('')}
    <aside class="panel lb-notification-note"><p>القوائم تعرض آخر 60 إشعار مجتمع وآخر 100 إشعار إدارة ودعم. عدّاد غير المقروء من الخادم وممكن يشمل إشعارات أقدم. ما فيه تحميل صفحات أقدم في المسارات الحالية.</p><p>المتابعات والتفاعل من المجتمع، والتنبيهات وردود الدعم من الإدارة. طلبات الصداقة ودعوات اللعب والجوائز ما لها مصدر إشعارات مخصص في هالمسارات.</p><a class="btn" href="#/support">متابعة طلبات الدعم</a></aside>`;
}

export function render(ctx = {}) {
  const reason = guard(ctx);
  return `<section data-lb-page="notifications" class="lb-notifications-page" dir="rtl"><div class="hero"><div class="hero-symbol lb-notification-hero-icon">${icon('i-bell')}</div><h1>الإشعارات</h1><p class="subtitle">كل يديد من المجتمع والإدارة، في مكان واحد</p></div><div data-lb-notification-content>${reason ? gateHTML(reason) : bodyHTML(freshState())}</div></section>`;
}

export function mount(root, ctx = {}) {
  const host = root.matches?.('[data-lb-page="notifications"]') ? root : root.querySelector('[data-lb-page="notifications"]');
  const content = host?.querySelector('[data-lb-notification-content]');
  if (!host || !content) return { destroy() {} };
  const reason = guard(ctx);
  if (reason) { content.innerHTML = gateHTML(reason); return { destroy() {} }; }
  const state = freshState();
  let destroyed = false;
  const live = () => !destroyed && host.isConnected && (root === host || root.contains(host));
  const paint = () => { if (live()) content.innerHTML = bodyHTML(state); };
  const message = (text, failed = false) => { state.message = text; state.messageError = failed; };
  const api = async (path, method = 'GET', body) => {
    const response = await ctx.api(path, method, body);
    if (!response || response.ok === false) throw Object.assign(new Error(response?.error || 'تعذّر تنفيذ الطلب. جرّب عقب شوي.'), { status: response?.status });
    return response;
  };
  const loadSource = async (source) => {
    if (!live()) return;
    const current = state[source];
    current.loading = true; current.error = ''; current.status = 0; paint();
    try {
      const response = await api(sources[source].path);
      if (!Array.isArray(response.list) || !count(response.unread)) throw new Error('ردّ الإشعارات مو بالصيغة المتوقعة. ما بنعرض بيانات غير مؤكدة.');
      if (!live()) return;
      current.data = { ...response, list: response.list.filter((n) => n && typeof n === 'object' && !Array.isArray(n)) };
      if (source === 'community') { CM.notifs.data = current.data; CM.notifs.err = ''; CM.notifs.loading = false; CM.unread = response.unread; }
    } catch (error) {
      if (!live()) return;
      current.status = Number(error?.status) || 0;
      current.error = [404, 405, 501].includes(current.status) ? 'هالمصدر مو متاح من الخادم الحالي.' : current.status === 401 ? 'انتهت الجلسة أو ما تم تسجيل الدخول. سجّل دخولك عشان تشوف إشعاراتك.' : error?.message || 'ما قدرنا نحمّل الإشعارات. جرّب عقب شوي.';
    } finally { current.loading = false; paint(); }
  };
  const refreshAccount = async () => {
    if (live() && typeof ctx.refreshMe === 'function') {
      try { await ctx.refreshMe(); } catch { /* Reading succeeded; an account refresh failure does not undo it. */ }
    }
  };
  const readNotice = async (source, id, all = false) => {
    const current = state[source];
    if (!current || state.busy || current.loading || !current.data || current.error) return false;
    const target = !all && current.data.list.find((n) => String(n.id) === id && n.read === false);
    if (!all && !target) return false;
    if (source === 'community' ? (!all && !numericId(target.id)) : (all || !NOTICE_ID.test(id))) return false;
    state.busy = true; message('يتم حفظ حالة القراءة…'); paint();
    try {
      const response = source === 'community' ? await api('/api/community/notifs/read', 'POST', all ? {} : { ids: [target.id] }) : await api('/api/notifications-internal/' + encodeURIComponent(id) + '/read', 'POST', {});
      if (!live()) return false;
      if (source === 'community' && count(response.unread)) CM.unread = response.unread;
      await loadSource(source);
      if (!live()) return false;
      message(current.error ? 'تم حفظ القراءة، بس ما قدرنا نحدّث القائمة. جرّب تحديثها.' : 'تم حفظ حالة القراءة.', !!current.error);
      await refreshAccount();
      return true;
    } catch (error) {
      if (live()) message(error?.message || 'ما تم حفظ حالة القراءة. جرّب مرة ثانية.', true);
      return false;
    } finally { state.busy = false; paint(); }
  };
  const onClick = async (event) => {
    const element = event.target.closest?.('[data-lb-notification-tab], [data-lb-notification-retry], [data-lb-notification-refresh], [data-lb-notification-read-all], [data-lb-notification-read], [data-lb-notification-open]');
    if (!element || !host.contains(element) || element.disabled || !live()) return;
    if (element.dataset.lbNotificationTab) {
      if (tabs.some(([key]) => key === element.dataset.lbNotificationTab)) { state.tab = element.dataset.lbNotificationTab; paint(); }
    } else if (element.hasAttribute('data-lb-notification-refresh')) {
      if (state.busy || state.community.loading || state.admin.loading) return;
      message(''); await Promise.all(Object.keys(sources).map(loadSource));
    } else if (element.dataset.lbNotificationRetry) {
      const source = element.dataset.lbNotificationRetry;
      if (sources[source] && !state[source].loading && !state.busy) await loadSource(source);
    } else if (element.hasAttribute('data-lb-notification-read-all')) {
      await readNotice('community', '', true);
    } else if (element.dataset.lbNotificationRead) {
      await readNotice(element.dataset.lbNotificationSource, element.dataset.lbNotificationRead);
    } else if (element.dataset.lbNotificationOpen) {
      // Preserve normal modified-link behavior. Regular opening marks only after a successful write.
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button > 0) return;
      event.preventDefault();
      const notice = state.community.data?.list.find((n) => String(n.id) === element.dataset.lbNotificationOpen);
      const href = notice && detailHref(notice);
      if (href && await readNotice('community', element.dataset.lbNotificationOpen) && live()) (globalThis.__LA3BAK_NAV__ || location).hash = href;
    }
  };
  host.addEventListener('click', onClick);
  paint();
  void Promise.all(Object.keys(sources).map(loadSource));
  return { destroy() { destroyed = true; host.removeEventListener('click', onClick); } };
}
