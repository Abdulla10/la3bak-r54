/* R69zk: الرجوع للعبة بعد انقطاع النت أو قفل التطبيق.
 * - لما يرجع النت أو ترجع للتطبيق، نعيد الاتصال فوراً (بدل ما ننتظر).
 * - لو عندك مباراة شغالة وأنت برا صفحتها: شريط «ارجع للعبة» بعداد الوقت المتبقي.
 * - لو سكّرت التطبيق وأنت تلعب ورجعت خلال دقيقتين: يرجعك للعبة على طول. */
const LS = 'la3_lastgame';
const ls = { get() { try { return JSON.parse(localStorage.getItem(LS) || 'null'); } catch { return null; } }, set(v) { try { if (v) localStorage.setItem(LS, JSON.stringify(v)); else localStorage.removeItem(LS); } catch { /* */ } } };
let api = null, bar = null, timer = 0, autoDone = false, lostAt = 0, hiddenAt = 0;

function css() {
  if (document.querySelector('style[data-rs69]')) return;
  const s = document.createElement('style'); s.dataset.rs69 = '1';
  s.textContent = `.rs69{position:fixed;z-index:9000;left:12px;right:12px;bottom:calc(86px + env(safe-area-inset-bottom));display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:16px;
  background:linear-gradient(135deg,#3b0a6b,#1d0638);border:1.5px solid #f5c542;box-shadow:0 10px 30px rgba(0,0,0,.55),0 0 0 3px rgba(245,197,66,.12);color:#fff;font:600 14px/1.35 system-ui,sans-serif;direction:rtl;animation:rs69in .35s ease}
  .rs69 i{font-style:normal;font-size:24px}.rs69 span{flex:1;min-width:0}.rs69 small{display:block;opacity:.8;font-weight:500;font-size:12px}
  .rs69 button{border:0;border-radius:12px;padding:9px 14px;font:800 14px system-ui;background:linear-gradient(#ffd86b,#e2a920);color:#2a1500;cursor:pointer}
  .rs69 .x{background:transparent;color:#fff;opacity:.7;padding:6px;font-size:18px}
  .rs69-net{position:fixed;z-index:9001;top:calc(8px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);padding:7px 14px;border-radius:999px;background:#7f1d1d;color:#fff;font:700 13px system-ui;direction:rtl;box-shadow:0 6px 18px rgba(0,0,0,.4)}
  @keyframes rs69in{from{transform:translateY(20px);opacity:0}}`;
  document.head.appendChild(s);
}
const routeCode = () => { const m = /^#\/room\/([^/?]+)/.exec((globalThis.__LA3BAK_NAV__ || location).hash || ''); return m ? decodeURIComponent(m[1]) : ''; };
function hide() { bar?.remove(); bar = null; clearInterval(timer); timer = 0; }
function show(room) {
  css(); hide();
  bar = document.createElement('div'); bar.className = 'rs69'; bar.setAttribute('role', 'status');
  const name = api.gameName(room.gameId) || 'المباراة';
  bar.innerHTML = `<i>🎮</i><span>عندك مباراة ${name} شغالة<small data-rs-left>اللعبة تنتظرك</small></span><button type="button" data-rs-go>ارجع للعبة</button><button type="button" class="x" aria-label="إخفاء" data-rs-x>✕</button>`;
  bar.querySelector('[data-rs-go]').onclick = () => { hide(); api.go(room.code); };
  bar.querySelector('[data-rs-x]').onclick = () => { hide(); dismissed.add(room.code); };
  document.body.appendChild(bar);
  const me = (room.players || []).find((p) => p.id === api.me());
  const until = me?.reconnectUntil;
  if (until) { const tick = () => { const s = Math.max(0, Math.round((until - api.now()) / 1000)); const el = bar?.querySelector('[data-rs-left]'); if (el) el.textContent = s > 0 ? `مقعدك محجوز ${s} ثانية` : 'اللعبة تنتظرك'; }; tick(); timer = setInterval(tick, 1000); }
}
const dismissed = new Set();
/** ينادى بعد كل تحديث لحالة الغرف */
export function sync() {
  if (!api) return;
  const playing = api.rooms().filter((r) => r.status === 'playing' && (r.players || []).some((p) => p.id === api.me() && !p.left));
  const here = routeCode();
  if (here && playing.some((r) => r.code === here)) { ls.set({ code: here, at: Date.now() }); hide(); return; }
  if (!playing.length) { if (!here) ls.set(null); hide(); return; }
  const room = playing[0];
  // رجع للتطبيق خلال دقيقتين من آخر مرة كان داخل اللعبة: نرجعه على طول
  const last = ls.get();
  if (!autoDone && last && last.code === room.code && Date.now() - last.at < 120_000) { autoDone = true; hide(); api.go(room.code); return; }
  autoDone = true;
  if (!dismissed.has(room.code)) show(room); else hide();
}
function net(off) {
  css(); let el = document.querySelector('.rs69-net');
  if (off) { if (!el) { el = document.createElement('div'); el.className = 'rs69-net'; el.textContent = '📶 انقطع النت… بنرجعك أول ما يرجع'; document.body.appendChild(el); } }
  else el?.remove();
}
export function init(o) {
  api = o;
  const wake = () => { if (document.visibilityState === 'visible') { if (routeCode()) ls.set({ code: routeCode(), at: Date.now() }); api.reconnect(hiddenAt && Date.now() - hiddenAt > 15_000); hiddenAt = 0; } else { hiddenAt = Date.now(); if (routeCode()) ls.set({ code: routeCode(), at: Date.now() }); } };
  document.addEventListener('visibilitychange', wake);
  addEventListener('pageshow', () => api.reconnect());
  addEventListener('online', () => { net(false); api.reconnect(); });
  addEventListener('offline', () => { lostAt = Date.now(); net(true); });
  addEventListener('hashchange', () => { if (!routeCode()) ls.set(null); setTimeout(sync, 50); });
  void lostAt;
}
export const connectionChanged = (online) => { if (online) net(false); };
