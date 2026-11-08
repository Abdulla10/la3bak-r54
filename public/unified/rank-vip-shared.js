/* Presentation only. Prices, points, entitlement and expiry are server authority.
 * No account storage, wallet projection, reference backgrounds or seeded data. */
import { rankBadgeArt, rankTheme } from '../preview/rank-overview.js?v=r58c';
import { renderProfileIcon } from '../preview/assets/profile/ui-icons-inline.js?v=r58p';

export const CAPS = Object.freeze({ level: 100, vip: 15, noble: 9 });
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const obj = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const list = value => Array.isArray(value) ? value : [];
export const nat = value => Number.isSafeInteger(value) && value >= 0;
export const fmt = value => nat(value) ? new Intl.NumberFormat('ar-AE-u-nu-latn').format(value) : '—';
export const accountId = ctx => Object.hasOwn(ctx, 'user') ? ctx.user?.id ?? null : ctx.me?.id ?? null;
export const canRead = ctx => typeof ctx.api === 'function';
export const canWrite = ctx => Boolean(accountId(ctx)) && canRead(ctx) && ctx.connected !== false;
export const fingerprint = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export const identifier = value => typeof value === 'string' && /^[A-Za-z0-9_:.-]{1,128}$/.test(value);
export const safeColor = value => typeof value === 'string' && /^#(?:[a-f0-9]{3}|[a-f0-9]{4}|[a-f0-9]{6}|[a-f0-9]{8})$/i.test(value) ? value : '';

