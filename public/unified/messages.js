/* Messages-only adaptation of ../social-private.js. No new backend or persistence.
 * Caller owns authenticated HTTP, routing and the common shell. */
import * as E2E from '../e2e-r69.js?v=r69zj';
const BASE = '/api/social-private/';
const PUB = /^[A-Za-z0-9_-]{16}$/;
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const positive = value => Number.isSafeInteger(value) && value > 0;
const pageEmpty = () => ({ list: [], more: false, nextBefore: null });
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
const stamp = value => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('ar-AE-u-nu-latn', { dateStyle: 'short', timeStyle: 'short' }) : '';
};
/* R68g: رأس الرسائل بتصميم المالك */
const hero = (ctx = {}) => `<header class="m68-head" dir="ltr"><div class="m68-btns"><a class="m68-sq" href="#/friends" aria-label="إضافة صديق"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></a><a class="m68-sq" href="#/friends" aria-label="الأصدقاء"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2.5 20c0-3.8 2.9-6.2 6.5-6.2s6.5 2.4 6.5 6.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16 8h5M16 12h5M18 16h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><i class="m68-dot" data-m68-reqdot hidden></i></a></div><span class="m68-logo" aria-hidden="true"><i>👑</i><b>لعبك</b><small>LA3BAK</small></span><h1>الرسائل</h1></header>
<nav class="m68-rows"><a class="m68-row" href="#/notifications"><span class="m68-ic is-bell" aria-hidden="true">🔔</span><span class="m68-txt"><b>معلومات النظام <i class="m68-ok">✓</i></b><small>آخر الأخبار والتنبيهات من لعبك</small></span><span class="m68-end">${Number(ctx.unread) > 0 ? `<em>${esc(Math.min(99, Number(ctx.unread)))}</em>` : ''}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></span></a><a class="m68-row" href="#/friends"><span class="m68-ic is-req" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10" cy="8" r="4" fill="#fff"/><path d="M2 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" fill="#fff"/><path d="M19 9v6M16 12h6" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg></span><span class="m68-txt"><b>طلبات الصداقة</b></span><span class="m68-end"><em data-m68-req hidden></em><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></span></a></nav>`;
const limits = () => `<p class="lb-message-limit">الرسائل نصية بين الأصدقاء المقبولين فقط. المجموعات والمرفقات ودعوات اللعب وحالة الاتصال ما تدعمها خدمة الرسائل الحالية. التحديث يدوي.</p>`;

/** Returns the body only; no common header, balances, navigation or drawer. */
export function render(ctx = {}) {
  const loggedIn = !!(ctx.user || ctx.me);
  return `<div data-lb-page="messages" class="m68" dir="rtl">${hero(ctx)}<div data-lb-messages-host>${loggedIn ? '<section class="panel lb-message-empty" role="status">جاري تحميل رسائلك…</section>' : '<section class="panel lb-message-empty"><h2 class="panel-title">سجّل دخولك أول</h2><p>سجّل دخولك عشان تشوف رسائلك وتراسل ربعك.</p><a class="gold-btn" href="#/account">تسجيل الدخول</a></section>'}</div></div>`;
}

