/* Preview-only settings body. The host owns routing, authentication and sound application.
 * Reuses accountToolsView: no new persistence, account, wallet or API transport.
 */
import { accountToolsView } from '../account-tools.js?v=shell-r6';
import { renderProfileIcon } from '../preview/assets/profile/ui-icons-inline.js?v=emerald-r44';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const mounts = new WeakMap();
const OPTIONS = {
  sound: ['المؤثرات الصوتية', 'تشغيل الصوت المتاح في الألعاب.'],
  notifications: ['تنبيهات المنصة', 'تفضيل التنبيهات داخل المنصة، مب إذن إشعارات المتصفح.'],
  showActivity: ['إظهار نشاطي', 'السماح بعرض إحصائيات نشاطك العامة.'],
  showPresence: ['إظهار حالة الاتصال', 'ينحفظ على حسابك؛ العرض الحالي ما يطبّقه على حالة الاتصال.'],
  hideEntrances: ['إخفاء الدخوليات', 'ينحفظ على حسابك؛ العرض الحالي ما يطبّقه على الدخوليات.'],
  hideChatEffects: ['إخفاء مؤثرات المحادثة', 'إخفاء مؤثرات المحادثة والهدايا المتاحة في الغرفة.'],
};
const icon = name => renderProfileIcon(name);
const title = (name, text) => `<h2 class="panel-title"><span class="lb-settings-title">${icon(name)}<span>${esc(text)}</span></span></h2>`;
const linkRow = (text, href, note = '') => `<a class="list-row lb-settings-link" href="${esc(href)}"><span class="grow"><b>${esc(text)}</b>${note ? `<small>${esc(note)}</small>` : ''}</span>${icon('back')}</a>`;
const unavailableRow = (text, note) => `<div class="list-row lb-settings-unavailable"><span class="grow"><b>${esc(text)}</b><small>${esc(note)}</small></span><span class="tag">مب متاح</span></div>`;

function publicID(ctx) {
  const display = ctx.me?.displayPlayerId || ctx.me?.specialPlayerId;
  if (typeof display === 'string' && /^[0-9]{1,8}$/.test(display)) return display;
  const original = ctx.me?.playerId;
  return typeof original === 'string' && /^[0-9]{8}$/.test(original) ? original : '';
}

function accountRow(ctx) {
  const rawName = ctx.me?.name ?? ctx.user?.name;
  const name = typeof rawName === 'string' && rawName.trim() ? rawName : 'الاسم مب متاح';
  const id = publicID(ctx);
  // avatarHTML is the existing trusted host renderer; ordinary data never becomes markup.
  const face = typeof ctx.avatarHTML === 'function' ? ctx.avatarHTML(62) : icon('person');
  return `<section class="list-row lb-settings-user" aria-label="حسابك"><span class="avatar lb-settings-avatar">${face || icon('person')}</span><span class="grow"><b>${esc(name)}</b><small>${id ? `معرّف اللاعب: <bdi dir="ltr">${esc(id)}</bdi>` : 'معرّف اللاعب مب متاح الحين'}</small></span><a class="btn" href="#/profile">تعديل الملف الشخصي</a></section>`;
}

/** Page BODY only; no header, balance strip, navigation shell or drawer. */
export function render(ctx = {}) {
  const hero = `<section class="hero"><div class="hero-symbol">${icon('settings')}</div><h1>الإعدادات</h1><p class="subtitle">رتّب حسابك وتجربتك في لعبك على راحتك</p></section>`;
  const help = `<section class="panel">${title('help', 'المساعدة والدعم')}${linkRow('المساعدة والدعم', '#/support', 'تواصل ويّا الدعم وافتح تذكرة من صفحة الدعم.')}${linkRow('بلّغ عن مشكلة', '#/support', 'صف المشكلة في تذكرة الدعم، بدون بيانات حسّاسة.')}${unavailableRow('الأسئلة الشائعة', 'ما فيه صفحة أسئلة شائعة مرتبطة حاليًا.')}</section>`;
  const about = `<section class="panel">${title('info', 'حول المنصة')}${linkRow('سياسة الخصوصية', '#/privacy')}${linkRow('الشروط والأحكام', '#/terms')}${linkRow('معلومات المنصة', '#/about')}</section>`;
  if (!ctx.user) return `<div data-lb-page="settings" dir="rtl">${hero}<section class="panel lb-settings-state" role="status"><h2 class="panel-title">سجّل دخولك أول</h2><p>إعداداتك خاصة بحسابك. سجّل دخولك عشان تشوفها وتعدّلها.</p><a class="gold-btn" href="#/account">تسجيل الدخول</a></section>${help}${about}</div>`;
  return `<div data-lb-page="settings" dir="rtl">${hero}${accountRow(ctx)}<section class="panel">${title('person', 'إعدادات الحساب')}${linkRow('معلومات الحساب', '#/account')}${unavailableRow('تغيير كلمة المرور', 'نظام الدخول الحالي ما يوفر تغيير كلمة مرور من هالصفحة.')}${linkRow('ربط الحساب بـ Google', '#/account', 'الربط والدخول يتمّان من صفحة الحساب الحالية.')}${linkRow('توثيق الحساب', '#/verification', 'افتح حالة طلبك أو أرسل طلب للمراجعة.')}</section><div data-lb-settings-tools aria-label="الإعدادات المحفوظة"><section class="panel lb-settings-state" role="status"><p>جاري تحميل إعداداتك من الخادم…</p></section></div>${help}${about}<div class="lb-settings-footer"><button type="button" class="gold-btn lb-settings-logout" data-act="auth-logout">${icon('logout')}<span>تسجيل الخروج</span></button><p class="muted">الخروج يستخدم جلسة حسابك الحالية، وما ينشئ حساب أو محفظة يديدة.</p></div></div>`;
}

