// R69za: تحسينات «التطبيق» — رقم الجهاز (لكشف الحسابات الوهمية)، شاشة «ما فيه نت» مع لعبة XO تشتغل بدون نت،
// بانر «ثبّت لعبك على جوالك»، وعداد الإشعارات على أيقونة التطبيق.
import * as PWA from './pwa.js?v=r86';
const KEY_DID = 'la3_did', KEY_DISMISS = 'la3_install_x';
const CSS = `
.ap69-off{position:fixed;inset:0;z-index:9500;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:12px;padding:calc(env(safe-area-inset-top,0px) + 30px) 18px 24px;background:radial-gradient(circle at 50% 20%,#4a1680,#160530 70%);color:#fff;direction:rtl;font-family:inherit;text-align:center;overflow:auto}
.ap69-off[hidden]{display:none}
.ap69-off .ic{font-size:54px;animation:ap69p 2s ease-in-out infinite}
@keyframes ap69p{50%{transform:scale(1.08)}}
.ap69-off h2{margin:0;font-size:22px;color:#ffd76a}.ap69-off p{margin:0;color:#e2d4ff;font-size:14px;line-height:1.6}
.ap69-dots{display:inline-flex;gap:5px}.ap69-dots i{width:8px;height:8px;border-radius:50%;background:#ffd76a;animation:ap69d 1.2s infinite}.ap69-dots i:nth-child(2){animation-delay:.2s}.ap69-dots i:nth-child(3){animation-delay:.4s}
@keyframes ap69d{50%{opacity:.25}}
.ap69-xo{margin-top:6px;padding:14px;border-radius:22px;background:linear-gradient(180deg,#2c0f55,#170632);box-shadow:0 0 0 1.5px #e9b44c,0 10px 26px #000a;width:min(320px,90vw)}
.ap69-xo h3{margin:0 0 8px;font-size:16px;color:#ffd76a}
.ap69-board{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.ap69-board button{aspect-ratio:1;border-radius:14px;border:1.5px solid #c79bff55;background:#ffffff0d;color:#fff;font-size:40px;font-weight:900;cursor:pointer;font-family:inherit}
.ap69-board button.x{color:#ffd76a}.ap69-board button.o{color:#ff6b8a}.ap69-board button.win{background:#ffd76a33;border-color:#ffd76a}
.ap69-xo .st{margin:10px 0 0;font-weight:800;min-height:22px}
.ap69-xo .sc{display:flex;justify-content:space-around;margin-top:6px;font-size:13px;color:#cdb8f2}
.ap69-btn{margin-top:8px;padding:10px 18px;border:0;border-radius:14px;font-weight:900;font-size:15px;color:#3a1600;background:linear-gradient(180deg,#ffe07a,#ffb21f);cursor:pointer;font-family:inherit}
.ap69-inst{position:fixed;left:10px;right:10px;bottom:calc(env(safe-area-inset-bottom,0px) + 96px);z-index:8800;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:18px;background:linear-gradient(180deg,#3a1470f5,#1c0838f5);box-shadow:0 0 0 1.5px #e9b44c,0 12px 28px #000c;color:#fff;direction:rtl;font-family:inherit;max-width:460px;margin:0 auto;animation:ap69up .5s cubic-bezier(.2,1.4,.4,1) both}
.ap69-inst[hidden]{display:none}
@keyframes ap69up{from{transform:translateY(140%)}}
.ap69-inst img{width:48px;height:48px;border-radius:12px;flex:none}
.ap69-inst div{flex:1;min-width:0}.ap69-inst b{display:block;font-size:14.5px}.ap69-inst small{display:block;font-size:12px;color:#d9c8f5;line-height:1.4}
.ap69-inst .go{flex:none;padding:9px 14px;border:0;border-radius:12px;font-weight:900;color:#3a1600;background:linear-gradient(180deg,#ffe07a,#ffb21f);font-family:inherit;cursor:pointer}
.ap69-inst .x{flex:none;width:28px;height:28px;border:0;border-radius:50%;background:#ffffff1a;color:#fff;cursor:pointer}
.ap69-ios{position:fixed;inset:0;z-index:9600;display:flex;align-items:flex-end;justify-content:center;background:#000a;direction:rtl;font-family:inherit}
.ap69-ios .sh{width:100%;max-width:460px;padding:18px 16px calc(env(safe-area-inset-bottom,0px) + 18px);border-radius:22px 22px 0 0;background:linear-gradient(180deg,#2c0f55,#170632);color:#fff;box-shadow:0 0 0 1.5px #e9b44c}
.ap69-ios h3{margin:0 0 10px;color:#ffd76a;font-size:18px;text-align:center}
.ap69-ios ol{margin:0;padding:0;list-style:none;display:grid;gap:10px}
.ap69-ios li{display:flex;align-items:center;gap:10px;padding:10px;border-radius:14px;background:#ffffff0d;font-size:14.5px}
.ap69-ios li i{flex:none;width:26px;height:26px;border-radius:50%;background:linear-gradient(#ffd76a,#e8a000);color:#3a1600;font-style:normal;font-weight:900;display:grid;place-items:center}
.ap69-ios .share{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:7px;background:#0a84ff;color:#fff;font-size:15px;vertical-align:middle}
`;
const rnd = () => { const a = new Uint8Array(18); crypto.getRandomValues(a); return btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } } };

/* ---------- 1) رقم الجهاز + بصمته ---------- */
// البصمة من صفات ثابتة بالجهاز (الشاشة، اللغة، المنطقة الزمنية، المعالج، طريقة رسم المتصفح) — نرسل بس الهاش، مو الصفات نفسها
async function fingerprint() {
  try {
    const parts = [screen.width, screen.height, screen.colorDepth, devicePixelRatio, Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.language, (navigator.languages || []).join(','), navigator.hardwareConcurrency || 0, navigator.maxTouchPoints || 0, navigator.platform || ''];
    try { const c = document.createElement('canvas'); c.width = 220; c.height = 40; const x = c.getContext('2d'); x.textBaseline = 'top'; x.font = '16px Arial'; x.fillStyle = '#f60'; x.fillRect(80, 1, 60, 20); x.fillStyle = '#069'; x.fillText('لعبك LA3BAK ✓😀', 2, 14); x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgba(102,204,0,.7)'; x.arc(50, 20, 20, 0, Math.PI * 2); x.fill(); parts.push(c.toDataURL()); } catch { /* */ }
    try { const g = document.createElement('canvas').getContext('webgl'); const d = g && g.getExtension('WEBGL_debug_renderer_info'); if (d) parts.push(g.getParameter(d.UNMASKED_VENDOR_WEBGL), g.getParameter(d.UNMASKED_RENDERER_WEBGL)); } catch { /* */ }
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(parts.join('|')));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
  } catch { return ''; }
}
let pinged = '';
async function devicePing() {
  try {
    const me = await fetch('/api/account', { credentials: 'same-origin', cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const uid = me?.id || me?.displayId || ''; if (!uid || pinged === uid) return; pinged = uid;
    let did = ls.get(KEY_DID); if (!did || !/^[A-Za-z0-9_-]{20,64}$/.test(did)) { did = rnd(); ls.set(KEY_DID, did); }
    const r = await fetch('/api/device', { method: 'POST', credentials: 'same-origin', headers: { 'x-la3-did': did, 'x-la3-fp': await fingerprint() } }).then((x) => x.json()).catch(() => null);
    if (r?.did && r.did !== did) ls.set(KEY_DID, r.did);
    /* R69ze: نسجل مفتاح التشفير العام عشان أصدقاؤك يقدرون يرسلون لك رسائل مشفّرة */
    import('./e2e-r69.js?v=r69zj').then((E) => E.register((u, m, b) => fetch(u, { method: m, credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }).then((x) => x.json()))).catch(() => {});
  } catch { /* */ }
}

/* ---------- 2) ما فيه نت + لعبة XO ---------- */
const XO = { b: Array(9).fill(''), turn: 'x', over: false, score: { x: 0, o: 0, d: 0 } };
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const winner = (b) => { for (const l of LINES) if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return l; return null; };
function aiMove(b) {
  const free = b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
  const tryWin = (p) => free.find((i) => { const c = [...b]; c[i] = p; return winner(c); });
  let m = tryWin('o'); if (m === undefined) m = tryWin('x');
  if (m === undefined && Math.random() < 0.85) m = !b[4] ? 4 : [0, 2, 6, 8].filter((i) => !b[i])[0];
  if (m === undefined) m = free[Math.floor(Math.random() * free.length)];
  return m;
}
let off = null;
function offPaint() {
  if (!off) return; const w = winner(XO.b), full = XO.b.every(Boolean);
  off.querySelector('.ap69-board').innerHTML = XO.b.map((v, i) => `<button type="button" data-i="${i}" class="${v}${w && w.includes(i) ? ' win' : ''}" aria-label="خانة ${i + 1}">${v === 'x' ? '✕' : v === 'o' ? '◯' : ''}</button>`).join('');
  off.querySelector('.st').textContent = w ? (XO.b[w[0]] === 'x' ? 'فزت! 🎉' : 'فاز الجوال 🤖') : full ? 'تعادل 🤝' : XO.turn === 'x' ? 'دورك ✕' : 'الجوال يفكر…';
  off.querySelector('.sc').innerHTML = `<span>أنت: ${XO.score.x}</span><span>تعادل: ${XO.score.d}</span><span>الجوال: ${XO.score.o}</span>`;
}
function xoEnd() { const w = winner(XO.b); if (w) { XO.over = true; XO.score[XO.b[w[0]]]++; } else if (XO.b.every(Boolean)) { XO.over = true; XO.score.d++; } }
function showOffline(on) {
  if (!off) {
    off = document.createElement('div'); off.className = 'ap69-off'; off.hidden = true; off.setAttribute('role', 'alertdialog'); off.setAttribute('aria-label', 'ما فيه اتصال');
    off.innerHTML = `<span class="ic" aria-hidden="true">📡</span><h2>ما فيه نت</h2><p>نحاول نرجع نتصل تلقائياً <span class="ap69-dots" aria-hidden="true"><i></i><i></i><i></i></span><br>لين يرجع النت، العب XO ضد الجوال 👇</p>
      <section class="ap69-xo"><h3>❌⭕ إكس أو</h3><div class="ap69-board"></div><p class="st"></p><div class="sc"></div><button type="button" class="ap69-btn" data-xo-new>جولة جديدة</button></section>
      <button type="button" class="ap69-btn" data-retry style="background:#ffffff1a;color:#fff">جرّب الحين</button>`;
    off.addEventListener('click', (e) => {
      const c = e.target.closest('[data-i]');
      if (c && !XO.over && XO.turn === 'x' && !XO.b[c.dataset.i]) {
        XO.b[c.dataset.i] = 'x'; xoEnd(); XO.turn = 'o'; offPaint();
        if (!XO.over) setTimeout(() => { XO.b[aiMove(XO.b)] = 'o'; xoEnd(); XO.turn = 'x'; offPaint(); }, 450);
        return;
      }
      if (e.target.closest('[data-xo-new]')) { XO.b = Array(9).fill(''); XO.over = false; XO.turn = 'x'; offPaint(); }
      if (e.target.closest('[data-retry]')) check(true);
    });
    document.body.append(off);
  }
  off.hidden = !on; if (on) offPaint();
}
let offTimer = 0, failures = 0;
async function check(force) {
  if (navigator.onLine === false) { failures = 2; showOffline(true); return; }
  try { const r = await fetch('/healthz', { cache: 'no-store' }); if (!r.ok) throw 0; failures = 0; if (off && !off.hidden) { showOffline(false); if (force !== 'silent') location.reload(); } }
  catch { failures++; if (failures >= 2 || force === true) showOffline(true); }
}

/* ---------- 3) بانر التثبيت ---------- */
let inst = null;
function iosSheet() {
  const n = document.createElement('div'); n.className = 'ap69-ios'; n.setAttribute('role', 'dialog');
  n.innerHTML = `<div class="sh"><h3>ثبّت لعبك على الآيفون</h3><ol><li><i>1</i>اضغط زر المشاركة <span class="share">⬆︎</span> تحت في Safari</li><li><i>2</i>انزل واختار «إضافة إلى الشاشة الرئيسية»</li><li><i>3</i>اضغط «إضافة» وبيطلع لك تطبيق لعبك 👑</li></ol><button type="button" class="ap69-btn" style="width:100%;margin-top:12px">تمام</button></div>`;
  n.addEventListener('click', (e) => { if (e.target === n || e.target.closest('button')) n.remove(); }); document.body.append(n);
}
function maybeInstall() {
  if (PWA.isStandalone()) return;
  const last = Number(ls.get(KEY_DISMISS) || 0); if (Date.now() - last < 3 * 86400_000) return;
  const h = (globalThis.__LA3BAK_NAV__ || location).hash || '#/'; if (!(h === '#/' || h === '' || h === '#/games')) return;
  if (!inst) {
    inst = document.createElement('div'); inst.className = 'ap69-inst'; inst.setAttribute('role', 'dialog'); inst.setAttribute('aria-label', 'ثبّت التطبيق');
    inst.innerHTML = '<img src="/icon-192.png" alt=""><div><b>ثبّت لعبك على جوالك 📲</b><small>يفتح أسرع، بشاشة كاملة، وتوصلك الإشعارات</small></div><button type="button" class="go">ثبّت</button><button type="button" class="x" aria-label="إغلاق">✕</button>';
    inst.addEventListener('click', async (e) => {
      if (e.target.closest('.x')) { inst.hidden = true; ls.set(KEY_DISMISS, String(Date.now())); return; }
      if (e.target.closest('.go')) { inst.hidden = true; ls.set(KEY_DISMISS, String(Date.now())); if (PWA.isIOS) iosSheet(); else { try { await PWA.install(); } catch { /* */ } } }
    });
    document.body.append(inst);
  }
  inst.hidden = false;
}

/* ---------- 4) عداد الإشعارات على الأيقونة ---------- */
async function badge() {
  if (!('setAppBadge' in navigator)) return;
  try {
    const me = await fetch('/api/account', { credentials: 'same-origin', cache: 'no-store' }).then((r) => (r.ok ? r.json() : null));
    const n = Number(me?.internalNotifications ?? 0) || 0;
    if (n > 0) await navigator.setAppBadge(Math.min(99, n)); else await navigator.clearAppBadge?.();
  } catch { /* */ }
}

let started = false;
export function startApp69() {
  if (started) return; started = true;
  const s = document.createElement('style'); s.dataset.ap69 = '1'; s.textContent = CSS; document.head.append(s);
  addEventListener('offline', () => { failures = 2; showOffline(true); });
  addEventListener('online', () => check('silent'));
  clearInterval(offTimer); offTimer = setInterval(() => { if (off && !off.hidden) check(); else if (navigator.onLine === false) check(); }, 5000);
  setTimeout(devicePing, 2500); setInterval(devicePing, 10 * 60_000);
  setTimeout(maybeInstall, 25_000);
  setTimeout(badge, 4000); setInterval(badge, 60_000);
  addEventListener('visibilitychange', () => { if (!document.hidden) { badge(); devicePing(); } });
}
startApp69();

/* R69zw: انتقال ناعم بين الصفحات (بس لما تتغير الصفحة، مو مع كل تحديث) */
(() => {
  let t = 0, last = '';
  const page = () => String((globalThis.__LA3BAK_NAV__ || location).hash || '').split('/').slice(0, 2).join('/');
  addEventListener('hashchange', () => {
    const p = page(); if (p === last) return; last = p;
    if (p.startsWith('#/room')) return; // داخل اللعبة ما نحرّك شي
    const h = document.documentElement; h.classList.add('la69-pg'); clearTimeout(t); t = setTimeout(() => h.classList.remove('la69-pg'), 320);
  });
  last = page();
})();

/* R69zz: توفير البطارية: نوقف الحركات لما الصفحة مخفية، ووضع توفير لما البطارية أقل من 20% وما هي على الشاحن */
(() => {
  const h = document.documentElement;
  const vis = () => h.classList.toggle('la69-hidden', document.visibilityState === 'hidden');
  document.addEventListener('visibilitychange', vis); vis();
  /* R71: وضع النت الضعيف — لو الجوال على نت بطيء أو «توفير البيانات» شغال: نخفف الحركات ونعرض صور الهدايا بدل المجسمات */
  try {
    const c = navigator.connection; const slowNav = () => { try { const n = performance.getEntriesByType('navigation')[0]; return n && n.responseStart > 2500; } catch { return false; } };
    const lite = () => { const on = !!(c && (c.saveData || /(^|-)2g$|^3g$/.test(c.effectiveType || ''))) || slowNav(); h.classList.toggle('la69-lite', on); h.classList.toggle('la69-saver', on || h.classList.contains('la69-saver')); };
    lite(); c?.addEventListener?.('change', lite);
  } catch { /* */ }
  try { navigator.getBattery?.().then((b) => { const up = () => h.classList.toggle('la69-saver', (!b.charging && b.level < 0.2) || h.classList.contains('la69-lite')); b.addEventListener('levelchange', up); b.addEventListener('chargingchange', up); up(); }).catch(() => {}); } catch { /* */ }
})();