/** Only local, non-traversing artwork. Never allow data URLs or third-party tracking. */
export function safeImageURL(value) {
  if (typeof value !== 'string' || !value || /[\u0000-\u0020\u007f\\]/.test(value) || /%(?:0[0-9a-f]|1[0-9a-f]|2[ef]|5c|7f)/i.test(value) || value.startsWith('//')) return '';
  let path = value;
  if (!value.startsWith('/')) {
    try {
      const url = new URL(value);
      if (typeof location === 'undefined' || !['http:', 'https:'].includes(url.protocol) || url.origin !== location.origin || url.username || url.password) return '';
      path = url.pathname + url.search;
    } catch { return ''; }
  }
  if (path.includes('..') || !/^\/(?!\/)[^?#]+\.(?:png|webp|svg|jpg|jpeg|avif|gif)(?:\?[^#]*)?$/i.test(path)) return '';
  return path;
}
let artSequence = 0;
export function icon(name) {
  const prefix = `lbrv-art-${++artSequence}-`;
  return renderProfileIcon(name).replace(/id="([^"]+)"/g, (_, id) => `id="${prefix}${esc(id)}"`).replace(/url\(#([^\)]+)\)/g, (_, id) => `url(#${prefix}${esc(id)})`);
}
export function rankNumber(system, value) {
  const pattern = system === 'vip' ? /^V([1-9]|1[0-5])$/ : system === 'noble' ? /^N([1-9])$/ : null;
  const n = typeof value === 'string' && pattern?.test(value) ? Number(value.slice(1)) : value;
  return nat(n) && n >= 1 && n <= CAPS[system] ? n : null;
}
export function rankState(entry, system) {
  if (!obj(entry) || typeof entry.enabled !== 'boolean') return { state: 'unavailable', rank: null, text: 'بيانات الرتبة غير متاحة' };
  if (!entry.enabled) return { state: 'disabled', rank: null, text: 'نظام الرتبة غير مفعّل' };
  if (entry.value === null) return { state: 'unranked', rank: null, text: 'لا رتبة مكتسبة بعد' };
  const rank = rankNumber(system, entry.value);
  return rank === null ? { state: 'invalid', rank: null, text: 'بيانات الرتبة تحتاج تحديثًا' } : { state: 'earned', rank, text: system === 'vip' ? `VIP ${rank}` : `الرتبة ${fmt(rank)}` };
}
export function rankArt(system, rank, metadata) {
  return safeImageURL(metadata?.artwork) || (rank ? rankBadgeArt(system, rank) : '');
}
export function theme(system, rank) { return rankTheme(system, rank); }
export function artwork(url, fallback = 'medal', className = '', alt = '') {
  const safe = safeImageURL(url);
  return `<span class="lbrv-art ${className}" ${safe ? '' : 'aria-hidden="true"'}>${safe ? `<img src="${esc(safe)}" alt="${esc(alt)}" width="160" height="160" loading="lazy" decoding="async">` : icon(fallback)}</span>`;
}
export function progressModel(entry, system) {
  const view = rankState(entry, system);
  if (!['earned', 'unranked'].includes(view.state) || !nat(entry.points)) return { valid: false };
  const approvedCap = system === 'noble' && nat(entry.max) && entry.max >= 1 && entry.max <= CAPS.noble ? entry.max : CAPS[system];
  if (view.rank === approvedCap) return { valid: true, capped: true, percentage: 100, points: entry.points };
  const next = rankNumber(system, entry.nextRank);
  if (next !== (view.rank ?? 0) + 1 || !nat(entry.pointsFloor) || !nat(entry.pointsNext) || entry.pointsNext <= entry.pointsFloor || entry.points < entry.pointsFloor || entry.points >= entry.pointsNext) return { valid: false, points: entry.points };
  return { valid: true, capped: false, points: entry.points, next, threshold: entry.pointsNext, remaining: entry.pointsNext - entry.points, percentage: Math.max(0, Math.min(100, (entry.points - entry.pointsFloor) / (entry.pointsNext - entry.pointsFloor) * 100)) };
}
export function meterHTML(model, label) {
  if (!model.valid) return '<p class="lbrv-muted">حدود الترقية غير مكتملة أو غير معتمدة؛ لا يمكن حساب التقدم.</p>';
  const percentage = model.percentage.toFixed(1);
  return `<div class="lbrv-meter"><progress max="100" value="${percentage}" aria-label="${esc(label)}" aria-valuetext="${percentage}%">${percentage}%</progress><span dir="ltr">${percentage}%</span></div>`;
}
/** Parse absolute UTC instants only. Bare dates/local timestamps must not invent timezone. */
export function timestamp(value) {
  if (nat(value) && value > 0 && value <= 8640000000000000) return value;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
export function countdown(until, now = Date.now()) {
  const end = timestamp(until);
  if (end === null || !Number.isFinite(now)) return 'المدة غير متاحة';
  if (end <= now) return 'انتهت المدة';
  const total = Math.floor((end - now) / 100);
  const days = Math.floor(total / 864000);
  const hours = Math.floor(total / 36000) % 24;
  const minutes = Math.floor(total / 600) % 60;
  const seconds = (total % 600 / 10).toFixed(1).padStart(4, '0');
  return `${days ? `${days} يوم · ` : ''}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${seconds}`;
}
export function clockHTML(until, label) {
  const end = timestamp(until);
  return end === null ? '<span class="lbrv-muted">المدة غير متاحة</span>' : `<span class="lbrv-countdown" data-lbrv-until="${end}" dir="ltr" aria-label="${esc(label)}">${esc(countdown(end))}</span>`;
}
export function dateText(value) {
  const at = timestamp(value);
  return at === null ? 'غير متاح' : new Intl.DateTimeFormat('ar-AE-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(at) + ' UTC';
}
export function emptyHTML(title, text, symbol = 'shield') { return `<section class="lbrv-empty" role="status">${icon(symbol)}<h3>${esc(title)}</h3><p>${esc(text)}</p></section>`; }
export function loginHTML() { return `${emptyHTML('رتبتك تبدأ من حسابك', 'سجّل الدخول لعرض تقدمك ومكافآتك وعضويتك الفعلية.', 'person')}<a class="lbrv-button is-gold" href="#/account">تسجيل الدخول</a>`; }
export function messageHTML(state) { return `${state.loading ? '<p class="lbrv-notice" role="status">جاري التحديث من الخادم…</p>' : ''}${state.error ? `<p class="lbrv-notice is-error" role="alert">${esc(state.error)}</p>` : ''}${state.notice ? `<p class="lbrv-notice" role="status">${esc(state.notice)}</p>` : ''}`; }
export function errorText(error) {
  const code = Number(error?.status ?? error?.statusCode);
  if (code === 401 || code === 403) return 'الجلسة غير متاحة. سجّل الدخول من جديد.';
  if (code === 404 || code === 501) return 'هذه الخدمة غير متاحة على الخادم حاليًا.';
  if (code === 409) return 'تغيّرت البيانات أو شروط الطلب. حدّث الصفحة وراجع الشروط مجددًا.';
  return 'تعذّر إكمال الطلب. تحقق من اتصالك وحاول مجددًا.';
}
export async function call(ctx, path, method = 'GET', body) {
  const result = await ctx.api(path, method, body);
  if (!obj(result) || result.ok === false || result.error) {
    const error = new Error('Invalid or failed server response');
    error.status = result?.status ?? result?.statusCode;
    throw error;
  }
  return result;
}

/** Page-local scope: destroy/account change cancels presentation of every late result. */
export function lifecycle(root, ctx, pageName, draw) {
  const page = root?.matches?.(`.lbrv-page[data-lb-page="${pageName}"]`) ? root : root?.querySelector?.(`.lbrv-page[data-lb-page="${pageName}"]`) || root;
  const owner = accountId(ctx);
  let dead = false, generation = 0;
  const current = version => !dead && accountId(ctx) === owner && (typeof ctx.getUserId !== 'function' || ctx.getUserId() === owner) && (typeof ctx.getAccountId !== 'function' || ctx.getAccountId() === owner) && (version === undefined || version === generation);
  const paint = () => {
    if (dead || !page) return;
    page.innerHTML = current() ? draw() : loginHTML();
  };
  const tick = () => {
    if (!current()) { destroy(); if (page) page.innerHTML = loginHTML(); return; }
    for (const node of page?.querySelectorAll?.('[data-lbrv-until]') ?? []) node.textContent = countdown(Number(node.dataset.lbrvUntil));
  };
  // Do not keep a timer in login or an unmounted presentation.
  const timer = owner && page ? setInterval(tick, 100) : null;
  timer?.unref?.();
  const listeners = [];
  function destroy() { dead = true; generation++; if (timer) clearInterval(timer); for (const [event, fn] of listeners) page?.removeEventListener?.(event, fn); }
  return { page, owner, current, paint, next: () => ++generation, destroy,
    on(event, fn) { page?.addEventListener?.(event, fn); listeners.push([event, fn]); } };
}
