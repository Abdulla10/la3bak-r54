/* Payment body only: the host owns authentication, routing and canonical balances.
 * No redirect/query parameter is evidence of payment; only OrderView is trusted.
 */
import { renderProfileIcon as icon } from '../preview/assets/profile/ui-icons-inline.js?v=r58p';
import { giftArt } from '../giftart.js?v=r68i-r14';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const nat = value => Number.isSafeInteger(value) && value >= 0;
const quantity = value => nat(value) ? value.toLocaleString('ar-AE-u-nu-latn') : '—';
const units = Object.freeze({ coins: 'عملة', gems: 'جوهرة' });
const statuses = Object.freeze({ pending: 'يالس نجهّز الطلب', awaiting_payment: 'بانتظار الدفع', paid: 'الدفع مسجّل', failed: 'الدفع ما تم', cancelled: 'الطلب ملغي', refund_pending: 'الاسترجاع قيد المعالجة', refunded: 'المبلغ مسترجع', review: 'الطلب تحت المراجعة' });
const TEST_LABEL = 'وضع اختبار — ما فيه أموال حقيقية';
const STORAGE_PREFIX = 'la3bak:payments:request:v1:';
const CLAIM_STORAGE_PREFIX = 'la3bak:complimentary:request:v1:';
const STALE = Symbol('payment-account-changed');
let currentState;

