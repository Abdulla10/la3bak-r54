import { renderProfileIcon } from './preview/assets/profile/ui-icons-inline.js?v=r58p';

// Presentation only. The injected admin call owns authentication; the server owns authorization,
// persistence, refund eligibility, provider access and idempotency. No credentials live here.
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = value => Number.isSafeInteger(value) ? value.toLocaleString('ar-AE-u-nu-latn') : '—';
const rows = value => Array.isArray(value) ? value : [];
const mounts = new WeakMap();
// Tab-memory journal survives dispose/remount, including a lost response. Never silently renew a key.
const journals = new Map();
const owner = actor => actor?.role === 'owner';
const actorScope = actor => actor?.id ? `owner:${actor.id}` : 'owner:admin-token';
const statusLabels = { pending: 'بانتظار الدفع', awaiting_payment: 'بانتظار إتمام الدفع', paid: 'مدفوع', succeeded: 'ناجح', successful: 'ناجح', completed: 'مكتمل', failed: 'فشل', cancelled: 'ملغي', canceled: 'ملغي', refunded: 'مسترجع', refund_pending: 'استرجاع قيد المعالجة', review: 'مراجعة يدوية' };
const reviewStatuses = new Set(['review', 'manual_review', 'manual-review', 'requires_review', 'insufficient_balance', 'insufficient', 'spent', 'blocked', 'rejected', 'pending', 'processing', 'requested', 'refunding', 'initiated', 'pending_refund', 'unknown']);
const reviewRefund = order => Boolean(order?.manualReview || reviewStatuses.has(String(order?.refundStatus || '').toLowerCase()) || ['review', 'refund_pending'].includes(order?.status));
const paidStatuses = new Set(['paid', 'succeeded', 'successful', 'success', 'completed']);

