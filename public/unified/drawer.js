/* Unified drawer body only. The host owns overlay/open/close, routing and logout.
 * Data comes from ctx.me / ctx.user or the existing authenticated GET /api/account.
 * avatarHTML and renderProfileIcon are trusted existing application renderers.
 */
import { renderProfileIcon } from '../preview/assets/profile/ui-icons-inline.js?v=r58p';
import { mini as equippedAvatarHTML } from '../avatars.js?v=r90';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const icon = name => renderProfileIcon(name);
const mounts = new WeakMap();
const LINKS = Object.freeze([
  ['home', 'crown', 'الرئيسية'],
  ['games', 'game', 'الألعاب'],
  ['community', 'file', 'المنشورات'],
  ['studio', 'crown', 'استوديو التصميم'],
  ['profile', 'person', 'الملف الشخصي'],
  ['wallet', 'coin', 'المحفظة'],
  ['shop', 'shop', 'المتجر'],
  ['auction', 'shop', 'مزادات المقتنيات'],
  ['family', 'users', 'العائلة والارتباط الافتراضي'],
  ['settings', 'settings', 'الإعدادات'],
  ['leaderboard', 'trophy', 'الترتيب'],
  ['ranks', 'trophy', 'الرتب والمكافآت'],
  ['vip', 'crown', 'VIP الخاص بي'],
  ['tournaments', 'trophy', 'البطولات'],
  ['league', 'trophy', 'الدوري الأسبوعي'],
  ['watch', 'game', 'تفرّج على المباريات'],
  ['events', 'calendar', 'الأخبار والفعاليات'],
  ['friends', 'users', 'الأصدقاء'],
  ['rooms', 'game', 'غرف الألعاب'],
  ['social-rooms', 'users', 'الغرف الاجتماعية'],
  ['notifications', 'bell', 'إشعارات المجتمع'],
  ['notifications-internal', 'bell', 'إشعارات الإدارة'],
  ['messages', 'mail', 'الرسائل الخاصة'],
  ['support', 'help', 'تواصل مع الإدارة والدعم'],
  ['privacy', 'shield', 'سياسة الخصوصية'],
  ['terms', 'file', 'شروط الاستخدام']
]);
const ALIASES = { account: 'profile', store: 'shop', ranking: 'leaderboard', contact: 'support', 'social-room':'social-rooms' };

