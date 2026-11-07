/* إعدادات الحساب والتوثيق من الخادم فقط؛ بلا Google marker أو localStorage أو ملفات حساسة.
 * api(fullPath, method='GET', body?) يرجع JSON أو يرمي Error؛ destroy عند تغيير المسار. */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const SETTINGS = [
  ['sound', 'الصوت'], ['notifications', 'الإشعارات'], ['showActivity', 'إظهار النشاط'],
  ['showPresence', 'إظهار حالة الاتصال'], ['hideEntrances', 'إخفاء الدخوليات'],
  ['hideChatEffects', 'إخفاء مؤثرات المحادثة'],
];
const STATUS = { none: 'لم يتم تقديم طلب', pending: 'قيد المراجعة', accepted: 'تم قبول الطلب — الحساب موثّق', rejected: 'تم رفض الطلب', revoked: 'تم إلغاء التوثيق' };
const PATH = '/api/account-tools/';
// نفس سياسة الخادم: الطول الخام، منع المحارف الحساسة، ثم طول النص بعد توحيد المسافات.
const reasonValid = text => typeof text === 'string' && text.length <= 500 && text.replace(/\s+/g, ' ').trim().length >= 3 &&
  !/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069@＠]|https?:\/\/|www\.|data:|file:|mailto:|-----BEGIN/i.test(text);
const mayRequest = v => v && ['none', 'rejected', 'revoked'].includes(v.status) && v.verified !== true;
// لا تخزين لحالة توثيق أو UID عام: العمليات الجارية فقط، حسب عميل API والحساب الحقيقي إن توفّر.
const verificationOperations = new WeakMap();
const anonymousApiScope = Symbol('account-tools-api-scope');
let viewSequence = 0;

function verificationHTML({ verification, loading, busy, error, message, draft, invalidReason, uiId }) {
  const status = verification?.status;
  const request = verification?.request;
  const editable = mayRequest(verification);
  const disabled = loading || busy ? ' disabled' : '';
  const statusText = status ? STATUS[status] || 'حالة الطلب غير متاحة' : busy ? 'جاري إرسال الطلب…' : loading ? 'جاري تحميل حالة الطلب…' : 'تعذّر تحميل حالة الطلب';
  const feedback = error || message;
  return `<section class="verification-ui-r3" dir="rtl" aria-labelledby="${esc(uiId)}-title" aria-busy="${loading || busy}">
    <header class="verification-ui-r3__header">
      <h1 id="${esc(uiId)}-title">توثيق الحساب</h1>
      <p class="verification-ui-r3__status" data-verification-status="${esc(status || 'unavailable')}" role="status" aria-live="polite" tabindex="-1"><span class="verification-ui-r3__status-dot" aria-hidden="true"></span>${esc(statusText)}</p>
    </header>
    ${status === 'pending' ? '<p class="verification-ui-r3__state-note">طلبك لدى الإدارة الآن. انتظر نتيجة المراجعة؛ لا تحتاج إلى إرسال طلب آخر.</p>' : ''}
    ${status === 'accepted' ? '<p class="verification-ui-r3__state-note">حسابك موثّق حاليًا. لا تحتاج إلى تقديم طلب جديد.</p>' : ''}
    ${status === 'rejected' ? `<div class="verification-ui-r3__decision"><p><strong>سبب الرفض:</strong> ${esc(request?.decisionReason || 'لم يُرفق سبب للرفض.')}</p><p>يمكنك إعادة التقديم بكتابة سبب واضح؛ سيُراجع الطلب الجديد وفق النظام الحالي.</p></div>` : ''}
    ${status === 'revoked' ? `<div class="verification-ui-r3__decision"><p><strong>سبب الإلغاء:</strong> ${esc(request?.revocationReason || 'لم يُرفق سبب للإلغاء.')}</p><p>يمكنك طلب مراجعة جديدة وفق النظام الحالي.</p></div>` : ''}
    <div class="verification-ui-r3__instructions">
      <p>تراجع الإدارة طلبات التوثيق يدويًا. تسجيل الدخول عبر Google لا يعني توثيق الحساب تلقائيًا.</p>
      <p>اكتب سبب طلبك فقط. لا ترسل بريدك الإلكتروني أو رقم هاتفك أو هويتك أو مستندات أو روابط.</p>
    </div>
    ${request?.reason ? `<details class="verification-ui-r3__request"><summary>سبب الطلب المسجّل</summary><p>${esc(request.reason)}</p></details>` : ''}
    ${feedback ? `<p id="${esc(uiId)}-feedback" class="verification-ui-r3__feedback${error ? ' is-error' : ' is-success'}" role="${error ? 'alert' : 'status'}">${esc(feedback)}</p>` : ''}
    ${editable ? `<form class="verification-ui-r3__form" data-account-tools="verification" novalidate>
      <label for="${esc(uiId)}-reason">سبب طلب التوثيق</label>
      <textarea id="${esc(uiId)}-reason" data-verification-reason name="reason" dir="rtl" rows="4" minlength="3" maxlength="500" required aria-describedby="${esc(uiId)}-help${invalidReason ? ` ${esc(uiId)}-feedback` : ''}" aria-invalid="${invalidReason === true}"${disabled}>${esc(draft)}</textarea>
      <p id="${esc(uiId)}-help" class="verification-ui-r3__help">اشرح سبب حاجتك إلى التوثيق بوضوح، من 3 إلى 500 حرف في فقرة واحدة، دون معلومات شخصية أو روابط.</p>
      <button class="verification-ui-r3__submit" type="submit"${disabled}>${busy ? 'جاري الإرسال…' : 'إرسال طلب التوثيق'}</button>
    </form>` : ''}
    ${busy && !editable ? '<p class="verification-ui-r3__help" role="status">جاري إتمام الطلب السابق؛ يُمنع تكرار الإرسال أثناء المعالجة.</p>' : ''}
    ${error && !loading && !busy ? '<button class="verification-ui-r3__reload" type="button" data-account-tools-reload>إعادة تحميل حالة الطلب</button>' : ''}
  </section>`;
}

