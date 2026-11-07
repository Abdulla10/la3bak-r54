/* وضع الشاشة الكاملة للألعاب: يخفي الشريط العلوي والتنقل ويعطي اللعبة الشاشة كلها.
   على أندرويد والكمبيوتر نطلب كمان شاشة المتصفح الكاملة؛ على آيفون الأفضل تثبيت الموقع كتطبيق. */
const KEY = 'qa_fs_v1';
export const pref = () => { try { return localStorage.getItem(KEY) !== '0'; } catch { return true; } };
function setPref(v) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* ignore */ } }
const root = document.documentElement;
let inGame = false;

export function sync(game) {
  inGame = !!game;
  root.classList.toggle('fs', inGame && pref());
  let b = document.getElementById('fsBtn');
  if (!inGame) { b?.remove(); return; }
  if (!b) {
    b = document.createElement('button');
    b.id = 'fsBtn'; b.type = 'button'; b.className = 'fs-btn'; b.dataset.act = 'fs-toggle';
    document.body.appendChild(b);
  }
  const on = root.classList.contains('fs');
  b.textContent = on ? '✕' : '⛶';
  b.setAttribute('aria-label', on ? 'اطلع من الشاشة الكاملة' : 'شاشة كاملة');
  b.title = on ? 'اطلع من الشاشة الكاملة' : 'شاشة كاملة';
}
export function toggle() {
  const next = !root.classList.contains('fs');
  setPref(next);
  sync(inGame);
  try {
    if (next && root.requestFullscreen && !document.fullscreenElement) root.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    else if (!next && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  } catch { /* ما كل المتصفحات تدعمها */ }
  return next;
}