function currentPage(ctx) {
  let page = typeof ctx.page === 'string' ? ctx.page : '';
  if (!page || page === 'drawer') page = (globalThis.location?.hash ?? '').replace(/^#\/?/, '').split('/')[0] || 'home';
  return ALIASES[page] || page;
}

function playerIds(me) {
  const original = typeof me?.playerId === 'string' && /^[0-9]{8}$/.test(me.playerId) ? me.playerId : '';
  const display = [me?.displayPlayerId, me?.specialPlayerId].find(value =>
    typeof value === 'string' && /^(?:[0-9]{8}|[1-9][0-9]{0,7})$/.test(value)
  ) || original;
  return { display, original };
}

function faceHTML(ctx, me) {
  if (ctx.user && me && me === ctx.me && typeof ctx.avatarHTML === 'function') {
    try {
      const html = ctx.avatarHTML(62);
      if (typeof html === 'string' && html.trim()) return html;
    } catch { /* Fall back to the actual uploaded photo or neutral SVG. */ }
  }
  const equipped = me?.equipped?.avatar?.id;
  if (ctx.user && typeof equipped === 'string' && /^(?:av-|av2-|ref-[pk]-av-)[A-Za-z0-9_-]{1,80}$/.test(equipped)) {
    const html = equippedAvatarHTML(equipped, 62);
    if (html) return html.replace(/\/assets\/reference\/(ref-[pk]-av-\d+)\.webp/g, '/preview/assets/cosmetics/$1.png');
  }
  const version = me?.avatar;
  if (ctx.user && me && ((typeof version === 'number' && Number.isFinite(version) && version > 0) ||
      (typeof version === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(version)))) {
    return `<img src="${esc('/api/avatar?v=' + encodeURIComponent(String(version)))}" alt="صورة اللاعب" width="62" height="62" decoding="async">`;
  }
  return `<span class="lb-drawer-neutral" role="img" aria-label="صورة اللاعب غير متوفرة">${icon('person')}</span>`;
}

function identityHTML(ctx, state = {}) {
  const me = state.me ?? ctx.me;
  if (!ctx.user) {
    return `<div class="drawer-user lb-drawer-user">${faceHTML({}, null)}<div class="grow"><b>حيّاك في لعبك</b><small>سجّل دخولك عشان تشوف بيانات لاعبك.</small><a class="btn lb-drawer-login" href="#/account">تسجيل الدخول</a></div></div>`;
  }
  const name = (typeof me?.name === 'string' && me.name.trim() ? me.name : '') ||
    (typeof ctx.user.name === 'string' && ctx.user.name.trim() ? ctx.user.name : 'اسم اللاعب مب متوفر');
  const { display, original } = playerIds(me);
  let status = '';
  if (state.error) {
    status = `<p class="lb-drawer-status lb-drawer-error" role="alert">${esc(state.error)}</p>${typeof ctx.api === 'function' ? '<button type="button" class="btn lb-drawer-retry" data-lb-drawer-retry>جرّب مرة ثانية</button>' : ''}`;
  } else if (!me) {
    status = typeof ctx.api === 'function'
      ? '<p class="lb-drawer-status" role="status">جاري تحميل رقم اللاعب وصورته…</p>'
      : '<p class="lb-drawer-status">بيانات اللاعب التفصيلية مب متوفرة في هالواجهة.</p>';
  } else if (!display) {
    status = '<p class="lb-drawer-status">رقم اللاعب مب متوفر في رد الخادم.</p>';
  }
  const connection = ctx.connected === true ? 'متصل بالخادم' : ctx.connected === false ? 'الاتصال بالخادم مب متوفر' : '';
  return `<div class="drawer-user lb-drawer-user"><div class="avatar lb-drawer-avatar">${faceHTML(ctx, me)}</div><div class="grow"><b class="lb-drawer-name"><bdi>${esc(name)}</bdi></b>${display ? `<small>رقم اللاعب: <bdi dir="ltr">${esc(display)}</bdi></small>` : '<small>رقم اللاعب: غير متوفر</small>'}${original && original !== display ? `<small>الرقم الأصلي: <bdi dir="ltr">${esc(original)}</bdi></small>` : ''}${connection ? `<small class="lb-drawer-connection">${esc(connection)}</small>` : ''}</div></div>${status}`;
}

/** Returns only the drawer's body; no surrounding page header/navigation/overlay. */
export function render(ctx = {}) {
  const active = currentPage(ctx);
  return `<div class="lb-drawer-body" data-lb-page="drawer" dir="rtl">
    <button type="button" class="lb-drawer-close" data-lb-shell="close" aria-label="إغلاق القائمة">${icon('close')}</button>
    <div class="drawer-brand lb-drawer-brand"><a href="#/" aria-label="LA3BAK لعبك — الرئيسية"><img src="/preview/assets/profile/icon-game.svg" width="52" height="52" alt=""><b><span dir="ltr">LA3BAK</span> | لعبك</b></a><p>كل خياراتك في مكان واحد</p></div>
    <div data-lb-drawer-identity aria-live="polite">${identityHTML(ctx)}</div>
    <nav class="drawer-links lb-drawer-links" aria-label="روابط القائمة الجانبية">
      ${LINKS.map(([route, shape, label, note]) => `<a class="list-row lb-drawer-link${active === route ? ' active' : ''}" href="${esc('#/' + route)}" data-lb-drawer-route="${esc(route)}"${active === route ? ' aria-current="page"' : ''}>${icon(shape)}<span class="grow"><b>${esc(label)}</b>${note ? `<small>${esc(note)}</small>` : ''}</span>${icon('back')}</a>`).join('')}
      <div class="list-row lb-drawer-unavailable" aria-disabled="true">${icon('help')}<span class="grow"><b>الأسئلة الشائعة</b><small>مب متوفرة كصفحة مستقلة؛ تقدر تفتح الدعم.</small></span></div>
    </nav>
    ${ctx.user ? `<button type="button" class="drawer-logout lb-drawer-logout" data-act="auth-logout">${icon('logout')}<span>تسجيل الخروج</span></button>` : ''}
  </div>`;
}

/** Read-only account hydration when the host hasn't loaded ctx.me yet. */
export function mount(root, ctx = {}) {
  if (!root || typeof root.querySelector !== 'function') return { destroy() {} };
  mounts.get(root)?.destroy();
  const drawer = root.matches?.('.lb-drawer') ? root : root.querySelector('.lb-drawer');
  if (!drawer) return { destroy() {} };
  const identity = drawer.querySelector('[data-lb-drawer-identity]');
  const state = { me: ctx.me ?? null, error: '', busy: false };
  let destroyed = false;
  function repaint() {
    if (!destroyed && identity) identity.innerHTML = identityHTML(ctx, state);
  }
  async function loadIdentity() {
    if (destroyed || state.busy || !ctx.user || typeof ctx.api !== 'function') return;
    state.busy = true;
    state.error = '';
    identity?.setAttribute('aria-busy', 'true');
    repaint();
    try {
      const result = await ctx.api('/api/account', 'GET');
      if (destroyed) return;
      if (!result || typeof result !== 'object' || Array.isArray(result) || result.ok === false) throw new Error('account_response');
      state.me = result;
    } catch (error) {
      if (destroyed) return;
      state.error = error?.status === 401
        ? 'جلسة الدخول انتهت. افتح الملف الشخصي وسجّل دخولك من جديد.'
        : 'ما قدرنا نحمّل رقم اللاعب وصورته. تأكّد من الاتصال وجرّب مرة ثانية.';
    } finally {
      state.busy = false;
      if (!destroyed) {
        identity?.removeAttribute('aria-busy');
        repaint();
      }
    }
  }
  function click(event) {
    const button = event.target?.closest?.('[data-lb-drawer-retry]');
    if (!button || !drawer.contains(button)) return;
    event.preventDefault();
    void loadIdentity();
  }
  function imageError(event) {
    const image = event.target;
    if (image?.tagName !== 'IMG' || !identity?.contains(image)) return;
    const fallback = drawer.ownerDocument.createElement('span');
    fallback.className = 'lb-drawer-neutral';
    fallback.setAttribute('role', 'img');
    fallback.setAttribute('aria-label', 'تعذّر تحميل صورة اللاعب');
    fallback.innerHTML = icon('person');
    image.replaceWith(fallback);
  }
  drawer.addEventListener('click', click);
  drawer.addEventListener('error', imageError, true);
  const controller = {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      drawer.removeEventListener('click', click);
      drawer.removeEventListener('error', imageError, true);
      identity?.removeAttribute('aria-busy');
      if (mounts.get(root) === controller) mounts.delete(root);
    }
  };
  mounts.set(root, controller);
  if (ctx.user && !state.me) void loadIdentity();
  return controller;
}
