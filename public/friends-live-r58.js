/* R58f: شريط «أصدقائي الحين» مثل انستغرام: دوائر صور الأصدقاء، واللي داخل غرفة يطلع عليه إطار متحرك وشارة «في غرفة».
 * الضغط عليه يدخلك نفس الغرفة مباشرة (انضمام ثم فتح الغرفة). اللي مو في غرفة يفتح ملفه.
 * يشتغل على أي مكان فيه [data-friends-live] (الرئيسية وصفحة الغرف). البيانات من الخادم فقط. */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let cache = null, at = 0, inflight = null;
const TTL = 20000;
async function load(force = false) {
  if (!force && cache && Date.now() - at < TTL) return cache;
  if (inflight) return inflight;
  inflight = fetch('/api/friends/live', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : { list: [] })).catch(() => ({ list: [] })).then((j) => { cache = Array.isArray(j?.list) ? j.list : []; at = Date.now(); inflight = null; return cache; });
  return inflight;
}
const initial = (n) => esc([...String(n || '؟').trim()][0] || '؟');
function html(list) {
  if (!list.length) return '';
  const live = list.filter((f) => f.room).length;
  return `<section class="fl-strip" dir="rtl" aria-label="أصدقائي الحين"><header class="fl-head"><b>أصدقائي</b>${live ? `<span class="fl-live-count"><i></i>${live} في غرف الحين</span>` : ''}</header><div class="fl-row">${list.map((f) => {
    const pic = f.avatar ? `<img src="${esc(f.avatar)}" alt="" loading="lazy" decoding="async">` : `<span class="fl-initial">${initial(f.name)}</span>`;
    return f.room
      ? `<button type="button" class="fl-item is-live" data-fl-room="${esc(f.room.id)}" data-fl-locked="${f.room.locked ? 1 : 0}" aria-label="${esc(f.name)} في غرفة ${esc(f.room.name)} — ادخل معه"><span class="fl-ring"><span class="fl-pic">${pic}</span></span><span class="fl-badge">في غرفة</span><b>${esc(f.name)}</b><small>${esc(f.room.name)}</small></button>`
      : `<a class="fl-item" href="#/u/${esc(f.id)}" aria-label="ملف ${esc(f.name)}"><span class="fl-ring"><span class="fl-pic">${pic}</span></span><b>${esc(f.name)}</b><small>&nbsp;</small></a>`;
  }).join('')}</div></section>`;
}
function hydrate(el) {
  if (el.dataset.flDone === '1') return; el.dataset.flDone = '1';
  if (cache) el.innerHTML = html(cache);
  load().then((list) => { if (el.isConnected) el.innerHTML = html(list); });
}
async function joinAndGo(roomId, locked) {
  const nav = globalThis.__LA3BAK_NAV__ || location; const url = '#/social-room/' + encodeURIComponent(roomId);
  if (!locked) {
    try {
      const key = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()) + Math.random().toString(16).slice(2);
      await fetch('/api/social/command', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: 'room:join', roomId, key }) });
    } catch { /* يفتح الغرفة وفيها زر الانضمام */ }
  }
  nav.hash = url;
}
function scan(root = document) { root.querySelectorAll?.('[data-friends-live]').forEach(hydrate); }
if (typeof document !== 'undefined' && !globalThis.__LA3BAK_FL__) {
  globalThis.__LA3BAK_FL__ = true;
  new MutationObserver((muts) => { for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1) { if (n.matches?.('[data-friends-live]')) hydrate(n); scan(n); } }).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', (e) => { const b = e.target.closest?.('[data-fl-room]'); if (!b) return; e.preventDefault(); e.stopPropagation(); b.disabled = true; joinAndGo(b.dataset.flRoom, b.dataset.flLocked === '1').finally(() => { b.disabled = false; }); }, true);
  addEventListener('hashchange', () => { at = 0; });
  // R58f: تنبيه «صاحبك دخل الموقع» و«صاحبك دخل غرفة فلان» (من الخادم عبر الاتصال المباشر)
  let stack = null;
  addEventListener('la3bak:friend', (e) => {
    const m = e.detail || {}; at = 0; if (!m.name) return;
    if (!stack || !stack.isConnected) { stack = document.createElement('div'); stack.className = 'fl-toasts'; stack.setAttribute('aria-live', 'polite'); document.body.appendChild(stack); }
    const t = document.createElement('div'); t.className = 'fl-toast' + (m.t === 'friend:room' ? ' is-room' : ''); t.setAttribute('role', 'status');
    t.innerHTML = m.t === 'friend:room' && m.room
      ? `<span class="fl-toast-ic">🎙️</span><span class="fl-toast-tx"><b>${esc(m.name)}</b> دخل غرفة <b>${esc(m.room.name)}</b></span><button type="button" class="fl-toast-go" data-fl-room="${esc(m.room.id)}" data-fl-locked="${m.room.locked ? 1 : 0}">ادخل معه</button>`
      : `<span class="fl-toast-ic">🟢</span><span class="fl-toast-tx">صاحبك <b>${esc(m.name)}</b> دخل الموقع</span>`;
    stack.prepend(t); while (stack.children.length > 3) stack.lastChild.remove();
    setTimeout(() => { t.classList.add('is-out'); setTimeout(() => t.remove(), 400); }, m.t === 'friend:room' ? 7000 : 4500);
    document.querySelectorAll('[data-friends-live]').forEach((el) => { load(true).then((list) => { if (el.isConnected) el.innerHTML = html(list); }); });
  });
  setInterval(() => { if (document.querySelector('[data-friends-live]') && !document.hidden) load(true).then((list) => document.querySelectorAll('[data-friends-live]').forEach((el) => { el.innerHTML = html(list); })); }, 30000);
  scan();
}
export { load as loadFriendsLive };
