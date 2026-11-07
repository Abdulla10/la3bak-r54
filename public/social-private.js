/* Additive friends/DM view. api(path,{method,body}) must use authenticated same-origin JSON + existing CSRF protection.
 * The caller owns routing. Public Community HMAC IDs only; no new style/art or attachment handling. */
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const PUB = /^[A-Za-z0-9_-]{16}$/;
const BASE = '/api/social-private/';
const emptyPage = () => ({ list: [], more: false, nextBefore: null });
const stamp = at => Number.isFinite(Number(at)) ? new Date(Number(at)).toLocaleString('ar-EG') : '';
const userName = user => esc(user?.name || 'لاعب');
const mergePage = (old, next) => ({ ...next, list: [...old.list, ...next.list.filter(item => !old.list.some(x => x.id === item.id))] });
const publicUser = user => !!user && PUB.test(user.pub);

/** Returns { ready: Promise, refresh(), setMode('friends'|'messages'), destroy() }. */
export function socialPrivateView(root, { api, mode = 'friends', me } = {}) {
  if (!root || typeof root.addEventListener !== 'function' || typeof api !== 'function') throw new TypeError('socialPrivateView requires root and api');
  const state = { mode: mode === 'messages' ? 'messages' : 'friends', loading: false, busy: false, error: '', dmEnabled: true,
    friends: emptyPage(), incoming: emptyPage(), outgoing: emptyPage(), inbox: emptyPage(), conversation: emptyPage(), peer: '', canSend: false, peerName: '', friendInput: '', searchResults: [], draft: '', draftKey: null };
  let destroyed = false, generation = 0;
  const key = () => { if (!globalThis.crypto?.randomUUID) throw new Error('تعذّر إنشاء معرّف آمن للطلب.'); return globalThis.crypto.randomUUID(); };
  const call = async (path, options) => {
    const result = await api(BASE + path, options);
    if (!result || result.ok === false) throw new Error(result?.error || 'تعذّر إكمال الطلب. جرّب مرة ثانية.');
    return result;
  };
  const disabled = () => state.loading || state.busy ? 'disabled aria-busy="true"' : '';
  const button = (action, label, extra = '', ghost = true) => `<button type="button" class="btn ${ghost ? 'ghost' : ''} sm" data-sp-action="${action}" ${extra} ${disabled()}>${label}</button>`;
  const moreButton = (kind, page) => page.more ? button('more', 'عرض المزيد', `data-kind="${kind}"`) : '';
  const usersList = (page, kind) => page.list.length ? `<ul class="cm-ul">${page.list.map(item => {
    const u = item.user;
    if (!publicUser(u)) return '';
    const profile = `<a class="cm-name" href="#/u/${esc(u.pub)}">${userName(u)}</a>`;
    const attrs = `data-id="${Number(item.id)}" data-pub="${esc(u.pub)}"`;
    const actions = kind === 'incoming' ? button('accept', 'قبول', attrs, false) + button('reject', 'رفض', attrs)
      : kind === 'outgoing' ? button('remove', 'إلغاء الطلب', attrs)
      : button('open', 'رسالة', attrs) + button('remove', 'إزالة الصداقة', attrs);
    return `<li><div class="cm-row">${profile}${actions}</div></li>`;
  }).join('')}</ul>` : '<p class="muted">القائمة فارغة.</p>';
  const render = () => {
    if (destroyed) return;
    if (!me) { root.innerHTML = '<section class="card empty-state"><p>سجّل دخولك لعرض الأصدقاء والرسائل الخاصة.</p><a class="btn" href="#/account">تسجيل الدخول</a></section>'; return; }
    const nav = `<div class="chips" role="group" aria-label="الأصدقاء والرسائل">${button('friends', 'الأصدقاء')}${button('messages', 'الرسائل')}${button('refresh', 'تحديث')}</div>`;
    const privacy = `<section class="card"><h2>خصوصية الرسائل</h2><p class="cm-note">الرسائل بين الأصدقاء المقبولين فقط. المتابعة ليست صداقة؛ طلب الصداقة يحتاج موافقة المستلم.</p><label><input type="checkbox" data-sp-setting="dmEnabled" ${state.dmEnabled ? 'checked' : ''} ${disabled()}> السماح بالرسائل الخاصة بين أصدقائي المقبولين</label><p class="muted">إيقافها يمنع الرسائل الجديدة بالاتجاهين ولا يحذف السجل.</p></section>`;
    let content;
    if (state.mode === 'friends') {
      content = `<form class="card cm-compose" data-sp-form="friend"><label>اسم اللاعب أو رقم اللاعب الأصلي أو المميز<input name="to" maxlength="30" autocomplete="off" value="${esc(state.friendInput)}" required ${disabled()}></label><div class="cm-row"><button class="btn sm" type="submit" ${disabled()}>بحث عن اللاعب</button></div></form>${state.searchResults.length ? `<section class="card"><h2>نتائج البحث</h2><ul class="cm-ul">${state.searchResults.map(u => `<li><span>${userName(u)} · ${esc(u.playerId || "رقم قديم")}</span>${button("request", "إرسال طلب صداقة", `data-pub="${esc(u.pub)}"`, false)}</li>`).join("")}</ul></section>` : ""}
        <section class="card"><h2>طلبات واردة</h2>${usersList(state.incoming, 'incoming')}${moreButton('incoming', state.incoming)}</section>
        <section class="card"><h2>طلبات مرسلة</h2>${usersList(state.outgoing, 'outgoing')}${moreButton('outgoing', state.outgoing)}</section>
        <section class="card"><h2>الأصدقاء (${esc(state.friends.friendsCount ?? 0)})</h2>${usersList(state.friends, 'friends')}${moreButton('friends', state.friends)}</section>`;
    } else {
      const inbox = state.inbox.list.length ? `<ul class="cm-ul">${state.inbox.list.map(item => publicUser(item.user) ? `<li><div class="cm-row">${button('open', userName(item.user), `data-pub="${esc(item.user.pub)}"`)}<small>${esc(item.unread ?? 0)} غير مقروءة</small></div><p class="cm-text">${esc(item.last?.body)}</p><small>${esc(stamp(item.last?.at))}</small></li>` : '').join('')}</ul>` : '<p class="muted">لا توجد محادثات بعد. اختر صديقًا لبدء رسالة.</p>';
      const conversation = state.peer ? `<section class="card"><h2>المحادثة مع ${esc(state.peerName || 'صديق')}</h2>${moreButton('conversation', state.conversation)}<div class="cm-list" aria-label="رسائل المحادثة">${[...state.conversation.list].reverse().map(m => `<article class="cm-c"><div class="cm-cb"><b>${m.mine ? 'أنت' : esc(state.peerName || 'صديق')}</b><p class="cm-text">${esc(m.body)}</p><small>${esc(stamp(m.at))}${m.mine ? (m.read ? ' · مقروءة' : ' · مرسلة') : ''}</small></div></article>`).join('') || '<p class="muted">لا توجد رسائل بعد.</p>'}</div></section>
        <form class="card cm-cform" data-sp-form="message"><label>رسالتك<textarea name="text" maxlength="2000" rows="3" required ${!state.canSend ? 'disabled' : disabled()}>${esc(state.draft)}</textarea></label><div class="cm-row"><button class="btn sm" type="submit" ${!state.canSend ? 'disabled' : disabled()}>إرسال</button></div>${state.canSend ? '' : '<p class="muted">الرسائل الجديدة موقوفة حسب إعداد الخصوصية.</p>'}</form>` : '';
      content = `<section class="card"><h2>صندوق الرسائل (${esc(state.inbox.unread ?? 0)} غير مقروءة)</h2>${inbox}${moreButton('inbox', state.inbox)}</section><section class="card"><h2>بدء محادثة مع صديق</h2>${usersList(state.friends, 'friends')}${moreButton('friends', state.friends)}</section>${conversation}`;
    }
    root.innerHTML = `<div class="stack cm-page" dir="rtl"><header class="cm-top"><h1 class="section-title">${state.mode === 'friends' ? 'الأصدقاء' : 'الرسائل الخاصة'}</h1></header>${nav}${state.error ? `<p class="cm-err" role="alert">${esc(state.error)}</p>` : ''}${state.loading ? '<p role="status">جاري التحميل…</p>' : ''}${privacy}${content}</div>`;
  };
  const endpoint = kind => kind === 'incoming' || kind === 'outgoing' ? `friend-requests?direction=${kind}` : kind === 'conversation' ? `messages?peer=${encodeURIComponent(state.peer)}` : kind;
  const pageLoad = async (kind, more = false) => {
    const query = endpoint(kind), cursor = more ? state[kind].nextBefore : null;
    const next = await call(query + (cursor ? `${query.includes('?') ? '&' : '?'}before=${encodeURIComponent(cursor)}` : ''));
    if (!Array.isArray(next.list)) throw new Error('استجابة غير صالحة من الخادم.');
    state[kind] = more ? mergePage(state[kind], next) : next;
    if (kind === 'conversation') {
      state.peerName = next.user?.name || 'صديق'; state.canSend = next.canSend === true;
      // Only messages actually loaded for this authenticated recipient are marked read.
      for (const message of next.list.filter(m => !m.mine && !m.read)) {
        await call(`messages/${encodeURIComponent(message.id)}/read`, { method: 'POST', body: {} });
        message.read = true;
      }
    }
  };
  const refresh = async () => {
    if (destroyed || !me) { render(); return; }
    const version = ++generation; state.loading = true; state.error = ''; render();
    try {
      const settings = await call('settings');
      if (destroyed || version !== generation) return;
      state.dmEnabled = settings.dmEnabled === true;
      await pageLoad('friends');
      if (state.mode === 'friends') { await pageLoad('incoming'); await pageLoad('outgoing'); }
      else { if (state.peer) await pageLoad('conversation'); await pageLoad('inbox'); }
    } catch (e) { if (!destroyed && version === generation) state.error = e.message || 'تعذّر التحميل.'; }
    finally { if (!destroyed && version === generation) { state.loading = false; render(); } }
  };
  const run = async operation => {
    if (destroyed || state.busy || state.loading) return;
    state.busy = true; state.error = ''; render();
    try { await operation(); }
    catch (e) { state.error = e.message || 'تعذّر إكمال الطلب.'; }
    finally { state.busy = false; render(); }
  };
  const setMode = async next => { if (state.busy || state.loading || destroyed) return; state.mode = next === 'messages' ? 'messages' : 'friends'; await refresh(); };
  const click = event => {
    const target = event.target.closest?.('[data-sp-action]'); if (!target || !root.contains(target)) return;
    event.preventDefault(); const { spAction: action, pub, id, kind } = target.dataset;
    if (state.busy || state.loading) return;
    if (action === 'refresh') { void refresh(); return; }
    if (action === 'friends' || action === 'messages') { void setMode(action); return; }
    void run(async () => {
      if (action === 'open') {
        if (!PUB.test(pub)) throw new Error('معرّف اللاعب غير صالح.');
        if (state.peer !== pub) { state.peer = pub; state.draft = ''; state.draftKey = null; state.conversation = emptyPage(); }
        state.mode = 'messages'; await refresh();
      } else if (action === 'request') {
        if (!PUB.test(pub)) throw new Error('الحساب غير صالح.');
        await call('friend-requests', { method: 'POST', body: { to: pub, key: key() } });
        state.searchResults = []; state.friendInput = ''; await refresh();
      } else if (action === 'accept' || action === 'reject') {
        await call(`friend-requests/${encodeURIComponent(id)}/${action}`, { method: 'POST', body: { key: key() } }); await refresh();
      } else if (action === 'remove') {
        if (!PUB.test(pub)) throw new Error('معرّف اللاعب غير صالح.');
        await call(`friends/${encodeURIComponent(pub)}`, { method: 'DELETE' });
        if (state.peer === pub) { state.peer = ''; state.conversation = emptyPage(); state.draft = ''; state.draftKey = null; }
        await refresh();
      } else if (action === 'more' && ['friends', 'incoming', 'outgoing', 'inbox', 'conversation'].includes(kind)) await pageLoad(kind, true);
    });
  };
  const input = event => {
    if (event.target.name === 'text') { if (state.draft !== event.target.value) state.draftKey = null; state.draft = event.target.value; }
    if (event.target.name === 'to') state.friendInput = event.target.value;
  };
  const change = event => {
    if (event.target.dataset.spSetting !== 'dmEnabled') return;
    const enabled = event.target.checked;
    void run(async () => { await call('settings', { method: 'PATCH', body: { dmEnabled: enabled } }); await refresh(); });
  };
  const submit = event => {
    const form = event.target; if (!form.dataset?.spForm || !root.contains(form)) return;
    event.preventDefault();
    // Capture before re-rendering/disabling the form; keep same DM key after ambiguous failure.
    const text = form.elements?.text?.value ?? state.draft, to = form.elements?.to?.value ?? state.friendInput;
    if (form.dataset.spForm === 'message') state.draft = text;
    if (form.dataset.spForm === 'friend') state.friendInput = to;
    void run(async () => {
      if (form.dataset.spForm === 'friend') {
        const query = to.trim();
        if (query.length < 2 || query.length > 30) throw new Error('اكتب اسم اللاعب أو رقمه من 8 أرقام.');
        if (PUB.test(query)) {
          await call('friend-requests', { method: 'POST', body: { to: query, key: key() } }); state.friendInput = ''; await refresh();
        } else {
          const result = await call('search?q=' + encodeURIComponent(query));
          state.searchResults = (result.list || []).filter(publicUser);
          if (!state.searchResults.length) throw new Error('ما لقينا حساب مطابق.');
        }
      } else if (form.dataset.spForm === 'message') {
        if (!PUB.test(state.peer) || !state.canSend) throw new Error('المحادثة غير متاحة للإرسال.');
        if (!text.trim() || text.length > 2000) throw new Error('اكتب رسالة حتى 2000 حرف.');
        state.draftKey ??= key();
        await call('messages', { method: 'POST', body: { to: state.peer, text, key: state.draftKey } });
        state.draft = ''; state.draftKey = null; await refresh();
      }
    });
  };
  root.addEventListener('click', click); root.addEventListener('submit', submit); root.addEventListener('input', input); root.addEventListener('change', change);
  render();
  const ready = refresh();
  return { ready, refresh, setMode, destroy() { destroyed = true; generation++; root.removeEventListener('click', click); root.removeEventListener('submit', submit); root.removeEventListener('input', input); root.removeEventListener('change', change); state.draft = ''; state.draftKey = null; } };
}
