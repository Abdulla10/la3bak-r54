/* R88: كتم كلمات (ميزة VIP) — الكلمات اللي اختارها اللاعب تختفي عنده بس (•••) بالدردشة والرسائل والتعليقات.
 * ما يرسل شي للسيرفر غير قائمة الكلمات اللي يحفظها اللاعب من صفحة المزايا. */
const AREAS = '.so-chat-messages, .chat-log, .cm-text, .chat-bubble p, .lb-message-preview, .sp73-msgs, .sp73-chat, .r68-chat, .gc-chat, .room-chat, [data-chat-log]';
let words = [], re = null, mo = null, queued = new Set(), raf = 0;
const norm = (t) => String(t).replace(/[إأآا]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[ً-ْـ]/g, '');
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/* نطابق الكلمة مع اختلاف الهمزات والتاء المربوطة والتشكيل */
const pat = (w) => [...norm(w)].map((ch) => ch === 'ا' ? '[اأإآ]' : ch === 'ي' ? '[يى]' : ch === 'ه' ? '[هة]' : escRe(ch)).join('[\\u064B-\\u0652\\u0640]*');
export function setWords(list) {
  words = Array.isArray(list) ? list.filter((w) => typeof w === 'string' && w.trim().length >= 2).slice(0, 30) : [];
  re = words.length ? new RegExp(words.map(pat).join('|'), 'giu') : null;
  if (re) { start(); scan(document.body); } else stop();
}
export function mask(text) { return re ? String(text ?? '').replace(re, '•••') : String(text ?? ''); }
function maskNode(root) {
  if (!re || !root) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const p = n.parentElement; if (!p || p.closest('input,textarea,[contenteditable="true"],script,style')) continue;
    re.lastIndex = 0; if (re.test(n.nodeValue)) { re.lastIndex = 0; n.nodeValue = n.nodeValue.replace(re, '•••'); }
  }
}
function scan(root) {
  if (!re || !root || root.nodeType !== 1) return;
  if (root.matches?.(AREAS)) maskNode(root); else { const up = root.closest?.(AREAS); if (up) maskNode(root); else root.querySelectorAll?.(AREAS).forEach(maskNode); }
}
function flush() { raf = 0; const list = [...queued]; queued.clear(); for (const n of list) scan(n.nodeType === 1 ? n : n.parentElement); }
function start() {
  if (mo) return;
  mo = new MutationObserver((recs) => { for (const r of recs) { if (r.type === 'characterData') queued.add(r.target); else r.addedNodes.forEach((n) => queued.add(n)); } if (!raf) raf = requestAnimationFrame(flush); });
  mo.observe(document.body, { childList: true, subtree: true, characterData: true });
}
function stop() { mo?.disconnect(); mo = null; }
addEventListener('la3:mute', (e) => setWords(e.detail));
/* أول ما يفتح الموقع: نجيب القائمة (لو مسجّل وعنده الميزة) */
setTimeout(() => {
  fetch('/api/perks', { credentials: 'same-origin' }).then((r) => r.ok ? r.json() : null).then((d) => { const w = d?.prefs?.muteWords; if (Array.isArray(w) && w.length) setWords(w); }).catch(() => {});
}, 1500);