/* Decorate rather than clone the working form. Keep data-account-tools, checkbox names,
 * reload action and submit button intact; one server transaction saves all six fields. */
function decorate(tools) {
  const form = tools.querySelector('form[data-account-tools="settings"]');
  if (!form || form.dataset.lbSettingsStyled === 'true') return;
  const submit = form.querySelector('button[type="submit"]');
  const labels = new Map();
  for (const label of form.querySelectorAll('label')) {
    const input = label.querySelector('input[type="checkbox"]');
    if (input && Object.hasOwn(OPTIONS, input.name)) labels.set(input.name, { label, input });
  }
  if (!submit || labels.size !== Object.keys(OPTIONS).length) return;
  form.dataset.lbSettingsStyled = 'true';
  form.className = 'lb-settings-form';
  const section = (name, heading, keys) => {
    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.innerHTML = title(name, heading);
    for (const key of keys) {
      const { label, input } = labels.get(key);
      const grow = document.createElement('span');
      grow.className = 'grow';
      const strong = document.createElement('b');
      strong.textContent = OPTIONS[key][0];
      const note = document.createElement('small');
      note.textContent = OPTIONS[key][1];
      grow.append(strong, note);
      input.classList.add('switch');
      label.className = 'list-row lb-settings-option';
      label.replaceChildren(grow, input);
      panel.append(label);
    }
    return panel;
  };
  const game = section('game', 'إعدادات اللعبة', ['sound']);
  game.insertAdjacentHTML('beforeend', unavailableRow('الموسيقى', 'ما فيه تحكّم مستقل بالموسيقى في النظام الحالي.') + unavailableRow('اهتزاز الجهاز', 'ما فيه خيار اهتزاز محفوظ أو واجهة تدعمه حاليًا.'));
  const privacy = section('shield', 'الخصوصية والظهور', ['showActivity', 'showPresence', 'hideEntrances', 'hideChatEffects']);
  privacy.insertAdjacentHTML('beforeend', '<p class="muted lb-settings-note">هذي تفضيلات محفوظة على حسابك؛ تطبيق كل خيار يعتمد على دعم الصفحة أو اللعبة الحالية له.</p>');
  const notifications = section('bell', 'الإشعارات', ['notifications']);
  notifications.insertAdjacentHTML('beforeend', '<div class="action-row lb-settings-notification-links"><a class="btn" href="#/notifications">إشعارات المجتمع</a><a class="btn" href="#/notifications-internal">إشعارات الإدارة</a></div><p class="muted lb-settings-note">سجل الإشعارات الحقيقي يبقى في صفحاته، وما ينحذف عند تغيير هالتفضيل.</p>');
  const actions = document.createElement('section');
  actions.className = 'panel lb-settings-save';
  const note = document.createElement('p');
  note.className = 'muted';
  note.textContent = 'غيّر الخيارات، وعقب اضغط حفظ. ما نعرضها محفوظة إلا عقب تأكيد الخادم.';
  submit.classList.add('gold-btn');
  actions.append(note, submit);
  form.replaceChildren(game, privacy, notifications, actions);
}

/** Host must destroy the mount before replacing this body. No background polling. */
export function mount(root, ctx = {}) {
  mounts.get(root)?.destroy();
  const tools = root?.querySelector?.('[data-lb-page="settings"] [data-lb-settings-tools]')
    || (root?.matches?.('[data-lb-page="settings"]') ? root.querySelector('[data-lb-settings-tools]') : null);
  if (!tools || !ctx.user) return { destroy() {} };
  if (typeof ctx.api !== 'function') {
    tools.innerHTML = '<section class="panel lb-settings-state" role="alert"><h2 class="panel-title">الإعدادات مب متاحة الحين</h2><p>مساعد الاتصال بالحساب مب مربوط بهالمعاينة. ما بنعرض مفاتيح وهمية أو نحفظ أي شي على جهازك.</p></section>';
    return { destroy() {} };
  }
  const observer = new MutationObserver(() => decorate(tools));
  observer.observe(tools, { childList: true, subtree: true });
  let view;
  try {
    view = accountToolsView(tools, {
      api: ctx.api,
      mode: 'settings',
      refreshMe: typeof ctx.refreshMe === 'function' ? ctx.refreshMe : async () => {},
    });
    decorate(tools);
  } catch {
    observer.disconnect();
    tools.innerHTML = '<section class="panel lb-settings-state" role="alert"><p>تعذّر تركيب الإعدادات. أعد فتح الصفحة، أو تواصل ويّا الدعم.</p><a class="btn" href="#/support">الدعم</a></section>';
    return { destroy() {} };
  }
  let destroyed = false;
  const handle = {
    ready: view.ready,
    reload: view.reload,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      observer.disconnect();
      view.destroy();
      if (mounts.get(root) === handle) mounts.delete(root);
    },
  };
  mounts.set(root, handle);
  return handle;
}