/** Adapts the existing social-private pagination, DM privacy and send/read contracts. */
export function mount(root, ctx = {}) {
  const host = root?.querySelector?.('[data-lb-messages-host]');
  if (!host) return { destroy() {} };
  if (!(ctx.user || ctx.me)) return { destroy() {} };
  if (typeof ctx.api !== 'function') {
    host.innerHTML = '<section class="panel lb-message-empty" role="alert">خدمة الرسائل مب متاحة في هالواجهة الحين. ما تم إرسال أي طلب.</section>';
    return { destroy() {} };
  }
  ctx.api('/api/social-private/friend-requests?direction=incoming&limit=20','GET').then(r=>{const n=Array.isArray(r?.list)?r.list.length:0;const el=root.querySelector('[data-m68-req]'),dot=root.querySelector('[data-m68-reqdot]');if(el&&n){el.textContent=n>=20?'20+':String(n);el.hidden=false;}if(dot)dot.hidden=!n;}).catch(()=>{});
  const state = {
    tab: 'inbox', query: '', busy: false, error: '', notice: '',
    settings: null, friends: pageEmpty(), inbox: pageEmpty(), conversation: pageEmpty(),
    loaded: { friends: false, inbox: false, conversation: false },
    errors: { friends: '', inbox: '', conversation: '', settings: '' },
    peer: '', peerName: '', canSend: false, draft: '', draftKey: null,
    pk: { dmEdit: false, pinChats: false, pins: [] }
  };
  /* R88: مزايا VIP بالرسائل (تعديل/حذف، تثبيت) */
  ctx.api('/api/perks', 'GET').then((d) => { if (!d || !Array.isArray(d.list)) return; const on = (k) => d.list.some((x) => x.key === k && x.open); state.pk = { dmEdit: on('dmEdit'), pinChats: on('pinChats'), pins: Array.isArray(d.prefs?.pins) ? d.prefs.pins : [] }; if (active()) paint(); }).catch(() => {});
  let destroyed = false;
  const active = () => !destroyed;
  const call = async (path, method = 'GET', body) => {
    if (!active()) throw new Error('انتهت جلسة الصفحة.');
    const result = await ctx.api(BASE + path, method, body);
    if (!active()) throw new Error('انتهت جلسة الصفحة.');
    if (!result || result.ok === false) throw new Error(result?.error || 'تعذّر إكمال الطلب. جرّب مرة ثانية.');
    return result;
  };
  const errorText = error => error?.status === 401 ? 'انتهت جلسة الدخول. سجّل دخولك مرة ثانية.' : String(error?.message || 'تعذّر تحميل الرسائل. جرّب مرة ثانية.');
  const disabled = () => state.busy ? 'disabled aria-busy="true"' : '';
  const action = (name, text, extra = '', gold = false) => `<button type="button" class="${gold ? 'gold-btn' : 'btn'}" data-lb-msg-action="${name}" ${extra} ${disabled()}>${text}</button>`;
  const moreButton = kind => state[kind].more ? action('more', kind === 'conversation' ? 'رسائل أقدم' : 'عرض المزيد', `data-kind="${kind}"`) : '';
  const safeUsers = list => list.filter(item => item?.user && PUB.test(item.user.pub));
  const filtered = list => {
    const query = state.query.trim().toLocaleLowerCase('ar-AE');
    return safeUsers(list).filter(item => !query || String(item.user.name ?? '').toLocaleLowerCase('ar-AE').includes(query) || String(item.last?.body ?? '').toLocaleLowerCase('ar-AE').includes(query));
  };
  const listHTML = () => {
    const kind = state.tab;
    if (!state.loaded[kind]) return `<p class="lb-message-empty" ${state.errors[kind] ? 'role="alert"' : 'role="status"'}>${esc(state.errors[kind] || 'جاري تحميل القائمة…')}</p>`;
    const rows = filtered(state[kind].list); if (kind === 'inbox' && state.pk.pins.length) rows.sort((a, b) => (state.pk.pins.includes(b.user.pub) ? 1 : 0) - (state.pk.pins.includes(a.user.pub) ? 1 : 0));
    const html = rows.map(item => {
      const user = item.user, selected = state.peer === user.pub;
      const unread = typeof item.unread === 'number' && Number.isSafeInteger(item.unread) && item.unread > 0 ? `<span class="lb-message-unread" aria-label="${esc(item.unread)} رسالة غير مقروءة">${esc(item.unread)}</span>` : '';
      return `<button type="button" class="list-row lb-message-row${selected ? ' active' : ''}" data-lb-msg-action="open" data-peer="${esc(user.pub)}" ${selected ? 'aria-current="true"' : ''} ${disabled()}><span class="avatar lb-message-avatar">${icon('user')}</span><span class="grow"><b>${kind === 'inbox' && state.pk.pins.includes(user.pub) ? '📌 ' : ''}${esc(user.name || 'لاعب')}</b><small class="lb-message-preview">${kind === 'inbox' ? esc(item.last?.body || '') : 'صديق مقبول · افتح المحادثة'}</small></span><span class="lb-message-row-end">${unread}${kind === 'inbox' ? `<small>${esc(stamp(item.last?.at))}</small>` : ''}</span></button>`;
    }).join('');
    return `${state.errors[kind] ? `<p role="alert" class="lb-message-error">${esc(state.errors[kind])} القائمة المعروضة هي آخر بيانات تم تحميلها.</p>` : ''}${html || `${kind === 'inbox' && !state.query.trim() ? '<img class="m68-empty-art" src="/assets/art68/msg-empty.webp" alt="" decoding="async">' : ''}<p class="lb-message-empty">${state.query.trim() ? 'ما لقينا نتيجة في القائمة المحمّلة.' : kind === 'inbox' ? 'ما عندك محادثات للحين. اختَر صديق من تبويب الأصدقاء.' : 'ما عندك أصدقاء مقبولين ظاهرين للحين.'}</p>`}${moreButton(kind)}`;
  };
  const conversationHTML = () => {
    if (!state.peer) return '<div class="lb-message-empty lb-message-pick"><span class="lb-message-empty-icon">' + icon('chat') + '</span><h2>اختَر محادثة</h2><p>اختَر محادثة من القائمة، أو صديق مقبول عشان تبدأ السوالف.</p></div>';
    const failure = state.errors.conversation ? `<p class="lb-message-error" role="alert">${esc(state.errors.conversation)}</p>` : '';
    const canEdit = (m) => state.pk.dmEdit && m.mine === true && m.deleted !== true && Date.now() - m.at < 10 * 60_000 && m.e2e !== 'lock';
    const messages = [...state.conversation.list].reverse().map(message => `<article class="chat-bubble${message.mine === true ? ' mine' : ''}${message.deleted === true ? ' is-deleted' : ''}"><b>${message.mine === true ? 'أنت' : esc(state.peerName || 'صديق')}</b><p>${esc(message.body)}</p><small>${message.e2e === 'ok' ? '🔒 ' : ''}${esc(stamp(message.at))}${message.editedAt && message.deleted !== true ? ' · معدّلة' : ''}${message.mine === true && message.deleted !== true ? `<span class="dm119-tick${message.read === true ? ' is-read' : ''}" aria-label="${message.read === true ? 'مقروءة' : 'وصلت'}">${message.read === true ? '✓✓' : '✓'}</span>` : ''}</small>${canEdit(message) ? `<span class="m88-acts"><button type="button" data-lb-msg-action="edit" data-id="${esc(message.id)}" aria-label="تعديل">✏️</button><button type="button" data-lb-msg-action="del" data-id="${esc(message.id)}" aria-label="حذف">🗑️</button></span>` : ''}</article>`).join('');
    const canSend = state.canSend && state.loaded.conversation && !state.busy;
    return `<h2 class="panel-title">المحادثة ويا ${esc(state.peerName || 'صديق')}${state.typing ? '<small class="dm119-sub" style="display:block;font-size:12px;color:#7ee2a8">جاري الكتابة…</small>' : ''}</h2><a class="lb-message-profile" href="#/u/${esc(state.peer)}">الملف الشخصي</a>${state.pk.pinChats ? `<button type="button" class="m88-pin${state.pk.pins.includes(state.peer) ? ' on' : ''}" data-lb-msg-action="pin">${state.pk.pins.includes(state.peer) ? '📌 مثبّتة — إلغاء' : '📌 تثبيت المحادثة'}</button>` : ''}${failure}<p class="lb-e2e-note">🔒 رسايلكم مشفّرة من طرف لطرف. محد يقدر يقراها غيركم، حتى إدارة لعبك.</p><div class="lb-message-history">${moreButton('conversation')}<div class="lb-message-stream" aria-label="رسائل المحادثة">${state.loaded.conversation ? (messages || '<p class="lb-message-empty">ما بينكم رسائل للحين.</p>') : (!failure ? '<p role="status" class="lb-message-empty">جاري تحميل المحادثة…</p>' : '')}</div></div><form class="chat-compose" data-lb-msg-form="message"><label class="lb-message-draft-label">رسالتك<textarea name="text" rows="3" maxlength="2000" placeholder="اكتب رسالة…" required ${canSend ? '' : 'disabled'}>${esc(state.draft)}</textarea></label><button type="submit" class="gold-btn" ${canSend ? '' : 'disabled'}>إرسال</button></form>${state.loaded.conversation && !state.canSend ? '<p class="lb-message-limit">الإرسال موقوف حسب إعداد الخصوصية عندك أو عند صديقك.</p>' : ''}`;
  };
  const paint = () => {
    if (!active()) return;
    const unread = state.loaded.inbox && Number.isSafeInteger(state.inbox.unread) && state.inbox.unread >= 0 ? `<span class="tag">${esc(state.inbox.unread)} غير مقروءة</span>` : '';
    host.innerHTML = `<div class="lb-message-toolbar">${action('refresh', 'تحديث الرسائل')}<a class="btn" href="#/friends">إدارة الأصدقاء</a>${state.busy ? '<span role="status">جاري تنفيذ الطلب…</span>' : ''}</div>${state.error ? `<p class="lb-message-error" role="alert">${esc(state.error)}</p>` : ''}${state.notice ? `<p class="lb-message-notice" role="status">${esc(state.notice)}</p>` : ''}<div class="grid2 lb-message-grid"><section class="panel lb-message-conversation" aria-label="المحادثة">${conversationHTML()}</section><section class="panel lb-message-sidebar" aria-label="قائمة المحادثات"><h2 class="panel-title">رسائلك ${unread}</h2><div class="tabs" role="group" aria-label="قائمة الرسائل"><button type="button" data-lb-msg-action="tab" data-tab="inbox" class="${state.tab === 'inbox' ? 'active' : ''}" aria-pressed="${state.tab === 'inbox'}" ${disabled()}>الكل</button><button type="button" data-lb-msg-action="tab" data-tab="friends" class="${state.tab === 'friends' ? 'active' : ''}" aria-pressed="${state.tab === 'friends'}" ${disabled()}>الأصدقاء</button><button type="button" disabled title="المجموعات غير مدعومة في الخدمة الحالية">المجموعات · غير متاحة</button></div><label class="lb-message-search-label">بحث في القائمة المحمّلة<input class="search" type="search" data-lb-msg-search maxlength="200" value="${esc(state.query)}" placeholder="اسم صديق أو نص رسالة…" ${disabled()}></label><p class="lb-message-limit">البحث محلي في الأسماء وآخر رسالة بالقائمة المحمّلة، مب في كامل السجل. اضغط «عرض المزيد» لتحميل صفحات إضافية.</p><div data-lb-msg-list>${listHTML()}</div></section></div><section class="panel lb-message-privacy"><h2 class="panel-title">خصوصية الرسائل</h2>${state.errors.settings ? `<p class="lb-message-error" role="alert">${esc(state.errors.settings)}</p>` : ''}<label><input type="checkbox" class="switch" data-lb-msg-setting ${state.settings?.dmEnabled === true ? 'checked' : ''} ${state.busy || !state.settings ? 'disabled' : ''}> أسمح بالرسائل الخاصة بيني وبين أصدقائي المقبولين</label><p class="lb-message-limit">إيقافها يمنع الرسائل الجديدة بالاتجاهين، وما يحذف السجل. المتابعة بروحها مب صداقة.</p>${!state.settings && !state.errors.settings ? '<p role="status">جاري تحميل إعداد الخصوصية…</p>' : ''}</section>`;
  };
  const loadPage = async (kind, append = false) => {
    const cursor = append ? state[kind].nextBefore : null;
    const query = kind === 'conversation' ? `messages?peer=${encodeURIComponent(state.peer)}` : kind;
    const result = await call(query + (cursor ? `${query.includes('?') ? '&' : '?'}before=${encodeURIComponent(cursor)}` : ''));
    if (!Array.isArray(result.list) || typeof result.more !== 'boolean' || (result.more && !positive(result.nextBefore))) throw new Error('رد القائمة مب صالح. جرّب التحديث.');
    if (kind === 'conversation' && (!result.user || !PUB.test(result.user.pub) || result.user.pub !== state.peer || typeof result.canSend !== 'boolean' || result.list.some(message => !positive(message?.id) || typeof message.body !== 'string' || typeof message.mine !== 'boolean' || typeof message.read !== 'boolean'))) throw new Error('رد المحادثة مب صالح.');
    /* R69ze: فك تشفير الرسائل على الجهاز */
    if (kind === 'conversation') { for (const m of result.list) if (E2E.isSealed(m.body)) { const o = await E2E.open(m.body); m.body = o.text; m.e2e = o.locked ? 'lock' : 'ok'; } }
    else if (kind === 'inbox') { for (const it of result.list) if (it.last && E2E.isSealed(it.last.body)) { const o = await E2E.open(it.last.body); it.last.body = o.locked ? '🔒 رسالة مشفّرة' : o.text; } }
    if (!active()) return;
    state[kind] = append ? { ...result, list: [...state[kind].list, ...result.list.filter(item => !state[kind].list.some(old => old.id === item.id))] } : result;
    state.loaded[kind] = true;
    state.errors[kind] = '';
    if (kind === 'conversation') {
      state.peerName = result.user.name || 'صديق'; state.canSend = result.canSend;
      // Only loaded incoming messages for this authenticated recipient are marked read.
      // Paint before marking: never mark a conversation that the user has not opened.
      paint();
      for (const message of result.list.filter(message => !message.mine && !message.read)) {
        if (!active()) return;
        try {
          await call(`messages/${encodeURIComponent(String(message.id))}/read`, 'POST', {});
          message.read = true;
        } catch (error) {
          if (active()) state.error = `تم تحميل المحادثة، لكن تعذّر تسجيل قراءة بعض الرسائل: ${errorText(error)}`;
          break;
        }
      }
    }
  };
  const loadSafe = async (kind, append = false) => {
    try { await loadPage(kind, append); }
    catch (error) { if (active()) { state.errors[kind] = errorText(error); if (kind === 'conversation') state.canSend = false; } }
  };
  const loadSettings = async () => {
    try {
      const result = await call('settings');
      if (typeof result.dmEnabled !== 'boolean') throw new Error('رد الخصوصية مب صالح.');
      state.settings = result; state.errors.settings = '';
    } catch (error) { if (active()) { state.settings = null; state.errors.settings = errorText(error); } }
  };
  const reload = async () => {
    await Promise.all([loadSettings(), loadSafe('friends')]);
    if (!active()) return;
    if (state.peer) await loadSafe('conversation');
    if (active()) await loadSafe('inbox');
  };
  const run = async operation => {
    if (!active() || state.busy) return;
    state.busy = true; state.error = ''; state.notice = ''; paint();
    try { await operation(); }
    catch (error) { if (active()) state.error = errorText(error); }
    finally { if (active()) { state.busy = false; paint(); } }
  };
  const click = event => {
    const target = event.target.closest?.('[data-lb-msg-action]');
    if (!target || !host.contains(target)) return;
    event.preventDefault();
    if (state.busy || !active()) return;
    const actionName = target.dataset.lbMsgAction;
    if (actionName === 'tab') {
      if (!['friends', 'inbox'].includes(target.dataset.tab)) return;
      state.tab = target.dataset.tab; state.query = ''; paint(); return;
    }
    if (actionName === 'refresh') { void run(reload); return; }
    if (actionName === 'pin') { void run(async () => { const r = await ctx.api('/api/perks/pin', 'POST', { pub: state.peer }); if (r && Array.isArray(r.pins)) state.pk.pins = r.pins; state.notice = r?.pinned ? 'انثبتت المحادثة فوق 📌' : 'انشال التثبيت'; }); return; }
    if (actionName === 'edit' || actionName === 'del') {
      const id = Number(target.dataset.id), m = state.conversation.list.find((x) => x.id === id); if (!m) return;
      if (actionName === 'del') { if (!confirm('تحذف الرسالة عند الطرفين؟')) return; void run(async () => { await call(`messages/${id}/delete`, 'POST', {}); await loadSafe('conversation'); }); return; }
      const text = prompt('عدّل رسالتك:', m.body); if (text === null || !text.trim() || text === m.body) return;
      void run(async () => { const body = await sealText(text); await call(`messages/${id}/edit`, 'POST', { text: body }); await loadSafe('conversation'); }); return;
    }
    if (actionName === 'more') {
      const kind = target.dataset.kind;
      if (!['friends', 'inbox', 'conversation'].includes(kind) || !state[kind].more || !positive(state[kind].nextBefore)) return;
      void run(async () => { await loadSafe(kind, true); if (active() && kind === 'conversation') await loadSafe('inbox'); }); return;
    }
    if (actionName === 'open') {
      const peer = target.dataset.peer;
      const item = [...state.friends.list, ...state.inbox.list].find(item => item.user?.pub === peer);
      if (!PUB.test(peer) || !item) return;
      void run(async () => {
        if (state.peer !== peer) { state.peer = peer; state.peerName = item.user.name || 'صديق'; state.conversation = pageEmpty(); state.loaded.conversation = false; state.errors.conversation = ''; state.canSend = false; state.draft = ''; state.draftKey = null; }
        await loadSafe('conversation');
        if (active()) await loadSafe('inbox');
      });
    }
  };
  const input = event => {
    if (!host.contains(event.target) || !active()) return;
    if (state.peer && event.target.closest?.('form') && event.target.matches?.('textarea,input[type=text],input:not([type])') && !event.target.hasAttribute('data-lb-msg-search') && event.target.value.trim()) { const now = Date.now(); if (now - (state.lastTyp || 0) > 2000) { state.lastTyp = now; ctx.api(BASE + 'typing', 'POST', { to: state.peer }).catch(() => {}); } }
    if (event.target.hasAttribute('data-lb-msg-search')) {
      state.query = event.target.value.slice(0, 200);
      const list = host.querySelector('[data-lb-msg-list]');
      if (list) list.innerHTML = listHTML();
    } else if (event.target.name === 'text') {
      if (state.draft !== event.target.value) state.draftKey = null;
      state.draft = event.target.value;
    }
  };
  const change = event => {
    if (!event.target.hasAttribute?.('data-lb-msg-setting') || !host.contains(event.target) || !state.settings) return;
    const enabled = event.target.checked;
    void run(async () => {
      const result = await call('settings', 'PATCH', { dmEnabled: enabled });
      if (typeof result.dmEnabled !== 'boolean') throw new Error('تعذّر تأكيد حفظ الخصوصية. حدّث الصفحة.');
      state.settings = result; state.notice = 'تم حفظ إعداد الخصوصية.';
      if (state.peer) await loadSafe('conversation');
    });
  };
  /* R88: نفس تشفير الإرسال للتعديل */
  const sealText = async (text) => {
    if (!E2E.supported()) return text;
    await E2E.register(ctx.api).catch(() => false);
    const keys = await ctx.api('/api/e2e/keys?peer=' + encodeURIComponent(state.peer), 'GET').catch(() => null);
    const me = await E2E.deviceKey().catch(() => null);
    if (!keys || !Array.isArray(keys.peer) || !keys.peer.length) return text;
    const all = [...keys.peer, ...(keys.mine || [])]; if (me && !all.some((d) => d.dev === me.dev)) all.push({ dev: me.dev, x: me.x, y: me.y });
    return E2E.seal(text, all);
  };
  const submit = event => {
    const form = event.target;
    if (form.dataset?.lbMsgForm !== 'message' || !host.contains(form)) return;
    event.preventDefault();
    if (state.busy || !active()) return;
    const text = form.elements?.text?.value ?? state.draft;
    if (state.draft !== text) state.draftKey = null;
    state.draft = text;
    void run(async () => {
      if (!PUB.test(state.peer) || !state.canSend) throw new Error('الإرسال مب متاح لهالمحادثة.');
      if (!text.trim() || text.length > 2000) throw new Error('اكتب رسالة، بحد أقصى 2000 حرف.');
      if (!state.draftKey) {
        if (!globalThis.crypto?.randomUUID) throw new Error('تعذّر إنشاء معرّف آمن للرسالة.');
        state.draftKey = globalThis.crypto.randomUUID();
      }
      // Preserve the same idempotency key and draft after an ambiguous send failure.
      /* R69ze: نشفر الرسالة قبل لا تطلع من الجهاز (نفس النص المشفر لو أعدنا المحاولة) */
      if (!state.sealed || state.sealed.key !== state.draftKey || state.sealed.text !== text) {
        let body = text;
        if (E2E.supported()) {
          await E2E.register(ctx.api).catch(() => false);
          const keys = await ctx.api('/api/e2e/keys?peer=' + encodeURIComponent(state.peer), 'GET').catch(() => null);
          const me = await E2E.deviceKey().catch(() => null);
          if (keys && Array.isArray(keys.peer) && keys.peer.length) {
            const all = [...keys.peer, ...(keys.mine || [])]; if (me && !all.some((d) => d.dev === me.dev)) all.push({ dev: me.dev, x: me.x, y: me.y });
            body = await E2E.seal(text, all);
          }
        }
        state.sealed = { key: state.draftKey, text, body };
      }
      const result = await call('messages', 'POST', { to: state.peer, text: state.sealed.body, key: state.draftKey });
      if (!positive(result.message?.id)) throw new Error('تعذّر تأكيد إرسال الرسالة. جرّب بنفس النص أو حدّث المحادثة.');
      state.notice = state.sealed?.body?.startsWith('e2e1.') ? 'انرسلت مشفّرة 🔒' : 'تم إرسال رسالتك. (ما انشفرت لأن صديقك ما فتح التطبيق من بعد التحديث)'; state.draft = ''; state.draftKey = null; state.sealed = null;
      await loadSafe('conversation');
      if (active()) await loadSafe('inbox');
    });
  };
  host.addEventListener('click', click); host.addEventListener('input', input);
  host.addEventListener('change', change); host.addEventListener('submit', submit);
  E2E.register(ctx.api).catch(() => {});
  /* R119: لحظي — رسالة جديدة / قراها / جاري الكتابة */
  let typT = 0;
  const onDM = (e) => { const m = e.detail || {}; if (!active()) return;
    if (m.t === 'dm:typing' && m.from === state.peer) { state.typing = m.on !== false; clearTimeout(typT); if (state.typing) typT = setTimeout(() => { state.typing = false; if (active()) paint(); }, 4500); paint(); return; }
    if ((m.from && m.from === state.peer) || (m.by && m.by === state.peer)) { if (m.t === 'dm:new') { state.typing = false; clearTimeout(typT); } loadSafe('conversation').then(() => { if (active()) paint(); }); }
    if (m.t === 'dm:new') loadSafe('inbox').then(() => { if (active()) paint(); }); };
  addEventListener('la3bak:dm', onDM);
  const ready = run(reload);
  return { ready, refresh: () => run(reload), destroy() {
    destroyed = true; removeEventListener('la3bak:dm', onDM);
    host.removeEventListener('click', click); host.removeEventListener('input', input);
    host.removeEventListener('change', change); host.removeEventListener('submit', submit);
    state.draft = ''; state.draftKey = null;
  } };
}
