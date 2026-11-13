/* R67: الرسائل الخاصة من داخل الغرفة — لوحة تطلع من تحت والغرفة شغالة وراها.
 * نفس خدمة /api/social-private (أصدقاء مقبولين فقط، نص فقط). ما نطلعك من الغرفة ولا نوقف الصوت. */
import * as E2E from '../e2e-r69.js?v=r69zj';
import { voiceNoteHTML, recordVoiceNote, MIC_ICON, isVoiceNote } from '../voice-note-r127.js?v=r127b';
const BASE = '/api/social-private/';
const PUB = /^[A-Za-z0-9_-]{16}$/;
const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const COLORS = ['#A63DFF', '#E0A526', '#2BB673', '#E0306E', '#3A8DFF', '#FF7A2F'];
const tint = s => COLORS[[...String(s)].reduce((a, ch) => a + ch.charCodeAt(0), 0) % COLORS.length];
const face = u => `<span class="dm67-face" style="--dm67-c:${tint(u?.pub || u?.name)}">${esc(Array.from(String(u?.name || 'ل'))[0])}</span>`;
const day = t => { const d = new Date(t); if (!Number.isFinite(d.getTime())) return ''; const now = new Date(); return d.toDateString() === now.toDateString() ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const X = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
const BACK = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
const SEND = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 3 18 9-18 9 4-9-4-9ZM7 12h14"/></svg>';

const TICK = (read) => `<span class="dm119-tick${read ? ' is-read' : ''}" aria-label="${read ? 'مقروءة' : 'وصلت'}">${read ? '<svg viewBox="0 0 22 14"><path d="M1 7.5 5 11.5 13 2.5M8.5 10l1.5 1.5L18 2.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '<svg viewBox="0 0 16 14"><path d="M2 7.5 6 11.5 14 2.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'}</span>`;
const CSS119 = `.dm119-tick{display:inline-flex;vertical-align:middle;margin-inline-start:4px;color:#ffffffa0}.dm119-tick svg{height:12px;width:auto}.dm119-tick.is-read{color:#4fc3ff}
.dm67-msg.is-mine p{position:relative}.dm67-msg .dm119-meta{display:block;font-size:10.5px;opacity:.8;margin-top:2px;text-align:end}
.dm119-typing{display:flex;align-items:center;gap:6px;padding:4px 14px 6px;color:#c8b4ef;font-size:12.5px;font-weight:700}.dm119-typing i{display:inline-flex;gap:3px}.dm119-typing i b{width:6px;height:6px;border-radius:50%;background:#c8b4ef;animation:dm119 1s infinite}.dm119-typing i b:nth-child(2){animation-delay:.15s}.dm119-typing i b:nth-child(3){animation-delay:.3s}
@keyframes dm119{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}
.dm67-head small.dm119-sub{display:block;font-size:11.5px;font-weight:700;color:#7ee2a8}`;
async function call(path, method = 'GET', body) {
  const res = await fetch(BASE + path, { method, credentials: 'same-origin', cache: 'no-store', headers: method === 'GET' ? {} : { 'Content-Type': 'application/json' }, body: method === 'GET' ? undefined : JSON.stringify(body ?? {}) });
  let data; try { data = await res.json(); } catch { throw Error('تعذّر قراءة رد الخادم.'); }
  if (!res.ok || data?.ok === false) throw Object.assign(Error(data?.error || 'تعذّر تنفيذ الطلب.'), { status: res.status });
  return data;
}

function setUnread(n) {
  n = Number.isSafeInteger(n) && n > 0 ? n : 0;
  globalThis.__LA3_DM_UNREAD__ = n;
  for (const el of document.querySelectorAll('[data-so-dm-unread]')) { el.textContent = n > 99 ? '99+' : String(n); el.hidden = n === 0; }
}

/* عداد غير المقروء على زر الرسائل في الغرفة — يشتغل بس لما تكون في غرفة */
let watching = null;
export function watchUnread() {
  if (watching) return;
  const tick = async () => {
    if (document.hidden || !document.querySelector('[data-so-room-dock]')) return;
    try { const r = await call('inbox'); setUnread(r.unread); } catch { /* صامت */ }
  };
  tick(); watching = setInterval(tick, 20000);
}

let open = null;
export function openRoomDM({ peer = '' } = {}) {
  if (open) { open.focus(); return open; }
  const root = document.createElement('div');
  root.className = 'dm67'; root.setAttribute('dir', 'rtl');
  root.innerHTML = '<button type="button" class="dm67-scrim" data-dm="close" aria-label="إغلاق"></button><section class="dm67-sheet" role="dialog" aria-modal="true" aria-label="الرسائل الخاصة"></section>';
  document.body.append(root);
  const sheet = root.querySelector('.dm67-sheet');
  const st = { view: 'list', inbox: [], friends: [], loaded: false, error: '', peer: '', peerName: '', msgs: [], canSend: false, busy: false, key: null };
  let timer = null, alive = true;

  const listHTML = () => {
    const seen = new Set(st.inbox.map(r => r.user.pub));
    const rows = st.inbox.map(r => `<button type="button" class="dm67-row" data-dm="open" data-peer="${esc(r.user.pub)}" data-name="${esc(r.user.name)}">${face(r.user)}<span class="dm67-mid"><b>${esc(r.user.name || 'لاعب')}</b><small>${r.last?.mine ? 'أنت: ' : ''}${esc(isVoiceNote(r.last?.body) ? '🎤 رسالة صوتية' : (r.last?.body || ''))}</small></span><span class="dm67-end"><time>${esc(day(r.last?.at))}</time>${r.unread > 0 ? `<i class="dm67-badge">${r.unread > 99 ? '99+' : r.unread}</i>` : ''}</span></button>`).join('');
    const fr = st.friends.filter(f => !seen.has(f.user.pub));
    const friends = fr.length ? `<h3 class="dm67-sec">الأصدقاء</h3>${fr.map(f => `<button type="button" class="dm67-row is-friend" data-dm="open" data-peer="${esc(f.user.pub)}" data-name="${esc(f.user.name)}">${face(f.user)}<span class="dm67-mid"><b>${esc(f.user.name || 'لاعب')}</b><small>ابدأ السوالف</small></span></button>`).join('')}` : '';
    const body = !st.loaded ? '<p class="dm67-note">جاري التحميل…</p>' : (rows || friends) ? rows + friends : '<p class="dm67-note">ما عندك محادثات للحين. الرسائل الخاصة بين الأصدقاء المقبولين.</p>';
    return `<header class="dm67-head"><span></span><h2>دردشة</h2><button type="button" class="dm67-icon" data-dm="close" aria-label="إغلاق">${X}</button></header>${st.error ? `<p class="dm67-err" role="alert">${esc(st.error)}</p>` : ''}<div class="dm67-scroll">${body}</div>`;
  };
  const chatHTML = () => {
    const msgs = [...st.msgs].reverse().map(m => `<div class="dm67-msg${m.mine ? ' is-mine' : ''}">${m.mine ? '' : face({ pub: st.peer, name: st.peerName })}<p dir="auto">${voiceNoteHTML(m.body) || esc(m.body)}${m.mine ? `<span class="dm119-meta">${esc(day(m.at))}${TICK(m.read === true)}</span>` : ''}</p></div>`).join('');
    return `<header class="dm67-head"><button type="button" class="dm67-icon" data-dm="back" aria-label="رجوع">${BACK}</button><h2>${esc(st.peerName || 'محادثة')}${st.typing ? '<small class="dm119-sub">جاري الكتابة…</small>' : ''}</h2><button type="button" class="dm67-icon" data-dm="close" aria-label="إغلاق">${X}</button></header>${st.error ? `<p class="dm67-err" role="alert">${esc(st.error)}</p>` : ''}<div class="dm67-scroll dm67-thread" data-dm-thread>${msgs || '<p class="dm67-note">قول هلا 👋</p>'}</div>${st.typing ? `<div class="dm119-typing">${esc(st.peerName || '')} يكتب <i><b></b><b></b><b></b></i></div>` : ''}<form class="dm67-form" data-dm-form><input name="text" maxlength="2000" autocomplete="off" placeholder="${st.canSend ? 'قل شيئًا…' : 'الرسائل موقوفة لهالمحادثة'}" ${st.canSend ? '' : 'disabled'} dir="auto" enterkeyhint="send"><button type="button" class="vn127-mic" data-dm="voice" aria-label="رسالة صوتية" ${st.canSend ? '' : 'disabled'}>${MIC_ICON}</button><button type="submit" class="dm67-send" aria-label="إرسال" ${st.canSend ? '' : 'disabled'}>${SEND}</button></form>`;
  };
  const paint = (keepDraft = true) => {
    if (!alive) return;
    const draft = keepDraft ? sheet.querySelector('input[name=text]')?.value || '' : '';
    const hadFocus = document.activeElement?.name === 'text';
    sheet.dataset.view = st.view;
    sheet.innerHTML = st.view === 'chat' ? chatHTML() : listHTML();
    const input = sheet.querySelector('input[name=text]');
    if (input) { input.value = draft; if (hadFocus) input.focus(); }
    const th = sheet.querySelector('[data-dm-thread]'); if (th) th.scrollTop = th.scrollHeight;
  };
  const loadList = async () => {
    try {
      const [inbox, friends] = await Promise.all([call('inbox'), call('friends').catch(() => ({ list: [] }))]);
      for (const it of inbox.list || []) if (it.last && E2E.isSealed(it.last.body)) { try { const o = await E2E.open(it.last.body); it.last.body = o.locked ? '🔒 رسالة مشفّرة' : o.text; } catch { it.last.body = '🔒 رسالة مشفّرة'; } }
      st.inbox = (inbox.list || []).filter(r => PUB.test(r?.user?.pub)); st.friends = (friends.list || []).filter(r => PUB.test(r?.user?.pub));
      st.loaded = true; st.error = ''; setUnread(inbox.unread);
    } catch (e) { st.loaded = true; st.error = e.status === 401 ? 'سجّل دخولك عشان تشوف رسائلك.' : e.message; }
  };
  const loadChat = async () => {
    const r = await call(`messages?peer=${encodeURIComponent(st.peer)}`);
    if (!alive || st.view !== 'chat') return;
    const before = st.msgs.length ? st.msgs[0].id : 0;
    const list = r.list || []; for (const m of list) if (E2E.isSealed(m.body)) { try { const o = await E2E.open(m.body); m.body = o.locked ? '🔒 رسالة مشفّرة' : o.text; } catch { m.body = '🔒 رسالة مشفّرة'; } }
    st.msgs = list; st.canSend = r.canSend === true; st.peerName = r.user?.name || st.peerName; st.error = '';
    if (!st.msgs.length || st.msgs[0].id !== before || !sheet.querySelector('[data-dm-thread]')) paint();
    for (const m of st.msgs.filter(m => !m.mine && !m.read)) { try { await call(`messages/${m.id}/read`, 'POST', {}); m.read = true; } catch { break; } }
  };
  const poll = () => { clearInterval(timer); timer = setInterval(() => { if (document.hidden || !alive) return; (st.view === 'chat' ? loadChat() : loadList().then(() => paint())).catch(() => {}); }, st.view === 'chat' ? 4000 : 15000); };
  const openChat = async (pub, name) => {
    if (!PUB.test(pub)) return;
    st.view = 'chat'; st.peer = pub; st.peerName = name || 'لاعب'; st.msgs = []; st.canSend = false; st.key = null; st.error = ''; paint(false);
    try { await loadChat(); } catch (e) { st.error = e.message; paint(); }
    poll();
  };
  let close = () => {
    if (!alive) return; alive = false; clearInterval(timer);
    root.classList.add('is-out'); setTimeout(() => root.remove(), 200);
    document.removeEventListener('keydown', onKey); open = null;
  };
  const onKey = e => { if (e.key === 'Escape') close(); };
  root.addEventListener('click', async e => {
    const t = e.target.closest('[data-dm]'); if (!t) return;
    const a = t.dataset.dm;
    if (a === 'close') return close();
    if (a === 'back') { st.view = 'list'; st.error = ''; paint(false); await loadList(); paint(); poll(); return; }
    if (a === 'open') return openChat(t.dataset.peer, t.dataset.name);
    if (a === 'voice') { if (!st.canSend || st.busy) return; const tok = await recordVoiceNote(); if (!tok || !alive) return; st.busy = true; try { await call('messages', 'POST', { to: st.peer, text: tok, key: crypto.randomUUID() }); await loadChat(); paint(); } catch (e2) { st.error = e2.message; paint(); } finally { st.busy = false; } return; }
  });
  root.addEventListener('submit', async e => {
    e.preventDefault(); const input = sheet.querySelector('input[name=text]'); const text = input?.value.trim() || '';
    if (!text || st.busy || !st.canSend) return;
    st.busy = true; st.key ??= crypto.randomUUID();
    try {
      await call('messages', 'POST', { to: st.peer, text, key: st.key });
      st.key = null; input.value = ''; await loadChat(); paint();
      sheet.querySelector('input[name=text]')?.focus();
    } catch (e2) { st.error = e2.message; paint(); }
    finally { st.busy = false; }
  });
  /* R119: لحظي — رسالة جديدة، قرأها، جاري الكتابة */
  if (!document.querySelector('style[data-dm119]')) { const st2 = document.createElement('style'); st2.dataset.dm119 = '1'; st2.textContent = CSS119; document.head.append(st2); }
  let typT = 0, lastTyp = 0;
  const onDM = (e) => { const m = e.detail || {}; if (!alive) return;
    if (st.view === 'chat' && m.from === st.peer && m.t === 'dm:typing') { st.typing = m.on !== false; clearTimeout(typT); if (st.typing) typT = setTimeout(() => { st.typing = false; paint(); }, 4500); paint(); return; }
    if (st.view === 'chat' && (m.from === st.peer || m.by === st.peer)) { if (m.t === 'dm:new') { st.typing = false; clearTimeout(typT); } loadChat().then(() => paint()).catch(() => {}); return; }
    if (st.view === 'list' && m.t === 'dm:new') loadList().then(() => paint()).catch(() => {}); };
  addEventListener('la3bak:dm', onDM);
  root.addEventListener('input', (e) => { if (e.target?.name !== 'text' || st.view !== 'chat' || !st.canSend) return; const now = Date.now(); if (now - lastTyp < 2000 || !e.target.value.trim()) return; lastTyp = now; call('typing', 'POST', { to: st.peer }).catch(() => {}); });
  const close0 = close; close = () => { removeEventListener('la3bak:dm', onDM); close0(); };
  document.addEventListener('keydown', onKey);
  requestAnimationFrame(() => root.classList.add('is-in'));
  paint();
  if (peer) openChat(peer, ''); else loadList().then(() => { paint(); poll(); });
  open = { close, focus: () => sheet.focus?.() };
  return open;
}