// Integer minor units, including the last fils, without floating-point rounding.
function money(minor, currency) {
  if (!nat(minor) || currency !== 'AED') return 'السعر مب متوفر';
  const value = BigInt(minor);
  return `${(value / 100n).toLocaleString('en-AE')}.${String(value % 100n).padStart(2, '0')} AED`;
}
function checkoutURL(value) {
  if (typeof value !== 'string' || !value || /[\u0000-\u0020\u007f\\]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hostname !== 'checkout.payments.tap.company') return null;
    return url.href;
  } catch { return null; }
}
function validOrder(order) {
  return !!order && typeof order.id === 'string' && !!order.id && typeof order.packId === 'string' && !!order.packId &&
    Object.hasOwn(units, order.cur) && nat(order.amount) && order.amount > 0 && nat(order.priceMinor) && order.currency === 'AED' &&
    ['test', 'live'].includes(order.mode) && Object.hasOwn(statuses, order.status) && typeof order.credited === 'boolean' && typeof order.refunded === 'boolean';
}
function paid(order) { return order?.status === 'paid' && order.credited === true && order.refunded === false; }
function finalOrder(order) { return paid(order) || ['failed', 'cancelled', 'refunded'].includes(order?.status); }
function phase(order) { return paid(order) ? 'success' : order.status === 'failed' ? 'failed' : order.status === 'cancelled' ? 'cancelled' : order.status === 'refunded' ? 'refunded' : 'pending'; }
const storageName = owner => STORAGE_PREFIX + encodeURIComponent(owner);
function readRequest(owner) {
  try {
    const saved = JSON.parse(globalThis.sessionStorage?.getItem(storageName(owner)) || 'null');
    if (!saved) return null;
    if (typeof saved.key !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved.key) || typeof saved.packId !== 'string' || !saved.packId || (saved.orderId !== undefined && (typeof saved.orderId !== 'string' || !saved.orderId))) return { blocked: true };
    return { key: saved.key, packId: saved.packId, ...(saved.orderId ? { orderId: saved.orderId } : {}) };
  } catch { return { blocked: true }; }
}
function saveRequest(state, request) {
  // Customer details never enter storage; a write failure locks POST creation.
  const storage = globalThis.sessionStorage;
  if (!storage) throw Error('storage-unavailable');
  const serialized = JSON.stringify({ key: request.key, packId: request.packId, ...(request.orderId ? { orderId: request.orderId } : {}) });
  storage.setItem(storageName(state.owner), serialized);
  if (storage.getItem(storageName(state.owner)) !== serialized) throw Error('storage-unavailable');
}
const claimStorageName = owner => CLAIM_STORAGE_PREFIX + encodeURIComponent(owner);
function readClaimRequest(owner) {
  try {
    const saved = JSON.parse(globalThis.sessionStorage?.getItem(claimStorageName(owner)) || 'null');
    if (!saved) return null;
    if (typeof saved.key !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved.key) || typeof saved.packId !== 'string' || !saved.packId) return { blocked: true };
    return { key: saved.key, packId: saved.packId };
  } catch { return { blocked: true }; }
}
function saveClaimRequest(state, saved) {
  const storage = globalThis.sessionStorage;
  if (!storage) throw Error('storage-unavailable');
  const serialized = JSON.stringify({ packId: saved.packId, key: saved.key });
  storage.setItem(claimStorageName(state.owner), serialized);
  if (storage.getItem(claimStorageName(state.owner)) !== serialized) throw Error('storage-unavailable');
}
function stateFor(ctx) {
  const owner = ctx.user?.id != null ? String(ctx.user.id) : null;
  if (!currentState || currentState.owner !== owner) {
    const request = owner ? readRequest(owner) : null;
    currentState = { owner, catalogue: null, history: null, total: null, offset: 0, tab: 'coins', selected: null, request, claimRequest: owner ? readClaimRequest(owner) : null, claim: null, uncertain: !!request && !request.orderId, order: null, returnLoaded: null, cancelConfirm: false, loadingPacks: false, loadingHistory: false, busy: false, error: '', notice: '', refreshed: new Set() };
  }
  // A home (+) link selects an existing currency view; it cannot mint credit
  // or dismiss an order/request already awaiting a server response.
  if (Object.hasOwn(units, ctx.paymentCurrency) && !currentState.busy) currentState.tab = ctx.paymentCurrency;
  return currentState;
}
function apiReady(ctx) { return ctx.user?.id != null && ctx.connected !== false && typeof ctx.api === 'function'; }
function enabled(state) { return !complimentary(state) && state.catalogue?.status?.enabled === true && ['test', 'live'].includes(state.catalogue?.status?.mode); }
function complimentary(state) { return state.catalogue?.status?.complimentaryEnabled === true; }
function packs(state) { return [...(state.catalogue?.coinPacks || []), ...(state.catalogue?.gemPacks || [])]; }
function available(state, pack) { return enabled(state) && pack?.available === true && Object.hasOwn(units, pack.cur) && nat(pack.amount) && pack.amount > 0 && nat(pack.priceMinor) && pack.moneyCurrency === 'AED'; }
function claimable(state, pack, retry = false) { return complimentary(state) && pack?.complimentary === true && Object.hasOwn(units, pack.cur) && nat(pack.amount) && pack.amount > 0 && ((retry && pack.claimed === true) || (pack.available === true && pack.claimed === false)); }
const action = (label, name, disabled = false, extra = '', gold = false) => `<button type="button" class="${gold ? 'gold-btn' : 'btn'}" data-lbp-action="${name}" ${disabled ? 'disabled aria-disabled="true"' : ''} ${extra}>${label}</button>`;
const note = (message, error = false) => `<p class="lbp-note${error ? ' lbp-error' : ''}" role="${error ? 'alert' : 'status'}">${esc(message)}</p>`;
const art = cur => `<span class="lbp-art" aria-hidden="true" style="display:inline-flex;align-items:center;justify-content:center;background:none">${(cur === 'gems' ? giftArt({motif:'diamond',cat:'luxury',variant:0,name:'الجواهر'},58) : icon('coin')).replace('<svg','<svg style="width:100%;height:100%;background:none"')}</span>`;
const panel = (title, body, extra = '') => `<section class="panel" ${extra}><h2 class="panel-title" tabindex="-1">${title}</h2>${body}</section>`;
const testBanner = mode => mode === 'test' ? `<p class="lbp-test" data-lbp-test-mode role="status">${icon('info')}<strong>${TEST_LABEL}</strong></p>` : '';
function banner(state) {
  const status = state.catalogue?.status;
  if (complimentary(state)) return `<aside class="lbp-live" data-lbp-mode="complimentary">${icon('shield')}<div><strong>مجاني — مرة واحدة لكل حساب</strong><p>تفعيل مؤقت للباقات النقدية فقط: رصيد افتراضي حقيقي يؤكّده الخادم، مب دفع نقدي أو عملية اختبار. أسعار المتجر الافتراضي والتحويلات ما تتغيّر.</p></div></aside>`;
  if (!status || status.mode === 'disabled' || status.enabled !== true) return `<aside class="lbp-disabled" data-lbp-mode="disabled">${icon('shield')}<div><strong>الشحن مقفول الحين — بانتظار التراخيص والتفعيل</strong><p>ما بنحصّل منك فلوس من هالواجهة لين يفعّل الخادم الدفع ويعتمد الأسعار.</p></div></aside>${testBanner(status?.mode)}`;
  return status.mode === 'test' ? `<aside data-lbp-mode="test">${testBanner('test')}</aside>` : `<aside class="lbp-live" data-lbp-mode="live">${icon('shield')}<p>الدفع الفعلي مفعّل حسب الخادم. راجع المبلغ بالدرهم قبل ما تفتح صفحة الدفع.</p></aside>`;
}
function dateText(value) {
  if (value == null || (typeof value !== 'string' && typeof value !== 'number')) return 'التاريخ مب متوفر';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('ar-AE-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dubai' }) : 'التاريخ مب متوفر';
}
function orderSummary(order) {
  return `<dl class="lbp-summary"><div><dt>الكمية</dt><dd>${esc(quantity(order.amount))} ${units[order.cur]}</dd></div><div><dt>المبلغ</dt><dd><bdi dir="ltr">${esc(money(order.priceMinor, order.currency))}</bdi></dd></div><div><dt>رقم الطلب</dt><dd><bdi>${esc(order.id)}</bdi></dd></div><div><dt>وقت الطلب</dt><dd>${esc(dateText(order.createdAt))} · بتوقيت الإمارات</dd></div></dl>`;
}
function resultView(state, ctx) {
  const order = state.order;
  if (!order || !state.catalogue) return '';
  if (complimentary(state)) return panel(`${icon('file')} طلب دفع سابق — للقراءة فقط`, `${testBanner(order.mode)}${orderSummary(order)}<p>حالة الخادم: ${statuses[order.status]}</p><p class="lbp-muted">الدفع والتحقق عند المزوّد والإلغاء مقفولين خلال التفعيل المجاني. هالطلب السابق مب استلام مجاني ولا إثبات استرجاع نقدي.</p>${order.transactionId ? `<details><summary>مرجع الدفع السابق</summary><bdi>${esc(order.transactionId)}</bdi></details>` : ''}<a class="btn" href="#/wallet">شوف محفظتك</a>`, `data-lbp-result="readonly" data-lbp-order-id="${esc(order.id)}"`);
  const result = phase(order);
  const title = result === 'success' ? 'تم الدفع والإضافة بتأكيد الخادم' : result === 'failed' ? 'الدفع ما تم' : result === 'cancelled' ? 'الطلب ملغي حسب الخادم' : result === 'refunded' ? 'الخادم أكّد استرجاع المبلغ' : 'نتحقق من حالة طلبك';
  const description = result === 'success' ? 'الخادم أكّد إضافة الباقة لحسابك. رصيد الشريط يتحدّث من بيانات حسابك، مب من حسابات المتصفح.' : result === 'failed' ? 'الخادم سجّل فشل هالطلب. ما بنفترض أي إضافة؛ إذا شفت خصم عند البنك، تحقّق من الطلب قبل محاولة ثانية.' : result === 'cancelled' ? 'الإلغاء حالة الطلب بالخادم، مب إثبات استرجاع مبلغ مدفوع. لو وصل دفع متأخر، الخادم يتعامل وياه.' : result === 'refunded' ? 'هذي نتيجة الاسترجاع من الخادم. وقت ظهور المبلغ بحسابك البنكي يعتمد على مزوّد الدفع والبنك.' : order.status === 'refund_pending' ? 'استرجاع المبلغ قيد المعالجة. ما بنعتبره مسترجع لين يؤكّد الخادم.' : order.status === 'review' || order.manualReview ? 'الطلب يحتاج مراجعة من الخادم. لا تدفع مرة ثانية لهالطلب لين تتضح حالته.' : order.status === 'paid' ? 'الدفع مسجّل، بس إضافة الباقة مب مؤكدة للحين. ما بنعرض نجاح الشحن لين يؤكّد الخادم الإضافة.' : 'الرجعة من صفحة الدفع ما تثبت نجاحه. اضغط التحقق عشان يراجع الخادم حالته عند مزوّد الدفع.';
  const url = checkoutURL(order.checkoutUrl);
  const canPay = ['pending', 'awaiting_payment'].includes(order.status) && !order.credited && !order.manualReview;
  const locked = !apiReady(ctx) || state.busy;
  const hosted = canPay && url && !locked ? `<a class="gold-btn" data-lbp-checkout href="${esc(url)}" rel="noopener noreferrer" referrerpolicy="no-referrer">${icon('shield')} إكمال الدفع عند المزود</a>` : '';
  const unsafe = canPay && order.checkoutUrl && !url ? note('رابط الدفع مب ضمن النطاقات المعتمدة، فما بنفتحه. تحقّق من الطلب أو تواصل مع الدعم.', true) : '';
  const canCancel = canPay;
  const cancel = state.cancelConfirm && canCancel ? `<section class="lbp-cancel-confirm" data-lbp-cancel-focus tabindex="-1" aria-label="مراجعة إلغاء الطلب"><h3>تبا تلغي هالطلب؟</h3><p>بنرسل نية الإلغاء للخادم. هالزر ما يسترجع فلوس مدفوعة، وما يضمن منع دفع وصل متأخر؛ الخادم يراجع التحصيل المتأخر.</p><div class="lbp-actions">${action('أكيد، أرسل طلب الإلغاء', 'cancel-go', locked)}${action('خل الطلب', 'cancel-back', state.busy)}</div></section>` : '';
  return panel(`${icon(result === 'success' ? 'check' : 'clock')} ${title}`, `${testBanner(order.mode)}<p role="status">${description}</p>${orderSummary(order)}<p class="lbp-muted">حالة الخادم: ${statuses[order.status]}</p>${order.transactionId ? `<details><summary>مرجع الدفع</summary><bdi>${esc(order.transactionId)}</bdi></details>` : ''}${order.refundStatus ? `<p class="lbp-muted">حالة الاسترجاع بالخادم: <bdi>${esc(order.refundStatus)}</bdi></p>` : ''}${unsafe}<div class="lbp-actions">${action(state.busy ? 'يالس نتحقق…' : 'تحقّق عند مزوّد الدفع', 'verify', locked, '', true)}${hosted}${canCancel ? action('طلب إلغاء', 'cancel-ask', locked) : ''}${finalOrder(order) && !state.request ? action('اختار باقة ثانية', 'new', locked) : ''}<a class="btn" href="#/wallet">${icon('file')} شوف محفظتك</a></div>${cancel}`, `data-lbp-result="${result}" data-lbp-order-id="${esc(order.id)}" data-lbp-order-status="${esc(order.status)}"`);
}
function confirmation(state, ctx) {
  if (complimentary(state) || !state.catalogue) return '';
  const pending = state.request;
  if (pending?.blocked) return panel('استرجاع الطلب يحتاج تحقق', note('بيانات استرجاع الطلب مب مقروءة. الشحن مقفول عشان ما يتكرر طلب مب معروف؛ تواصل مع الدعم، ولا تمسح بيانات الجلسة بغرض إعادة الدفع.', true));
  const packId = pending && !pending.orderId ? pending.packId : state.selected;
  if (!packId || (pending?.orderId && state.order)) return '';
  const pack = packs(state).find(item => item.id === packId);
  const retry = !!pending && !pending.orderId;
  const locked = !apiReady(ctx) || state.busy || state.loadingPacks || (!retry && !available(state, pack));
  const summary = pack ? `<dl class="lbp-summary"><div><dt>الباقة</dt><dd><bdi>${esc(pack.id)}</bdi></dd></div><div><dt>الكمية</dt><dd>${esc(quantity(pack.amount))} ${units[pack.cur] || ''}</dd></div><div><dt>المبلغ</dt><dd><bdi dir="ltr">${esc(money(pack.priceMinor, pack.moneyCurrency))}</bdi></dd></div></dl>` : `<p>رقم الباقة المحفوظ: <bdi>${esc(packId)}</bdi>. تفاصيلها الحالية مب متوفرة؛ إعادة نفس الطلب للتحقق، مب اختيار باقة جديدة.</p>`;
  return panel(`${icon('shop')} ${retry ? 'استرجاع نفس الطلب' : 'راجع الباقة قبل الدفع'}`, `${testBanner(state.catalogue?.status?.mode)}${summary}${retry ? note('رد إنشاء الطلب مب مؤكد. ما تقدر تنشئ طلب ثاني. أدخل الاسم والبريد من يديد، واضغط إعادة نفس الطلب؛ بنرسل نفس المفتاح المحفوظ للحساب بدون تكرار الطلب.', true) : '<p>هذي الكمية والسعر من الخادم. بننشئ الطلب أول، وبعدها تختار تفتح صفحة الدفع المستضافة.</p>'}<form data-lbp-form="customer"><label>اسم صاحب الطلب<input name="name" type="text" autocomplete="name" maxlength="120" required value="${retry ? '' : esc(ctx.user?.name || '')}" ${locked ? 'disabled' : ''}></label><label>البريد الإلكتروني<input name="email" type="email" autocomplete="email" inputmode="email" maxlength="254" required dir="ltr" ${locked ? 'disabled' : ''}></label><p class="lbp-muted">الاسم والبريد لمزوّد الدفع المستضاف بس. تفاصيل بطاقتك تدخلها هناك، مب عندنا. ما نحفظ هالحقول باسترجاع الجلسة.</p><div class="lbp-actions"><button type="submit" class="gold-btn" data-lbp-action="${retry ? 'retry-create' : 'create'}" ${locked ? 'disabled aria-disabled="true"' : ''}>${state.busy ? 'يالس نرسل نفس الطلب…' : retry ? 'إعادة نفس الطلب المحفوظ' : 'تأكيد الباقة وإنشاء طلب الدفع'}</button>${!retry ? action('تراجع', 'dismiss', state.busy) : ''}</div></form>`, 'data-lbp-confirmation tabindex="-1"');
}
function catalogueView(state, ctx) {
  if (complimentary(state)) return complimentaryCatalogue(state, ctx);
  const list = (state.catalogue?.coinPacks) || [];
  const locked = !apiReady(ctx) || state.busy || !!state.request || !!state.order;
  const tabs = `<div class="tabs lbp-tabs" aria-label="نوع الباقات">${[['coins', 'العملات']].map(([cur, label]) => action(`${art(cur)} ${label}`, 'currency', state.busy, `data-lbp-cur="${cur}" aria-pressed="${state.tab === cur}"`, state.tab === cur)).join('')}</div>`;
  const cards = list.length ? `<div class="lbp-packs">${list.map(pack => `<article class="card lbp-pack" data-lbp-pack="${esc(pack.id)}">${art(pack.cur)}<h3>${esc(quantity(pack.amount))} ${units[pack.cur] || ''}</h3><small>الباقة: <bdi>${esc(pack.id)}</bdi></small><strong class="lbp-price"><bdi dir="ltr">${esc(money(pack.priceMinor, pack.moneyCurrency))}</bdi></strong>${action(available(state, pack) ? 'راجع الباقة' : 'الباقة مب متاحة', 'select', locked || !available(state, pack), `data-lbp-pack-id="${esc(pack.id)}"`, true)}</article>`).join('')}</div>` : note(state.loadingPacks ? 'يالس نحمّل الباقات من الخادم…' : 'ما وصلتنا باقات لهالعملة. ما بنعرض كميات أو أسعار من عندنا.');
  return panel(`${icon('shop')} باقات حسابك`, `${tabs}${cards}<p class="lbp-muted">العملات افتراضية، مب فلوس قابلة للسحب. الكمية والسعر والتوفر من الخادم، وما فيه هدايا أو أسعار مقترحة بهالصفحة.</p>`);
}
function complimentaryCatalogue(state, ctx) {
  const list = (state.catalogue?.coinPacks) || [];
  const locked = !apiReady(ctx) || state.busy || state.loadingPacks || !!state.claimRequest;
  const tabs = `<div class="tabs lbp-tabs" aria-label="نوع الباقات">${[['coins', 'العملات']].map(([cur, label]) => action(`${art(cur)} ${label}`, 'currency', state.busy, `data-lbp-cur="${cur}" aria-pressed="${state.tab === cur}"`, state.tab === cur)).join('')}</div>`;
  const cards = list.length ? `<div class="lbp-packs">${list.map(pack => `<article class="card lbp-pack" data-lbp-pack="${esc(pack.id)}" data-lbp-claimed="${pack.claimed === true}">${art(pack.cur)}<h3>${esc(quantity(pack.amount))} ${units[pack.cur] || ''}</h3><small>الباقة: <bdi>${esc(pack.id)}</bdi></small><strong class="lbp-price">${pack.complimentary === true ? 'مجاني — مرة واحدة لكل حساب' : 'الباقة مب متاحة مجاناً'}</strong>${action(pack.claimed === true ? 'تم الاستلام' : state.busy && state.claimRequest?.packId === pack.id ? 'يالس نستلم…' : claimable(state, pack) ? 'شراء مجاني' : 'الباقة مب متاحة', 'claim', locked || !claimable(state, pack), `data-lbp-pack-id="${esc(pack.id)}"`, true)}</article>`).join('')}</div>` : note('ما وصلتنا باقات لهالعملة. الكميات من الخادم فقط.');
  return panel(`${icon('shop')} باقات حسابك`, `${tabs}${cards}<p class="lbp-muted">كل باقة نقدية مؤهلة تُستلم مرة واحدة لكل حساب. الشراء المجاني يرسل طلب استلام مباشرة، بدون اسم أو بريد أو بطاقة. الرصيد من الخادم فقط.</p>`);
}
function claimView(state, ctx) {
  if (!complimentary(state)) return '';
  const claim = state.claim;
  const receipt = claim ? panel(`${icon('check')} تم الاستلام`, `<p role="status">${claim.duplicate ? 'الخادم أكّد استلام هالباقة سابقاً؛ ما تمت إضافة مكررة.' : 'الخادم أكّد إضافة الباقة المجانية لحسابك.'}</p><dl class="lbp-summary"><div><dt>الكمية</dt><dd>${esc(quantity(claim.amount))} ${units[claim.cur]}</dd></div><div><dt>مرجع الاستلام المجاني</dt><dd><bdi>${esc(claim.claimRef)}</bdi></dd></div></dl><p>هذي منحة رصيد افتراضي، مب طلب دفع أو استرجاع نقدي.</p><a class="btn" href="#/wallet">شوف سجل محفظتك</a>`, `data-lbp-claim-result="claimed" data-lbp-claim-ref="${esc(claim.claimRef)}"`) : '';
  const saved = state.claimRequest;
  if (!saved) return receipt;
  if (saved.blocked) return receipt + panel('استرجاع الاستلام يحتاج تحقق', note('بيانات الاستلام المحفوظة مب مقروءة. ما بنرسل طلب يديد؛ تواصل مع الدعم.', true));
  const pack = packs(state).find(item => item.id === saved.packId);
  return receipt + panel('استرجاع نفس الاستلام', `<p>رد الاستلام مب مؤكد. بنعيد نفس الباقة والمفتاح المحفوظ فقط؛ الخادم يمنع الإضافة المكررة لكل حساب.</p><bdi>${esc(saved.packId)}</bdi><div class="lbp-actions">${action(state.busy ? 'يالس نستلم…' : 'إعادة نفس الاستلام', 'retry-claim', !apiReady(ctx) || state.busy || state.loadingPacks || !claimable(state, pack, true), `data-lbp-pack-id="${esc(saved.packId)}"`, true)}</div>`, 'data-lbp-claim-pending');
}
function historyView(state, ctx) {
  const locked = !apiReady(ctx) || state.loadingHistory || state.busy;
  const rows = state.history;
  const body = !rows ? note(state.loadingHistory ? 'يالس نحمّل سجل طلباتك…' : 'سجل الطلبات مب متوفر الحين.') : !rows.length ? note('ما عندك طلبات بهالصفحة للحين.') : `<ul class="lbp-orders">${rows.map(order => `<li class="lbp-history-row" data-lbp-history-order="${esc(order.id)}" data-lbp-history-status="${esc(order.status)}">${art(order.cur)}<div class="lbp-grow"><b>${esc(quantity(order.amount))} ${units[order.cur]} · <bdi dir="ltr">${esc(money(order.priceMinor, order.currency))}</bdi></b><small>${esc(dateText(order.createdAt))} · بتوقيت الإمارات</small><span class="lbp-status" data-lbp-phase="${phase(order)}">${paid(order) ? 'الدفع والإضافة مؤكّدين' : statuses[order.status]}</span>${testBanner(order.mode)}<small>الطلب: <bdi>${esc(order.id)}</bdi></small></div>${action('شوف الطلب', 'open-order', locked, `data-lbp-id="${esc(order.id)}"`)}</li>`).join('')}</ul>`;
  const next = state.offset + (rows?.length || 0);
  return panel(`${icon('file')} سجل طلبات الدفع`, `${body}<nav class="lbp-pagination" aria-label="صفحات طلبات الدفع">${action('الأحدث', 'history', locked || state.offset === 0, 'data-lbp-offset="0"')}<span>${nat(state.total) ? `${esc(quantity(state.total))} طلب مسجّل` : 'عدد الطلبات مب متوفر'}</span>${action('الأقدم', 'history', locked || !rows?.length || !nat(state.total) || next >= state.total, `data-lbp-offset="${next}"`)}</nav>`);
}
function html(ctx, state) {
  const hero = `<section class="hero lbp-hero"><div class="hero-symbol">${art('coins')}</div><h1>باقات الشحن</h1><p class="subtitle">اختار باقتك، وراجع طلبك بأمان</p></section>`;
  if (!ctx.user || state.owner === null) return `<div class="lbp-page" data-lb-page="payments" dir="rtl">${hero}${panel('ادخل حسابك الحالي', '<p>سجّل دخولك عشان تشوف باقاتك وطلباتك. هالصفحة ما تنشئ حساب يديد.</p><a class="gold-btn" href="#/account">دخول الحساب</a>')}</div>`;
  const unavailable = ctx.connected === false ? note('الاتصال مقطوع الحين. المعروض آخر حالة وصلت من الخادم، مب تحقق يديد. لا تعيد الدفع من صفحة ثانية.', true) : typeof ctx.api !== 'function' ? note('ربط طلبات الدفع مب متوفر الحين؛ إنشاء الطلب والتحقق مقفولين.', true) : '';
  return `<div class="lbp-page" data-lb-page="payments" data-lbp-owner="${esc(state.owner)}" dir="rtl">${hero}<nav class="lbp-links" aria-label="التنقل بين المتجر والمحفظة"><a class="btn" href="#/shop">${icon('back')} المتجر</a><a class="btn" href="#/wallet">${icon('file')} المحفظة</a>${action('حدّث الباقات والسجل', 'reload', !apiReady(ctx) || state.busy || state.loadingPacks || state.loadingHistory)}</nav>${banner(state)}${unavailable}${state.error ? note(state.error, true) : ''}${state.notice ? note(state.notice) : ''}${!complimentary(state) && state.request?.orderId && !state.order ? note('عندك طلب محفوظ. بنجيب حالته من الخادم قبل أي طلب يديد.') : ''}<div class="lbp-content" aria-busy="${state.busy || state.loadingPacks || state.loadingHistory}">${claimView(state, ctx)}${resultView(state, ctx)}${confirmation(state, ctx)}${catalogueView(state, ctx)}${historyView(state, ctx)}</div></div>`;
}