/** HTML قابل للاختبار؛ لا يعرض نموذجًا قابلًا للحفظ قبل وصول بيانات صالحة. */
export function accountToolsHTML({ settings = null, verification = null, mode = 'all', loading = false, busy = false, error = '', message = '', draft = '', invalidReason = false, uiId = 'verification-r3' } = {}) {
  const enabledSettings = mode !== 'verification', enabledVerification = mode !== 'settings';
  const disabled = loading || busy ? ' disabled' : '';
  const note = loading ? '<p class="hint" role="status">جاري تحميل بيانات الحساب…</p>' : '';
  const feedback = `<p class="hint${error ? ' bad' : ''}" role="${error ? 'alert' : 'status'}">${esc(error || message)}</p>`;
  const settingsForm = enabledSettings && settings ? `<form class="card form" data-account-tools="settings">
    <h2>إعدادات الحساب والخصوصية</h2><p class="hint">تُحفظ هذه الإعدادات في حسابك على الخادم. لا تطلب هذه الصفحة إذن إشعارات المتصفح.</p>
    ${SETTINGS.map(([key, label]) => `<label><input type="checkbox" name="${key}"${settings[key] === true ? ' checked' : ''}${disabled}> ${label}</label>`).join('')}
    <button class="btn" type="submit"${disabled}>${busy ? 'جاري الحفظ…' : 'حفظ الإعدادات'}</button></form>` : '';
  const verificationForm = enabledVerification ? verificationHTML({ verification, loading, busy, error, message, draft, invalidReason, uiId }) : '';
  return `<div class="stack">${enabledSettings ? note + feedback + settingsForm : ''}${verificationForm}${enabledSettings && error && !loading ? '<button class="btn ghost" type="button" data-account-tools-reload>إعادة التحميل</button>' : ''}</div>`;
}

/** mode = settings | verification | all. accountId/getUserId اختياريان؛ لا تُرسل الهوية في الطلب.
 * يرجع {ready,reload,destroy}؛ ready وعد اكتمال القراءة الأولى، بما فيها عملية سابقة عند إعادة التركيب. */
