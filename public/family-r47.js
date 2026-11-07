/* R47 private family/profile section. Parent owns route, auth, CSRF, same-origin API and CSS loading. */
const ENDPOINT = '/api/social-private/family';
const PUB = /^[A-Za-z0-9_-]{16}$/;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const loggedIn = ctx => !!(typeof ctx.getUserId === 'function' ? ctx.getUserId() : ctx.user?.id);
const login = '<section class="panel family-r47" dir="rtl"><h2>العائلة والارتباط الافتراضي</h2><p>سجّل دخولك لإدارة دائرتك وطلباتك الخاصة.</p><a class="btn" href="#/account">تسجيل الدخول</a></section>';
export function render(ctx = {}) {
  return `<section class="family-r47" data-family-r47 dir="rtl"><div data-family-r47-host>${loggedIn(ctx) ? '<p role="status">جاري تحميل العلاقات الخاصة…</p>' : login}</div></section>`;
}
export function mount(root, ctx = {}) {
  const host = root?.querySelector?.('[data-family-r47-host]') || root;
  return familyView(host, ctx);
}
/** Compact mount for a profile section or #/family. ctx.api(path,method,body) is the existing authenticated bridge. */
export function familyView(root, ctx = {}) {
  if (!root || typeof root.addEventListener !== 'function') throw new TypeError('familyView requires a root');
  let destroyed = false, generation = 0;
  const state = { data: null, busy: false, loading: false, error: '', notice: '', confirm: null, drafts: { create: '', invite: '', 'couple-request': '' }, retry: null };
  const disabled = () => state.busy || state.loading ? 'disabled aria-busy="true"' : '';
  const button = (act, label, extra = '', gold = false) => `<button type="button" class="${gold ? 'gold-btn' : 'btn'}" data-fr-action="${act}" ${extra} ${disabled()}>${label}</button>`;
  const user = u => u && PUB.test(u.pub) ? `<a href="#/u/${esc(u.pub)}">${esc(u.name || 'لاعب')}</a>` : '<span>حساب غير متاح وفق الخصوصية</span>';
  const attrs = (id, to) => `${id === undefined ? '' : `data-id="${Number(id)}"`} ${to ? `data-to="${esc(to)}"` : ''}`;
  const requestList = (list, couple) => !list?.length ? '<p class="muted">لا توجد طلبات معلّقة.</p>' : `<ul class="family-r47-list">${list.map(r => {
    const prefix = couple ? 'couple-' : '', incoming = r.direction === 'incoming';
    const label = couple ? 'طلب ارتباط افتراضي' : r.kind === 'transfer' ? 'نقل ملكية الدائرة — تصبح المسؤول عنها بعد القبول' : `دعوة إلى ${r.circleName || 'دائرة خاصة'}`;
    return `<li><div><strong>${esc(label)}</strong> · ${user(r.user)}<small>${incoming ? 'طلب وارد' : 'طلب أرسلته'}${r.hidden ? ' · التواصل محجوب؛ يمكنك الرفض أو الإلغاء' : ''}</small></div><div class="family-r47-actions">${incoming ? (r.hidden ? '' : button(prefix + 'accept', 'قبول صريح', attrs(r.id), true)) + button(prefix + 'reject', 'رفض', attrs(r.id)) : button(prefix + 'cancel', 'إلغاء الطلب', attrs(r.id))}</div></li>`;
  }).join('')}</ul>`;
  const targetForm = (action, title, text) => `<form data-fr-form="${action}" class="family-r47-form"><label>${esc(title)}<input name="to" inputmode="text" autocomplete="off" maxlength="16" minlength="16" value="${esc(state.drafts[action])}" required ${disabled()}></label><small>استخدم معرّف الملف العام المؤلف من 16 رمزًا، وليس معرّف الحساب الداخلي أو رقم اللاعب.</small><button class="btn" type="submit" ${disabled()}>${text}</button></form>`;
  const paint = () => {
    if (destroyed) return;
    if (!loggedIn(ctx)) { root.innerHTML = login; return; }
    if (typeof ctx.api !== 'function') { root.innerHTML = '<section class="panel family-r47"><p role="alert">تعذّر الاتصال بحسابك الحالي.</p></section>'; return; }
    const d = state.data, c = d?.circle, b = d?.couple;
    const confirm = state.confirm ? `<div class="family-r47-confirm" role="group" aria-label="تأكيد الإجراء"><p>${state.confirm.action === 'disband' ? 'حل الدائرة ينهي عضوية الجميع ويلغي دعواتها. هل تؤكد؟' : state.confirm.action === 'couple-dissolve' ? 'هل تؤكد إنهاء الارتباط الافتراضي؟ لا يحتاج موافقة الطرف الآخر.' : state.confirm.action === 'transfer' ? 'ترسل طلب نقل ملكية فقط. ستبقى المالك حتى يقبل العضو بنفسه.' : state.confirm.action === 'kick' ? 'هل تؤكد إزالة العضو العادي من دائرتك؟' : 'هل تؤكد مغادرة الدائرة؟'}</p>${button('confirmed', 'تأكيد', '', true)}${button('back', 'تراجع')}</div>` : '';
    const circle = c ? `<h3>${esc(c.name)}</h3><p class="muted">${c.isOwner ? 'أنت مالك الدائرة. الملكية لا تنتقل تلقائيًا عند الخروج.' : 'عضو في دائرة خاصة.'} الحد الأقصى 20 عضوًا.</p><ul class="family-r47-list">${(c.members || []).map(m => `<li><div>${user(m)}${m.owner ? ' · المالك' : ' · عضو'}${m.mine ? ' · أنت' : ''}</div>${c.isOwner && !m.owner && PUB.test(m.pub) ? `<div class="family-r47-actions">${button('kick', 'إزالة العضو', attrs(c.id, m.pub))}${button('transfer', 'طلب نقل الملكية', attrs(c.id, m.pub))}</div>` : ''}</li>`).join('')}</ul>${c.isOwner ? targetForm('invite', 'دعوة بمعرّف الملف العام', 'إرسال دعوة اختيارية') + button('disband', 'حل الدائرة', attrs(c.id)) : button('leave', 'مغادرة الدائرة', attrs(c.id))}` : `<p>دائرة اختيارية داخل المنصة، لا تُثبت قرابة واقعية. دائرة واحدة لكل حساب، دون رسوم أو مكافآت.</p><form class="family-r47-form" data-fr-form="create"><label>اسم دائرة فريد (3–32 حرفًا)<input name="name" maxlength="32" minlength="3" value="${esc(state.drafts.create)}" required ${disabled()}></label><button class="gold-btn" type="submit" ${disabled()}>إنشاء دائرة خاصة</button></form>`;
    const couple = b ? `<p>شريك باللعبة: ${user(b.partner)}${b.hidden ? ' · العلاقة مخفية بسبب الحراسة الحالية.' : ''}</p><p class="muted">${b.public ? 'العلاقة ظاهرة علنًا بموافقة الطرفين.' : 'العلاقة غير ظاهرة علنًا. يلزم تفعيل مستقل من الطرفين.'}</p><label class="family-r47-check"><input type="checkbox" data-fr-setting="exposure" ${b.exposure ? 'checked' : ''} ${disabled()}> أوافق على إظهار ارتباطي في الملف العام عند موافقة شريكي أيضًا</label><p class="muted">تقدر تسحب موافقة الظهور في أي وقت. لا يُكشف إلا معرّف الشريك العام.</p>${button('couple-dissolve', 'إنهاء الارتباط الافتراضي')}` : targetForm('couple-request', 'معرّف الشريك المقترح العام', 'إرسال طلب ارتباط افتراضي');
    root.innerHTML = `<div class="family-r47" dir="rtl"><header class="family-r47-header"><h2>العائلة والارتباط الافتراضي</h2>${button('refresh', 'تحديث')}</header><p class="family-r47-note">العضوية اختيارية. موافقة الانضمام تتيح عرض عضويتك للأعضاء الحاليين والمستقبليين (حتى 20)، مع احترام الحظر والخصوصية. لا تظهر العائلة علنًا.</p>${state.error ? `<p role="alert" class="family-r47-error">${esc(state.error)}</p>` : ''}${state.notice ? `<p role="status">${esc(state.notice)}</p>` : ''}${state.loading || state.busy ? '<p role="status" aria-live="polite">جاري حفظ أو تحميل العلاقات الخاصة…</p>' : ''}${confirm}${d ? `<section class="panel"><h2>دائرتي الخاصة</h2>${circle}<h3>دعوات العائلة ونقل الملكية</h3>${requestList(d.invitations, false)}</section><section class="panel"><h2>ارتباط افتراضي</h2><p>شراكة داخل اللعبة فقط، وليست زواجًا قانونيًا أو علاقة واقعية. حصرية بين حسابين، وتتطلب تصريح عمر 18+ في بيانات الحساب لكلا الطرفين وموافقة مستقلة. لا يُستنتج العمر أو الجنس من الاسم.</p>${couple}<h3>طلبات الارتباط</h3>${requestList(d.coupleRequests, true)}</section>` : ''}<p class="muted">لا تمنح هذه العلاقات صلاحيات على الحساب أو الغرف أو المحفظة، ولا تتجاوز إعدادات الرسائل أو الحظر.</p></div>`;
  };
  const call = async (method = 'GET', body) => {
    const out = await ctx.api(ENDPOINT, method, body);
    if (!out || typeof out !== 'object' || out.ok === false || out.error) throw new Error(out?.error || 'تعذّر إكمال العملية.');
    return out;
  };
  const load = async () => {
    const out = await call();
    if (!Array.isArray(out.invitations) || !Array.isArray(out.coupleRequests)) throw new Error('استجابة العلاقات غير صالحة.');
    return out;
  };
  const refresh = async () => {
    if (destroyed || !loggedIn(ctx) || typeof ctx.api !== 'function' || state.busy) { paint(); return; }
    const gen = ++generation; state.loading = true; state.error = ''; paint();
    try { const d = await load(); if (!destroyed && gen === generation) state.data = d; }
    catch (e) { if (!destroyed && gen === generation) { state.error = e.message || 'تعذّر التحميل.'; state.data = null; } }
    finally { if (!destroyed && gen === generation) { state.loading = false; paint(); } }
  };
  const send = async command => {
    if (destroyed || state.busy || state.loading) return;
    const gen = ++generation;
    state.busy = true; state.error = ''; state.notice = ''; state.confirm = null; paint();
    try {
      const signature = JSON.stringify(command);
      if (!state.retry || state.retry.signature !== signature) {
        if (typeof globalThis.crypto?.randomUUID !== 'function') throw new Error('تحتاج اتصالًا آمنًا لإنشاء معرّف العملية.');
        state.retry = { signature, key: globalThis.crypto.randomUUID(), command: { ...command } };
      }
      await call('POST', { ...command, key: state.retry.key });
      state.retry = null;
      if (command.action in state.drafts) state.drafts[command.action] = '';
      state.notice = 'تم حفظ الإجراء في حسابك.';
      const d = await load(); if (!destroyed && gen === generation) state.data = d;
    } catch (e) { if (!destroyed && gen === generation) { state.error = e.message || 'تعذّر الحفظ؛ أعد المحاولة بنفس الإجراء.'; state.data = null; } }
    finally {
      if (!destroyed && gen === generation) {
        state.busy = false; paint();
        if (state.error && state.retry) root.innerHTML += `<div class="family-r47">${button('retry', 'إعادة نفس العملية بأمان')}</div>`;
      }
    }
  };
  const click = event => {
    const el = event.target.closest?.('[data-fr-action]'); if (!el || !root.contains(el) || state.busy || state.loading) return;
    event.preventDefault(); const act = el.dataset.frAction;
    if (act === 'refresh') { void refresh(); return; }
    if (act === 'retry') { if (state.retry) void send(state.retry.command); return; }
    if (act === 'back') { state.confirm = null; paint(); return; }
    if (act === 'confirmed') { if (state.confirm) void send(state.confirm); return; }
    const permitted = ['accept', 'reject', 'cancel', 'couple-accept', 'couple-reject', 'couple-cancel', 'leave', 'kick', 'transfer', 'disband', 'couple-dissolve'];
    if (!permitted.includes(act)) return;
    const command = { action: act };
    command.id = act === 'couple-dissolve' ? state.data?.couple?.id : Number(el.dataset.id);
    if (act === 'kick' || act === 'transfer') { if (!PUB.test(el.dataset.to || '')) return; command.to = el.dataset.to; }
    if (['leave', 'kick', 'transfer', 'disband', 'couple-dissolve'].includes(act)) { state.confirm = command; paint(); } else void send(command);
  };
  const submit = event => {
    const form = event.target; const act = form?.dataset?.frForm;
    if (!['create', 'invite', 'couple-request'].includes(act) || !root.contains(form)) return;
    event.preventDefault(); if (state.busy || state.loading) return;
    const command = { action: act };
    const value = String(act === 'create' ? form.elements?.name?.value ?? '' : form.elements?.to?.value ?? '').trim();
    state.drafts[act] = value;
    if (act === 'create') command.name = value;
    else { if (!PUB.test(value)) { state.error = 'اكتب معرّف الملف العام المؤلف من 16 رمزًا.'; paint(); return; } command.to = value; }
    if (act === 'invite') { if (!state.data?.circle?.isOwner) return; command.id = state.data.circle.id; }
    void send(command);
  };
  const input = event => {
    const act = event.target.closest?.('[data-fr-form]')?.dataset.frForm;
    if (act in state.drafts) state.drafts[act] = event.target.value;
  };
  const change = event => { if (event.target?.dataset?.frSetting === 'exposure' && state.data?.couple) void send({ action: 'couple-exposure', id: state.data.couple.id, enabled: event.target.checked === true }); };
  root.addEventListener('click', click); root.addEventListener('submit', submit); root.addEventListener('input', input); root.addEventListener('change', change);
  paint(); const ready = refresh();
  return { ready, refresh, destroy() { destroyed = true; generation++; state.data = null; state.retry = null; for (const [type, fn] of [['click', click], ['submit', submit], ['input', input], ['change', change]]) root.removeEventListener(type, fn); } };
}
