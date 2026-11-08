/* محادثة الغرفة: ردود سريعة (إيموجي وعبارات جاهزة فقط، بدون كتابة حرة، آمنة للأطفال) + رسائل الهدايا المؤكدة من الخادم + سجل المحادثة. */
import { chatCardHTML } from './gifts.js?v=r58o';
export const REACTIONS = ['👍', '😂', '😮', '😡', '🔥', '👏', '🤔', '❤️', '😎', '🙏', 'يلا!', 'حظ سعيد', 'أحسنت', 'استعجل ⏳'];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let open = false;
let code = '';
let wrap = null;

export const isOpen = () => open;
export function toggle() { open = !open; paint(); }
export function close() { open = false; paint(); }

function ensure() {
  if (wrap) return wrap;
  wrap = document.createElement('div');
  wrap.id = 'reactDock';
  wrap.className = 'react-dock';
  document.body.appendChild(wrap);
  const feed = document.createElement('div');
  feed.id = 'reactFeed';
  feed.className = 'react-feed';
  feed.setAttribute('aria-live', 'polite');
  document.body.appendChild(feed);
  return wrap;
}

function paint() {
  if (!wrap) return;
  wrap.hidden = !code;
  wrap.innerHTML = code
    ? `<button type="button" class="react-toggle" data-act="react-toggle" aria-expanded="${open}" aria-label="ردود سريعة">💬</button>${open ? `<div class="react-bar" role="group" aria-label="ردود سريعة">${REACTIONS.map((r) => `<button type="button" data-act="react" data-e="${esc(r)}">${esc(r)}</button>`).join('')}<button type="button" class="rb-wide" data-act="room-gift">🎁 أرسل هدية</button><button type="button" class="rb-wide" data-act="chat-log" aria-expanded="${logOpen}">📜 المحادثة</button></div>` : ''}${logOpen ? logHTML() : ''}`
    : '';
}

/* سجل المحادثة (آخر 40 من الخادم + المباشر) */
let LOG = []; let logOpen = false; let me = ''; let loader = null;
let logGeneration = 0, logLoading = false, logError = '';
export function setLoader(fn) { loader = fn; }
export function toggleLog() { logOpen = !logOpen; open = false; paint(); }
function entryHTML(e) {
  if (e.k === 'gift') return `<li class="cl-gift">${chatCardHTML(e, me)}</li>`;
  return `<li><b>${esc(e.from?.id === me ? 'أنت' : e.from?.name)}</b><span>${esc(e.text)}</span></li>`;
}
function logHTML() {
  return `<section class="chat-log" role="log" aria-label="محادثة الغرفة"><header><b>📜 محادثة الغرفة</b><button type="button" class="dm-x" data-act="chat-log" aria-label="إغلاق">✕</button></header>${logLoading ? '<p class="muted" role="status">جاري تحميل السجل…</p>' : ''}${logError ? `<p class="cm-err" role="alert">${esc(logError)} الرسائل المباشرة محفوظة. جرّب تدخل الغرفة مرة ثانية لتحديث السجل.</p>` : ''}${LOG.length ? `<ul>${LOG.map(entryHTML).join('')}</ul>` : !logLoading && !logError ? '<p class="muted">ما فيه رسائل بعد. الردود السريعة والهدايا تظهر هنا.</p>' : ''}</section>`;
}
const eventKey = (e) => e.tx ? 'gift:' + e.tx : e.eventId ? 'event:' + e.eventId : null;
function mergeLog(history, live) {
  const seen = new Set();
  return [...history, ...live].filter((e) => {
    if (!e || !['gift', 'react'].includes(e.k)) return false;
    const key = eventKey(e); if (key && seen.has(key)) return false;
    if (key) seen.add(key); return true;
  }).sort((a, b) => (Number(a.ts) || 0) - (Number(b.ts) || 0)).slice(-40);
}
function addLog(e) { const key = eventKey(e); if (key && LOG.some((x) => eventKey(x) === key)) return false; LOG = mergeLog([], [...LOG, e]); if (logOpen) paint(); return true; }
/** رسالة هدية مؤكدة من الخادم: تنضاف للسجل وتطلع بطاقة مميزة بالشاشة */
export function addGift(ev) {
  ensure();
  if (!addLog(ev)) return;
  const feed = document.getElementById('reactFeed');
  const el = document.createElement('div'); el.className = 'react-pop gift'; el.innerHTML = chatCardHTML(ev, me);
  feed.appendChild(el);
  while (feed.children.length > 3) feed.firstChild.remove();
  setTimeout(() => el.remove(), 6500);
}

/** يعرض الزر فقط داخل غرفة فيها لاعبان حقيقيان فأكثر */
export function sync(room, meId = '') {
  ensure(); me = meId;
  const humans = room ? room.players.filter((p) => !p.bot && !p.left).length : 0;
  const next = room && humans >= 2 ? room.code : '';
  if (next !== code) {
    code = next; open = false; logOpen = false; LOG = [];
    const generation = ++logGeneration; logLoading = !!code && !!loader; logError = '';
    const load = loader;
    if (code && load) Promise.resolve().then(() => load(next)).then((r) => {
      if (generation !== logGeneration || code !== next) return;
      const list = Array.isArray(r) ? r : r?.ok ? r.log : null;
      if (!Array.isArray(list)) throw new Error('chat-load');
      LOG = mergeLog(list, LOG); logLoading = false; if (logOpen) paint();
    }).catch(() => {
      if (generation !== logGeneration || code !== next) return;
      logLoading = false; logError = 'تعذّر تحميل سجل المحادثة.'; if (logOpen) paint();
    });
    paint();
  }
}
export const currentCode = () => code;

export function pop(name, text, mine, fromId = '', event = null) {
  ensure();
  if (!addLog({ k: 'react', ts: Number.isFinite(event?.ts) ? event.ts : Date.now(), eventId: event?.eventId, from: { id: mine ? me : fromId, name }, text })) return;
  const feed = document.getElementById('reactFeed');
  const el = document.createElement('div');
  el.className = 'react-pop' + (mine ? ' mine' : '');
  el.innerHTML = `<b>${esc(mine ? 'أنت' : name)}</b><span>${esc(text)}</span>`;
  feed.appendChild(el);
  while (feed.children.length > 4) feed.firstChild.remove();
  setTimeout(() => el.remove(), 3200);
}