export function accountToolsView(root, { api, refreshMe = async () => {}, mode = 'all', accountId, getUserId } = {}) {
  if (!root || typeof root.addEventListener !== 'function' || typeof api !== 'function' || !['all', 'settings', 'verification'].includes(mode))
    throw new TypeError('accountToolsView requires a root, api and valid mode');
  const ownerId = accountId ?? (typeof getUserId === 'function' ? getUserId() : undefined);
  const operationKey = ownerId ?? anonymousApiScope;
  let operations = verificationOperations.get(api);
  if (!operations) { operations = new Map(); verificationOperations.set(api, operations); }
  let scope = operations.get(operationKey);
  if (!scope) { scope = { operation: null, revision: 0, views: 0 }; operations.set(operationKey, scope); }
  scope.views++;
  const releaseScope = () => { if (!scope.views && !scope.operation && operations.get(operationKey) === scope) operations.delete(operationKey); };
  const state = { mode, settings: null, verification: null, loading: false, busy: false, error: '', message: '', draft: '', invalidReason: false, uiId: `verification-r3-${++viewSequence}` };
  let destroyed = false, generation = 0;
  const active = () => !destroyed && (typeof getUserId !== 'function' || getUserId() === ownerId);
  const render = () => {
    if (!active()) return;
    // إن أعيد رسم الخطأ أثناء الكتابة، لا نخسر موضع المؤشر ولا نأخذ التركيز من خارج الصفحة.
    const focused = root.ownerDocument?.activeElement;
    const editing = focused?.hasAttribute?.('data-verification-reason') && root.contains(focused);
    const selection = editing ? [focused.selectionStart, focused.selectionEnd] : null;
    root.innerHTML = accountToolsHTML(state);
    if (editing) {
      const textarea = root.querySelector?.('[data-verification-reason]');
      if (textarea && !textarea.disabled) { textarea.focus({ preventScroll: true }); textarea.setSelectionRange?.(...selection); }
    }
  };
  const errorOf = e => typeof e?.message === 'string' && (mode === 'settings' || /[\u0600-\u06ff]/.test(e.message)) ? e.message : 'تعذّر الاتصال أو الحفظ. جرّب مرة أخرى.';
  const call = async (path, method = 'GET', body) => {
    const r = await api(PATH + path, method, body);
    if (!r || r.ok === false) throw new Error(r?.error || r?.message || 'تعذّر إتمام العملية.');
    return r;
  };
  const checkedSettings = r => {
    const s = r.settings ?? r;
    if (!s || !SETTINGS.every(([k]) => typeof s[k] === 'boolean')) throw new Error('بيانات الإعدادات غير مكتملة. أعد التحميل.');
    return Object.fromEntries(SETTINGS.map(([k]) => [k, s[k]]));
  };
  const checkedVerification = r => {
    const v = r.verification ?? r;
    const request = v?.request;
    // accepted مصدره علامة الخادم الحالية؛ المنح المباشر قد لا يملك طلبًا أو يملك طلبًا قديمًا مختلف الحالة.
    if (typeof v?.verified !== 'boolean' || !Object.hasOwn(v, 'request') || !Object.hasOwn(STATUS, v.status) || (v.status === 'accepted') !== v.verified ||
        (request != null && (!Object.hasOwn(STATUS, request.status) || request.status === 'none' || typeof request.reason !== 'string')) ||
        (['pending', 'rejected'].includes(v.status) && !request) ||
        (v.status !== 'accepted' && request && request.status !== v.status))
      throw new Error('بيانات التوثيق غير مكتملة. أعد التحميل.');
    return v;
  };
  const messageOf = (r, v) => r.dup ? 'طلبك موجود بالفعل دون تكرار.' : v.status === 'pending' ? 'تم إرسال طلبك للمراجعة.' : v.status === 'accepted' ? 'حسابك موثّق حسب حالة الخادم.' : 'تم تحديث حالة الطلب من الخادم.';
  async function awaitOperation(operation, gen) {
    if (!active() || gen !== generation) return;
    state.busy = true; state.draft = operation.reason; render();
    const receipt = await operation.promise;
    if (!active() || gen !== generation) return;
    state.busy = false;
    if (receipt.error) state.error = errorOf(receipt.error);
    else {
      state.message = messageOf(receipt.response, receipt.verification); state.draft = '';
      try { await refreshMe(); } catch { if (active()) state.message += ' تعذّر تحديث الملف؛ أعد فتحه.'; }
    }
  }
  async function readVerification(gen) {
    // قراءة بعد اكتمال POST لا لقطة قديمة قبله. حتى GET الجاري عند بداية POST يعاد بعده.
    while (active() && gen === generation) {
      if (scope.operation) await awaitOperation(scope.operation, gen);
      if (!active() || gen !== generation) return;
      const revision = scope.revision;
      const response = await call('verification');
      if (!active() || gen !== generation) return;
      // قد ينتهي POST وتُحذف العملية قبل وصول GET؛ رقم المراجعة يكشف هذه اللقطة القديمة أيضًا.
      if (scope.operation || revision !== scope.revision) continue;
      state.verification = checkedVerification(response);
      return;
    }
  }
  async function reload() {
    if (!active() || state.busy || state.loading) return;
    const gen = ++generation;
    state.loading = true; state.error = ''; state.invalidReason = false; render();
    const tasks = [];
    if (mode !== 'verification') tasks.push((async () => { const s = checkedSettings(await call('settings')); if (active() && gen === generation) state.settings = s; })());
    if (mode !== 'settings') tasks.push(readVerification(gen));
    const outcomes = await Promise.allSettled(tasks);
    if (!active() || gen !== generation) return;
    const errors = outcomes.filter(r => r.status === 'rejected').map(r => errorOf(r.reason)).join(' ');
    if (errors) {
      state.error = errors;
      if (mode !== 'settings') state.verification = null; // لا نموذج مبني على حالة قديمة عند فشل التحقق.
    }
    state.loading = false; state.busy = false; render();
  }
  async function submit(event) {
    const form = event.target?.closest?.('form[data-account-tools]');
    if (!form || !root.contains(form)) return;
    event.preventDefault();
    if (!active() || state.busy || state.loading) return;
    const kind = form.getAttribute('data-account-tools');
    let body;
    if (kind === 'settings' && state.settings && mode !== 'verification') {
      body = Object.fromEntries(SETTINGS.map(([k]) => [k, form.elements.namedItem(k)?.checked === true]));
    } else if (kind === 'verification' && mayRequest(state.verification) && mode !== 'settings') {
      const pending = scope.operation;
      if (pending) { await reload(); return; }
      const reason = String(form.elements.namedItem('reason')?.value ?? ''); state.draft = reason;
      if (!reasonValid(reason)) {
        state.invalidReason = true; state.error = 'اكتب سببًا من 3 إلى 500 حرف في فقرة واحدة، دون بريد أو روابط أو مستندات.';
        state.message = ''; render(); root.querySelector?.('[data-verification-reason]')?.focus({ preventScroll: true }); return;
      }
      body = { reason };
    } else return;
    state.busy = true; state.error = ''; state.message = ''; state.invalidReason = false; render();
    try {
      let r;
      if (kind === 'verification') {
        const operation = { reason: body.reason, promise: null };
        // يوضع القفل قبل بدء API؛ يبقى بعد destroy حتى يستقر POST، ولا يتضمن حالة حساب دائمة.
        scope.operation = operation; scope.revision++;
        operation.promise = call(kind, 'POST', body)
          .then(response => ({ response, verification: checkedVerification(response) }), error => ({ error }))
          .catch(error => ({ error }))
          .finally(() => { if (scope.operation === operation) scope.operation = null; releaseScope(); });
        const receipt = await operation.promise;
        if (!active()) return;
        if (receipt.error) throw receipt.error;
        r = receipt.response; state.verification = receipt.verification; state.draft = '';
      } else {
        r = await call(kind, 'PATCH', body);
        if (!active()) return;
        state.settings = checkedSettings(r);
      }
      state.message = kind === 'settings' ? 'تم حفظ الإعدادات.' : messageOf(r, state.verification);
      // حدّث الملف بعلامة الخادم، لا علامة متفائلة؛ لا تحديث بعد تبديل الحساب أو teardown.
      try { if (active()) await refreshMe(); } catch { if (active()) state.message += ' تعذّر تحديث الملف؛ أعد فتحه.'; }
    } catch (e) { if (active()) state.error = errorOf(e); }
    finally { if (active()) { state.busy = false; render(); } }
  }
  function input(event) {
    const textarea = event.target?.closest?.('[data-verification-reason]');
    if (active() && !state.busy && textarea && root.contains(textarea)) state.draft = String(textarea.value ?? '');
  }
  function click(event) {
    const button = event.target?.closest?.('[data-account-tools-reload]');
    if (button && root.contains(button)) { event.preventDefault(); void reload(); }
  }
  root.addEventListener('submit', submit); root.addEventListener('click', click);
  if (mode !== 'settings') root.addEventListener('input', input);
  const ready = reload();
  return { ready, reload, destroy() {
    if (destroyed) return;
    destroyed = true; generation++;
    root.removeEventListener('submit', submit); root.removeEventListener('click', click);
    if (mode !== 'settings') root.removeEventListener('input', input);
    scope.views--; releaseScope();
  } };
}