/* R128f: الباقات المجانية انقفلت — الصفحة صارت بوابة «اشحن رصيدك» (نفس شاشة الشحن) */
const COIN128 = '<img src="/coin-r128.svg?v=r128h" width="64" height="64" alt="" aria-hidden="true">';
function gate128() { return `<section class="card lbp-r128" style="margin:14px;padding:22px 16px;border-radius:22px;text-align:center;background:linear-gradient(180deg,#2a1650,#170c2e);border:1px solid rgba(250,204,21,.35);color:#f4efff">${COIN128}<h2 style="margin:10px 0 6px;font-size:20px">اشحن رصيدك</h2><p style="margin:0 0 14px;color:#c4b5fd;font-size:14px">باقات العملات وأسعارها كلها هني.</p><button type="button" data-r128-open style="border:0;border-radius:999px;padding:12px 30px;font:inherit;font-weight:800;font-size:16px;color:#2a1650;background:linear-gradient(180deg,#fde68a,#e5a91c)">افتح الباقات</button></section>`; }
const open128 = () => import('../recharge-r123.js?v=r128h').then((m) => m.openRecharge()).catch(() => {});
export function render() { return gate128(); }

export function mount(root, ctx = {}) {
  root.innerHTML = gate128();
  const onClick = (e) => { if (e.target.closest('[data-r128-open]')) open128(); };
  root.addEventListener('click', onClick);
  if (!ctx.embeddedWallet) open128();
  return { destroy() { root.removeEventListener('click', onClick); } };
}

