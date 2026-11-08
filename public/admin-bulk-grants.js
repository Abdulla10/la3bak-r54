/* واجهة منح مستقلة. الحماية والتحقق والحفظ ومنع التكرار مسؤولية الخادم. */
const STORAGE = 'qa_adm_bulk_grants_v1';
const SLOTS = { avatar: 'الأفاتارات', frame: 'الإطارات', bg: 'الخلفيات', title: 'الألقاب', badge: 'الشارات' };
const ROLES = { owner: 'المالك', admin: 'مدير', moderator: 'مشرف', support: 'دعم' };
const STATUS = { preview: 'معاينة فقط — لم تُنفّذ', queued: 'في قائمة التنفيذ', running: 'قيد التنفيذ', paused_storage: 'متوقفة لحماية الحفظ', paused_authorization: 'متوقفة لمراجعة الصلاحية أو الكتالوج', completed: 'مكتملة', completed_with_errors: 'مكتملة مع حالات فشل' };
const ERRORS = {
  BULK_DISABLED: 'خدمة المنح غير مفعّلة حالياً.', FORBIDDEN: 'لا تملك صلاحية هذه العملية.', NOT_CAMPAIGN_CREATOR: 'التأكيد وإعادة المحاولة متاحان لمنشئ الحملة أو المالك فقط.', CREATOR_REVOKED: 'سُحبت صلاحية منشئ الحملة. يلزم مراجعة المالك.',
  PREVIEW_EXPIRED: 'انتهت صلاحية المعاينة. أنشئ معاينة جديدة وراجع العدد مجدداً.', SNAPSHOT_MISMATCH: 'لم تتطابق بصمة الحملة أو عدد المستلمين. حدّث بيانات الحملة قبل التأكيد.', KEY_CONFLICT: 'مفتاح الطلب مرتبط بمعاينة أخرى. راجع الحملة المحفوظة أو عدّل المدخلات لإنشاء طلب جديد.',
  CATALOG_CHANGED: 'تغيّر الكتالوج. راجع المقتنيات وأنشئ معاينة جديدة قبل التنفيذ.', INVALID_ITEM: 'إحدى المقتنيات لم تعد متاحة للمنح.', TARGET_LIMIT: 'عدد المستلمين يتجاوز الحد المسموح. ضيّق نطاق الفلترة.', CAMPAIGN_LIMIT: 'بلغت الحملات الحد المسموح. راجع المالك.',
  BALANCE_OVERFLOW: 'بلغ رصيد اللاعب الحد المسموح؛ لم تُضف له هذه المكافأة.', STORAGE_NOT_READY: 'التخزين غير جاهز. لم نعتبر أي نتيجة ناجحة دون حفظها.', WRITE_OR_AUDIT_FAILED: 'تعذّر حفظ العملية أو تدقيقها. راجع الحملة نفسها قبل إعادة المحاولة.', STORAGE_UNAVAILABLE: 'التخزين غير متاح حالياً. راجع الحملة نفسها قبل إعادة المحاولة.',
  CAMPAIGN_NOT_FOUND: 'تعذّر العثور على الحملة المحفوظة.', NOT_CONFIRMED: 'لم تُؤكَّد هذه الحملة بعد.', RETRY_LIMIT: 'بلغت الحملة حد إعادة المحاولة. راجع المالك.', BULK_BUSY_OR_CLOSED: 'الخدمة مشغولة حالياً. أعد المحاولة لاحقاً بنفس الطلب.',
  INVALID_FILTER: 'نطاق اللاعبين غير صالح.', INVALID_REWARDS: 'راجع مقادير المكافآت والمقتنيات المختارة.', EMPTY_REWARDS: 'اختر مكافأة واحدة على الأقل.', INVALID_REASON: 'اكتب سبباً من 3 إلى 200 حرف.', INVALID_REQUEST: 'راجع المدخلات قبل إرسال الطلب.', INVALID_KEY: 'تعذّر التحقق من مفتاح الطلب. حدّث الصفحة.',
  STAFF_NOT_FOUND: 'عضو الطاقم لم يعد متاحاً.', OWNER_ONLY: 'تعديل التفويض متاح للمالك فقط.', INVALID_STAFF: 'يمكن تفويض عضو طاقم غير مالك فقط.',
};
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (v) => Number.isFinite(Number(v)) ? Number(v).toLocaleString('ar-EG-u-nu-latn') : '—';
const date = (v) => { const d = new Date(v); return v && Number.isFinite(d.getTime()) ? d.toLocaleString('ar-EG-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' }) : '—'; };
const timezone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'التوقيت المحلي'; } catch { return 'التوقيت المحلي'; } };
const localDate = (v) => { const d = new Date(v); if (!v || !Number.isFinite(d.getTime())) return ''; const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const freshDraft = () => ({ kind: 'all', days: '7', from: '', to: '', coins: '0', gems: '0', itemIds: [], reason: '', operatorName: '' });
const newState = () => ({ identity: '', draft: freshDraft(), catalog: null, loaded: false, loading: null, busy: false, error: '', message: '', key: '', body: null, campaignId: '', campaign: null, bound: false, results: null, resultStatus: 'all', resultOffset: 0, history: null, historyOffset: 0, staff: null, staffError: '', staffArm: null, countText: '', giftAck: false, query: '', pollCount: 0, pollStopped: false });
let B = newState();
let mounted = null;
const same = (s) => s === B;
const identity = (me) => `${me.id ?? 'token'}:${me.role}:${me.name ?? ''}`;
function store(s) {
  if (!same(s)) return;
  try { sessionStorage.setItem(STORAGE, JSON.stringify({ identity: s.identity, campaignId: s.campaignId, key: s.key, body: s.body })); } catch { /* التخزين اختياري، لا نخزن رموز دخول هنا. */ }
}
function restore(s) {
  try {
    const p = JSON.parse(sessionStorage.getItem(STORAGE) || 'null');
    if (!p || p.identity !== s.identity) return;
    const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
    s.campaignId = uuid.test(p.campaignId || '') ? p.campaignId : '';
    if (uuid.test(p.key || '') && p.body?.key === p.key && p.body.filter && p.body.rewards && Array.isArray(p.body.rewards.itemIds) && typeof p.body.reason === 'string') {
      s.key = p.key; s.body = p.body; draftFrom(s, p.body);
    }
    if (s.campaignId || s.key) s.message = 'يوجد طلب محفوظ في هذه الجلسة. نستعيد الحملة للقراءة فقط؛ لا يُنفّذ شيء تلقائياً.';
  } catch { /* بيانات جلسة غير صالحة: لا نستخدمها. */ }
}
function draftFrom(s, c) {
  const f = c.filter || {}, r = c.rewards || {};
  s.draft = { kind: ['all', 'active', 'registered'].includes(f.kind) ? f.kind : 'all', days: String(f.days ?? 7), from: localDate(f.from), to: localDate(f.to), coins: String(r.coins ?? 0), gems: String(r.gems ?? 0), itemIds: Array.isArray(r.itemIds) ? [...r.itemIds] : [], reason: c.reason || '', operatorName: c.operatorName || '' };
}
function normalize(c) {
  if (!c || typeof c !== 'object' || !c.id) throw new Error('INVALID_RESPONSE');
  const n = c.counts || {};
  return { ...c, successCount: c.successCount ?? n.success ?? 0, failedCount: c.failedCount ?? n.failed ?? 0, pendingCount: c.pendingCount ?? n.pending ?? 0, itemSnapshots: c.itemSnapshots ?? c.rewards?.items ?? [] };
}
function errorText(e) {
  const code = typeof e?.errorCode === 'string' ? e.errorCode : e?.message;
  if (ERRORS[code]) return ERRORS[code];
  if (e?.code === 0) return 'انقطع الاتصال؛ ربما وصل الطلب للخادم. حدّث الحملة أو أعد الطلب نفسه؛ مفتاحه محفوظ لمنع تكرار المنح.';
  if (e?.code === 401) return 'انتهت جلسة الإدارة. سجّل الدخول مجدداً.';
  if (e?.code === 403) return 'لا تملك صلاحية هذه العملية أو سُحب التفويض. راجع المالك.';
  if (e?.code === 404) return 'الحملة أو الخدمة غير متاحة حالياً.';
  if (e?.code === 409) return 'تعارضت حالة العملية. حدّث الحملة نفسها وراجع بياناتها قبل المحاولة.';
  if (e?.code === 503 || e?.code >= 500) return 'الخدمة أو التخزين غير جاهز. لم نؤكد نجاحاً غير محفوظ؛ راجع الحملة نفسها لاحقاً.';
  return 'تعذّر إتمام الطلب. راجع المدخلات أو حدّث الحملة وحاول لاحقاً.';
}
function ensureCss() {
  if (document.querySelector('link[data-bulk-grants-css]')) return;
  const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/admin-bulk-grants.css?v=r58p'; link.dataset.bulkGrantsCss = '1'; document.head.appendChild(link);
}
function invalidate(s) {
  s.bound = false; s.key = ''; s.body = null; s.countText = ''; s.giftAck = false; s.error = ''; s.message = s.campaign?.status === 'preview' ? 'تغيّرت المدخلات؛ التأكيد مخفي حتى تنشئ معاينة صريحة جديدة.' : ''; store(s);
}
function limits(s) {
  const l = s.catalog?.limits || {};
  const cap = (v, max) => Number.isSafeInteger(v) && v > 0 ? Math.min(v, max) : max;
  return { coins: cap(l.maxCoins ?? l.coins, 1000000), gems: cap(l.maxGems ?? l.gems, 100000), items: cap(l.maxItems ?? l.itemIds, 30), targets: cap(l.maxTargets, 10000), batch: cap(l.batchSize, 25) };
}
function request(s) {
  const d = s.draft, l = limits(s);
  const integer = (v, max, label) => { if (!/^\d+$/.test(String(v)) || !Number.isSafeInteger(Number(v)) || Number(v) > max) throw new Error(`${label}: أدخل عدداً صحيحاً من 0 إلى ${nf(max)}.`); return Number(v); };
  const coins = integer(d.coins, l.coins, 'العملات'), gems = integer(d.gems, l.gems, 'الجواهر');
  const itemIds = [...new Set(d.itemIds)].sort();
  if (itemIds.length > l.items) throw new Error(`الحد الأقصى ${nf(l.items)} مقتنى للحملة.`);
  const available = new Set((s.catalog?.items || []).filter((i) => i.active === true && i.permanent === true && SLOTS[i.slot]).map((i) => i.id));
  if (itemIds.some((id) => !available.has(id))) throw new Error('إحدى المقتنيات المختارة غير متاحة. راجع الاختيار أو حدّث الكتالوج.');
  if (!coins && !gems && !itemIds.length) throw new Error('اختر عملات أو جواهر أو مقتنى واحداً على الأقل.');
  const reason = d.reason.trim();
  if (reason.length < 3 || reason.length > 200) throw new Error('اكتب سبباً من 3 إلى 200 حرف.');
  let filter = { kind: 'all' };
  if (d.kind === 'active') {
    const days = integer(d.days, 365, 'أيام النشاط'); if (days < 1) throw new Error('أيام النشاط بين 1 و365.'); filter = { kind: 'active', days };
  } else if (d.kind === 'registered') {
    const from = new Date(d.from).getTime(), to = new Date(d.to).getTime();
    if (!d.from || !d.to || !Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 0 || to <= from) throw new Error('حدد بداية ونهاية صحيحتين؛ النهاية يجب أن تكون بعد البداية.');
    filter = { kind: 'registered', from, to };
  }
  const operatorName = (d.operatorName || '').trim();
  if (operatorName.length > 120) throw new Error('اسم منفذ العملية حتى 120 حرفاً.');
  return { filter, rewards: { coins, gems, itemIds }, reason, ...(operatorName ? { operatorName } : {}) };
}
const btn = (action, label, disabled = false, extra = '', style = 'ghost') => `<button class="ad-btn ${style}" type="button" data-bg-action="${action}" ${disabled ? 'disabled' : ''} ${extra}>${label}</button>`;
const note = (text, type = '') => `<div class="ad-note ${type}">${esc(text)}</div>`;
function pager(kind, offset, size, total, busy) {
  return `<div class="ad-pager bg-pager">${btn(`${kind}-prev`, 'السابق', busy || offset <= 0)}<span>${total ? nf(offset + 1) : '0'}–${nf(Math.min(offset + size, total))} من ${nf(total)}</span>${btn(`${kind}-next`, 'التالي', busy || offset + size >= total)}</div>`;
}
function filterLabel(f) {
  if (f?.kind === 'active') return `نشاط مسجّل خلال آخر ${nf(f.days)} يوم`;
  if (f?.kind === 'registered') return `تسجيل من ${date(f.from)} حتى ${date(f.to)} (النهاية غير مشمولة)`;
  return 'جميع اللاعبين المسجّلين';
}
function rewardLabel(c, s) {
  const r = c.rewards || {};
  const items = new Map([...(s.catalog?.items || []), ...(c.itemSnapshots || c.rewards?.items || [])].map((i) => [i.id, i]));
  return `${nf(r.coins || 0)} عملة + ${nf(r.gems || 0)} جوهرة${r.itemIds?.length ? ' · ' + r.itemIds.map((id) => items.get(id)?.name || id).join('، ') : ''}`;
}
function formHTML(s) {
  const d = s.draft, l = limits(s), disabled = s.busy || !s.catalog?.enabled;
  const items = (s.catalog?.items || []).filter((i) => i.active === true && i.permanent === true && SLOTS[i.slot]);
  return `<section class="ad-card"><h2>1. إعداد المنحة</h2><p class="ad-muted">اختر عدة أنواع معاً: عملات وجواهر ومقتنيات تجميلية دائمة. المعاينة لا تمنح أي شيء؛ التنفيذ يحتاج تأكيداً منفصلاً.</p>
    ${!s.catalog ? note('جاري تحميل الكتالوج…') : !s.catalog.enabled ? note('خدمة المنح غير مفعّلة حالياً. الإنشاء والتأكيد متوقفان.', 'warn') : ''}
    ${s.catalog?.note ? note(s.catalog.note) : ''}
    <form data-bg-form="preview" class="bg-form"><fieldset class="bg-fields" ${disabled ? 'disabled' : ''}>
      <label>نطاق اللاعبين<select class="ad-in" name="kind" data-bg-field="kind"><option value="all" ${d.kind === 'all' ? 'selected' : ''}>جميع اللاعبين المسجّلين</option><option value="active" ${d.kind === 'active' ? 'selected' : ''}>نشاط مسجّل خلال آخر N يوم</option><option value="registered" ${d.kind === 'registered' ? 'selected' : ''}>تاريخ التسجيل</option></select></label>
      <div data-bg-active ${d.kind === 'active' ? '' : 'hidden'}><label>نشاط مسجّل خلال آخر N يوم<input class="ad-in" name="days" data-bg-field="days" type="number" min="1" max="365" step="1" value="${esc(d.days)}" dir="ltr"></label></div>
      <div data-bg-registered class="bg-two" ${d.kind === 'registered' ? '' : 'hidden'}><label>بداية التسجيل (مشمولة)<input class="ad-in" name="from" data-bg-field="from" type="datetime-local" value="${esc(d.from)}" dir="ltr"></label><label>نهاية التسجيل (غير مشمولة)<input class="ad-in" name="to" data-bg-field="to" type="datetime-local" value="${esc(d.to)}" dir="ltr"></label></div>
      <p class="ad-muted">النشاط المسجّل لا يعني «متصل الآن»، ولا نفترض نشاطاً تاريخياً غير محفوظ. ${esc(s.catalog?.activityNote || 'يعتمد النطاق على سجل النشاط المتاح فعلياً في الخادم.')}<br>منطقة العرض والإدخال: <b dir="ltr">${esc(timezone())}</b>. يُرسل نطاق التسجيل بطوابع UTC بالمللي ثانية، مع استبعاد لحظة النهاية.</p>
      <div class="bg-two"><label>عملات لكل لاعب<input class="ad-in" name="coins" data-bg-field="coins" type="number" min="0" max="${l.coins}" step="1" inputmode="numeric" value="${esc(d.coins)}" dir="ltr" required><small>حتى ${nf(l.coins)} لكل لاعب</small></label><label>جواهر لكل لاعب<input class="ad-in" name="gems" data-bg-field="gems" type="number" min="0" max="${l.gems}" step="1" inputmode="numeric" value="${esc(d.gems)}" dir="ltr" required><small>حتى ${nf(l.gems)} لكل لاعب</small></label></div>
      <label>بحث في المقتنيات<input class="ad-in" type="search" data-bg-search value="${esc(s.query)}" placeholder="اسم المقتنى أو معرّفه"></label>
      <p class="ad-muted" data-bg-selected>المختار: ${nf(d.itemIds.length)} من ${nf(l.items)} مقتنى كحد أقصى.</p>
      <div class="bg-slots">${Object.entries(SLOTS).map(([slot, label]) => `<fieldset class="bg-slot"><legend>${label}</legend><div class="bg-item-list">${items.filter((i) => i.slot === slot).map((i) => `<label class="bg-item" data-bg-item data-bg-match="${esc(`${i.name} ${i.id}`.toLocaleLowerCase())}"><input type="checkbox" data-bg-item-id="${esc(i.id)}" ${d.itemIds.includes(i.id) ? 'checked' : ''}><span>${esc(i.icon || '')} ${esc(i.name)}<small dir="ltr">${esc(i.id)}</small></span></label>`).join('') || '<p class="ad-muted">لا توجد مقتنيات متاحة.</p>'}</div><p class="ad-muted" data-bg-no-match hidden>لا نتائج مطابقة.</p></fieldset>`).join('')}</div>
      <p class="ad-muted">إذا كان اللاعب يملك المقتنى فلن تُضاف نسخة مكررة؛ العملات والجواهر المشمولة تُمنح له مرة واحدة ضمن هذه الحملة.</p>
      <label>اسم منفذ العملية (اختياري)<input class="ad-in" name="operatorName" data-bg-field="operatorName" maxlength="120" value="${esc(d.operatorName)}" placeholder="اسمك إذا كنت تستخدم رمز الإدارة المشترك"><small>يسجّل مع هوية جلسة الإدارة، ولا يحل محلها أو يثبت صاحب الرمز المشترك.</small></label>
      <label>سبب المنح (يسجّل للتدقيق)<textarea class="ad-in" name="reason" data-bg-field="reason" minlength="3" maxlength="200" rows="2" required>${esc(d.reason)}</textarea></label>
      <p class="ad-muted">سقف الحملة: ${nf(l.targets)} لاعب · دفعة الخادم: حتى ${nf(l.batch)} لاعب. تُجمّد قائمة المستلمين عند إنشاء المعاينة.</p>
      <button class="ad-btn" type="submit" data-bg-preview ${disabled ? 'disabled' : ''}>${s.busy ? 'جاري الطلب…' : s.key && !s.campaign ? 'إعادة طلب المعاينة بالمفتاح المحفوظ' : 'إنشاء معاينة فقط'}</button>
    </fieldset></form></section>`;
}
const countValue = (v) => String(v).trim().replace(/[٠-٩]/g, (c) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)));
const canAct = (c, me) => me.role === 'owner' || (me.id != null && c.actor?.id === me.id);
function actionKind(s, me) {
  const c = s.campaign;
  if (!c || !canAct(c, me) || !s.catalog?.enabled || !c.id || !c.fingerprint || !Number.isSafeInteger(c.targetCount) || c.targetCount <= 0) return '';
  if (c.status === 'preview' && s.bound && Number(c.expiresAt) > Date.now()) return 'confirm';
  if (['completed_with_errors', 'paused_storage', 'paused_authorization'].includes(c.status) && (c.failedCount > 0 || c.pendingCount > 0)) return 'retry';
  return '';
}
function canSubmit(s, me) { return !s.busy && !!actionKind(s, me) && s.giftAck && countValue(s.countText) === String(s.campaign.targetCount); }
function confirmationHTML(s, me) {
  const c = s.campaign;
  if (!c) return '';
  if (!c.targetCount) return note('عدد المستلمين صفر. التنفيذ معطّل؛ عدّل النطاق وأنشئ معاينة جديدة.', 'warn');
  if (!canAct(c, me)) return note('يمكن لمنشئ هذه الحملة أو المالك فقط تأكيدها أو إعادة محاولة المتبقي منها.');
  if (c.status === 'preview' && !s.bound) return note('المعاينة المعروضة سابقة؛ تغيّرت المدخلات. التأكيد مخفي حتى إنشاء معاينة جديدة.', 'warn');
  if (c.status === 'preview' && !(Number(c.expiresAt) > Date.now())) return `${note('انتهت صلاحية المعاينة؛ لن تُنفّذ. أنشئ معاينة جديدة وراجع المستلمين مجدداً.', 'warn')}${btn('new-preview', 'إنشاء معاينة جديدة بهذه المدخلات', s.busy || !s.catalog?.enabled)}`;
  const action = actionKind(s, me);
  if (!action) return '';
  return `<form data-bg-form="confirm" class="bg-confirm"><h3>${action === 'retry' ? 'إعادة محاولة داخل الحملة نفسها' : '3. تأكيد المنحة المجانية'}</h3><p>${action === 'retry' ? 'ستُعاد محاولة الفاشل والمعلّق فقط بنفس معرّف الحملة؛ لا تُعاد المنحة للناجحين ولا تنشأ حملة شاملة جديدة.' : 'هذا تأكيد تنفيذ حقيقي للقائمة المجمّدة، وليس معاينة أخرى.'}</p><label>أعد كتابة عدد المستلمين المعروض: <b>${nf(c.targetCount)}</b><input class="ad-in" data-bg-count type="text" inputmode="numeric" autocomplete="off" value="${esc(s.countText)}" ${s.busy ? 'disabled' : ''} required aria-label="إعادة كتابة عدد المستلمين"></label><label class="bg-check"><input data-bg-ack type="checkbox" ${s.giftAck ? 'checked' : ''} ${s.busy ? 'disabled' : ''}><span>أقرّ أن هذه منحة مجانية للاعبين، بلا خصم أو شراء، وأنني راجعت المكافآت والعدد والسبب.</span></label><button class="ad-btn danger" type="submit" data-bg-execute ${canSubmit(s, me) ? '' : 'disabled'}>${s.busy ? 'جاري الطلب…' : action === 'retry' ? 'إعادة محاولة الفاشل والمعلّق فقط' : 'تأكيد المنح للعدد المعروض'}</button></form>`;
}
function campaignHTML(s, me) {
  const c = s.campaign;
  if (!c) return '';
  return `<section class="ad-card" data-bg-campaign><div class="bg-heading"><h2>2. الحملة المجمّدة</h2>${btn('refresh-campaign', 'تحديث الحملة', s.busy)}</div><p><strong>${esc(STATUS[c.status] || 'حالة غير متاحة')}</strong> · <code dir="ltr">${esc(c.id)}</code></p>
    <div class="ad-grid bg-stats"><div class="ad-stat"><b>${nf(c.targetCount)}</b><span>المستلمون في اللقطة</span></div><div class="ad-stat"><b>${nf(c.successCount)}</b><span>نجاح محفوظ</span></div><div class="ad-stat"><b>${nf(c.failedCount)}</b><span>فشل</span></div><div class="ad-stat"><b>${nf(c.pendingCount)}</b><span>${c.status === 'preview' ? 'بانتظار التأكيد — لم يبدأ' : 'معلّق'}</span></div></div>
    <dl class="ad-kv bg-details"><dt>النطاق</dt><dd>${esc(filterLabel(c.filter))}</dd><dt>لكل لاعب</dt><dd>${esc(rewardLabel(c, s))}</dd><dt>إجمالي العملات</dt><dd>${nf(c.totals?.coins)}</dd><dt>إجمالي الجواهر</dt><dd>${nf(c.totals?.gems)}</dd><dt>السبب</dt><dd class="bg-reason">${esc(c.reason || s.body?.reason || '—')}</dd><dt>اسم منفذ العملية</dt><dd>${esc(c.operatorName || 'لم يُدخل اسم إضافي')}</dd><dt>منشئ الحملة</dt><dd>${esc(c.actor?.name || '—')} · ${esc(ROLES[c.actor?.role] || 'عضو طاقم')} <code dir="ltr">${esc(c.actor?.id || '')}</code></dd><dt>إنشاء المعاينة</dt><dd>${esc(date(c.createdAt))}</dd><dt>صلاحية التأكيد حتى</dt><dd>${esc(date(c.expiresAt))}</dd><dt>منطقة العرض</dt><dd dir="ltr">${esc(timezone())}</dd><dt>البصمة المجمّدة</dt><dd><code dir="ltr">${esc(c.fingerprint)}</code></dd></dl>
    <p class="ad-muted">النتائج من الخادم بعد الحفظ، وليست تقديراً من الواجهة. المقتنى المملوك لا يتكرر، والعملة المشمولة تُمنح مرة واحدة. تعديل النموذج لا يغيّر هذه اللقطة.</p>
    ${['queued', 'running'].includes(c.status) ? note(s.pollStopped ? 'توقف التحديث التلقائي. استخدم «تحديث الحملة» لمتابعة حالتها.' : 'تُحدَّث الحالة كل ثانيتين أثناء التنفيذ فقط. مغادرة القسم توقف المتابعة، لا توقف عمل الخادم.') : ''}
    ${c.status === 'paused_storage' ? note('الحملة متوقفة بسبب الحفظ. راجع سلامة التخزين ثم حدّث الحملة أو أعد محاولة الفاشل والمعلّق فقط.', 'warn') : ''}
    ${c.status === 'paused_authorization' ? note('راجع صلاحية المنشئ وتوفّر المقتنيات مع المالك قبل إعادة محاولة المتبقي.', 'warn') : ''}
    <div data-bg-confirmation>${confirmationHTML(s, me)}</div>
    ${resultsHTML(s)}
  </section>`;
}
function itemNames(ids, s) {
  if (!Array.isArray(ids) || !ids.length) return '';
  const names = new Map([...(s.catalog?.items || []), ...(s.campaign?.itemSnapshots || [])].map((i) => [i.id, i.name]));
  return ids.map((id) => names.get(id) || String(id)).join('، ');
}
function resultsHTML(s) {
  const p = s.results;
  return `<div class="bg-results"><h3>نتائج المستلمين</h3><label>عرض النتائج<select class="ad-in" data-bg-status ${s.busy ? 'disabled' : ''}>${[['all', 'الكل'], ['success', 'الناجح'], ['failed', 'الفاشل'], ['pending', 'المعلّق']].map(([v, t]) => `<option value="${v}" ${s.resultStatus === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    ${!p ? '<p class="ad-muted">اضغط «تحديث الحملة» لقراءة نتائج المستلمين.</p>' : `<div class="ad-list">${p.list.length ? p.list.map((r) => { const status = r.outcome || r.status; const label = ({ granted: 'مُنحت', duplicate: 'مُعالجة سابقاً — لم تتكرر', success: 'نجاح محفوظ', failed: 'فشل', pending: 'معلّق' })[status] || 'معلّق'; return `<div class="ad-line"><span><b>${esc(r.name || 'لاعب')}</b><small dir="ltr">${esc(r.id)}</small>${r.code ? `<small>${esc(ERRORS[r.code] || 'تعذّر منح مكافأة هذا اللاعب؛ راجع المالك.')}</small>` : ''}${Array.isArray(r.addedItems) && r.addedItems.length ? `<small>مقتنيات مُضافة: ${esc(itemNames(r.addedItems, s))}</small>` : ''}${Array.isArray(r.alreadyOwned) && r.alreadyOwned.length ? `<small>مملوكة مسبقاً — بلا نسخة أخرى: ${esc(itemNames(r.alreadyOwned, s))}. العملات والجواهر المشمولة لا تتأثر بذلك.</small>` : ''}</span><em class="ad-tag ${status === 'failed' ? 'bad' : ['granted', 'duplicate', 'success'].includes(status) ? 'ok' : ''}">${esc(label)}</em></div>`; }).join('') : '<p class="ad-empty">لا توجد نتائج في هذا التصنيف.</p>'}</div>${pager('results', p.offset, p.limit, p.total, s.busy)}`}
  </div>`;
}
function historyHTML(s) {
  const h = s.history;
  return `<section class="ad-card"><div class="bg-heading"><h2>الحملات السابقة</h2>${btn('refresh-history', 'تحديث القائمة', s.busy)}</div><p class="ad-muted">افتح الحملة لمراجعة تفاصيلها أو إعادة محاولة المتبقي ضمن المعرّف نفسه.</p>${!h ? '<p class="ad-empty">جاري تحميل الحملات…</p>' : `<div class="ad-list">${h.list.length ? h.list.map((raw) => { const c = normalize(raw); return `<article class="ad-line"><span><b>${esc(STATUS[c.status] || 'حملة')}</b> · ${nf(c.targetCount)} لاعب<small>${esc(c.actor?.name || '—')} · ${esc(ROLES[c.actor?.role] || 'عضو طاقم')} · ${esc(date(c.createdAt))}</small><small>السبب: ${esc(c.reason || '—')}</small><small>لكل لاعب: ${esc(rewardLabel(c, s))}</small><small>نجاح ${nf(c.successCount)} · فشل ${nf(c.failedCount)} · معلّق ${nf(c.pendingCount)}</small><code dir="ltr">${esc(c.id)}</code></span>${btn('open-campaign', 'عرض الحملة', s.busy, `data-bg-id="${esc(c.id)}"`)}</article>`; }).join('') : '<p class="ad-empty">لا توجد حملات.</p>'}</div>${pager('history', s.historyOffset, 10, h.total, s.busy)}`}</section>`;
}
function staffHTML(s, me) {
  if (me.role !== 'owner') return '';
  const staff = (s.staff || []).filter((x) => x.role !== 'owner' && x.id !== me.id && x.id !== 'token');
  return `<section class="ad-card"><div class="bg-heading"><h2>تفويض المنح لأفراد الطاقم</h2>${btn('refresh-staff', 'تحديث الطاقم', s.busy)}</div><p class="ad-muted">للمالك فقط: التفويض فردي ومحدد لصلاحية «منح جميع اللاعبين»، وليس لكل أصحاب الدور. يمكنك سحبه لاحقاً، وتُسجّل التغييرات للتدقيق. لا يمكن تفويض نفسك أو مالك آخر.</p>${s.staffError ? note(s.staffError, 'bad') : ''}${s.staff === null ? '<p class="ad-empty">قائمة التفويض غير محمّلة.</p>' : staff.length ? `<div class="ad-list">${staff.map((x) => `<div class="ad-line"><span><b>${esc(x.name)}</b> · ${esc(ROLES[x.role] || 'عضو طاقم')}<small dir="ltr">${esc(x.id)}</small><small>${x.allowed ? 'مفوّض بالمنح' : 'غير مفوّض'}</small></span>${btn('arm-staff', x.allowed ? 'سحب التفويض' : 'منح الصلاحية', s.busy, `data-bg-id="${esc(x.id)}"`, x.allowed ? 'danger' : 'ghost')}</div>`).join('')}</div>` : '<p class="ad-empty">لا يوجد أفراد طاقم قابلون للتفويض.</p>'}${s.staffArm ? `<form data-bg-form="staff" class="bg-confirm"><h3>${s.staffArm.allowed ? 'تأكيد منح صلاحية المنح' : 'تأكيد سحب صلاحية المنح'}</h3><p>العضو: <b>${esc(s.staffArm.name)}</b> · <code dir="ltr">${esc(s.staffArm.id)}</code></p><label class="bg-check"><input type="checkbox" data-bg-staff-ack ${s.busy ? 'disabled' : ''} required><span>راجعت هوية هذا العضو وأؤكد تغيير صلاحية المنح لهذا الفرد وحده.</span></label><div class="ad-acts"><button class="ad-btn danger" type="submit" ${s.busy ? 'disabled' : ''}>${s.busy ? 'جاري الحفظ…' : 'تأكيد التغيير لهذا العضو'}</button>${btn('cancel-staff', 'إلغاء', s.busy)}</div></form>` : ''}</section>`;
}
function render(s = B) {
  const m = mounted;
  if (!same(s) || !m || m.state !== s || !m.root.isConnected) return;
  m.root.innerHTML = `<div class="bg-page" dir="rtl" aria-busy="${s.busy ? 'true' : 'false'}"><section class="ad-card bg-intro"><h2>منح جميع اللاعبين</h2><p class="ad-muted">منحة مجانية موثّقة للمالك أو عضو طاقم مُفوّض بالاسم. راجع النطاق والمكافآت أولاً، ثم أكّد لقطة المستلمين.</p><ol class="bg-steps"><li>إعداد المكافآت</li><li>معاينة العدد والتكلفة</li><li>تأكيد مستقل ومتابعة</li></ol></section><div data-bg-notices aria-live="polite">${s.error ? `<div class="ad-note bad" role="alert">${esc(s.error)}</div>` : ''}${s.message ? `<div class="ad-note ok" role="status">${esc(s.message)}</div>` : ''}</div>${formHTML(s)}${campaignHTML(s, m.me)}${historyHTML(s)}${staffHTML(s, m.me)}</div>`;
  filterItems(m);
}
function filterItems(m) {
  const q = m.state.query.trim().toLocaleLowerCase();
  m.root.querySelectorAll('[data-bg-item]').forEach((row) => { row.hidden = !!q && !row.dataset.bgMatch.includes(q); });
  m.root.querySelectorAll('.bg-slot').forEach((slot) => { const rows = [...slot.querySelectorAll('[data-bg-item]')]; const empty = slot.querySelector('[data-bg-no-match]'); if (empty) empty.hidden = !rows.length || rows.some((r) => !r.hidden); });
}
function updateControls(m, confirmation = false) {
  if (!m.root.isConnected) return;
  const s = m.state;
  if (confirmation) { const el = m.root.querySelector('[data-bg-confirmation]'); if (el) el.innerHTML = confirmationHTML(s, m.me); }
  const b = m.root.querySelector('[data-bg-execute]'); if (b) b.disabled = !canSubmit(s, m.me);
  const n = m.root.querySelector('[data-bg-selected]'); if (n) n.textContent = `المختار: ${nf(s.draft.itemIds.length)} من ${nf(limits(s).items)} مقتنى كحد أقصى.`;
  const a = m.root.querySelector('[data-bg-active]'); if (a) a.hidden = s.draft.kind !== 'active';
  const r = m.root.querySelector('[data-bg-registered]'); if (r) r.hidden = s.draft.kind !== 'registered';
  const notices = m.root.querySelector('[data-bg-notices]'); if (notices) notices.innerHTML = `${s.error ? `<div class="ad-note bad" role="alert">${esc(s.error)}</div>` : ''}${s.message ? `<div class="ad-note ok" role="status">${esc(s.message)}</div>` : ''}`;
}
async function history(s, call) {
  const j = await call(`bulk-grants?offset=${s.historyOffset}&limit=10`);
  if (same(s)) s.history = { total: j.total || 0, list: j.list || j.campaigns || [] };
}
async function staff(s, call) {
  try { const j = await call('bulk-permissions'); if (same(s)) { s.staff = j.list || []; s.staffError = ''; } }
  catch (e) { if (same(s)) s.staffError = errorText(e); }
}
function setCampaign(s, j) {
  const c = normalize(j.campaign || j);
  s.campaign = c; s.campaignId = c.id;
  if (j.results) {
    const p = Array.isArray(j.results) ? { ...j.page, list: j.results } : j.results;
    s.results = { total: p.total ?? 0, offset: p.offset ?? s.resultOffset, limit: p.limit ?? 50, list: Array.isArray(p.list) ? p.list : [] };
  } else s.results = null;
  store(s);
}
async function detail(s, call, id = s.campaignId) {
  if (!id) return;
  const status = s.resultStatus === 'all' ? '' : `&status=${encodeURIComponent(s.resultStatus)}`;
  const j = await call(`bulk-grants/${encodeURIComponent(id)}?offset=${s.resultOffset}&limit=50${status}`);
  if (same(s)) setCampaign(s, j);
}
function stopPoll(m = mounted) { if (m?.timer) { clearTimeout(m.timer); m.timer = null; } }
function schedulePoll(s = B) {
  const m = mounted;
  if (!m || m.state !== s) return;
  stopPoll(m);
  if (!m.root.isConnected || document.hidden || s.busy || s.pollStopped || !['queued', 'running'].includes(s.campaign?.status)) return;
  if (s.pollCount >= 150) { s.pollStopped = true; render(s); return; }
  m.timer = setTimeout(async () => {
    m.timer = null;
    if (mounted !== m || !m.root.isConnected || document.hidden || s.busy || !same(s)) return;
    s.busy = true; s.pollCount++;
    try { await detail(s, m.call); }
    catch (e) { if (same(s)) { s.error = errorText(e); s.pollStopped = true; } }
    finally { if (same(s)) { s.busy = false; render(s); schedulePoll(s); } }
  }, 2000);
}
async function run(s, task) {
  if (!same(s) || s.busy || s.loading) return;
  s.busy = true; s.error = ''; s.message = ''; stopPoll(); render(s);
  try { await task(); } catch (e) { if (same(s)) s.error = errorText(e); }
  finally { if (same(s)) { s.busy = false; render(s); schedulePoll(s); } }
}
async function createPreview(s, call, force = false) {
  if (!s.catalog?.enabled) return;
  let body;
  try { body = request(s); } catch (e) { s.error = e.message; updateControls(mounted, true); return; }
  if (force) { s.key = ''; s.body = null; s.bound = false; }
  await run(s, async () => {
    if (!crypto.randomUUID) throw new Error('INVALID_KEY');
    if (!s.key) s.key = crypto.randomUUID();
    // إعادة إرسال نفس الجسم حرفياً بعد خطأ شبكة يحافظ على اللقطة الأصلية.
    const payload = s.body || { key: s.key, ...body };
    s.body = payload; store(s);
    const j = await call('bulk-grants/preview', { method: 'POST', body: payload });
    if (!same(s)) return;
    s.resultOffset = 0; s.resultStatus = 'all'; s.countText = ''; s.giftAck = false; s.pollCount = 0; s.pollStopped = false;
    setCampaign(s, j); s.bound = s.campaign.status === 'preview';
    s.message = s.campaign.status === 'preview' ? 'حُفظت المعاينة فقط. لم تُمنح أي مكافأة. راجع العدد والتكلفة قبل التأكيد.' : 'استُعيدت الحملة المرتبطة بالمفتاح نفسه؛ لم تُنشأ حملة جديدة.';
  });
}
async function execute(s, m) {
  const action = actionKind(s, m.me);
  if (!action || !canSubmit(s, m.me)) return;
  const c = s.campaign, id = c.id;
  await run(s, async () => {
    const j = await m.call(`bulk-grants/${encodeURIComponent(id)}/${action}`, { method: 'POST', body: { fingerprint: c.fingerprint, targetCount: c.targetCount } });
    if (!same(s)) return;
    // لا نفترض نجاح مستلم عند قبول 202؛ نعرض أرقام الاستجابة المحفوظة فقط.
    if (j?.id || j?.campaign?.id) setCampaign(s, j); else await detail(s, m.call, id);
    s.countText = ''; s.giftAck = false; s.bound = false; s.pollCount = 0; s.pollStopped = false;
    s.message = action === 'retry' ? 'قُبل طلب إعادة محاولة المتبقي ضمن الحملة نفسها. تابع النتائج المحفوظة أدناه.' : 'قُبل طلب التنفيذ للحملة نفسها. قبول الطلب لا يعني اكتمال المنح؛ تابع النتائج المحفوظة أدناه.';
  });
}
async function initialize(s, m) {
  if (s.loading || s.loaded) return;
  const id = s.campaignId;
  s.busy = true;
  s.loading = (async () => {
    const tasks = [
      m.call('bulk-grants/catalog').then((j) => { if (same(s)) s.catalog = j; }),
      history(s, m.call),
      ...(m.me.role === 'owner' ? [staff(s, m.call)] : []),
      ...(id ? [detail(s, m.call, id).then(() => { if (same(s) && s.campaign?.status === 'preview' && !s.key) draftFrom(s, s.campaign); })] : []),
    ];
    const out = await Promise.allSettled(tasks);
    if (same(s)) {
      const failed = out.find((r) => r.status === 'rejected'); if (failed) s.error = errorText(failed.reason);
      // لا نفعل التأكيد تلقائياً بعد الاستعادة؛ فتح الحملة أو معاينتها إجراء صريح.
      s.bound = false; s.loaded = true;
    }
  })();
  try { await s.loading; } finally { if (same(s)) { s.loading = null; s.busy = false; render(s); schedulePoll(s); } }
}
export function unmountBulkGrants() {
  const m = mounted;
  if (!m) return;
  stopPoll(m); m.observer.disconnect(); m.events.abort(); mounted = null;
}
export function resetBulkGrants() {
  unmountBulkGrants(); B = newState();
  try { sessionStorage.removeItem(STORAGE); } catch { /* بدون تخزين */ }
}
export function mountBulkGrants(root, { call, me }) {
  if (root.dataset.bulkGrantsMounted === '1') return;
  if (!me?.perms?.includes('rewards.grant')) return;
  if (B.identity && B.identity !== identity(me)) resetBulkGrants();
  unmountBulkGrants(); ensureCss(); root.dataset.bulkGrantsMounted = '1';
  if (!B.identity) { B.identity = identity(me); restore(B); }
  const s = B, events = new AbortController();
  const m = { root, call, me, state: s, events, timer: null, observer: new MutationObserver(() => { if (!root.isConnected && mounted === m) unmountBulkGrants(); }) };
  mounted = m; m.observer.observe(document.body, { childList: true, subtree: true });
  root.addEventListener('input', (e) => {
    const t = e.target;
    if (t.matches('[data-bg-search]')) { s.query = t.value; filterItems(m); return; }
    if (t.matches('[data-bg-count]')) { s.countText = t.value; updateControls(m); return; }
    if (!t.dataset.bgField || s.busy) return;
    s.draft[t.dataset.bgField] = t.value; invalidate(s); updateControls(m, true);
  }, { signal: events.signal });
  root.addEventListener('change', async (e) => {
    const t = e.target;
    if (t.matches('[data-bg-ack]')) { s.giftAck = t.checked; updateControls(m); return; }
    if (s.busy) return;
    if (t.matches('[data-bg-item-id]')) {
      s.draft.itemIds = t.checked ? [...new Set([...s.draft.itemIds, t.dataset.bgItemId])] : s.draft.itemIds.filter((id) => id !== t.dataset.bgItemId);
      invalidate(s); updateControls(m, true); return;
    }
    if (t.dataset.bgField) { s.draft[t.dataset.bgField] = t.value; invalidate(s); updateControls(m, true); return; }
    if (t.matches('[data-bg-status]')) { s.resultStatus = t.value; s.resultOffset = 0; await run(s, () => detail(s, call)); }
  }, { signal: events.signal });
  root.addEventListener('submit', async (e) => {
    const f = e.target.closest('[data-bg-form]'); if (!f) return; e.preventDefault();
    if (s.busy || s.loading) return;
    if (f.dataset.bgForm === 'preview') return createPreview(s, call);
    if (f.dataset.bgForm === 'confirm') return execute(s, m);
    if (f.dataset.bgForm === 'staff' && me.role === 'owner' && s.staffArm && f.querySelector('[data-bg-staff-ack]')?.checked) {
      const a = s.staffArm, x = s.staff?.find((row) => row.id === a.id);
      if (!x || x.role === 'owner' || x.id === me.id || x.id === 'token' || x.allowed === a.allowed) return;
      await run(s, async () => {
        await call(`bulk-permissions/${encodeURIComponent(a.id)}`, { method: 'POST', body: { allowed: a.allowed } });
        if (!same(s)) return;
        x.allowed = a.allowed; s.staffArm = null; s.message = 'حُفظ تغيير التفويض لهذا العضو فقط.'; await staff(s, call);
      });
    }
  }, { signal: events.signal });
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-bg-action]'); if (!b || b.disabled || s.busy || s.loading) return;
    const action = b.dataset.bgAction;
    if (action === 'new-preview') return createPreview(s, call, true);
    if (action === 'cancel-staff') { s.staffArm = null; render(s); return; }
    if (action === 'arm-staff' && me.role === 'owner') {
      const x = s.staff?.find((row) => row.id === b.dataset.bgId);
      if (x && x.role !== 'owner' && x.id !== me.id && x.id !== 'token') { s.staffArm = { id: x.id, name: x.name, allowed: !x.allowed }; render(s); }
      return;
    }
    await run(s, async () => {
      if (action === 'refresh-campaign') { s.pollStopped = false; s.pollCount = 0; await detail(s, call); }
      else if (action === 'open-campaign') {
        s.resultOffset = 0; s.resultStatus = 'all'; s.bound = false; s.countText = ''; s.giftAck = false; s.pollStopped = false; s.pollCount = 0;
        await detail(s, call, b.dataset.bgId);
        if (same(s) && s.campaign?.status === 'preview') { draftFrom(s, s.campaign); s.bound = true; s.key = ''; s.body = null; store(s); }
      } else if (action === 'refresh-history') {
        s.catalog = await call('bulk-grants/catalog'); await history(s, call);
      } else if (action === 'history-prev' || action === 'history-next') {
        s.historyOffset = Math.max(0, s.historyOffset + (action.endsWith('next') ? 10 : -10)); await history(s, call);
      } else if (action === 'results-prev' || action === 'results-next') {
        s.resultOffset = Math.max(0, s.resultOffset + (action.endsWith('next') ? 50 : -50)); await detail(s, call);
      } else if (action === 'refresh-staff' && me.role === 'owner') await staff(s, call);
    });
  }, { signal: events.signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopPoll(m); else schedulePoll(s); }, { signal: events.signal });
  window.addEventListener('pagehide', () => { if (mounted === m) unmountBulkGrants(); }, { signal: events.signal });
  render(s);
  if (!s.loaded) initialize(s, m); else schedulePoll(s);
}