export function paymentMoney(minor, currency = 'AED') {
  if (!Number.isSafeInteger(minor) || currency !== 'AED') return '—';
  // Integer splitting avoids losing a fil at the safe-integer boundary.
  const absolute = Math.abs(minor);
  return `${minor < 0 ? '−' : ''}${Math.floor(absolute / 100).toLocaleString('en-AE')}.${String(absolute % 100).padStart(2, '0')} AED`;
}
export function paymentDate(value) {
  if (value === null || value === undefined || value === '') return '—';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('ar-AE-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dubai' }) : '—';
}
export function paymentPriceMinor(value) {
  const text = String(value ?? '').trim();
  if (text === '') return null;
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(text)) throw new Error('اكتب سعر AED بالأرقام الإنجليزية وبحد أقصى منزلتين عشريتين، مثل 12.50.');
  const [whole, fraction = ''] = text.split('.');
  const minor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (minor < 1n || minor > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('السعر لازم يكون موجب وضمن حد الأرقام الآمنة.');
  return Number(minor);
}
function priceInput(pack) {
  if (pack.moneyCurrency !== 'AED' || !Number.isSafeInteger(pack.priceMinor) || pack.priceMinor <= 0) return '';
  return `${Math.floor(pack.priceMinor / 100)}.${String(pack.priceMinor % 100).padStart(2, '0')}`;
}
export function paymentPacksPayload(catalogue, prices) {
  const packs = [...rows(catalogue?.coinPacks), ...rows(catalogue?.gemPacks)];
  if (!packs.length) throw new Error('حدّث كتالوج الباقات قبل الحفظ.');
  const map = Object.create(null);
  for (const pack of packs) {
    if (typeof pack.id !== 'string' || !pack.id || Object.hasOwn(map, pack.id)) throw new Error('كتالوج الباقات غير صالح؛ حدّث البيانات.');
    if (!Object.hasOwn(prices, pack.id)) throw new Error('راجع سعر كل باقة؛ ما نكمّل أسعار ناقصة تلقائيًا.');
    const minorUnits = paymentPriceMinor(prices[pack.id]);
    map[pack.id] = minorUnits === null ? null : { minorUnits, currency: 'AED' };
  }
  return { packPrices: { ...map } };
}
export function paymentRefundEligibility(order, status) {
  if (!order || order.refunded || order.status === 'refunded' || String(order.refundStatus || '').toLowerCase() === 'refunded') return { allowed: false, reason: 'تم الاسترجاع؛ ما نكرّره.' };
  if (reviewRefund(order)) return { allowed: false, reason: 'مراجعة يدوية / رصيد مصروف أو غير كافي: ما نخصم تحت الصفر. راجع سجل الخادم.' };
  if (!order.credited || !paidStatuses.has(order.status)) return { allowed: false, reason: 'الطلب مب مدفوع ومضاف للمحفظة؛ الاسترجاع غير متاح.' };
  if (!['test', 'live'].includes(order.mode) || status?.enabled !== true || status?.mode !== order.mode) return { allowed: false, reason: 'الاسترجاع غير متاح في وضع الخدمة الحالي. لا نخلط الاختبار بالدفع الفعلي.' };
  return { allowed: true, reason: 'استرجاع كامل فقط؛ الخادم يتحقق أن العملة المشتراة ما انصرفت وأن الرصيد يكفي.' };
}
const modeText = mode => mode === 'test' ? 'اختبار TEST — مب مبيعات فعلية' : mode === 'live' ? 'دفع فعلي LIVE' : mode === 'disabled' ? 'الدفع معطّل' : 'الوضع غير معروف';
const packsOf = state => [...rows(state.packs?.coinPacks), ...rows(state.packs?.gemPacks)];
const summary = (label, value, key, test) => `<article class="ad-kpi" data-pay-total="${key}"><b dir="ltr">${esc(value)}</b><span>${esc(label)}</span>${test ? '<i>أرقام اختبار فقط · TEST</i>' : ''}</article>`;
function modeBanner(status) {
  if (!status) return '<div class="ad-note warn" data-pay-mode="unknown">جاري التحقق من وضع الدفع من الخادم…</div>';
  return `<section class="pay-mode ad-note ${status.mode === 'live' && status.enabled ? 'ok' : 'warn'}" data-pay-mode="${esc(status.mode)}" role="status">${renderProfileIcon('shield')}<div><strong>${esc(modeText(status.mode))}</strong><p>${status.mode === 'test' ? 'كل المبالغ والطلبات في وضع الاختبار تجريبية، مب إيراد ولا مبيعات فعلية. ' : ''}${status.enabled ? 'الخدمة مفعّلة حسب إعدادات الخادم.' : 'الخدمة غير مفعّلة؛ حفظ الأسعار ما يشغّل الدفع.'}</p>${status.reason ? `<p>${esc(status.reason)}</p>` : ''}<small>المزوّد: <b dir="ltr">${esc(status.provider || 'غير مهيّأ')}</b> · ما فيه مفاتيح أو تبديل LIVE من هالواجهة.</small></div></section>`;
}
function overviewHTML(state, status, pending) {
  const data = state.overview, total = data?.totals;
  return `${total ? `<section aria-label="إجماليات المدفوعات من الخادم"><p class="pay-section-note">${esc(modeText(total.mode))} · الإجماليات من الخادم، مب محسوبة من نتائج البحث.${total.mode === 'test' ? ' هالأرقام مب مبيعات فعلية.' : ''}</p><div class="ad-dashboard-grid pay-totals" data-pay-totals-mode="${esc(total.mode)}">${summary('إجمالي المدفوع', paymentMoney(total.grossMinor, total.currency), 'grossMinor', total.mode === 'test')}${summary('إجمالي المسترجع', paymentMoney(total.refundedMinor, total.currency), 'refundedMinor', total.mode === 'test')}${summary('الصافي', paymentMoney(total.netMinor, total.currency), 'netMinor', total.mode === 'test')}${summary('طلبات ناجحة', nf(total.successful), 'successful', total.mode === 'test')}${summary('طلبات فاشلة', nf(total.failed), 'failed', total.mode === 'test')}${summary('طلبات معلّقة', nf(total.pending), 'pending', total.mode === 'test')}</div></section>` : '<p class="ad-empty">إجماليات الخادم غير متاحة بعد.</p>'}
  <section class="ad-card pay-orders"><div class="pay-card-head"><h2>${renderProfileIcon('file')} طلبات الدفع</h2><span class="ad-muted">بيانات الطلب فقط؛ بدون أسماء أو صور مفترضة</span></div>
  <form class="pay-search" data-pay-form="search"><label>معرّف الطلب أو اللاعب UUID<input class="ad-in" name="q" dir="ltr" value="${esc(state.q || '')}" placeholder="ابحث بمعرّف الطلب أو اللاعب" maxlength="100" autocomplete="off"></label><button class="ad-btn" type="submit" ${state.busy ? 'disabled' : ''}>بحث</button></form>
  ${!data ? '<p class="ad-empty">جاري تحميل الطلبات…</p>' : !rows(data.list).length ? `<p class="ad-empty">${state.q ? 'ما فيه طلبات مطابقة للمعرّف.' : 'ما فيه طلبات دفع مسجّلة.'}</p>` : `<div class="ad-scroll pay-table-scroll" tabindex="0" aria-label="جدول طلبات الدفع"><table class="ad-table pay-table"><caption>الطلبات المعروضة (${nf(rows(data.list).length)}) · التوقيت: دبي · العملة النقدية: AED</caption><thead><tr><th scope="col">الطلب / اللاعب</th><th scope="col">الباقة</th><th scope="col">المبلغ</th><th scope="col">الحالة</th><th scope="col">التاريخ / المعاملة</th><th scope="col">الاسترجاع</th></tr></thead><tbody>${rows(data.list).map(order => {
    const eligible = paymentRefundEligibility(order, status);
    return `<tr data-pay-order="${esc(order.id)}"><td data-pay-label="الطلب / اللاعب"><span class="pay-cell-label">الطلب</span><code dir="ltr">${esc(order.id)}</code><span class="pay-cell-label">اللاعب</span><code dir="ltr">${esc(order.userId)}</code></td><td data-pay-label="الباقة"><code dir="ltr">${esc(order.packId)}</code><small>${nf(order.amount)} ${order.cur === 'gems' ? 'جوهرة' : order.cur === 'coins' ? 'عملة' : esc(order.cur)}</small></td><td data-pay-label="المبلغ"><b dir="ltr">${esc(paymentMoney(order.priceMinor, order.currency))}</b><small class="pay-mode-chip" data-pay-order-mode="${esc(order.mode)}">${esc(modeText(order.mode))}</small></td><td data-pay-label="الحالة"><span class="ad-tag ${order.status === 'failed' ? 'bad' : order.credited ? 'ok' : ''}">${esc(statusLabels[order.status] || order.status)}</span><small>${order.credited ? 'أضيف للمحفظة' : 'لم يضف للمحفظة'}</small>${order.refundStatus ? `<small>حالة الاسترجاع: ${esc(order.refundStatus)}</small>` : ''}${order.manualReview ? '<small class="pay-review">يحتاج مراجعة يدوية</small>' : ''}</td><td data-pay-label="التاريخ / المعاملة"><time>${esc(paymentDate(order.createdAt))}</time><small>آخر تحديث: ${esc(paymentDate(order.updatedAt))}</small>${order.transactionId ? `<code dir="ltr">${esc(order.transactionId)}</code>` : '<small>بدون معاملة مسجّلة</small>'}</td><td data-pay-label="الاسترجاع"><p class="ad-muted">${esc(eligible.reason)}</p>${eligible.allowed ? `<button class="ad-btn danger" type="button" data-pay="refund" data-id="${esc(order.id)}" ${state.busy || pending ? 'disabled' : ''}>مراجعة استرجاع كامل</button>` : ''}</td></tr>`;
  }).join('')}</tbody></table></div>`}</section>`;
}
function pricesHTML(state, pending) {
  const packs = packsOf(state);
  return `<section class="ad-card pay-prices"><div class="pay-card-head"><h2>${renderProfileIcon('shop')} أسعار الباقات — المالك فقط</h2><span class="ad-role-pill">AED · كميات ثابتة</span></div><p class="ad-muted">كل الباقات من كتالوج الاقتصاد الحالي (${nf(packs.length)}). ما نغيّر الكمية أو نوع العملة الافتراضية أو سياسة التحويل. ما فيه أسعار مقترحة؛ الخانة الفاضية تعني الباقة بدون سعر. حفظ الأسعار ما يفعّل بوابة الدفع ولا يضيف رصيد.</p>
  ${!state.packs ? '<p class="ad-empty">كتالوج الخادم غير متاح؛ حدّث البيانات.</p>' : !packs.length ? '<p class="ad-empty">الكتالوج فارغ؛ الحفظ غير متاح.</p>' : `<form data-pay-form="prices"><fieldset ${state.busy || pending ? 'disabled' : ''}><legend class="pay-sr-only">أسعار كل باقات العملات</legend><div class="pay-pack-grid">${packs.map(pack => `<label class="pay-pack" data-pay-pack="${esc(pack.id)}"><span class="pay-pack-name">${renderProfileIcon(pack.cur === 'coins' ? 'coin' : 'star')} ${nf(pack.amount)} ${pack.cur === 'gems' ? 'جوهرة' : 'عملة'}</span><code dir="ltr">${esc(pack.id)}</code><span>السعر بالدرهم AED</span><input class="ad-in" data-pay-price="${esc(pack.id)}" name="price-${esc(pack.id)}" dir="ltr" type="text" inputmode="decimal" pattern="(?:0|[1-9][0-9]*)(?:[.][0-9]{1,2})?" value="${esc(state.prices?.[pack.id] ?? priceInput(pack))}" placeholder="غير محدد" maxlength="20" autocomplete="off" aria-label="سعر ${esc(pack.id)} بالدرهم AED">${pack.priceMinor !== null && pack.moneyCurrency && pack.moneyCurrency !== 'AED' ? `<small class="pay-review">السعر الحالي ${esc(pack.priceMinor)} وحدة صغرى ${esc(pack.moneyCurrency)}؛ راجع استبداله أو إزالته صراحة في التأكيد.</small>` : ''}</label>`).join('')}</div><p class="ad-muted">اكتب أرقام إنجليزية وبحد أقصى منزلتين عشريتين (12.50). الفراغ يزيل تسعير الباقة. ما نعتمد أي قيمة تلقائيًا.</p><button class="ad-btn" type="submit" data-pay-review-prices>مراجعة وحفظ الأسعار</button></fieldset></form>`}</section>`;
}
function dialogHTML(dialog, busy) {
  if (!dialog) return '';
  const refund = dialog.kind === 'refund', retry = dialog.retry;
  return `<div class="pay-dialog-backdrop"><section class="ad-card pay-dialog" role="dialog" aria-modal="true" aria-labelledby="pay-dialog-title" aria-describedby="pay-dialog-description" tabindex="-1" data-pay-dialog><h2 id="pay-dialog-title">${refund ? 'تأكيد استرجاع كامل' : 'تأكيد أسعار كل الباقات'}</h2><p id="pay-dialog-description">${refund ? 'الاسترجاع كامل فقط، بشرط أن العملة المشتراة ما انصرفت. القرار والحفظ عند الخادم؛ ما ننزل الرصيد تحت صفر.' : 'هالحفظ يستبدل خريطة أسعار الباقات كاملة. راجع القيم؛ الفاضي يزيل السعر. ما يغيّر كميات الباقات أو يشغّل الدفع.'}</p>
  ${refund ? `<div class="ad-note warn"><strong>${esc(modeText(dialog.order.mode))}</strong><p>المبلغ الكامل: <b dir="ltr">${esc(paymentMoney(dialog.order.priceMinor, dialog.order.currency))}</b></p><span>الطلب</span><code dir="ltr">${esc(dialog.order.id)}</code><span>اللاعب</span><code dir="ltr">${esc(dialog.order.userId)}</code><p>سحب ${nf(dialog.order.amount)} ${dialog.order.cur === 'gems' ? 'جوهرة' : 'عملة'} مشتراة؛ الخادم يتحقق من الأهلية الحالية.</p></div>` : `<div class="pay-price-review"><table class="ad-table pay-table"><caption>كل الأسعار التي سيتم حفظها</caption><thead><tr><th>الباقة</th><th>الحالي</th><th>بعد الحفظ</th></tr></thead><tbody>${dialog.packs.map(pack => `<tr><td><code dir="ltr">${esc(pack.id)}</code></td><td dir="ltr">${pack.priceMinor === null ? 'غير محدد' : pack.moneyCurrency === 'AED' ? esc(paymentMoney(pack.priceMinor)) : esc(`${pack.priceMinor} ${pack.moneyCurrency} (minor)`)}</td><td dir="ltr">${dialog.payload.packPrices[pack.id] ? esc(paymentMoney(dialog.payload.packPrices[pack.id].minorUnits)) : 'غير محدد — إزالة السعر'}</td></tr>`).join('')}</tbody></table></div>`}
  ${retry ? `<p class="ad-note warn">نتيجة الطلب السابق غير مؤكدة. إعادة المحاولة ترسل نفس البيانات ونفس المفتاح، مب عملية جديدة.</p><code dir="ltr">${esc(dialog.payload.key)}</code>` : ''}
  <div data-pay-dialog-error role="alert">${esc(dialog.error || '')}</div><form data-pay-form="confirm"><fieldset ${busy ? 'disabled' : ''}><legend class="pay-sr-only">تأكيد قرار المالك</legend><label>سبب ${refund ? 'الاسترجاع' : 'تعديل الأسعار'} (مطلوب)<textarea class="ad-in" name="reason" required minlength="3" maxlength="180" rows="2" ${retry ? 'readonly' : ''}>${esc(dialog.reason || '')}</textarea></label><label class="pay-ack"><input type="checkbox" name="ack" required ${dialog.ack ? 'checked' : ''}>راجعت البيانات والوضع، وأعتمد هالعملية بصفتي المالك.</label><p class="pay-arm-note" data-pay-arm-note role="status">${dialog.armed ? 'التأكيد جاهز. اضغط «تنفيذ نهائي» عن قصد لإرسال الطلب.' : 'إدخال السبب أو اختيار الخانة بروحه ما ينفّذ شي. فيه خطوتين للتأكيد.'}</p><div class="ad-acts"><button class="ad-btn ${refund ? 'danger' : ''}" type="submit" data-pay-confirm data-armed="${dialog.armed ? '1' : '0'}" ${busy ? 'disabled' : ''}>${busy ? 'جاري الإرسال…' : dialog.armed ? 'تنفيذ نهائي' : 'تجهيز التأكيد'}</button><button class="ad-btn ghost" type="button" data-pay="cancel-dialog" ${busy ? 'disabled' : ''}>رجوع بدون إرسال</button></div></fieldset></form></section></div>`;
}
export function paymentAdminHTML(state = {}, { actor, pending = null } = {}) {
  if (!owner(actor)) return '<section class="pay-admin" dir="rtl"><div class="ad-note bad" role="alert">إدارة المدفوعات للمالك فقط. حماية الصلاحيات مطبّقة بشكل مستقل بالخادم.</div></section>';
  const status = state.overview?.status || state.packs?.status;
  return `<section class="pay-admin" dir="rtl" aria-label="إدارة المدفوعات" aria-busy="${state.busy ? 'true' : 'false'}"><div data-pay-content ${state.dialog ? 'inert aria-hidden="true"' : ''}><header class="pay-head"><div><span class="pay-eyebrow">${renderProfileIcon('crown')} إدارة المالك</span><h2>المدفوعات والباقات</h2><p class="ad-muted">طلبات حقيقية من الخادم، وأسعار تعتمدها إنت.</p></div><button class="ad-btn ghost" type="button" data-pay="refresh" ${state.busy ? 'disabled' : ''}>تحديث البيانات</button></header>${modeBanner(status)}
  <div class="ad-note bad" role="alert" data-pay-error ${state.error ? '' : 'hidden'}>${esc(state.error || '')}</div><div class="ad-note ok" role="status" data-pay-message ${state.message ? '' : 'hidden'}>${esc(state.message || '')}</div>
  ${pending ? `<section class="ad-note warn" data-pay-pending role="status"><strong>عملية سابقة ${pending.inFlight ? 'قيد الإرسال' : 'نتيجتها غير مؤكدة'}</strong><p>لا تبدأ عملية ثانية. استكمل نفس الطلب بنفس المفتاح، أو راجع سجل الخادم أولًا. المفتاح محفوظ بذاكرة هالتبويب؛ انسخه قبل إغلاقه.</p><code dir="ltr">${esc(pending.body.key)}</code><button class="ad-btn ghost" type="button" data-pay="retry" ${state.busy || pending.inFlight ? 'disabled' : ''}>مراجعة وإعادة نفس الطلب</button></section>` : ''}
  <div class="pay-tabs" role="tablist" aria-label="أقسام المدفوعات">${[['orders', 'الطلبات والإجماليات', 'chart'], ['packs', 'أسعار الباقات', 'shop']].map(([id, label, icon]) => `<button class="ad-btn ${state.tab === id ? '' : 'ghost'}" type="button" role="tab" id="pay-tab-${id}" aria-controls="pay-panel-${id}" aria-selected="${(state.tab || 'orders') === id}" tabindex="${(state.tab || 'orders') === id ? '0' : '-1'}" data-pay="tab" data-tab="${id}">${renderProfileIcon(icon)}${label}</button>`).join('')}</div>
  <section role="tabpanel" tabindex="0" id="pay-panel-${state.tab || 'orders'}" aria-labelledby="pay-tab-${state.tab || 'orders'}">${state.tab === 'packs' ? pricesHTML(state, pending) : overviewHTML(state, status, pending)}</section><p class="pay-footer">التوقيت دبي (Asia/Dubai) · مبالغ AED بوحدات صغرى ÷ 100 · ما فيه استرجاع جزئي أو ملفات لاعب مفترضة.</p></div>${dialogHTML(state.dialog, state.busy)}</section>`;
}
function ensureCSS() {
  if (!document.querySelector('link[data-payment-admin-css]')) {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/payment-admin.css?v=r58p'; link.dataset.paymentAdminCss = '1'; document.head.appendChild(link);
  }
}
export function mountPaymentAdmin(root, { call, actor } = {}) {
  if (!root) throw new Error('عنصر إدارة المدفوعات مطلوب.');
  if (mounts.has(root)) return mounts.get(root);
  ensureCSS();
  const state = { tab: 'orders', q: '', overview: null, packs: null, prices: {}, busy: false, error: '', message: '', dialog: null };
  const scope = actorScope(actor);
  let disposed = false, sequence = 0, returnFocus = null;
  const valid = () => !disposed && root.isConnected !== false && mounts.get(root) === controller;
  const pending = () => journals.get(scope) || null;
  const status = () => state.overview?.status || state.packs?.status;
  const draw = () => { if (valid()) root.innerHTML = paymentAdminHTML(state, { actor, pending: pending() }); };
  const focus = selector => { if (valid()) root.querySelector(selector)?.focus?.(); };
  function notice() {
    if (!valid()) return;
    for (const [selector, text] of [['[data-pay-error]', state.error], ['[data-pay-message]', state.message]]) {
      const node = root.querySelector(selector); if (node) { node.textContent = text; node.hidden = !text; }
    }
  }
  const setCatalogue = data => {
    if (!data || !Array.isArray(data.coinPacks) || !Array.isArray(data.gemPacks)) throw new Error('رد كتالوج الباقات غير صالح.');
    state.packs = data; state.prices = Object.fromEntries(packsOf(state).map(pack => [pack.id, priceInput(pack)]));
  };
  const validateOverview = data => { if (!data?.status || !data?.totals || !Array.isArray(data.list)) throw new Error('رد نظرة المدفوعات غير صالح.'); return data; };
  async function refresh() {
    if (!valid() || !owner(actor) || state.busy || state.dialog) return;
    const request = ++sequence; state.busy = true; state.error = ''; draw();
    const results = await Promise.allSettled([Promise.resolve().then(() => call(`payments/overview?q=${encodeURIComponent(state.q)}`)), Promise.resolve().then(() => call('payments/packs'))]);
    if (!valid() || request !== sequence) return;
    const errors = [];
    try { if (results[0].status === 'fulfilled') state.overview = validateOverview(results[0].value); else throw results[0].reason; } catch (error) { errors.push(error?.message || 'تعذّر تحميل الطلبات.'); }
    try { if (results[1].status === 'fulfilled') setCatalogue(results[1].value); else throw results[1].reason; } catch (error) { errors.push(error?.message || 'تعذّر تحميل الباقات.'); }
    state.error = errors.join(' · '); state.busy = false; draw();
  }
  function showDialog(dialog, trigger) {
    if (!valid() || state.busy || state.dialog) return;
    returnFocus = trigger; state.dialog = { reason: '', ack: false, armed: false, error: '', ...dialog }; draw();
    focus('[data-pay-dialog]');
  }
  function closeDialog() {
    if (!valid() || state.busy) return;
    state.dialog = null; draw();
    if (returnFocus === 'prices') focus('[data-pay-review-prices]');
    else if (returnFocus === 'retry') focus('[data-pay="retry"]');
    else { const button = [...root.querySelectorAll('[data-pay="refund"]')].find(node => node.dataset.id === returnFocus); button?.focus?.(); }
    returnFocus = null;
  }
  function syncDialog() {
    if (!valid() || !state.dialog) return;
    const d = state.dialog, button = root.querySelector('[data-pay-confirm]'), note = root.querySelector('[data-pay-arm-note]'), error = root.querySelector('[data-pay-dialog-error]');
    if (button) { button.textContent = state.busy ? 'جاري الإرسال…' : d.armed ? 'تنفيذ نهائي' : 'تجهيز التأكيد'; button.dataset.armed = d.armed ? '1' : '0'; button.disabled = state.busy; }
    if (note) note.textContent = d.armed ? 'التأكيد جاهز. اضغط «تنفيذ نهائي» عن قصد لإرسال الطلب.' : 'إدخال السبب أو اختيار الخانة بروحه ما ينفّذ شي. فيه خطوتين للتأكيد.';
    if (error) error.textContent = d.error || '';
  }
  async function execute(dialog) {
    if (!valid() || state.busy || !dialog.armed || !owner(actor)) return;
    let entry = pending();
    if (entry && (entry.inFlight || !dialog.retry || entry.body.key !== dialog.payload.key)) { dialog.error = 'فيه عملية سابقة؛ استكملها بنفس المفتاح أولًا.'; syncDialog(); return; }
    if (!entry) {
      const body = { ...dialog.payload, reason: dialog.reason.trim(), key: crypto.randomUUID() };
      entry = { kind: dialog.kind, path: dialog.kind === 'refund' ? `payments/orders/${encodeURIComponent(dialog.order.id)}/refund` : 'payments/packs', body, order: dialog.order, packs: dialog.packs, inFlight: false };
      journals.set(scope, entry);
    }
    entry.inFlight = true; state.busy = true; state.error = ''; state.message = ''; draw(); focus('[data-pay-dialog]');
    let saved = false;
    try {
      const result = await call(entry.path, { method: 'POST', body: structuredClone(entry.body) });
      saved = true;
      if (journals.get(scope) === entry) journals.delete(scope);
      if (!valid()) return;
      state.dialog = null;
      state.message = entry.kind === 'refund' ? (reviewRefund(result) ? 'الطلب يحتاج مراجعة يدوية؛ الاسترجاع مب مؤكد. ما نفرض خصم تحت الصفر.' : result?.refunded ? 'تم تأكيد الاسترجاع الكامل من الخادم.' : 'استلم الخادم الطلب؛ راجع حالته. ما نعتبره استرجاع مكتمل بدون تأكيد.') : 'تم حفظ أسعار الباقات؛ هالحفظ ما يفعّل الدفع.';
      if (result?.auditOk === false) state.message += ' تنبيه: تعذّر تسجيل التدقيق؛ لا تعيد التنفيذ بسبب هالتنبيه.';
      if (entry.kind === 'refund' && state.overview && result?.id === entry.order.id) state.overview.list = rows(state.overview.list).map(order => order.id === result.id ? result : order);
      const request = ++sequence;
      const results = await Promise.allSettled([Promise.resolve().then(() => call(`payments/overview?q=${encodeURIComponent(state.q)}`)), Promise.resolve().then(() => call('payments/packs'))]);
      if (!valid() || request !== sequence) return;
      const errors = [];
      try { if (results[0].status === 'fulfilled') state.overview = validateOverview(results[0].value); else throw results[0].reason; } catch (error) { errors.push(error?.message || 'تعذّر تحديث الطلبات.'); }
      try { if (results[1].status === 'fulfilled') setCatalogue(results[1].value); else throw results[1].reason; } catch (error) { errors.push(error?.message || 'تعذّر تحديث الأسعار.'); }
      if (errors.length) state.error = `العملية استلمها الخادم، لكن تحديث العرض تعذّر: ${errors.join(' · ')} لا تعيد التنفيذ؛ حدّث البيانات للتحقق.`;
    } catch (error) {
      if (!valid()) return;
      const message = error?.message || 'تعذّر الاتصال بالخادم.';
      state.error = saved ? `العملية محفوظة؛ تعذّر تحديث العرض: ${message}` : `نتيجة الطلب غير مؤكدة: ${message} احتفظنا بنفس المفتاح والبيانات لإعادة المحاولة. إذا الرصيد مصروف أو غير كافي، راجع يدويًا؛ ما نخصم تحت الصفر.`;
      state.dialog = null;
    } finally {
      entry.inFlight = false;
      if (valid()) { state.busy = false; draw(); focus('[data-pay="retry"]'); }
    }
  }
  const onClick = event => {
    const button = event.target.closest?.('[data-pay]');
    if (!button || !root.contains(button) || !valid() || state.busy || !owner(actor)) return;
    const action = button.dataset.pay;
    // Parent admin delegation must never see payment actions, including nested forms.
    event.preventDefault(); event.stopPropagation();
    if (action === 'cancel-dialog') { closeDialog(); return; }
    if (state.dialog) return;
    if (action === 'refresh') { void refresh(); return; }
    if (action === 'tab') { if (['orders', 'packs'].includes(button.dataset.tab)) { state.tab = button.dataset.tab; draw(); focus(`[data-tab="${state.tab}"]`); } return; }
    if (action === 'retry') {
      const entry = pending(); if (!entry || entry.inFlight) return;
      showDialog({ kind: entry.kind, payload: structuredClone(entry.body), reason: entry.body.reason, order: entry.order, packs: entry.packs, retry: true }, 'retry'); return;
    }
    if (pending()) return;
    if (action === 'refund') {
      const order = rows(state.overview?.list).find(order => order.id === button.dataset.id);
      if (!paymentRefundEligibility(order, status()).allowed) return;
      showDialog({ kind: 'refund', order: structuredClone(order), payload: {} }, order.id);
    }
  };
  const onInput = event => {
    if (!valid() || state.busy) return;
    const field = event.target;
    if (field.dataset?.payPrice && !state.dialog && !pending() && Object.hasOwn(state.prices, field.dataset.payPrice)) state.prices[field.dataset.payPrice] = field.value;
    if (state.dialog && ['reason', 'ack'].includes(field.name)) {
      if (field.name === 'reason' && !state.dialog.retry) state.dialog.reason = field.value;
      if (field.name === 'ack') state.dialog.ack = field.checked === true;
      state.dialog.armed = false; state.dialog.error = ''; syncDialog();
    }
  };
  const onSubmit = async event => {
    const form = event.target.closest?.('[data-pay-form]');
    if (!form || !root.contains(form)) return;
    event.preventDefault(); event.stopPropagation();
    if (!valid() || state.busy || !owner(actor)) return;
    const values = Object.fromEntries(new FormData(form));
    if (form.dataset.payForm === 'confirm' && state.dialog) {
      const d = state.dialog, reason = d.retry ? d.payload.reason : String(values.reason || '').trim();
      const ack = Object.hasOwn(values, 'ack');
      if (reason.length < 3 || reason.length > 180 || !ack) { d.armed = false; d.error = 'اكتب سبب من 3 إلى 180 حرف، وأكّد مراجعتك للبيانات.'; syncDialog(); return; }
      if (d.reason.trim() !== reason || !d.ack) d.armed = false;
      d.reason = reason; d.ack = ack; d.error = '';
      if (!d.armed) { d.armed = true; syncDialog(); return; }
      await execute(d); return;
    }
    if (state.dialog) return;
    if (form.dataset.payForm === 'search') {
      state.q = String(values.q || '').trim().slice(0, 100); state.message = ''; await refresh(); return;
    }
    if (form.dataset.payForm === 'prices' && !pending()) {
      try {
        const prices = Object.fromEntries(packsOf(state).map(pack => [pack.id, values[`price-${pack.id}`] ?? state.prices[pack.id]]));
        const payload = paymentPacksPayload(state.packs, prices);
        state.prices = prices; state.error = ''; showDialog({ kind: 'packs', payload, packs: structuredClone(packsOf(state)) }, 'prices');
      } catch (error) { state.error = error.message; notice(); }
    }
  };
  const onKeydown = event => {
    if (!valid()) return;
    if (state.dialog) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeDialog(); return; }
      const dialog = root.querySelector('[data-pay-dialog]');
      const controls = dialog ? [...dialog.querySelectorAll('button:not(:disabled), textarea:not(:disabled), input:not(:disabled), [tabindex="0"]')].filter(node => !node.hidden) : [];
      if (event.key === 'Tab' && controls.length) {
        const index = controls.indexOf(document.activeElement), next = event.shiftKey ? index <= 0 ? controls.length - 1 : index - 1 : index < 0 || index === controls.length - 1 ? 0 : index + 1;
        event.preventDefault(); event.stopPropagation(); controls[next].focus();
      } else if (['ArrowLeft', 'ArrowRight'].includes(event.key) && event.target.matches?.('button')) {
        const buttons = controls.filter(node => node.matches('button')), index = buttons.indexOf(event.target);
        if (index >= 0 && buttons.length) { event.preventDefault(); buttons[(index + (event.key === 'ArrowLeft' ? 1 : buttons.length - 1)) % buttons.length].focus(); }
      }
      return;
    }
    const tab = event.target.closest?.('[role="tab"][data-pay="tab"]');
    if (tab && !state.busy && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); event.stopPropagation();
      state.tab = event.key === 'Home' ? 'orders' : event.key === 'End' ? 'packs' : state.tab === 'orders' ? 'packs' : 'orders'; draw(); focus(`[data-tab="${state.tab}"]`);
    }
  };
  const controller = { dispose() {
    if (disposed) return;
    disposed = true; ++sequence;
    for (const [name, handler] of [['click', onClick], ['submit', onSubmit], ['input', onInput], ['change', onInput], ['keydown', onKeydown]]) root.removeEventListener(name, handler);
    if (mounts.get(root) === controller) mounts.delete(root);
  } };
  mounts.set(root, controller);
  draw();
  if (owner(actor) && typeof call === 'function') {
    for (const [name, handler] of [['click', onClick], ['submit', onSubmit], ['input', onInput], ['change', onInput], ['keydown', onKeydown]]) root.addEventListener(name, handler);
    void refresh();
  } else if (owner(actor)) { state.error = 'اتصال إدارة المدفوعات غير مهيّأ.'; draw(); }
  return controller;
}