export function mountOld128(root, ctx = {}) {
  const state = stateFor(ctx);
  let live = true;
  let pointerHeld = false;
  let deferredPaint = false;
  const holdPaint = () => { pointerHeld = true; };
  const releasePaint = () => { pointerHeld = false; setTimeout(() => { if (deferredPaint && sameAccount()) { deferredPaint = false; paint(); } }, 0); };
  const returnId = typeof ctx.paymentReturnId === 'string' ? ctx.paymentReturnId : typeof ctx.routeArgs?.[0] === 'string' ? ctx.routeArgs[0] : null;
  const sameAccount = () => live && currentState === state && ctx.user?.id != null && String(ctx.user.id) === state.owner;
  const usable = () => sameAccount() && apiReady(ctx);
  function paint(focusSelector) {
    if (!live || currentState !== state) return;
    const ownerNow = ctx.user?.id != null ? String(ctx.user.id) : null;
    if (ownerNow !== state.owner) { root.innerHTML = ''; return; }
    if (pointerHeld) { deferredPaint = true; return; }
    const doc = root.ownerDocument;
    const focused = doc?.activeElement;
    const focusAction = root.contains?.(focused) ? focused?.dataset?.lbpAction : null;
    root.innerHTML = html(ctx, state);
    if (focusSelector) root.querySelector?.(focusSelector)?.focus?.({ preventScroll: true });
    else if (focusAction) [...(root.querySelectorAll?.('[data-lbp-action]') || [])].find(node => node.dataset.lbpAction === focusAction && !node.disabled)?.focus?.({ preventScroll: true });
  }
  async function request(path, method = 'GET', body) {
    if (!usable()) throw STALE;
    const response = await ctx.api(path, method, body);
    if (!usable()) throw STALE;
    return response;
  }
  async function canonicalRefresh(order) {
    if (!sameAccount() || typeof ctx.refreshMe !== 'function' || !(paid(order) || order.refunded === true)) return;
    const token = `${order.id}:${order.status}:${order.credited}:${order.refunded}`;
    if (state.refreshed.has(token)) return;
    state.refreshed.add(token);
    try {
      if (!sameAccount()) return;
      await ctx.refreshMe();
      if (!sameAccount()) return;
    } catch {
      if (!sameAccount()) return;
      state.refreshed.delete(token);
      state.notice = 'حالة الطلب مؤكدة، بس تحديث رصيد الشريط ما وصل. حدّث المحفظة عشان تشوف الرصيد المحفوظ.';
      paint();
    }
  }
  function applyOrder(order, expectedId, creation = false) {
    if (!sameAccount()) throw STALE;
    if (!validOrder(order) || (expectedId && order.id !== expectedId) || (creation && order.packId !== state.request?.packId)) throw Error('invalid-order');
    state.order = order; state.cancelConfirm = false; state.selected = null;
    const associated = !complimentary(state) && !!state.catalogue && (creation || state.request?.orderId === order.id);
    if (associated && state.request && !state.request.blocked) {
      if (finalOrder(order)) {
        try {
          globalThis.sessionStorage.removeItem(storageName(state.owner));
          state.request = null; state.uncertain = false;
        } catch { state.notice = 'الطلب تأكّد، بس ما قدرنا نحدّث استرجاع الجلسة. الطلب اليديد مقفول لين تتحدّث الجلسة بأمان.'; }
      } else {
        const saved = { ...state.request, orderId: order.id };
        try { saveRequest(state, saved); state.request = saved; state.uncertain = false; }
        catch { state.notice = 'حالة الطلب وصلت، بس حفظ رقمه للجلسة ما تم. احتفظ برقم الطلب؛ ما بنسمح بطلب يديد.'; }
      }
    }
  }
  async function loadPacks() {
    if (!usable() || state.loadingPacks) return;
    state.loadingPacks = true; paint();
    try {
      const response = await request('/api/payments/packs');
      if (!sameAccount()) return;
      if (!response?.status || !['disabled', 'test', 'live'].includes(response.status.mode) || typeof response.status.enabled !== 'boolean' || !Array.isArray(response.coinPacks) || !Array.isArray(response.gemPacks)) throw Error('invalid-packs');
      const clean = list => list.filter(pack => pack && typeof pack.id === 'string' && pack.id && Object.hasOwn(units, pack.cur) && nat(pack.amount) && pack.amount > 0);
      state.catalogue = { ...response, coinPacks: clean(response.coinPacks), gemPacks: clean(response.gemPacks) };
    } catch (error) { if (sameAccount() && error !== STALE) state.error = 'ما قدرنا نحمّل باقات الخادم. جرّب تحدّثها؛ ما بنفترض السعر أو التفعيل.'; }
    finally { if (sameAccount()) { state.loadingPacks = false; paint(); } }
  }
  async function loadHistory(offset = 0) {
    if (!usable() || state.loadingHistory || !nat(offset)) return;
    state.loadingHistory = true; paint();
    try {
      const response = await request(`/api/payments/orders?offset=${offset}`);
      if (!sameAccount()) return;
      if (!Array.isArray(response?.list) || !nat(response.total) || !response.list.every(validOrder)) throw Error('invalid-history');
      state.history = response.list; state.total = response.total; state.offset = offset;
    } catch (error) { if (sameAccount() && error !== STALE) state.error = 'ما قدرنا نحمّل سجل الطلبات. حدّث السجل عشان تتحقق.'; }
    finally { if (sameAccount()) { state.loadingHistory = false; paint(); } }
  }
  async function retrieve(id, operation = 'GET') {
    if (!usable() || state.busy || typeof id !== 'string' || !id || (operation !== 'GET' && (!state.catalogue || complimentary(state)))) return;
    state.busy = true; state.error = ''; state.notice = ''; paint();
    let order;
    try {
      const path = `/api/payments/orders/${encodeURIComponent(id)}${operation === 'GET' ? '' : '/' + operation}`;
      order = await request(path, operation === 'GET' ? 'GET' : 'POST', operation === 'GET' ? undefined : {});
      if (!sameAccount()) return;
      applyOrder(order, id);
    } catch (error) { if (sameAccount() && error !== STALE) { state.error = operation === 'cancel' ? 'رد الإلغاء مب مؤكد. لا تعتبره استرجاع؛ تحقّق من نفس الطلب.' : 'ما قدرنا نثبت حالة هالطلب. جرّب التحقق من الخادم؛ ما بنفترض نجاح الدفع.'; order = null; } }
    finally { if (sameAccount()) { state.busy = false; paint('[data-lbp-result] .panel-title'); } }
    if (order && sameAccount()) {
      await canonicalRefresh(order);
      if (!sameAccount()) return;
      if (operation !== 'GET') loadHistory(state.offset);
    }
  }
  async function create(form) {
    if (!usable() || state.busy || !state.catalogue || complimentary(state) || state.request?.blocked || state.request?.orderId) return;
    const packId = state.request?.packId || state.selected;
    const pack = packs(state).find(item => item.id === packId);
    if (!packId || (!state.request && !available(state, pack))) return;
    const name = String(form.elements?.namedItem('name')?.value || '').trim();
    const email = String(form.elements?.namedItem('email')?.value || '').trim();
    if (!name || name.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { state.error = 'اكتب اسم صاحب الطلب وبريد إلكتروني صحيح.'; paint('[data-lbp-confirmation]'); return; }
    if (typeof form.reportValidity === 'function' && !form.reportValidity()) return;
    let saved = state.request;
    try {
      if (!saved) {
        if (typeof globalThis.crypto?.randomUUID !== 'function') throw Error('uuid-unavailable');
        saved = { key: globalThis.crypto.randomUUID(), packId };
      }
      // Persist before POST, including explicit retries. Never rotate an unknown key.
      saveRequest(state, saved);
    } catch { state.error = 'ما قدرنا نحفظ مفتاح الطلب بأمان. ما أرسلنا طلب دفع؛ استخدم متصفح يدعم تخزين الجلسة الآمن.'; paint(); return; }
    if (!sameAccount()) return;
    state.request = saved; state.uncertain = true; state.busy = true; state.error = ''; state.notice = ''; paint();
    let order;
    try {
      order = await request('/api/payments/orders', 'POST', { packId, key: saved.key, name, email });
      if (!sameAccount()) return;
      applyOrder(order, null, true);
    } catch (error) { if (sameAccount() && error !== STALE) { state.error = 'رد إنشاء الطلب مب مؤكد. أعد نفس الطلب المحفوظ بعد إدخال الاسم والبريد من يديد؛ لا تدفع بطلب ثاني.'; order = null; } }
    finally { if (sameAccount()) { state.busy = false; paint(order ? '[data-lbp-result] .panel-title' : '[data-lbp-confirmation]'); } }
    if (order && sameAccount()) {
      await canonicalRefresh(order);
      if (!sameAccount()) return;
      loadHistory(0);
    }
  }
  async function claimPack(packId, retry = false) {
    if (!usable() || state.busy || state.loadingPacks || state.claimRequest?.blocked || !complimentary(state)) return;
    const pending = state.claimRequest;
    if ((pending && (!retry || pending.packId !== packId)) || (!pending && retry)) return;
    const pack = packs(state).find(item => item.id === packId);
    if (!claimable(state, pack, retry)) return;
    let saved = pending;
    try {
      if (!saved) {
        if (typeof globalThis.crypto?.randomUUID !== 'function') throw Error('uuid-unavailable');
        saved = { packId, key: globalThis.crypto.randomUUID() };
      }
      // Metadata only, persisted before POST. Cash history is never overwritten.
      saveClaimRequest(state, saved);
    } catch { state.error = 'ما قدرنا نحفظ مفتاح الاستلام بأمان. ما أرسلنا طلب استلام.'; paint(); return; }
    if (!sameAccount()) return;
    state.claimRequest = saved; state.busy = true; state.error = ''; state.notice = ''; paint();
    let result;
    try {
      result = await request('/api/payments/claims', 'POST', { packId, key: saved.key });
      if (!sameAccount()) return;
      if (result?.ok !== true || typeof result.duplicate !== 'boolean' || result.claimed !== true || result.packId !== packId || result.cur !== pack.cur || !nat(result.amount) || result.amount <= 0 || !nat(result.coins) || !nat(result.gems) || typeof result.claimRef !== 'string' || !result.claimRef) throw Error('invalid-claim');
      state.claim = result;
      for (const row of packs(state)) if (row.id === packId) { row.claimed = true; row.available = false; }
      try { globalThis.sessionStorage.removeItem(claimStorageName(state.owner)); state.claimRequest = null; }
      catch { state.notice = 'الاستلام مؤكّد، بس تحديث بيانات الجلسة ما تم. أعد نفس الاستلام بأمان للتحقق.'; }
    } catch (error) { if (sameAccount() && error !== STALE) { state.error = 'رد الاستلام مب مؤكد. اضغط إعادة نفس الاستلام بعد رجوع الاتصال؛ ما بنرسل طلب ثاني أو نفترض إضافة.'; result = null; } }
    finally { if (sameAccount()) { state.busy = false; paint(result ? '[data-lbp-claim-result] .panel-title' : '[data-lbp-claim-pending]'); } }
    // Returned coins/gems are NOT assigned or added in the browser. The host
    // refresh / authenticated WebSocket owns the canonical wallet snapshot.
    if (result && sameAccount() && typeof ctx.refreshMe === 'function') {
      try { await ctx.refreshMe(); }
      catch { if (sameAccount()) { state.notice = 'الاستلام مؤكّد من الخادم. حدّث محفظتك عشان تشوف الرصيد المحفوظ.'; paint(); } }
    }
  }
  function onClick(event) {
    const hosted = event.target.closest?.('[data-lbp-checkout]');
    if (hosted && root.contains(hosted)) {
      // Redundant click-time account/URL fence; no scripted navigation.
      const expected = checkoutURL(state.order?.checkoutUrl);
      if (!usable() || state.busy || !state.catalogue || complimentary(state) || !expected || hosted.getAttribute('href') !== expected) event.preventDefault();
      return;
    }
    const target = event.target.closest?.('[data-lbp-action]');
    if (!target || !root.contains(target) || target.disabled || !sameAccount()) return;
    const name = target.dataset.lbpAction;
    if (['create', 'retry-create'].includes(name)) return; // Native submit validation.
    event.preventDefault();
    if (name === 'currency' && Object.hasOwn(units, target.dataset.lbpCur) && !state.busy) {
      state.tab = target.dataset.lbpCur;
      if (Object.hasOwn(units, ctx.paymentCurrency)) {
        ctx.paymentCurrency = state.tab;
        if (ctx.embeddedWallet === true && typeof ctx.onPaymentCurrency === 'function') ctx.onPaymentCurrency(state.tab);
        if (ctx.embeddedWallet !== true && typeof location !== 'undefined') (globalThis.__LA3BAK_NAV__ || location).hash = '#/shop/packs/' + state.tab;
      }
      paint();
    }
    else if (name === 'claim') claimPack(target.dataset.lbpPackId);
    else if (name === 'retry-claim') claimPack(target.dataset.lbpPackId, true);
    else if (name === 'select' && !complimentary(state) && usable() && !state.busy && !state.request && !state.order) {
      const pack = packs(state).find(item => item.id === target.dataset.lbpPackId);
      if (available(state, pack)) { state.selected = pack.id; state.error = ''; paint('[data-lbp-confirmation]'); }
    } else if (name === 'dismiss' && !state.busy && !state.request) { state.selected = null; paint(); }
    else if (name === 'reload' && !state.busy) { state.error = ''; loadPacks(); loadHistory(state.offset); if (!state.order && (returnId || state.request?.orderId)) retrieve(returnId || state.request.orderId); }
    else if (name === 'history' && !state.busy) loadHistory(Number(target.dataset.lbpOffset));
    else if (name === 'open-order' && !state.busy) retrieve(target.dataset.lbpId);
    else if (name === 'verify' && state.order) retrieve(state.order.id, 'refresh');
    else if (name === 'cancel-ask' && !complimentary(state) && state.order && !state.busy && ['pending', 'awaiting_payment'].includes(state.order.status) && !state.order.credited) { state.cancelConfirm = true; paint('[data-lbp-cancel-focus]'); }
    else if (name === 'cancel-back' && !state.busy) { state.cancelConfirm = false; paint(); }
    else if (name === 'cancel-go' && state.cancelConfirm && state.order && !state.busy) retrieve(state.order.id, 'cancel');
    else if (name === 'new' && !state.busy && !state.request && finalOrder(state.order)) { state.order = null; state.selected = null; state.error = ''; state.notice = ''; paint(); }
  }
  function onSubmit(event) {
    if (!root.contains(event.target) || event.target.dataset?.lbpForm !== 'customer') return;
    event.preventDefault();
    if (sameAccount()) create(event.target);
  }
  root.addEventListener('click', onClick);
  root.addEventListener('submit', onSubmit);
  root.addEventListener('pointerdown', holdPaint);
  root.addEventListener('pointerup', releasePaint);
  root.addEventListener('pointercancel', releasePaint);
  paint();
  if (usable()) {
    // Same-owner shell redraws keep server snapshots and in-flight keys. No
    // automatic provider POST, and no GET -> refreshMe -> remount fetch loop.
    if (!state.catalogue) loadPacks();
    if (!state.history) loadHistory(0);
    if (returnId && (state.returnLoaded !== returnId || !state.order)) {
      state.returnLoaded = returnId;
      // Do not show another order's success while this return ID is loading.
      state.order = null;
      retrieve(returnId);
    }
    else if (state.request?.orderId && !state.order) retrieve(state.request.orderId);
  }
  return { destroy() {
    live = false;
    // Old awaits are fenced by live/current owner. A replacement mount may GET
    // again, but an uncertain POST can only be retried manually with its key.
    if (currentState === state) {
      // A fenced return GET never completed. The replacement mount must read
      // it again, rather than treating a pre-refund snapshot as the result.
      if (state.busy && returnId && state.returnLoaded === returnId) state.returnLoaded = null;
      state.loadingPacks = false; state.loadingHistory = false; state.busy = false;
    }
    root.removeEventListener('click', onClick); root.removeEventListener('submit', onSubmit);
    root.removeEventListener('pointerdown', holdPaint); root.removeEventListener('pointerup', releasePaint); root.removeEventListener('pointercancel', releasePaint);
  } };
}
